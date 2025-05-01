// BackEnd/routes/api/esp32.ts
import express, { Request, Response, RequestHandler } from 'express';
import WaterLevel from '../../models/WaterLevel';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import { sendAlertEmail } from '../../services/emailService';
import { broadcastWaterLevel, broadcastAlert } from '../../services/wsService';
import { activateBuzzer, deactivateBuzzer } from '../../services/sensorService';
import PumpLog from '../../models/PumpLog';

const router = express.Router();

// Define the request handler type explicitly
const handleEsp32Data: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { distance } = req.body;
    
    if (distance === undefined || typeof distance !== 'number') {
      res.status(400).json({ message: 'Valid distance measurement is required' });
      return;
    }

    // Get current settings to determine tank height and thresholds
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    
    // Convert distance to water level (assuming sensor is mounted at the top of the tank)
    // Tank height - measured distance = water level
    const waterLevel = thresholds.maxLevel - distance;
    
    // Create and save the water level reading
    const waterLevelReading = new WaterLevel({
      level: waterLevel,
      unit: thresholds.unit || 'cm',
    });
    
    await waterLevelReading.save();
    
    // Broadcast to WebSocket clients
    try {
      broadcastWaterLevel(waterLevelReading);
    } catch (wsError) {
      console.warn('Failed to broadcast water level via WebSocket:', wsError);
    }
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    
    // Check against danger threshold
    if (waterLevel >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Water level has reached danger threshold (${waterLevel} ${thresholds.unit || 'cm'})`;
    } 
    // Check against warning threshold
    else if (waterLevel >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Water level has reached warning threshold (${waterLevel} ${thresholds.unit || 'cm'})`;
    }
    
    // Create alert if threshold exceeded
    if (alertType) {
      try {
        const alert = new Alert({
          level: waterLevel,
          type: alertType,
          message: alertMessage,
          acknowledged: false,
        });
        
        await alert.save();
        console.log(`Alert created: ${alertType} at level ${waterLevel}`);
        
        // Activate buzzer based on alert type
        activateBuzzer(alertType);
        
        // Broadcast alert to WebSocket clients
        try {
          broadcastAlert(alert);
        } catch (wsError) {
          console.warn('Failed to broadcast alert via WebSocket:', wsError);
        }
        
        // Send email notification if enabled
        if (notifications.emailEnabled) {
          if ((alertType === 'warning' && notifications.notifyOnWarning) || 
              (alertType === 'danger' && notifications.notifyOnDanger)) {
            try {
              await sendAlertEmail(
                notifications.emailAddress,
                `Water Level ${alertType.toUpperCase()} Alert`,
                alertMessage
              );
              console.log(`Alert email sent to ${notifications.emailAddress}`);
            } catch (emailError) {
              console.error('Failed to send alert email:', emailError);
            }
          }
        }
      } catch (alertError) {
        console.error('Error creating alert:', alertError);
      }
    }
    
    // Handle automatic pump control if in auto mode
    if (pumpMode === 'auto') {
      const shouldActivatePump = waterLevel >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = waterLevel <= thresholds.pumpDeactivationLevel;
      
      // Get current pump status
      const latestPumpLog = await PumpLog.findOne().sort({ createdAt: -1 });
      const isPumpActive = latestPumpLog?.isActive || false;
      
      if (shouldActivatePump && !isPumpActive) {
        // Activate pump
        const pumpLog = new PumpLog({
          isActive: true,
          startTime: new Date(),
          activatedBy: 'auto',
          waterLevelAtActivation: waterLevel
        });
        
        await pumpLog.save();
        console.log('Pump automatically activated');
      } else if (shouldDeactivatePump && isPumpActive) {
        // Find the latest active pump entry
        const latestActivePumpLog = await PumpLog.findOne({ 
          isActive: true, 
          endTime: { $exists: false } 
        }).sort({ startTime: -1 });
        
        if (latestActivePumpLog && latestActivePumpLog.startTime) {
          // Update the pump log entry
          const now = new Date();
          const duration = (now.getTime() - latestActivePumpLog.startTime.getTime()) / 1000; // in seconds
          
          latestActivePumpLog.isActive = false;
          latestActivePumpLog.endTime = now;
          latestActivePumpLog.duration = duration;
          
          await latestActivePumpLog.save();
        }
        
        // Create a deactivation log
        const pumpLog = new PumpLog({
          isActive: false,
          activatedBy: 'auto'
        });
        
        await pumpLog.save();
        console.log('Pump automatically deactivated');
      }
    }
    
    res.status(201).json({
      message: 'ESP32 data processed successfully',
      data: {
        rawDistance: distance,
        waterLevel: waterLevel,
        unit: thresholds.unit || 'cm'
      },
      alert: alertType ? { type: alertType, message: alertMessage } : null
    });
  } catch (error) {
    console.error('Error processing ESP32 data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/esp32/data
// @desc    Receive data from ESP32 sensor
// @access  Public (for ESP32 access)
router.post('/data', handleEsp32Data);

export default router;
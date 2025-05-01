// BackEnd/routes/api/esp32.ts - Fix for 500 Error

import express, { Request, Response, RequestHandler } from 'express';
import WaterLevel from '../../models/WaterLevel';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import { sendAlertEmail } from '../../services/emailService';
import { broadcastWaterLevel, broadcastAlert } from '../../services/wsService';
import { activateBuzzer, deactivateBuzzer } from '../../services/sensorService';
import PumpLog from '../../models/PumpLog';

const router = express.Router();

const handleEsp32Data: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Debug logging
    console.log('ESP32 data received:', req.body);
    
    const { distance } = req.body;
    
    if (distance === undefined || typeof distance !== 'number') {
      console.error('Invalid distance value:', distance);
      res.status(400).json({ message: 'Valid distance measurement is required' });
      return;
    }

    // Get current settings to determine tank height and thresholds
    const settings = await Settings.findOne();
    
    if (!settings) {
      console.error('No settings found in database');
      
      // Create default settings if none exist
      const defaultSettings = {
        thresholds: {
          warningLevel: 30,
          dangerLevel: 20,
          maxLevel: 100,
          minLevel: 0,
          pumpActivationLevel: 40,
          pumpDeactivationLevel: 20,
          unit: 'cm',
        },
        notifications: {
          emailEnabled: false,
          emailAddress: '',
          notifyOnWarning: true,
          notifyOnDanger: true,
          notifyOnPumpActivation: false,
        },
        pumpMode: 'auto',
      };
      
      const newSettings = new Settings(defaultSettings);
      await newSettings.save();
      
      console.log('Created default settings:', defaultSettings);
      
      // Use the default settings
      res.status(201).json({
        message: 'Default settings created. Please try again.',
        data: {
          rawDistance: distance,
          waterLevel: 100 - distance, // Using default max height of 100cm
          unit: 'cm'
        }
      });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    
    // Convert distance to water level (assuming sensor is mounted at the top of the tank)
    // Tank height - measured distance = water level
    const waterLevel = thresholds.maxLevel - distance;
    
    console.log(`Distance: ${distance}cm, Converted to water level: ${waterLevel}cm`);
    
    // Create and save the water level reading
    const waterLevelReading = new WaterLevel({
      level: waterLevel,
      unit: thresholds.unit || 'cm',
    });
    
    await waterLevelReading.save();
    console.log('Water level reading saved to database');
    
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
    
    // Success response
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
    // Detailed error logging
    console.error('Error processing ESP32 data:', error);
    console.error('Request body:', req.body);
    
    res.status(500).json({ 
      message: 'Server error processing ESP32 data', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add this to the bottom of your esp32.ts file, before the export
router.get('/test', (req, res) => {
  res.json({ 
    message: 'ESP32 API is working',
    timestamp: new Date().toISOString()
  });
});

// Route definition
router.post('/data', handleEsp32Data);

export default router;
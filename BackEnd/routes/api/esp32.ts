// BackEnd/routes/api/esp32.ts (Perbaikan)

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
    
    // Validasi input data
    const { distance } = req.body;
    
    if (distance === undefined) {
      res.status(400).json({
        success: false,
        message: 'Nilai jarak sensor (distance) diperlukan',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (typeof distance !== 'number' || isNaN(distance)) {
      res.status(400).json({
        success: false,
        message: 'Nilai jarak sensor (distance) harus berupa angka',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (distance < 0) {
      res.status(400).json({
        success: false,
        message: 'Nilai jarak sensor (distance) tidak boleh negatif',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    // Get current settings to determine tank height and thresholds
    const settings = await Settings.findOne().lean();
    
    if (!settings) {
      console.log('No settings found in database, creating default settings');
      
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
        success: true,
        message: 'Pengaturan default dibuat. Mohon coba lagi.',
        data: {
          rawDistance: distance,
          waterLevel: 100 - Math.min(distance, 100), // Using default max height of 100cm
          unit: 'cm'
        }
      });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    
    // Konversi jarak ke level air dengan beberapa perbaikan
    // 1. Pastikan nilai distance berada dalam rentang valid
    // 2. Gunakan nilai maxLevel dari pengaturan
    // 3. Batasi nilai akhir agar tidak negatif atau melebihi maxLevel
    const validDistance = Math.max(0, Math.min(distance, thresholds.maxLevel));
    const waterLevel = Math.max(0, Math.min(thresholds.maxLevel - validDistance, thresholds.maxLevel));
    
    console.log(`Distance: ${distance}cm, Valid distance: ${validDistance}cm, Converted to water level: ${waterLevel}cm`);
    
    // Create and save the water level reading
    const waterLevelReading = new WaterLevel({
      level: waterLevel,
      unit: thresholds.unit || 'cm',
    });
    
    await waterLevelReading.save();
    console.log('Water level reading saved to database:', waterLevelReading);
    
    // Broadcast to WebSocket clients
    try {
      const broadcastSuccess = broadcastWaterLevel(waterLevelReading);
      if (!broadcastSuccess) {
        console.warn('Failed to broadcast water level via WebSocket (no clients or server not initialized)');
      }
    } catch (wsError) {
      console.warn('Exception when broadcasting water level via WebSocket:', wsError);
    }
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    let createdAlert = null;
    
    // Check against danger threshold - using greater than or equal
    if (waterLevel >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Level air telah mencapai ambang BAHAYA (${waterLevel.toFixed(1)} ${thresholds.unit || 'cm'})`;
    } 
    // Check against warning threshold - using greater than or equal
    else if (waterLevel >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Level air telah mencapai ambang PERINGATAN (${waterLevel.toFixed(1)} ${thresholds.unit || 'cm'})`;
    }
    
    // Create alert if threshold exceeded and there isn't already an active alert of the same type
    if (alertType) {
      try {
        // Check if there's already an unacknowledged alert of the same type
        const existingAlert = await Alert.findOne({
          type: alertType,
          acknowledged: false
        }).sort({ createdAt: -1 });
        
        // Only create a new alert if there isn't an existing one of the same type
        // or if the existing one is older than 30 minutes
        const shouldCreateNewAlert = !existingAlert || 
          (Date.now() - existingAlert.createdAt.getTime() > 30 * 60 * 1000);
        
        if (shouldCreateNewAlert) {
          const alert = new Alert({
            level: waterLevel,
            type: alertType,
            message: alertMessage,
            acknowledged: false,
          });
          
          await alert.save();
          createdAlert = alert;
          console.log(`Alert created: ${alertType} at level ${waterLevel}`);
          
          // Activate buzzer based on alert type
          activateBuzzer(alertType);
          
          // Broadcast alert to WebSocket clients
          try {
            const broadcastSuccess = broadcastAlert(alert);
            if (!broadcastSuccess) {
              console.warn('Failed to broadcast alert via WebSocket (no clients or server not initialized)');
            }
          } catch (wsError) {
            console.warn('Exception when broadcasting alert via WebSocket:', wsError);
          }
          
          // Send email notification if enabled
          if (notifications.emailEnabled) {
            if ((alertType === 'warning' && notifications.notifyOnWarning) || 
                (alertType === 'danger' && notifications.notifyOnDanger)) {
              try {
                await sendAlertEmail(
                  notifications.emailAddress,
                  `Peringatan Level Air ${alertType.toUpperCase()}`,
                  alertMessage
                );
                console.log(`Alert email sent to ${notifications.emailAddress}`);
              } catch (emailError) {
                console.error('Failed to send alert email:', emailError);
              }
            }
          }
        } else {
          console.log(`Skipping alert creation: existing ${alertType} alert is still active`);
        }
      } catch (alertError) {
        console.error('Error creating alert:', alertError);
      }
    } else {
      // If water level is normal, check if we need to deactivate the buzzer
      // Only deactivate if there are no active alerts
      const activeAlerts = await Alert.countDocuments({ acknowledged: false });
      
      if (activeAlerts === 0) {
        deactivateBuzzer();
      }
    }
    
    // Handle automatic pump control if in auto mode
    if (pumpMode === 'auto') {
      const shouldActivatePump = waterLevel >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = waterLevel <= thresholds.pumpDeactivationLevel;
      
      // Tambahkan kode kendali pompa di sini jika diperlukan
    }
    
    // Success response dengan format yang konsisten
    res.status(201).json({
      success: true,
      message: 'Data ESP32 berhasil diproses',
      data: {
        rawDistance: distance,
        validDistance: validDistance,
        waterLevel: waterLevel,
        unit: thresholds.unit || 'cm',
        alert: createdAlert ? {
          id: createdAlert._id,
          type: createdAlert.type,
          message: createdAlert.message
        } : null
      }
    });
    
  } catch (error) {
    // Detailed error logging
    console.error('Error processing ESP32 data:', error);
    console.error('Request body:', req.body);
    
    // Format respons error yang konsisten
    res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses data ESP32',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Add this to the bottom of your esp32.ts file, before the export
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'ESP32 API berfungsi dengan baik',
    data: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

// Route definition
router.post('/data', handleEsp32Data);

export default router;
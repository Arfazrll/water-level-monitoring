import express, { Request, Response, NextFunction } from 'express';
import WaterLevel from '../../models/WaterLevel';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import { sendAlertEmail } from '../../services/emailService';
import { broadcastWaterLevel, broadcastAlert } from '../../services/wsService';
import { activateBuzzer, deactivateBuzzer } from '../../services/sensorService';

const router = express.Router();

const handleEsp32Data = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('ESP32 data received:', req.body);
    console.log('Headers:', req.headers);
    
    let distance = req.body.distance;
    
    if (distance === undefined) {
      if (req.body.data && req.body.data.distance !== undefined) {
        distance = req.body.data.distance;
      } else {
        console.log('Missing distance data in request');
        res.status(400).json({
          success: false,
          message: 'Nilai jarak sensor (distance) diperlukan',
          error: 'VALIDATION_ERROR'
        });
        return;
      }
    }
    
    if (typeof distance !== 'number' || isNaN(distance)) {
      console.log('Invalid distance type:', typeof distance);
      res.status(400).json({
        success: false,
        message: 'Nilai jarak sensor (distance) harus berupa angka',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (distance < 0) {
      console.log('Negative distance value received:', distance);
      res.status(400).json({
        success: false,
        message: 'Nilai jarak sensor (distance) tidak boleh negatif',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    console.log('Valid distance data received:', distance);

    const settings = await Settings.findOne().lean();
    
    if (!settings) {
      console.log('No settings found in database, creating default settings');
      
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
      
      res.status(201).json({
        success: true,
        message: 'Pengaturan default dibuat. Mohon coba lagi.',
        data: {
          rawDistance: distance,
          waterLevel: Math.max(0, Math.min(100 - distance, 100)), // Using default max height of 100cm
          unit: 'cm'
        }
      });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    const validDistance = Math.max(0, Math.min(distance, thresholds.maxLevel));

    // Rumus Penting
    const waterLevel = Math.max(0, Math.min(thresholds.maxLevel - validDistance, thresholds.maxLevel));
    console.log(`Distance: ${distance}cm, Valid distance: ${validDistance}cm, Converted to water level: ${waterLevel}cm`);
    
    const waterLevelReading = new WaterLevel({
      level: waterLevel,
      unit: thresholds.unit || 'cm',
    });
    
    await waterLevelReading.save();
    console.log('Water level reading saved to database:', waterLevelReading);
    
    try {
      const broadcastSuccess = broadcastWaterLevel(waterLevelReading);
      if (!broadcastSuccess) {
        console.warn('Failed to broadcast water level via WebSocket (no clients or server not initialized)');
      } else {
        console.log('Water level broadcast successful');
      }
    } catch (wsError) {
      console.warn('Exception when broadcasting water level via WebSocket:', wsError);
    }
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    let createdAlert = null;
    
    if (waterLevel >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Level air telah mencapai ambang BAHAYA (${waterLevel.toFixed(1)} ${thresholds.unit || 'cm'})`;
    } 
    else if (waterLevel >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Level air telah mencapai ambang PERINGATAN (${waterLevel.toFixed(1)} ${thresholds.unit || 'cm'})`;
    }
    
    if (alertType) {
      try {
        const existingAlert = await Alert.findOne({
          type: alertType,
          acknowledged: false
        }).sort({ createdAt: -1 });
        
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
          
          activateBuzzer(alertType);
          
          try {
            const broadcastSuccess = broadcastAlert(alert);
            if (!broadcastSuccess) {
              console.warn('Failed to broadcast alert via WebSocket (no clients or server not initialized)');
            }
          } catch (wsError) {
            console.warn('Exception when broadcasting alert via WebSocket:', wsError);
          }
          
          if (notifications.emailEnabled) {
            if ((alertType === 'warning' && notifications.notifyOnWarning) || 
                (alertType === 'danger' && notifications.notifyOnDanger)) {
              try {
                // Menggunakan template yang tepat berdasarkan jenis alert
                const subject = alertType === 'danger' 
                  ? 'DANGER: Critical Water Level Detected - Immediate Action Required'
                  : 'WARNING: Water Level Has Reached Warning Threshold';
                
                await sendAlertEmail(
                  notifications.emailAddress,
                  subject,
                  alertMessage,
                  alertType,
                  waterLevel,
                  thresholds.unit || 'cm'
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
      const activeAlerts = await Alert.countDocuments({ acknowledged: false });
      
      if (activeAlerts === 0) {
        deactivateBuzzer();
      }
    }
    
    if (pumpMode === 'auto') {
      const shouldActivatePump = waterLevel >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = waterLevel <= thresholds.pumpDeactivationLevel;
      
      if (shouldActivatePump) {
        console.log('Auto pump activation recommended');
      } else if (shouldDeactivatePump) {
        console.log('Auto pump deactivation recommended');
      }
    }

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
    console.error('Error processing ESP32 data:', error);
    console.error('Request body:', req.body);
    
    res.status(500).json({ 
      success: false, 
      message: 'Gagal memproses data ESP32',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

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

router.post('/data', handleEsp32Data);

export default router;
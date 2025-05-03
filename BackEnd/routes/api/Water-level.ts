// BackEnd/routes/api/Water-level.ts

import express from 'express';
import { validateWaterLevelData } from '../../middleware/validate';
import WaterLevel from '../../models/WaterLevel';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import { sendAlertEmail } from '../../services/emailService';
import { broadcastWaterLevel, broadcastAlert } from '../../services/wsService';
import { activateBuzzer, deactivateBuzzer } from '../../services/sensorService';

const router = express.Router();

// @route   GET /api/water-level
// @desc    Get water level data with optional limit
// @access  Public
router.get('/current', async (req, res) => {
  try {
    const currentLevel = await WaterLevel.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    // PERBAIKAN: Jika tidak ada data, kembalikan null dengan success=true
    if (!currentLevel) {
      res.json({
        success: true,
        message: 'Belum ada data level air',
        data: null
      });
      return;
    }
    
    res.json({
      success: true,
      message: 'Data level air terkini berhasil diambil',
      data: currentLevel
    });
  } catch (error) {
    console.error('Error fetching current water level:', error);
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data level air terkini',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/water-level
// @desc    Add water level reading and check thresholds
// @access  Private (in production) / Public (for testing)
router.post('/', validateWaterLevelData, async (req, res) => {
  try {
    const { level, unit } = req.body;
    
    // Create and save the water level reading
    const waterLevelReading = new WaterLevel({
      level,
      unit: unit || 'cm',
    });
    
    await waterLevelReading.save();
    
    // Broadcast to WebSocket clients
    try {
      const broadcastSuccess = broadcastWaterLevel(waterLevelReading);
      if (!broadcastSuccess) {
        console.warn('Failed to broadcast water level via WebSocket');
      }
    } catch (wsError) {
      console.warn('Exception when broadcasting water level via WebSocket:', wsError);
    }
    
    // Get current settings to check against thresholds
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(404).json({
        success: false,
        message: 'Pengaturan tidak ditemukan',
        data: null
      });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    
    // Check against danger threshold
    if (level >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Level air telah mencapai ambang BAHAYA (${level} ${unit || 'cm'})`;
    } 
    // Check against warning threshold
    else if (level >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Level air telah mencapai ambang PERINGATAN (${level} ${unit || 'cm'})`;
    }
    
    // Create alert if threshold exceeded
    let createdAlert = null;
    if (alertType) {
      try {
        const alert = new Alert({
          level,
          type: alertType,
          message: alertMessage,
          acknowledged: false,
        });
        
        await alert.save();
        createdAlert = alert;
        console.log(`Alert created: ${alertType} at level ${level}`);
        
        // Activate buzzer based on alert type
        activateBuzzer(alertType);
        
        // Broadcast alert to WebSocket clients
        try {
          const broadcastSuccess = broadcastAlert(alert);
          if (!broadcastSuccess) {
            console.warn('Failed to broadcast alert via WebSocket');
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
      } catch (alertError) {
        console.error('Error creating alert:', alertError);
      }
    }
    
    // Handle automatic pump control if in auto mode
    if (pumpMode === 'auto') {
      // Logic for pump control will be handled by a separate service/route
      const shouldActivatePump = level >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = level <= thresholds.pumpDeactivationLevel;
      
      if (shouldActivatePump) {
        console.log('Auto pump activation recommended');
      } else if (shouldDeactivatePump) {
        console.log('Auto pump deactivation recommended');
      }
    }
    
    // Format respons konsisten untuk sukses
    res.status(201).json({
      success: true,
      message: 'Data level air berhasil disimpan',
      data: {
        waterLevel: waterLevelReading,
        alert: createdAlert ? {
          id: createdAlert._id,
          type: createdAlert.type,
          message: createdAlert.message
        } : null
      }
    });
  } catch (error) {
    console.error('Error recording water level:', error);
    
    // Format respons konsisten untuk error
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan data level air',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/water-level/current
// @desc    Get the most recent water level reading
// @access  Public
router.get('/current', async (req, res) => {
  try {
    const currentLevel = await WaterLevel.findOne()
      .sort({ createdAt: -1 })
      .lean();
    
    if (!currentLevel) {
      res.status(404).json({
        success: false,
        message: 'Tidak ada data level air yang ditemukan',
        data: null
      });
      return;
    }
    
    // Format respons konsisten
    res.json({
      success: true,
      message: 'Data level air terkini berhasil diambil',
      data: currentLevel
    });
  } catch (error) {
    console.error('Error fetching current water level:', error);
    
    // Format respons konsisten untuk error
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data level air terkini',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
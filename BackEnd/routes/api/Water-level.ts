// Letakkan di: BackEnd/routes/api/Water-level.ts

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
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 24;
    
    // Get the most recent readings ordered by timestamp
    const waterLevelData = await WaterLevel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Return in chronological order (oldest first)
    res.json(waterLevelData.reverse());
  } catch (error) {
    console.error('Error fetching water level data:', error);
    res.status(500).json({ message: 'Server error' });
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
      broadcastWaterLevel(waterLevelReading);
    } catch (wsError) {
      console.warn('Failed to broadcast water level via WebSocket:', wsError);
    }
    
    // Get current settings to check against thresholds
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    const { thresholds, notifications, pumpMode } = settings;
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    
    // Check against danger threshold
    if (level >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Water level has reached danger threshold (${level} ${unit || 'cm'})`;
    } 
    // Check against warning threshold
    else if (level >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Water level has reached warning threshold (${level} ${unit || 'cm'})`;
    }
    
    // Create alert if threshold exceeded
    if (alertType) {
      try {
        const alert = new Alert({
          level,
          type: alertType,
          message: alertMessage,
          acknowledged: false,
        });
        
        await alert.save();
        console.log(`Alert created: ${alertType} at level ${level}`);
        
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
      // Logic for pump control will be handled by a separate service/route
      const shouldActivatePump = level >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = level <= thresholds.pumpDeactivationLevel;
      
      if (shouldActivatePump) {
        console.log('Auto pump activation recommended');
      } else if (shouldDeactivatePump) {
        console.log('Auto pump deactivation recommended');
      }
    }
    
    res.status(201).json({
      message: 'Water level data recorded successfully',
      data: waterLevelReading,
      alert: alertType ? { type: alertType, message: alertMessage } : null
    });
  } catch (error) {
    console.error('Error recording water level:', error);
    res.status(500).json({ message: 'Server error' });
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
      res.status(404).json({ message: 'No water level data found' });
      return;
    }
    
    res.json(currentLevel);
  } catch (error) {
    console.error('Error fetching current water level:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
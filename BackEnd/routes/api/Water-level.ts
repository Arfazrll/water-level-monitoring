import express, { Request, Response } from 'express';
import { validateWaterLevelData } from '../../middleware/validate';
import WaterLevel from '../../models/WaterLevel';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import { protect } from '../../middleware/auth';
import { sendAlertEmail } from '../../services/emailService';
import { broadcastWaterLevel, broadcastAlert } from '../../services/wsService';

const router = express.Router();

// @route   GET /api/water-level
// @desc    Get water level data with optional limit
// @access  Public
router.get('/', async (req: Request, res: Response) => {
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
router.post('/', validateWaterLevelData, async (req: Request, res: Response) => {
  try {
    const { level, unit } = req.body;
    
    // Create and save the water level reading
    const waterLevelReading = new WaterLevel({
      level,
      unit: unit || 'cm',
    });
    
    await waterLevelReading.save();
    
    // Broadcast to WebSocket clients
    broadcastWaterLevel(waterLevelReading);
    
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
      const alert = new Alert({
        level,
        type: alertType,
        message: alertMessage,
        acknowledged: false,
      });
      
      await alert.save();
      
      // Broadcast alert to WebSocket clients
      broadcastAlert(alert);
      
      // Send email notification if enabled
      if (notifications.emailEnabled) {
        if ((alertType === 'warning' && notifications.notifyOnWarning) || 
            (alertType === 'danger' && notifications.notifyOnDanger)) {
          await sendAlertEmail(
            notifications.emailAddress,
            `Water Level ${alertType.toUpperCase()} Alert`,
            alertMessage
          );
        }
      }
    }
    
    // Handle automatic pump control if in auto mode
    if (pumpMode === 'auto') {
      // Logic for pump control will be handled by a separate service/route
      // But we'll return the recommendation here
      const shouldActivatePump = level >= thresholds.pumpActivationLevel;
      const shouldDeactivatePump = level <= thresholds.pumpDeactivationLevel;
      
      if (shouldActivatePump) {
        // This information can be used by the pump control service
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
router.get('/current', async (req: Request, res: Response) => {
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
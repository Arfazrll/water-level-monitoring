import express, { Request, Response } from 'express';
import Settings from '../../models/Setting';
import { validateThresholdSettings } from '../../middleware/validate';
import { protect } from '../../middleware/auth';
import { broadcastSettings } from '../../services/wsService';

const router = express.Router();

// @route   GET /api/settings
// @desc    Get current settings
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    // Use findOne instead of calling a static method
    const settings = await Settings.findOne().lean();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    // Return just the threshold settings as expected by the frontend
    res.json(settings.thresholds);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/settings
// @desc    Update threshold settings
// @access  Public (could be secured with auth in production)
router.post('/', validateThresholdSettings, async (req: Request, res: Response) => {
  try {
    const newThresholds = req.body;
    
    // Get current settings or create if not exists
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = new Settings({
        thresholds: newThresholds,
        notifications: {
          emailEnabled: false,
          emailAddress: '',
          notifyOnWarning: true,
          notifyOnDanger: true,
          notifyOnPumpActivation: false
        }
      });
    } else {
      // Update threshold settings
      settings.thresholds = {
        ...settings.thresholds,
        ...newThresholds
      };
      
      // Update lastUpdatedBy if authenticated
      if (req.user) {
        settings.lastUpdatedBy = req.user._id;
      }
    }
    
    await settings.save();
    
    // Broadcast settings to WebSocket clients
    broadcastSettings(settings.thresholds);
    
    res.json(settings.thresholds);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/settings/notifications
// @desc    Get notification settings
// @access  Public (could be secured with auth in production)
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne().lean();
    
    if (!settings) {
      res.status(404).json({ message: 'Settings not found' });
      return;
    }
    
    res.json(settings.notifications);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/settings/notifications
// @desc    Update notification settings
// @access  Public (could be secured with auth in production)
router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { 
      emailEnabled, 
      emailAddress, 
      notifyOnWarning, 
      notifyOnDanger, 
      notifyOnPumpActivation 
    } = req.body;
    
    // Basic validation
    if (emailEnabled && !emailAddress) {
      res.status(400).json({ message: 'Email address is required when email is enabled' });
      return;
    }
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = new Settings({
        thresholds: {
          warning: 50,
          danger: 75,
          pumpActivation: 80
        },
        notifications: {
          emailEnabled: emailEnabled ?? false,
          emailAddress: emailAddress ?? '',
          notifyOnWarning: notifyOnWarning ?? true,
          notifyOnDanger: notifyOnDanger ?? true,
          notifyOnPumpActivation: notifyOnPumpActivation ?? false
        }
      });
    } else {
      // Update notification settings
      settings.notifications = {
        emailEnabled: emailEnabled ?? settings.notifications.emailEnabled,
        emailAddress: emailAddress ?? settings.notifications.emailAddress,
        notifyOnWarning: notifyOnWarning ?? settings.notifications.notifyOnWarning,
        notifyOnDanger: notifyOnDanger ?? settings.notifications.notifyOnDanger,
        notifyOnPumpActivation: notifyOnPumpActivation ?? settings.notifications.notifyOnPumpActivation
      };
    }
    
    await settings.save();
    
    res.json(settings.notifications);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
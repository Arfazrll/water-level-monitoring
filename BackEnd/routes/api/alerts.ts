import express, { Request, Response } from 'express';
import Alert from '../../models/Alert';
import { protect } from '../../middleware/auth';

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get alerts with optional filtering
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const acknowledgedParam = req.query.acknowledged as string;
    
    // Build filter
    const filter: any = {};
    
    if (type === 'warning' || type === 'danger') {
      filter.type = type;
    }
    
    if (acknowledgedParam === 'true') {
      filter.acknowledged = true;
    } else if (acknowledgedParam === 'false') {
      filter.acknowledged = false;
    }
    
    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/alerts
// @desc    Create a new alert (usually triggered by water level service)
// @access  Private
router.post('/', protect, async (req: Request, res: Response) => {
  try {
    const { level, type, message } = req.body;
    
    if (!level || !type || !message) {
      res.status(400).json({ message: 'Invalid alert data' });
      return; // Return void, not the response object
    }
    
    const alert = new Alert({
      level,
      type,
      message,
      acknowledged: false,
    });
    
    await alert.save();
    
    res.status(201).json({
      message: 'Alert created successfully',
      data: alert,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Public (could be secured with auth in production)
router.put('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    
    const alert = await Alert.findById(alertId);
    
    if (!alert) {
      res.status(404).json({ message: 'Alert not found' });
      return; // Return void, not the response object
    }
    
    alert.acknowledged = true;
    await alert.save();
    
    res.json({
      message: 'Alert acknowledged successfully',
      id: alertId,
      acknowledged: true,
    });
  } catch (error) {
    console.error(`Error acknowledging alert ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
// BackEnd/routes/api/reports.ts (file baru)
import express, { Request, Response } from 'express';
import Settings from '../../models/Setting';
import Alert from '../../models/Alert';
import WaterLevel from '../../models/WaterLevel';
import { sendSystemStatusReport } from '../../services/emailService';

const router = express.Router();

// @route   POST /api/reports/weekly-status
// @desc    Generate and send weekly status report
// @access  Public (bisa diamankan dengan auth)
router.post('/weekly-status', async (req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne();
    
    if (!settings || !settings.notifications.emailEnabled || !settings.notifications.emailAddress) {
      res.status(400).json({ 
        success: false,
        message: 'Email notifications not configured' 
      });
      return;
    }
    
    // Hitung statistik
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    
    const waterLevels = await WaterLevel.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
    
    const alerts = await Alert.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    let waterLevelStats;
    if (waterLevels.length > 0) {
      const levels = waterLevels.map(wl => wl.level);
      waterLevelStats = {
        maximum: Math.max(...levels),
        minimum: Math.min(...levels),
        average: levels.reduce((a, b) => a + b, 0) / levels.length,
        unit: waterLevels[0].unit
      };
    }
    
    const alertHistory = {
      warningCount: alerts.filter(a => a.type === 'warning').length,
      dangerCount: alerts.filter(a => a.type === 'danger').length,
      unacknowledgedCount: alerts.filter(a => !a.acknowledged).length
    };
    
    // Kirim report
    const success = await sendSystemStatusReport(
      settings.notifications.emailAddress,
      startDate.toLocaleDateString(),
      endDate.toLocaleDateString(),
      waterLevelStats,
      alertHistory,
      {
        online: true,
        deviceName: process.env.DEVICE_NAME || 'Water Monitor',
        uptime: 'N/A'
      }
    );
    
    if (success) {
      res.json({
        success: true,
        message: 'Weekly status report sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send weekly status report'
      });
    }
  } catch (error) {
    console.error('Error generating weekly status report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weekly status report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
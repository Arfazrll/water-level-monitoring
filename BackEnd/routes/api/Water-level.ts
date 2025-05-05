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
    
    const data = await WaterLevel.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    res.json({
      success: true,
      message: 'Data level air berhasil diambil',
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching water level data:', error);
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data level air',
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
    
    const waterLevelReading = new WaterLevel({
      level,
      unit: unit || 'cm',
    });
    
    await waterLevelReading.save();
    
    try {
      broadcastWaterLevel(waterLevelReading);
    } catch (wsError) {
      console.warn('Error broadcasting water level:', wsError);
    }
    
    const settings = await Settings.findOne();
    
    if (!settings) {
      res.status(201).json({
        success: true,
        message: 'Data level air berhasil disimpan, pengaturan belum dibuat',
        data: { waterLevel: waterLevelReading, alert: null }
      });
      return;
    }
    
    const { thresholds, notifications } = settings;
    
    let alertType: 'warning' | 'danger' | null = null;
    let alertMessage = '';
    
    if (level >= thresholds.dangerLevel) {
      alertType = 'danger';
      alertMessage = `Level air telah mencapai ambang BAHAYA (${level} ${unit || 'cm'})`;
    } 
    else if (level >= thresholds.warningLevel) {
      alertType = 'warning';
      alertMessage = `Level air telah mencapai ambang PERINGATAN (${level} ${unit || 'cm'})`;
    }
    
    let createdAlert = null;
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
            level,
            type: alertType,
            message: alertMessage,
            acknowledged: false,
          });
          
          await alert.save();
          createdAlert = alert;
          
          activateBuzzer(alertType);
          
          try {
            broadcastAlert(alert);
          } catch (wsError) {
            console.warn('Error broadcasting alert:', wsError);
          }
          
          if (notifications.emailEnabled) {
            if ((alertType === 'warning' && notifications.notifyOnWarning) || 
                (alertType === 'danger' && notifications.notifyOnDanger)) {
              try {
                await sendAlertEmail(
                  notifications.emailAddress,
                  `Peringatan Level Air ${alertType.toUpperCase()}`,
                  alertMessage
                );
              } catch (emailError) {
                console.error('Failed to send alert email:', emailError);
              }
            }
          }
        }
      } catch (alertError) {
        console.error('Error creating alert:', alertError);
      }
    }
    
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
    
    res.status(500).json({
      success: false,
      message: 'Gagal menyimpan data level air',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
// Letakkan di: BackEnd/routes/api/alerts.ts

import express, { Request, Response } from 'express';
import Alert from '../../models/Alert';
import { protect } from '../../middleware/auth';
import { deactivateBuzzer } from '../../services/sensorService';
import { broadcastAlert } from '../../services/wsService';

const router = express.Router();

// @route   GET /api/alerts
// @desc    Ambil peringatan dengan filtering opsional
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
    console.error('Error mengambil peringatan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/alerts
// @desc    Buat peringatan baru (biasanya dipicu oleh layanan level air)
// @access  Private
router.post('/', protect, async (req: Request, res: Response) => {
  try {
    const { level, type, message } = req.body;
    
    if (!level || !type || !message) {
      res.status(400).json({ message: 'Data peringatan tidak valid' });
      return;
    }
    
    const alert = new Alert({
      level,
      type,
      message,
      acknowledged: false,
    });
    
    await alert.save();
    
    // Broadcast peringatan ke klien WebSocket
    try {
      broadcastAlert(alert);
    } catch (wsError) {
      console.warn('Gagal broadcast peringatan via WebSocket:', wsError);
    }
    
    res.status(201).json({
      message: 'Peringatan berhasil dibuat',
      data: alert,
    });
  } catch (error) {
    console.error('Error membuat peringatan:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Tandai peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.put('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    
    const alert = await Alert.findById(alertId);
    
    if (!alert) {
      res.status(404).json({ message: 'Peringatan tidak ditemukan' });
      return;
    }
    
    alert.acknowledged = true;
    await alert.save();
    
    // Nonaktifkan buzzer ketika peringatan diakui
    deactivateBuzzer();
    
    // Broadcast status peringatan yang diperbarui
    try {
      broadcastAlert(alert);
    } catch (wsError) {
      console.warn('Gagal broadcast update peringatan via WebSocket:', wsError);
    }
    
    res.json({
      message: 'Peringatan berhasil ditandai sebagai diketahui',
      id: alertId,
      acknowledged: true,
    });
  } catch (error) {
    console.error(`Error menandai peringatan ${req.params.id}:`, error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/alerts/acknowledge-all
// @desc    Tandai semua peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.post('/acknowledge-all', function(req: Request, res: Response) {
  (async () => {
    try {
      // Temukan semua peringatan yang belum diketahui
      const unacknowledgedAlerts = await Alert.find({ acknowledged: false });
      
      if (unacknowledgedAlerts.length === 0) {
        return res.json({ message: 'Tidak ada peringatan yang perlu ditandai', count: 0 });
      }
      
      // Perbarui semua menjadi diketahui
      await Alert.updateMany(
        { acknowledged: false },
        { acknowledged: true }
      );
      
      // Nonaktifkan buzzer karena semua peringatan telah diakui
      deactivateBuzzer();
      
      // Broadcast bahwa semua peringatan diakui
      try {
        // Ambil peringatan yang diperbarui
        const updatedAlerts = await Alert.find({ _id: { $in: unacknowledgedAlerts.map(a => a._id) } });
        
        // Broadcast setiap peringatan yang diperbarui
        for (const alert of updatedAlerts) {
          broadcastAlert(alert);
        }
      } catch (wsError) {
        console.warn('Gagal broadcast update peringatan via WebSocket:', wsError);
      }
      
      res.json({
        message: 'Semua peringatan berhasil ditandai sebagai diketahui',
        count: unacknowledgedAlerts.length
      });
    } catch (error) {
      console.error('Error menandai semua peringatan:', error);
      res.status(500).json({ message: 'Server error' });
    }
  })();
});

export default router;
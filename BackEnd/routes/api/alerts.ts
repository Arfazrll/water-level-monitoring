// BackEnd/routes/api/alerts.ts

import express, { Request, Response, NextFunction, Router } from 'express';
import Alert from '../../models/Alert';
import { protect } from '../../middleware/auth';
import { deactivateBuzzer } from '../../services/sensorService';
import { broadcastAlert } from '../../services/wsService';

const router: Router = express.Router();

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
    
    // Format respons yang konsisten
    res.json({
      success: true,
      message: 'Data peringatan berhasil diambil',
      data: alerts
    });
  } catch (error) {
    console.error('Error mengambil peringatan:', error);
    
    // Format error yang konsisten
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengambil data peringatan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/alerts
// @desc    Buat peringatan baru (biasanya dipicu oleh layanan level air)
// @access  Private
router.post('/', protect, async (req: Request, res: Response) => {
  try {
    const { level, type, message } = req.body;
    
    // Validasi input
    if (!level || typeof level !== 'number') {
      res.status(400).json({ 
        success: false, 
        message: 'Level air diperlukan dan harus berupa angka',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (!type || (type !== 'warning' && type !== 'danger')) {
      res.status(400).json({ 
        success: false, 
        message: 'Tipe peringatan diperlukan dan harus "warning" atau "danger"',
        error: 'VALIDATION_ERROR'
      });
      return;
    }
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ 
        success: false, 
        message: 'Pesan peringatan diperlukan dan harus berupa string',
        error: 'VALIDATION_ERROR'
      });
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
      const broadcastSuccess = broadcastAlert(alert);
      if (!broadcastSuccess) {
        console.warn('Gagal broadcast peringatan via WebSocket');
      }
    } catch (wsError) {
      console.warn('Exception saat broadcast peringatan via WebSocket:', wsError);
    }
    
    // Format respons sukses yang konsisten
    res.status(201).json({
      success: true,
      message: 'Peringatan berhasil dibuat',
      data: alert
    });
  } catch (error) {
    console.error('Error membuat peringatan:', error);
    
    // Format error yang konsisten
    res.status(500).json({ 
      success: false, 
      message: 'Gagal membuat peringatan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Tandai peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.put('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    
    // Validasi ID - pastikan tidak undefined dan memiliki format yang benar
    if (!alertId || alertId === 'undefined' || alertId === 'null') {
      res.status(400).json({ 
        success: false, 
        message: 'ID peringatan tidak valid',
        error: 'VALIDATION_ERROR'
      });
      return;
    }

    // Log untuk debug
    console.log(`Mencoba mengakui peringatan dengan ID: ${alertId}`);
    
    const alert = await Alert.findById(alertId);
    
    if (!alert) {
      console.log(`Peringatan dengan ID ${alertId} tidak ditemukan`);
      
      res.status(404).json({ 
        success: false, 
        message: 'Peringatan tidak ditemukan',
        error: 'NOT_FOUND'
      }); 
      return;
    }
    
    // Jika sudah diakui sebelumnya, cukup beri tahu bahwa berhasil
    if (alert.acknowledged) {
      res.json({
        success: true,
        message: 'Peringatan sudah diakui sebelumnya',
        data: {
          id: alertId,
          acknowledged: true
        }
      });
      return;
    }
    
    alert.acknowledged = true;
    await alert.save();
    
    // Cek jika semua peringatan telah diakui dan matikan buzzer jika ya
    const unacknowledgedAlerts = await Alert.countDocuments({ acknowledged: false });
    
    if (unacknowledgedAlerts === 0) {
      deactivateBuzzer();
      console.log('Semua peringatan diakui, buzzer dinonaktifkan');
    }
    
    // Broadcast status peringatan yang diperbarui
    try {
      const broadcastSuccess = broadcastAlert(alert);
      if (!broadcastSuccess) {
        console.warn('Gagal broadcast update peringatan via WebSocket');
      }
    } catch (wsError) {
      console.warn('Exception saat broadcast update peringatan via WebSocket:', wsError);
    }
    
    // Format respons sukses yang konsisten
    res.json({
      success: true,
      message: 'Peringatan berhasil ditandai sebagai diketahui',
      data: {
        id: alertId,
        acknowledged: true
      }
    });
  } catch (error) {
    console.error(`Error menandai peringatan ${req.params.id}:`, error);
    
    // Format error yang konsisten
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menandai peringatan sebagai diketahui',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/alerts/acknowledge-all
// @desc    Tandai semua peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.post('/acknowledge-all', async (req: Request, res: Response) => {
  try {
    // Temukan semua peringatan yang belum diketahui
    const unacknowledgedAlerts = await Alert.find({ acknowledged: false });
    
    if (unacknowledgedAlerts.length === 0) {
      res.json({
        success: true, 
        message: 'Tidak ada peringatan yang perlu ditandai', 
        data: { count: 0 }
      });
      return;
    }
    
    // Perbarui semua menjadi diketahui
    const updateResult = await Alert.updateMany(
      { acknowledged: false },
      { acknowledged: true }
    );
    
    // Nonaktifkan buzzer karena semua peringatan telah diakui
    deactivateBuzzer();
    
    // Broadcast bahwa semua peringatan diakui
    try {
      // Ambil peringatan yang diperbarui
      const updatedAlerts = await Alert.find({ 
        _id: { $in: unacknowledgedAlerts.map(a => a._id) } 
      });
      
      // Broadcast setiap peringatan yang diperbarui
      let broadcastSuccessCount = 0;
      
      for (const alert of updatedAlerts) {
        const success = broadcastAlert(alert);
        if (success) broadcastSuccessCount++;
      }
      
      console.log(`${broadcastSuccessCount} dari ${updatedAlerts.length} peringatan berhasil disiarkan`);
    } catch (wsError) {
      console.warn('Gagal broadcast update peringatan via WebSocket:', wsError);
    }
    
    // Format respons sukses yang konsisten
    res.json({
      success: true,
      message: 'Semua peringatan berhasil ditandai sebagai diketahui',
      data: {
        count: unacknowledgedAlerts.length,
        updateResult: {
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount
        }
      }
    });
  } catch (error) {
    console.error('Error menandai semua peringatan:', error);
    
    // Format error yang konsisten
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menandai semua peringatan',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
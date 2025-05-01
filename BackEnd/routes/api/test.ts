// Letakkan di: BackEnd/routes/api/test.ts

import express, { Request, Response, NextFunction } from 'express';
import { activateBuzzer, deactivateBuzzer, testBuzzer, getBuzzerStatus } from '../../services/sensorService';

const router = express.Router();

// @route   GET /api/test/buzzer/status
// @desc    Dapatkan status buzzer
// @access  Public
const getBuzzerStatusHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const isActive = getBuzzerStatus();
    res.json({ 
      status: isActive ? 'active' : 'inactive',
      isActive 
    });
  } catch (error) {
    console.error('Error mendapatkan status buzzer:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/test/buzzer
// @desc    Uji buzzer
// @access  Public (sebaiknya diamankan di production)
const testBuzzerHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { activate, duration = 3000 } = req.body;
    
    if (activate === undefined) {
      res.status(400).json({ message: 'Parameter activate diperlukan' });
      return;
    }
    
    if (activate) {
      // Gunakan durasi pengujian dari request atau default 3 detik
      if (duration && typeof duration === 'number') {
        // Tes buzzer dengan durasi tertentu
        testBuzzer(duration).then(() => {
          res.json({ 
            success: true, 
            message: `Buzzer diaktifkan untuk ${duration}ms dan dinonaktifkan secara otomatis` 
          });
        }).catch(error => {
          console.error('Error pengujian buzzer:', error);
          res.status(500).json({ message: 'Server error' });
        });
      } else {
        // Aktifkan buzzer tanpa timeout otomatis
        activateBuzzer('warning');
        res.json({ 
          success: true, 
          message: 'Buzzer diaktifkan' 
        });
      }
    } else {
      // Nonaktifkan buzzer
      deactivateBuzzer();
      res.json({ 
        success: true, 
        message: 'Buzzer dinonaktifkan' 
      });
    }
  } catch (error) {
    console.error('Error pengujian buzzer:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @route   POST /api/test/sensor-calibration
// @desc    Kalibrasi sensor level air
// @access  Public (sebaiknya diamankan di production)
const sensorCalibrationHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { minLevel, maxLevel } = req.body;
    
    // Validasi input
    if (minLevel === undefined || maxLevel === undefined) {
      res.status(400).json({ message: 'Parameter minLevel dan maxLevel diperlukan' });
      return;
    }
    
    if (typeof minLevel !== 'number' || typeof maxLevel !== 'number') {
      res.status(400).json({ message: 'minLevel dan maxLevel harus berupa angka' });
      return;
    }
    
    if (minLevel >= maxLevel) {
      res.status(400).json({ message: 'minLevel harus lebih kecil dari maxLevel' });
      return;
    }
    
    // Simulasi kalibrasi sensor
    console.log(`[MOCK] Sensor calibrated: min=${minLevel}, max=${maxLevel}`);
    
    res.json({ 
      success: true, 
      message: 'Sensor berhasil dikalibrasi',
      calibration: { minLevel, maxLevel }
    });
  } catch (error) {
    console.error('Error kalibrasi sensor:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mendaftarkan semua route
router.get('/buzzer/status', getBuzzerStatusHandler);
router.post('/buzzer', testBuzzerHandler);
router.post('/sensor-calibration', sensorCalibrationHandler);

export default router;
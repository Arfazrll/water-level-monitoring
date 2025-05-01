"use strict";
// Letakkan di: BackEnd/routes/api/test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sensorService_1 = require("../../services/sensorService");
const router = express_1.default.Router();
// @route   GET /api/test/buzzer/status
// @desc    Dapatkan status buzzer
// @access  Public
const getBuzzerStatusHandler = (req, res, next) => {
    try {
        const isActive = (0, sensorService_1.getBuzzerStatus)();
        res.json({
            status: isActive ? 'active' : 'inactive',
            isActive
        });
    }
    catch (error) {
        console.error('Error mendapatkan status buzzer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// @route   POST /api/test/buzzer
// @desc    Uji buzzer
// @access  Public (sebaiknya diamankan di production)
const testBuzzerHandler = (req, res, next) => {
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
                (0, sensorService_1.testBuzzer)(duration).then(() => {
                    res.json({
                        success: true,
                        message: `Buzzer diaktifkan untuk ${duration}ms dan dinonaktifkan secara otomatis`
                    });
                }).catch(error => {
                    console.error('Error pengujian buzzer:', error);
                    res.status(500).json({ message: 'Server error' });
                });
            }
            else {
                // Aktifkan buzzer tanpa timeout otomatis
                (0, sensorService_1.activateBuzzer)('warning');
                res.json({
                    success: true,
                    message: 'Buzzer diaktifkan'
                });
            }
        }
        else {
            // Nonaktifkan buzzer
            (0, sensorService_1.deactivateBuzzer)();
            res.json({
                success: true,
                message: 'Buzzer dinonaktifkan'
            });
        }
    }
    catch (error) {
        console.error('Error pengujian buzzer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// @route   POST /api/test/sensor-calibration
// @desc    Kalibrasi sensor level air
// @access  Public (sebaiknya diamankan di production)
const sensorCalibrationHandler = (req, res, next) => {
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
    }
    catch (error) {
        console.error('Error kalibrasi sensor:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// Mendaftarkan semua route
router.get('/buzzer/status', getBuzzerStatusHandler);
router.post('/buzzer', testBuzzerHandler);
router.post('/sensor-calibration', sensorCalibrationHandler);
exports.default = router;
//# sourceMappingURL=test.js.map
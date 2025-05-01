"use strict";
// BackEnd/routes/api/alerts.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Alert_1 = __importDefault(require("../../models/Alert"));
const auth_1 = require("../../middleware/auth");
const sensorService_1 = require("../../services/sensorService");
const wsService_1 = require("../../services/wsService");
const router = express_1.default.Router();
// @route   GET /api/alerts
// @desc    Ambil peringatan dengan filtering opsional
// @access  Public
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const type = req.query.type;
        const acknowledgedParam = req.query.acknowledged;
        // Build filter
        const filter = {};
        if (type === 'warning' || type === 'danger') {
            filter.type = type;
        }
        if (acknowledgedParam === 'true') {
            filter.acknowledged = true;
        }
        else if (acknowledgedParam === 'false') {
            filter.acknowledged = false;
        }
        const alerts = yield Alert_1.default.find(filter)
            .sort({ createdAt: -1 })
            .lean();
        res.json(alerts);
    }
    catch (error) {
        console.error('Error mengambil peringatan:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/alerts
// @desc    Buat peringatan baru (biasanya dipicu oleh layanan level air)
// @access  Private
router.post('/', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { level, type, message } = req.body;
        if (!level || !type || !message) {
            res.status(400).json({ message: 'Data peringatan tidak valid' });
            return;
        }
        const alert = new Alert_1.default({
            level,
            type,
            message,
            acknowledged: false,
        });
        yield alert.save();
        // Broadcast peringatan ke klien WebSocket
        try {
            (0, wsService_1.broadcastAlert)(alert);
        }
        catch (wsError) {
            console.warn('Gagal broadcast peringatan via WebSocket:', wsError);
        }
        res.status(201).json({
            message: 'Peringatan berhasil dibuat',
            data: alert,
        });
    }
    catch (error) {
        console.error('Error membuat peringatan:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   PUT /api/alerts/:id/acknowledge
// @desc    Tandai peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.put('/:id/acknowledge', (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const alertId = req.params.id;
            // Validasi ID - pastikan tidak undefined dan memiliki format yang benar
            if (!alertId || alertId === 'undefined' || alertId === 'null') {
                return res.status(400).json({ message: 'ID peringatan tidak valid' });
            }
            // Log untuk debug
            console.log(`Mencoba mengakui peringatan dengan ID: ${alertId}`);
            const alert = yield Alert_1.default.findById(alertId);
            if (!alert) {
                console.log(`Peringatan dengan ID ${alertId} tidak ditemukan`);
                return res.status(404).json({ message: 'Peringatan tidak ditemukan' });
            }
            alert.acknowledged = true;
            yield alert.save();
            // Nonaktifkan buzzer ketika peringatan diakui
            (0, sensorService_1.deactivateBuzzer)();
            // Broadcast status peringatan yang diperbarui
            try {
                (0, wsService_1.broadcastAlert)(alert);
            }
            catch (wsError) {
                console.warn('Gagal broadcast update peringatan via WebSocket:', wsError);
            }
            res.json({
                message: 'Peringatan berhasil ditandai sebagai diketahui',
                id: alertId,
                acknowledged: true,
            });
        }
        catch (error) {
            console.error(`Error menandai peringatan ${req.params.id}:`, error);
            res.status(500).json({ message: 'Server error' });
        }
    }))();
});
// @route   POST /api/alerts/acknowledge-all
// @desc    Tandai semua peringatan sebagai diketahui
// @access  Public (sebaiknya diamankan dengan auth di production)
router.post('/acknowledge-all', (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Temukan semua peringatan yang belum diketahui
            const unacknowledgedAlerts = yield Alert_1.default.find({ acknowledged: false });
            if (unacknowledgedAlerts.length === 0) {
                return res.json({ message: 'Tidak ada peringatan yang perlu ditandai', count: 0 });
            }
            // Perbarui semua menjadi diketahui
            yield Alert_1.default.updateMany({ acknowledged: false }, { acknowledged: true });
            // Nonaktifkan buzzer karena semua peringatan telah diakui
            (0, sensorService_1.deactivateBuzzer)();
            // Broadcast bahwa semua peringatan diakui
            try {
                // Ambil peringatan yang diperbarui
                const updatedAlerts = yield Alert_1.default.find({ _id: { $in: unacknowledgedAlerts.map(a => a._id) } });
                // Broadcast setiap peringatan yang diperbarui
                for (const alert of updatedAlerts) {
                    (0, wsService_1.broadcastAlert)(alert);
                }
            }
            catch (wsError) {
                console.warn('Gagal broadcast update peringatan via WebSocket:', wsError);
            }
            res.json({
                message: 'Semua peringatan berhasil ditandai sebagai diketahui',
                count: unacknowledgedAlerts.length
            });
        }
        catch (error) {
            console.error('Error menandai semua peringatan:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }))();
});
exports.default = router;
//# sourceMappingURL=alerts.js.map
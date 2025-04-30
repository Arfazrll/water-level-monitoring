"use strict";
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
const router = express_1.default.Router();
// @route   GET /api/alerts
// @desc    Get alerts with optional filtering
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
        console.error('Error fetching alerts:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/alerts
// @desc    Create a new alert (usually triggered by water level service)
// @access  Private
router.post('/', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { level, type, message } = req.body;
        if (!level || !type || !message) {
            res.status(400).json({ message: 'Invalid alert data' });
            return; // Return void, not the response object
        }
        const alert = new Alert_1.default({
            level,
            type,
            message,
            acknowledged: false,
        });
        yield alert.save();
        res.status(201).json({
            message: 'Alert created successfully',
            data: alert,
        });
    }
    catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   PUT /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Public (could be secured with auth in production)
router.put('/:id/acknowledge', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const alertId = req.params.id;
        const alert = yield Alert_1.default.findById(alertId);
        if (!alert) {
            res.status(404).json({ message: 'Alert not found' });
            return; // Return void, not the response object
        }
        alert.acknowledged = true;
        yield alert.save();
        res.json({
            message: 'Alert acknowledged successfully',
            id: alertId,
            acknowledged: true,
        });
    }
    catch (error) {
        console.error(`Error acknowledging alert ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=alerts.js.map
"use strict";
// Letakkan di: BackEnd/routes/api/Water-level.ts
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
const validate_1 = require("../../middleware/validate");
const WaterLevel_1 = __importDefault(require("../../models/WaterLevel"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const Alert_1 = __importDefault(require("../../models/Alert"));
const emailService_1 = require("../../services/emailService");
const wsService_1 = require("../../services/wsService");
const sensorService_1 = require("../../services/sensorService");
const router = express_1.default.Router();
// @route   GET /api/water-level
// @desc    Get water level data with optional limit
// @access  Public
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 24;
        // Get the most recent readings ordered by timestamp
        const waterLevelData = yield WaterLevel_1.default.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        // Return in chronological order (oldest first)
        res.json(waterLevelData.reverse());
    }
    catch (error) {
        console.error('Error fetching water level data:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/water-level
// @desc    Add water level reading and check thresholds
// @access  Private (in production) / Public (for testing)
router.post('/', validate_1.validateWaterLevelData, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { level, unit } = req.body;
        // Create and save the water level reading
        const waterLevelReading = new WaterLevel_1.default({
            level,
            unit: unit || 'cm',
        });
        yield waterLevelReading.save();
        // Broadcast to WebSocket clients
        try {
            (0, wsService_1.broadcastWaterLevel)(waterLevelReading);
        }
        catch (wsError) {
            console.warn('Failed to broadcast water level via WebSocket:', wsError);
        }
        // Get current settings to check against thresholds
        const settings = yield Setting_1.default.findOne();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        const { thresholds, notifications, pumpMode } = settings;
        let alertType = null;
        let alertMessage = '';
        // Check against danger threshold
        if (level >= thresholds.dangerLevel) {
            alertType = 'danger';
            alertMessage = `Water level has reached danger threshold (${level} ${unit || 'cm'})`;
        }
        // Check against warning threshold
        else if (level >= thresholds.warningLevel) {
            alertType = 'warning';
            alertMessage = `Water level has reached warning threshold (${level} ${unit || 'cm'})`;
        }
        // Create alert if threshold exceeded
        if (alertType) {
            try {
                const alert = new Alert_1.default({
                    level,
                    type: alertType,
                    message: alertMessage,
                    acknowledged: false,
                });
                yield alert.save();
                console.log(`Alert created: ${alertType} at level ${level}`);
                // Activate buzzer based on alert type
                (0, sensorService_1.activateBuzzer)(alertType);
                // Broadcast alert to WebSocket clients
                try {
                    (0, wsService_1.broadcastAlert)(alert);
                }
                catch (wsError) {
                    console.warn('Failed to broadcast alert via WebSocket:', wsError);
                }
                // Send email notification if enabled
                if (notifications.emailEnabled) {
                    if ((alertType === 'warning' && notifications.notifyOnWarning) ||
                        (alertType === 'danger' && notifications.notifyOnDanger)) {
                        try {
                            yield (0, emailService_1.sendAlertEmail)(notifications.emailAddress, `Water Level ${alertType.toUpperCase()} Alert`, alertMessage);
                            console.log(`Alert email sent to ${notifications.emailAddress}`);
                        }
                        catch (emailError) {
                            console.error('Failed to send alert email:', emailError);
                        }
                    }
                }
            }
            catch (alertError) {
                console.error('Error creating alert:', alertError);
            }
        }
        // Handle automatic pump control if in auto mode
        if (pumpMode === 'auto') {
            // Logic for pump control will be handled by a separate service/route
            const shouldActivatePump = level >= thresholds.pumpActivationLevel;
            const shouldDeactivatePump = level <= thresholds.pumpDeactivationLevel;
            if (shouldActivatePump) {
                console.log('Auto pump activation recommended');
            }
            else if (shouldDeactivatePump) {
                console.log('Auto pump deactivation recommended');
            }
        }
        res.status(201).json({
            message: 'Water level data recorded successfully',
            data: waterLevelReading,
            alert: alertType ? { type: alertType, message: alertMessage } : null
        });
    }
    catch (error) {
        console.error('Error recording water level:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   GET /api/water-level/current
// @desc    Get the most recent water level reading
// @access  Public
router.get('/current', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentLevel = yield WaterLevel_1.default.findOne()
            .sort({ createdAt: -1 })
            .lean();
        if (!currentLevel) {
            res.status(404).json({ message: 'No water level data found' });
            return;
        }
        res.json(currentLevel);
    }
    catch (error) {
        console.error('Error fetching current water level:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=Water-level.js.map
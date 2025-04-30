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
const PumpLog_1 = __importDefault(require("../../models/PumpLog"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const WaterLevel_1 = __importDefault(require("../../models/WaterLevel"));
const wsService_1 = require("../../services/wsService");
const router = express_1.default.Router();
// Store current pump state in memory (would use Redis in production)
let pumpState = {
    isActive: false,
    mode: 'auto',
    lastActivated: null
};
// @route   GET /api/pump/status
// @desc    Get current pump status
// @access  Public
router.get('/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get the settings to return the current mode
        const settings = yield Setting_1.default.findOne().lean();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        // Get the latest pump log entry to determine current state
        const latestPumpLog = yield PumpLog_1.default.findOne()
            .sort({ createdAt: -1 })
            .lean();
        // Update pump state from database
        if (latestPumpLog) {
            pumpState.isActive = latestPumpLog.isActive;
            pumpState.mode = settings.pumpMode;
            pumpState.lastActivated = latestPumpLog.startTime ? latestPumpLog.startTime.toISOString() : null;
        }
        res.json(pumpState);
    }
    catch (error) {
        console.error('Error fetching pump status:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/pump/control
// @desc    Control the pump (turn on/off)
// @access  Public (could be secured with auth in production)
router.post('/control', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { isActive } = req.body;
        if (isActive === undefined || typeof isActive !== 'boolean') {
            res.status(400).json({ message: 'Invalid pump control data' });
            return;
        }
        // Get current settings to check if manual control is allowed
        const settings = yield Setting_1.default.findOne();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        if (settings.pumpMode === 'auto' && isActive !== pumpState.isActive) {
            res.status(400).json({
                message: 'Cannot manually control pump in auto mode',
                currentMode: 'auto'
            });
            return;
        }
        // If turning pump on and it's not already on
        if (isActive && !pumpState.isActive) {
            // Get current water level
            const currentLevel = yield WaterLevel_1.default.findOne().sort({ createdAt: -1 });
            // Create a new pump log entry
            const pumpLog = new PumpLog_1.default({
                isActive: true,
                startTime: new Date(),
                activatedBy: settings.pumpMode,
                waterLevelAtActivation: currentLevel ? currentLevel.level : undefined
            });
            yield pumpLog.save();
            // Update in-memory state
            pumpState = {
                isActive: true,
                mode: settings.pumpMode,
                lastActivated: new Date().toISOString()
            };
        }
        // If turning pump off and it's currently on
        else if (!isActive && pumpState.isActive) {
            // Find the latest active pump log entry
            const latestActivePumpLog = yield PumpLog_1.default.findOne({
                isActive: true,
                endTime: { $exists: false }
            }).sort({ startTime: -1 });
            if (latestActivePumpLog && latestActivePumpLog.startTime) {
                // Update the pump log entry
                const now = new Date();
                const duration = (now.getTime() - latestActivePumpLog.startTime.getTime()) / 1000; // in seconds
                latestActivePumpLog.isActive = false;
                latestActivePumpLog.endTime = now;
                latestActivePumpLog.duration = duration;
                yield latestActivePumpLog.save();
            }
            // Create a deactivation log
            const pumpLog = new PumpLog_1.default({
                isActive: false,
                activatedBy: settings.pumpMode
            });
            yield pumpLog.save();
            // Update in-memory state
            pumpState = {
                isActive: false,
                mode: settings.pumpMode,
                lastActivated: pumpState.lastActivated
            };
        }
        // Broadcast the pump status to WebSocket clients
        (0, wsService_1.broadcastPumpStatus)(pumpState);
        res.json(pumpState);
    }
    catch (error) {
        console.error('Error controlling pump:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/pump/mode
// @desc    Set pump mode (auto/manual)
// @access  Public (could be secured with auth in production)
router.post('/mode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mode } = req.body;
        if (!mode || (mode !== 'auto' && mode !== 'manual')) {
            res.status(400).json({ message: 'Invalid pump mode. Must be "auto" or "manual"' });
            return;
        }
        // Update settings
        const settings = yield Setting_1.default.findOne();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        settings.pumpMode = mode;
        yield settings.save();
        // Update in-memory state
        pumpState.mode = mode;
        // Handle auto mode activation logic
        if (mode === 'auto') {
            // Get the latest water level
            const currentLevel = yield WaterLevel_1.default.findOne().sort({ createdAt: -1 });
            if (currentLevel) {
                // Check if pump should be activated based on current level
                const shouldActivate = currentLevel.level >= settings.thresholds.pumpActivationLevel;
                const shouldDeactivate = currentLevel.level <= settings.thresholds.pumpDeactivationLevel;
                // If water level is above activation threshold and pump is not active
                if (shouldActivate && !pumpState.isActive) {
                    // Create a new pump log entry
                    const pumpLog = new PumpLog_1.default({
                        isActive: true,
                        startTime: new Date(),
                        activatedBy: 'auto',
                        waterLevelAtActivation: currentLevel.level
                    });
                    yield pumpLog.save();
                    // Update in-memory state
                    pumpState = {
                        isActive: true,
                        mode: 'auto',
                        lastActivated: new Date().toISOString()
                    };
                    // Broadcast the pump status
                    (0, wsService_1.broadcastPumpStatus)(pumpState);
                }
                // If water level is below deactivation threshold and pump is active
                else if (shouldDeactivate && pumpState.isActive) {
                    // Find the latest active pump log entry
                    const latestActivePumpLog = yield PumpLog_1.default.findOne({
                        isActive: true,
                        endTime: { $exists: false }
                    }).sort({ startTime: -1 });
                    if (latestActivePumpLog && latestActivePumpLog.startTime) {
                        // Update the pump log entry
                        const now = new Date();
                        const duration = (now.getTime() - latestActivePumpLog.startTime.getTime()) / 1000; // in seconds
                        latestActivePumpLog.isActive = false;
                        latestActivePumpLog.endTime = now;
                        latestActivePumpLog.duration = duration;
                        yield latestActivePumpLog.save();
                    }
                    // Create a deactivation log
                    const pumpLog = new PumpLog_1.default({
                        isActive: false,
                        activatedBy: 'auto'
                    });
                    yield pumpLog.save();
                    // Update in-memory state
                    pumpState = {
                        isActive: false,
                        mode: 'auto',
                        lastActivated: pumpState.lastActivated
                    };
                    // Broadcast the pump status
                    (0, wsService_1.broadcastPumpStatus)(pumpState);
                }
            }
        }
        res.json({ mode: pumpState.mode });
    }
    catch (error) {
        console.error('Error setting pump mode:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=pump.js.map
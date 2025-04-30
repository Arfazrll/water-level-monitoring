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
const Setting_1 = __importDefault(require("../../models/Setting"));
const validate_1 = require("../../middleware/validate");
const wsService_1 = require("../../services/wsService");
const router = express_1.default.Router();
// @route   GET /api/settings
// @desc    Get current settings
// @access  Public
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Use findOne instead of calling a static method
        // We'll get the first (and only) settings document
        const settings = yield Setting_1.default.findOne().lean();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        // Return just the threshold settings as expected by the frontend
        res.json(settings.thresholds);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/settings
// @desc    Update threshold settings
// @access  Public (could be secured with auth in production)
router.post('/', validate_1.validateThresholdSettings, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newThresholds = req.body;
        // Get current settings or create if not exists
        let settings = yield Setting_1.default.findOne();
        if (!settings) {
            // Create new settings if none exist
            settings = new Setting_1.default({
                thresholds: newThresholds,
                notifications: {
                    emailEnabled: false,
                    emailAddress: '',
                    notifyOnWarning: true,
                    notifyOnDanger: true,
                    notifyOnPumpActivation: false
                }
            });
        }
        else {
            // Update threshold settings
            settings.thresholds = Object.assign(Object.assign({}, settings.thresholds), newThresholds);
            // Update lastUpdatedBy if authenticated
            if (req.user) {
                settings.lastUpdatedBy = req.user._id;
            }
        }
        yield settings.save();
        // Broadcast settings to WebSocket clients
        (0, wsService_1.broadcastSettings)(settings.thresholds);
        res.json(settings.thresholds);
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   GET /api/settings/notifications
// @desc    Get notification settings
// @access  Public (could be secured with auth in production)
router.get('/notifications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield Setting_1.default.findOne().lean();
        if (!settings) {
            res.status(404).json({ message: 'Settings not found' });
            return;
        }
        res.json(settings.notifications);
    }
    catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
// @route   POST /api/settings/notifications
// @desc    Update notification settings
// @access  Public (could be secured with auth in production)
router.post('/notifications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { emailEnabled, emailAddress, notifyOnWarning, notifyOnDanger, notifyOnPumpActivation } = req.body;
        // Basic validation
        if (emailEnabled && !emailAddress) {
            res.status(400).json({ message: 'Email address is required when email is enabled' });
            return;
        }
        let settings = yield Setting_1.default.findOne();
        if (!settings) {
            // Create new settings if none exist
            settings = new Setting_1.default({
                thresholds: {
                    warning: 50,
                    danger: 75,
                    pumpActivation: 80
                },
                notifications: {
                    emailEnabled: emailEnabled !== null && emailEnabled !== void 0 ? emailEnabled : false,
                    emailAddress: emailAddress !== null && emailAddress !== void 0 ? emailAddress : '',
                    notifyOnWarning: notifyOnWarning !== null && notifyOnWarning !== void 0 ? notifyOnWarning : true,
                    notifyOnDanger: notifyOnDanger !== null && notifyOnDanger !== void 0 ? notifyOnDanger : true,
                    notifyOnPumpActivation: notifyOnPumpActivation !== null && notifyOnPumpActivation !== void 0 ? notifyOnPumpActivation : false
                }
            });
        }
        else {
            // Update notification settings
            settings.notifications = {
                emailEnabled: emailEnabled !== null && emailEnabled !== void 0 ? emailEnabled : settings.notifications.emailEnabled,
                emailAddress: emailAddress !== null && emailAddress !== void 0 ? emailAddress : settings.notifications.emailAddress,
                notifyOnWarning: notifyOnWarning !== null && notifyOnWarning !== void 0 ? notifyOnWarning : settings.notifications.notifyOnWarning,
                notifyOnDanger: notifyOnDanger !== null && notifyOnDanger !== void 0 ? notifyOnDanger : settings.notifications.notifyOnDanger,
                notifyOnPumpActivation: notifyOnPumpActivation !== null && notifyOnPumpActivation !== void 0 ? notifyOnPumpActivation : settings.notifications.notifyOnPumpActivation
            };
        }
        yield settings.save();
        res.json(settings.notifications);
    }
    catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({ message: 'Server error' });
    }
}));
exports.default = router;
//# sourceMappingURL=settings.js.map
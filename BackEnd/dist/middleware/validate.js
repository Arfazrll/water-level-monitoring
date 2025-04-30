"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWaterLevelData = exports.validateThresholdSettings = void 0;
const validateThresholdSettings = (req, res, next) => {
    const settings = req.body;
    // Check required fields
    const requiredFields = ['warningLevel', 'dangerLevel', 'minLevel', 'maxLevel', 'pumpActivationLevel', 'pumpDeactivationLevel'];
    for (const field of requiredFields) {
        if (settings[field] === undefined) {
            res.status(400).json({ message: `${field} is required` });
            return;
        }
    }
    // Logic validation
    if (settings.warningLevel >= settings.dangerLevel) {
        res.status(400).json({ message: 'Warning level must be lower than danger level' });
        return;
    }
    if (settings.pumpDeactivationLevel >= settings.pumpActivationLevel) {
        res.status(400).json({ message: 'Pump deactivation level must be lower than pump activation level' });
        return;
    }
    if (settings.minLevel >= settings.maxLevel) {
        res.status(400).json({ message: 'Minimum level must be lower than maximum level' });
        return;
    }
    // Check that all thresholds are within min/max range
    if (settings.warningLevel < settings.minLevel ||
        settings.warningLevel > settings.maxLevel ||
        settings.dangerLevel < settings.minLevel ||
        settings.dangerLevel > settings.maxLevel ||
        settings.pumpActivationLevel < settings.minLevel ||
        settings.pumpActivationLevel > settings.maxLevel ||
        settings.pumpDeactivationLevel < settings.minLevel ||
        settings.pumpDeactivationLevel > settings.maxLevel) {
        res.status(400).json({ message: 'All levels must be within min and max range' });
        return;
    }
    next();
};
exports.validateThresholdSettings = validateThresholdSettings;
const validateWaterLevelData = (req, res, next) => {
    const { level, unit } = req.body;
    if (level === undefined || typeof level !== 'number') {
        res.status(400).json({ message: 'Valid water level is required' });
        return;
    }
    if (!unit) {
        req.body.unit = 'cm'; // Default unit if not provided
    }
    next();
};
exports.validateWaterLevelData = validateWaterLevelData;
//# sourceMappingURL=validate.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateWaterLevelReading = exports.generateMockWaterLevel = exports.calculateDuration = exports.formatDate = void 0;
// Format date as YYYY-MM-DD HH:MM:SS
const formatDate = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
};
exports.formatDate = formatDate;
// Calculate duration between two dates in minutes
const calculateDuration = (startTime, endTime) => {
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
};
exports.calculateDuration = calculateDuration;
// Generate random water level data for testing
const generateMockWaterLevel = (min = 30, max = 90) => {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
};
exports.generateMockWaterLevel = generateMockWaterLevel;
// Simulate water level sensor reading (for testing without hardware)
const simulateWaterLevelReading = (baseUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Generate random water level with a sinusoidal pattern
        const time = Date.now() / 10000; // Slow oscillation
        const baseLevel = 50; // Center point
        const amplitude = 30; // Variation range
        const noise = Math.random() * 5 - 2.5; // Random noise
        const level = baseLevel + amplitude * Math.sin(time) + noise;
        const roundedLevel = Math.round(Math.max(0, Math.min(100, level)) * 10) / 10;
        // Post to the water level endpoint
        yield fetch(`${baseUrl}/api/water-level`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level: roundedLevel,
                unit: 'cm'
            }),
        });
        console.log(`Simulated water level: ${roundedLevel} cm`);
    }
    catch (error) {
        console.error('Error simulating water level reading:', error);
    }
});
exports.simulateWaterLevelReading = simulateWaterLevelReading;
//# sourceMappingURL=helpers.js.map
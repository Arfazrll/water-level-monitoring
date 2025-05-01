"use strict";
// BackEnd/services/sensorService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBuzzerStatus = exports.testBuzzer = exports.deactivateBuzzer = exports.activateBuzzer = exports.initSensor = exports.sensorEvents = void 0;
const events_1 = require("events");
// Event emitter untuk komunikasi sensor
exports.sensorEvents = new events_1.EventEmitter();
// Status buzzer
let buzzerActive = false;
let buzzerTimeout = null;
/**
 * Inisialisasi sensor dan buzzer (mock version for Windows development)
 */
const initSensor = () => {
    console.log('Mock sensor service initialized for Windows development');
    // Jika dalam mode development, mulai simulasi pembacaan
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
        setInterval(() => {
            // Simulasi pembacaan level air
            mockReadSensor();
        }, 5000);
    }
};
exports.initSensor = initSensor;
/**
 * Simulasi pembacaan sensor
 */
const mockReadSensor = () => {
    // Simulasi pembacaan dengan pola bergelombang
    const time = Date.now() / 10000;
    const baseLevel = 50;
    const amplitude = 30;
    const noise = Math.random() * 5 - 2.5;
    const level = baseLevel + amplitude * Math.sin(time) + noise;
    const waterLevel = {
        level: Math.max(0, Math.min(100, Math.round(level * 10) / 10)),
        unit: 'cm',
        timestamp: new Date()
    };
    // Emit event dengan data baru
    exports.sensorEvents.emit('reading', waterLevel);
    console.log(`[MOCK] Sensor reading: ${waterLevel.level} ${waterLevel.unit}`);
};
/**
 * Aktifkan buzzer untuk alarm (mock version)
 * @param type Jenis peringatan
 * @param autoDeactivate Apakah buzzer harus dinonaktifkan otomatis
 * @param timeout Waktu dalam milidetik sebelum buzzer dinonaktifkan (default: 10s)
 */
const activateBuzzer = (type, autoDeactivate = false, timeout = 10000) => {
    // Clear previous timeout if exists
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    buzzerActive = true;
    console.log(`[MOCK] BUZZER ACTIVATED for ${type.toUpperCase()} alert!`);
    // Auto deactivate buzzer after timeout if requested
    if (autoDeactivate) {
        buzzerTimeout = setTimeout(() => {
            (0, exports.deactivateBuzzer)();
            buzzerTimeout = null;
        }, timeout);
        console.log(`[MOCK] Buzzer will auto-deactivate after ${timeout}ms`);
    }
};
exports.activateBuzzer = activateBuzzer;
/**
 * Nonaktifkan buzzer (mock version)
 */
const deactivateBuzzer = () => {
    // Clear any existing timeout
    if (buzzerTimeout) {
        clearTimeout(buzzerTimeout);
        buzzerTimeout = null;
    }
    if (buzzerActive) {
        buzzerActive = false;
        console.log('[MOCK] BUZZER DEACTIVATED');
    }
};
exports.deactivateBuzzer = deactivateBuzzer;
/**
 * Uji buzzer (mock version)
 * @param duration Durasi dalam milidetik untuk menguji buzzer
 */
const testBuzzer = (duration = 1000) => {
    return new Promise((resolve) => {
        (0, exports.activateBuzzer)('warning');
        console.log(`[MOCK] Testing buzzer for ${duration}ms`);
        // Clear any existing timeout
        if (buzzerTimeout) {
            clearTimeout(buzzerTimeout);
        }
        buzzerTimeout = setTimeout(() => {
            (0, exports.deactivateBuzzer)();
            buzzerTimeout = null;
            resolve();
        }, duration);
    });
};
exports.testBuzzer = testBuzzer;
/**
 * Dapatkan status buzzer
 * @returns Status aktif buzzer
 */
const getBuzzerStatus = () => {
    return buzzerActive;
};
exports.getBuzzerStatus = getBuzzerStatus;
//# sourceMappingURL=sensorService.js.map
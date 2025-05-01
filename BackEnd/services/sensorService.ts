// Letakkan di: BackEnd/services/sensorService.ts

import { EventEmitter } from 'events';

// Event emitter untuk komunikasi sensor
const sensorEvents = new EventEmitter();

// Status buzzer
let buzzerActive = false;

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
  sensorEvents.emit('reading', waterLevel);
  console.log(`[MOCK] Sensor reading: ${waterLevel.level} ${waterLevel.unit}`);
};

/**
 * Aktifkan buzzer untuk alarm (mock version)
 */
const activateBuzzer = (type: 'warning' | 'danger') => {
  buzzerActive = true;
  console.log(`[MOCK] BUZZER ACTIVATED for ${type.toUpperCase()} alert!`);
};

/**
 * Nonaktifkan buzzer (mock version)
 */
const deactivateBuzzer = () => {
  if (buzzerActive) {
    buzzerActive = false;
    console.log('[MOCK] BUZZER DEACTIVATED');
  }
};

/**
 * Uji buzzer (mock version)
 */
const testBuzzer = (duration: number = 1000) => {
  return new Promise<void>((resolve) => {
    activateBuzzer('warning');
    console.log(`[MOCK] Testing buzzer for ${duration}ms`);
    
    setTimeout(() => {
      deactivateBuzzer();
      resolve();
    }, duration);
  });
};

/**
 * Dapatkan status buzzer
 */
const getBuzzerStatus = () => {
  return buzzerActive;
};

export {
  initSensor,
  sensorEvents,
  activateBuzzer,
  deactivateBuzzer,
  testBuzzer,
  getBuzzerStatus
};
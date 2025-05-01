import { EventEmitter } from 'events';
import { SerialPort } from 'serialport'; // Correct import for version 10+
import { ReadlineParser } from '@serialport/parser-readline';

// Event emitter untuk komunikasi sensor
export const sensorEvents = new EventEmitter();

// Status buzzer
let buzzerActive = false;
let buzzerTimeout: NodeJS.Timeout | null = null;

// Variabel koneksi sensor
let sensorPort: SerialPort | null = null;
let parser: ReadlineParser | null = null;

// Setting port untuk Arduino atau sensor
const ARDUINO_PORT = process.env.ARDUINO_PORT || 'COM3'; // Windows default
const ARDUINO_BAUD_RATE = parseInt(process.env.ARDUINO_BAUD_RATE || '9600');

/**
 * Inisialisasi sensor dan buzzer
 * Mencoba terhubung ke sensor ultrasonik atau float melalui Arduino
 */
export const initSensor = () => {
    try {
      // Jika dalam mode simulasi, gunakan mock sensor
      if (process.env.SIMULATE_SENSOR === 'true') {
        console.log('Menjalankan sensor dalam mode simulasi');
        setInterval(() => {
          mockReadSensor();
        }, 5000);
        return;
      }
  
      // Coba terhubung ke sensor fisik via Serial
      const portPath = process.env.ARDUINO_PORT || (
        process.platform === 'win32' ? 'COM3' : // Windows
        process.platform === 'darwin' ? '/dev/tty.usbmodem1101' : // macOS
        '/dev/ttyACM0' // Linux
      );
      
      console.log(`Mencoba terhubung ke sensor pada port ${portPath} dengan baud rate ${ARDUINO_BAUD_RATE}`);
      
      sensorPort = new SerialPort({ 
        path: portPath, 
        baudRate: ARDUINO_BAUD_RATE,
        autoOpen: true
      });
  
      parser = sensorPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      
      // Handle data dari serial
      if (parser) {
        parser.on('data', (data: string) => {
          console.log('Raw sensor data:', data);
          try {
            // Format data dari Arduino diharapkan: "water_level:XX.XX"
            // Tetapi kita juga mendukung format lain seperti JSON
            if (data.startsWith('{') && data.endsWith('}')) {
              // Format JSON
              try {
                const jsonData = JSON.parse(data);
                if (jsonData.water_level !== undefined) {
                  const level = parseFloat(jsonData.water_level);
                  
                  if (!isNaN(level)) {
                    // Emit event dengan data
                    const waterLevel = {
                      level: Math.max(0, Math.min(100, Math.round(level * 10) / 10)),
                      unit: 'cm',
                      timestamp: new Date()
                    };
                    
                    sensorEvents.emit('reading', waterLevel);
                    console.log(`Sensor reading (JSON): ${waterLevel.level} ${waterLevel.unit}`);
                  }
                }
              } catch (jsonError) {
                console.error('Error parsing JSON sensor data:', jsonError);
              }
            } else {
              // Format text: "water_level:XX.XX"
              const parts = data.trim().split(':');
              
              if (parts.length === 2 && parts[0] === 'water_level') {
                const level = parseFloat(parts[1]);
                
                if (!isNaN(level)) {
                  // Emit event dengan data
                  const waterLevel = {
                    level: Math.max(0, Math.min(100, Math.round(level * 10) / 10)),
                    unit: 'cm',
                    timestamp: new Date()
                  };
                  
                  sensorEvents.emit('reading', waterLevel);
                  console.log(`Sensor reading (Text): ${waterLevel.level} ${waterLevel.unit}`);
                }
              }
            }
          } catch (error) {
            console.error('Error parsing sensor data:', error);
          }
        });
      }
      
      // Handle koneksi
      sensorPort.on('open', () => {
        console.log('Koneksi sensor berhasil dibuka');
      });
      
      // Handle error
      sensorPort.on('error', (err: Error) => {
        console.error('Error koneksi sensor:', err.message);
        
        // Fallback ke simulasi jika sensor fisik gagal
        console.log('Beralih ke mode simulasi karena sensor fisik tidak tersedia');
        setInterval(() => {
          mockReadSensor();
        }, 5000);
      });
      
    } catch (error) {
      console.error('Error inisialisasi sensor:', error);
      console.log('Beralih ke mode simulasi karena sensor fisik tidak tersedia');
      
      // Fallback ke simulasi jika sensor fisik gagal
      setInterval(() => {
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
 * Aktifkan buzzer untuk alarm
 * @param type Jenis peringatan
 * @param autoDeactivate Apakah buzzer harus dinonaktifkan otomatis
 * @param timeout Waktu dalam milidetik sebelum buzzer dinonaktifkan (default: 10s)
 */
export const activateBuzzer = (type: 'warning' | 'danger', autoDeactivate = false, timeout = 10000) => {
  // Clear previous timeout if exists
  if (buzzerTimeout) {
    clearTimeout(buzzerTimeout);
    buzzerTimeout = null;
  }
  
  buzzerActive = true;

  // Jika menggunakan Arduino, kirim perintah ke buzzer
  if (sensorPort && sensorPort.isOpen) {
    try {
      // Format: "buzzer:on:type" where type is 1 for warning, 2 for danger
      const buzzerType = type === 'danger' ? '2' : '1';
      sensorPort.write(`buzzer:on:${buzzerType}\n`);
      console.log(`Buzzer activated for ${type.toUpperCase()} alert!`);
    } catch (error) {
      console.error('Error sending buzzer command:', error);
    }
  } else {
    console.log(`[MOCK] BUZZER ACTIVATED for ${type.toUpperCase()} alert!`);
  }
  
  // Auto deactivate buzzer after timeout if requested
  if (autoDeactivate) {
    buzzerTimeout = setTimeout(() => {
      deactivateBuzzer();
      buzzerTimeout = null;
    }, timeout);
    
    console.log(`Buzzer will auto-deactivate after ${timeout}ms`);
  }
};

/**
 * Nonaktifkan buzzer
 */
export const deactivateBuzzer = () => {
  // Clear any existing timeout
  if (buzzerTimeout) {
    clearTimeout(buzzerTimeout);
    buzzerTimeout = null;
  }
  
  if (buzzerActive) {
    buzzerActive = false;
    
    // Jika menggunakan Arduino, kirim perintah untuk mematikan buzzer
    if (sensorPort && sensorPort.isOpen) {
      try {
        sensorPort.write("buzzer:off\n");
        console.log('Buzzer deactivated');
      } catch (error) {
        console.error('Error sending buzzer deactivation command:', error);
      }
    } else {
      console.log('[MOCK] BUZZER DEACTIVATED');
    }
  }
};

/**
 * Uji buzzer 
 * @param duration Durasi dalam milidetik untuk menguji buzzer
 */
export const testBuzzer = (duration: number = 1000) => {
  return new Promise<void>((resolve) => {
    activateBuzzer('warning');
    console.log(`Testing buzzer for ${duration}ms`);
    
    // Clear any existing timeout
    if (buzzerTimeout) {
      clearTimeout(buzzerTimeout);
    }
    
    buzzerTimeout = setTimeout(() => {
      deactivateBuzzer();
      buzzerTimeout = null;
      resolve();
    }, duration);
  });
};

/**
 * Dapatkan status buzzer
 * @returns Status aktif buzzer
 */
export const getBuzzerStatus = () => {
  return buzzerActive;
};

/**
 * Handler saat aplikasi berhenti, tutup koneksi serial
 */
process.on('SIGINT', () => {
  if (sensorPort && sensorPort.isOpen) {
    console.log('Menutup koneksi sensor...');
    sensorPort.close();
  }
  process.exit(0);
});

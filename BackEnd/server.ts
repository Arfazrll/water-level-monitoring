// BackEnd/server.ts

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import connectDB from './config/db';
import { verifyEmailConnection } from './config/mailer';
import { initWebSocketServer, getWebSocketStatus } from './services/wsService';
import { simulateWaterLevelReading } from './utils/helpers';
import esp32Routes from './routes/api/esp32';

// Import sensor service
import { 
  initSensor, 
  sensorEvents,
  activateBuzzer,
  getBuzzerStatus
} from './services/sensorService';

// Import models 
import WaterLevel from './models/WaterLevel';
import Settings from './models/Setting';
import Alert from './models/Alert';

// Import routes
import waterLevelRoutes from './routes/api/Water-level';
import alertsRoutes from './routes/api/alerts';
import pumpRoutes from './routes/api/pump';
import settingsRoutes from './routes/api/settings';

// Import services
import { broadcastWaterLevel, broadcastAlert } from './services/wsService';
import { sendAlertEmail } from './services/emailService';

// Inisialisasi variabel lingkungan - prioritaskan sebelum eksekusi kode lainnya
dotenv.config();

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 5000;

// Fungsi utilitas: asynchronous delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Status pelacakan server
let serverStatus = {
  dbConnected: false,
  emailVerified: false,
  wsInitialized: false,
  sensorInitialized: false,
  serverStartTime: new Date(),
  simulationActive: false
};

/**
 * Koneksi ke database dengan mekanisme retry
 * Implementasi pattern reliable connectivity dengan exponential backoff
 */
const connectWithRetry = async (retries = 5, interval = 5000) => {
  let currentRetry = 0;
  
  while (currentRetry < retries) {
    try {
      await connectDB();
      console.log('Koneksi MongoDB berhasil dibuat');
      serverStatus.dbConnected = true;
      return true;
    } catch (error) {
      currentRetry++;
      console.error(`Percobaan koneksi database ke-${currentRetry} gagal. Mencoba lagi dalam ${interval/1000} detik...`);
      
      // Strategi fallback: MongoDB Atlas → MongoDB lokal
      if (process.env.MONGO_URI?.includes('mongodb+srv') && currentRetry === 2) {
        console.log('Mencoba terhubung ke MongoDB lokal...');
        try {
          mongoose.connection.close();
          await wait(1000);
          
          process.env.MONGO_URI = 'mongodb://localhost:27017/water-monitoring';
          await connectDB();
          console.log('Berhasil terhubung ke MongoDB lokal');
          serverStatus.dbConnected = true;
          return true;
        } catch (localError) {
          console.error('Gagal terhubung ke MongoDB lokal:', localError);
        }
      }
      
      if (currentRetry === retries) {
        console.error('Semua percobaan koneksi database gagal. Memulai server tanpa database...');
        console.warn('Beberapa fitur mungkin tidak berfungsi tanpa koneksi database');
        return false;
      }
      
      // Wait before retrying
      await wait(interval);
    }
  }
  return false;
};

/**
 * Handler untuk pembacaan sensor dengan processing pipeline lengkap
 * @param data - Data pembacaan sensor
 */
const handleSensorReading = async (data: { level: number, unit: string, timestamp: Date }) => {
  try {
    // Konstruksi objek waterLevel baru
    const waterLevelReading = new WaterLevel({
      level: data.level,
      unit: data.unit || 'cm',
    });
    
    await waterLevelReading.save();
    console.log(`Level air dari sensor tercatat: ${data.level} ${data.unit}`);
    
    // Broadcast ke WebSocket clients dengan penanganan error
    try {
      const broadcastSuccess = broadcastWaterLevel(waterLevelReading);
      if (!broadcastSuccess) {
        console.warn('Failed to broadcast water level via WebSocket (no clients or server not initialized)');
      }
    } catch (wsError) {
      console.warn('Exception when broadcasting water level via WebSocket:', wsError);
    }
    
    // Analisis threshold dan pembuatan alert
    const settings = await Settings.findOne();
    
    if (settings) {
      const { thresholds, notifications } = settings;
      let alertType: 'warning' | 'danger' | null = null;
      let alertMessage = '';
      
      // Klasifikasi level bahaya
      if (data.level >= thresholds.dangerLevel) {
        alertType = 'danger';
        alertMessage = `Level air telah mencapai ambang BAHAYA (${data.level} ${data.unit})`;
      } 
      // Klasifikasi level peringatan
      else if (data.level >= thresholds.warningLevel) {
        alertType = 'warning';
        alertMessage = `Level air telah mencapai ambang PERINGATAN (${data.level} ${data.unit})`;
      }
      
      // Pembuatan peringatan dengan deduplication dan throttling
      if (alertType) {
        // Cek peringatan sejenis yang masih aktif
        const existingAlert = await Alert.findOne({
          type: alertType,
          acknowledged: false
        }).sort({ createdAt: -1 });
        
        // Implementasi throttling: interval minimal 30 menit antara peringatan sejenis
        const shouldCreateNewAlert = !existingAlert || 
          (Date.now() - existingAlert.createdAt.getTime() > 30 * 60 * 1000);
        
        if (shouldCreateNewAlert) {
          const alert = new Alert({
            level: data.level,
            type: alertType,
            message: alertMessage,
            acknowledged: false,
          });
          
          await alert.save();
          console.log(`Peringatan dibuat: ${alertType} pada level ${data.level}`);
          
          // Aktivasi buzzer berdasarkan klasifikasi peringatan
          activateBuzzer(alertType);
          
          // Broadcast peringatan ke WebSocket clients
          try {
            const broadcastSuccess = broadcastAlert(alert);
            if (!broadcastSuccess) {
              console.warn('Failed to broadcast alert via WebSocket (no clients or server not initialized)');
            }
          } catch (wsError) {
            console.warn('Exception when broadcasting alert via WebSocket:', wsError);
          }
          
          // Notifikasi email jika diaktifkan
          if (notifications.emailEnabled) {
            if ((alertType === 'warning' && notifications.notifyOnWarning) || 
                (alertType === 'danger' && notifications.notifyOnDanger)) {
              try {
                await sendAlertEmail(
                  notifications.emailAddress,
                  `Peringatan Level Air ${alertType.toUpperCase()}`,
                  alertMessage
                );
                console.log(`Alert email sent to ${notifications.emailAddress}`);
              } catch (emailError) {
                console.error('Failed to send alert email:', emailError);
              }
            }
          }
        } else {
          console.log(`Peringatan ${alertType} sudah aktif, tidak membuat peringatan baru (throttling applied)`);
        }
      }
    }
  } catch (error) {
    console.error('Error memproses pembacaan sensor:', error);
  }
};

// Konfigurasi middleware fundamental
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// Konfigurasi CORS komprehensif untuk kompatibilitas maksimal
app.use(cors({
  origin: '*', // Dalam produksi, spesifikasikan domain yang diizinkan
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Izinkan kredensial
  maxAge: 86400, // Cache preflight request selama 1 hari
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Middleware untuk logging request dengan pengukuran durasi
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request masuk
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Instrumentasi durasi respons
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Middleware untuk penanganan error global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error yang tidak tertangani:', err);
  res.status(500).json({ 
    success: false,
    message: 'Kesalahan server internal',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Registrasi rute API
app.use('/api/water-level', waterLevelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/esp32', esp32Routes);

// Endpoint root untuk healthcheck
app.get('/', (req: Request, res: Response) => {
  res.send('API Pemantauan Ketinggian Air sedang berjalan...');
});

// Endpoint status server dengan metrik komprehensif
app.get('/api/status', (req: Request, res: Response) => {
  const wsStatus = getWebSocketStatus();
  
  res.json({
    success: true,
    message: 'Status server berhasil diambil',
    data: {
      status: 'online',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - serverStatus.serverStartTime.getTime()) / 1000), // in seconds
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      db: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.db?.databaseName || 'unknown'
      },
      websocket: {
        initialized: wsStatus?.isInitialized || false,
        connections: wsStatus?.activeConnections || 0,
        lastBroadcast: wsStatus?.lastBroadcast || null
      },
      sensor: {
        simulation: process.env.SIMULATE_SENSOR === 'true',
        active: serverStatus.simulationActive,
        buzzerActive: getBuzzerStatus()
      },
      email: {
        configured: process.env.EMAIL_USER && process.env.EMAIL_PASSWORD,
        verified: serverStatus.emailVerified
      }
    }
  });
});

// Endpoint pengujian untuk verifikasi ketersediaan API
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Inisialisasi server HTTP
const server = http.createServer(app);

/**
 * Fungsi inisialisasi server dengan sekuens startup terstruktur
 * Implementasi pattern graceful startup dengan fallback modes
 */
const startServer = async () => {
  // Inisialisasi koneksi database dengan mekanisme retry
  await connectWithRetry(3, 3000);
  
  // Verifikasi konektivitas email
  try {
    const emailConnected = await verifyEmailConnection();
    serverStatus.emailVerified = emailConnected;
    
    if (!emailConnected) {
      console.warn('Layanan email tidak terhubung. Email notifikasi tidak akan dikirim.');
      console.warn('Periksa variabel lingkungan EMAIL_* di file .env jika notifikasi email diperlukan.');
    }
  } catch (error) {
    console.error('Error saat memverifikasi koneksi email:', error);
    console.warn('Layanan notifikasi email tidak akan tersedia.');
  }
  
  // Inisialisasi WebSocket server dengan penanganan error
  try {
    initWebSocketServer(server);
    serverStatus.wsInitialized = true;
    console.log('WebSocket server initialized successfully');
  } catch (error) {
    console.error('Error initializing WebSocket server:', error);
    console.error('Detail error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    serverStatus.wsInitialized = false;
    console.warn('Application will run without WebSocket functionality');
  }
  
  // Inisialisasi sensor berdasarkan mode operasional
  if (process.env.NODE_ENV === 'production' && process.env.SIMULATE_SENSOR !== 'true') {
    // Inisialisasi untuk sensor fisik dalam lingkungan produksi
    try {
      initSensor();
      serverStatus.sensorInitialized = true;
      
      // Registrasi event handler untuk pembacaan sensor
      sensorEvents.on('reading', handleSensorReading);
      
      console.log('Sensor hardware diinisialisasi');
    } catch (error) {
      console.error('Error initializing sensor hardware:', error);
      serverStatus.sensorInitialized = false;
      console.warn('Fallback to simulation mode due to sensor initialization failure');
      process.env.SIMULATE_SENSOR = 'true';
    }
  } else {
    console.log('Berjalan dalam mode simulasi sensor');
  }
  
  // Inisialisasi listener server
  server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Mode server: ${process.env.NODE_ENV || 'development'}`);
    
    // Aktivasi simulasi pembacaan sensor dalam mode development
    if ((process.env.NODE_ENV === 'development' || !serverStatus.sensorInitialized) && 
        process.env.SIMULATE_SENSOR === 'true') {
      console.log('Memulai simulasi sensor ketinggian air...');
      serverStatus.simulationActive = true;
      
      // Simulasi pembacaan periodik dengan interval 10 detik
      const simulationInterval = setInterval(() => {
        simulateWaterLevelReading(`http://localhost:${PORT}`)
          .catch(error => {
            console.error('Error dalam simulasi ketinggian air:', error);
            // Terminasi simulasi jika koneksi database tidak tersedia
            if (error.message && error.message.includes('buffering timed out')) {
              console.warn('Menghentikan simulasi karena koneksi database tidak tersedia');
              clearInterval(simulationInterval);
              serverStatus.simulationActive = false;
            }
          });
      }, 10000);
      
      // Registrasi signal handler untuk graceful shutdown
      process.on('SIGINT', () => {
        console.log('Menghentikan simulasi...');
        clearInterval(simulationInterval);
        serverStatus.simulationActive = false;
        process.exit(0);
      });
    }
  });
};

// Inisialisasi server dengan penanganan error global
startServer().catch(err => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});

// Penanganan unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Rejection yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
});

// Penanganan uncaught exceptions dengan graceful shutdown
process.on('uncaughtException', (err: Error) => {
  console.error(`Exception yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
  // Graceful shutdown
  server.close(() => process.exit(1));
});
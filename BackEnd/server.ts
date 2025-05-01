// BackEnd/server.ts (Perbaikan)

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
import authRoutes from './routes/auth';
import waterLevelRoutes from './routes/api/Water-level';
import alertsRoutes from './routes/api/alerts';
import pumpRoutes from './routes/api/pump';
import settingsRoutes from './routes/api/settings';

// Import services
import { broadcastWaterLevel, broadcastAlert } from './services/wsService';
import { sendAlertEmail } from './services/emailService';

// Load environment variables - lakukan ini sebelum kode lainnya
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Fungsi untuk menunggu beberapa detik
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Server status tracking
let serverStatus = {
  dbConnected: false,
  emailVerified: false,
  wsInitialized: false,
  sensorInitialized: false,
  serverStartTime: new Date(),
  simulationActive: false
};

// Connect to Database with retry mechanism
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
      
      // Jika MongoDB Atlas gagal, coba MongoDB lokal
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

// Handler untuk pembacaan sensor
const handleSensorReading = async (data: { level: number, unit: string, timestamp: Date }) => {
  try {
    // Buat objek waterLevel baru
    const waterLevelReading = new WaterLevel({
      level: data.level,
      unit: data.unit || 'cm',
    });
    
    await waterLevelReading.save();
    console.log(`Level air dari sensor tercatat: ${data.level} ${data.unit}`);
    
    // Broadcast ke WebSocket clients
    broadcastWaterLevel(waterLevelReading);
    
    // Periksa thresholds dan buat alert jika perlu
    const settings = await Settings.findOne();
    
    if (settings) {
      const { thresholds, notifications } = settings;
      let alertType: 'warning' | 'danger' | null = null;
      let alertMessage = '';
      
      // Periksa threshold bahaya
      if (data.level >= thresholds.dangerLevel) {
        alertType = 'danger';
        alertMessage = `Level air telah mencapai ambang BAHAYA (${data.level} ${data.unit})`;
      } 
      // Periksa threshold peringatan
      else if (data.level >= thresholds.warningLevel) {
        alertType = 'warning';
        alertMessage = `Level air telah mencapai ambang PERINGATAN (${data.level} ${data.unit})`;
      }
      
      // Buat peringatan jika threshold terlampaui
      if (alertType) {
        // Cek dulu apakah sudah ada peringatan sejenis yang belum diakui
        const existingAlert = await Alert.findOne({
          type: alertType,
          acknowledged: false
        }).sort({ createdAt: -1 });
        
        // Hanya buat peringatan baru jika tidak ada yang aktif atau sudah lebih dari 30 menit
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
          
          // Aktifkan buzzer berdasarkan jenis peringatan
          activateBuzzer(alertType);
          
          // Broadcast peringatan ke WebSocket clients
          broadcastAlert(alert);
          
          // Kirim notifikasi email jika diaktifkan
          if (notifications.emailEnabled) {
            if ((alertType === 'warning' && notifications.notifyOnWarning) || 
                (alertType === 'danger' && notifications.notifyOnDanger)) {
              try {
                await sendAlertEmail(
                  notifications.emailAddress,
                  `Peringatan Level Air ${alertType.toUpperCase()}`,
                  alertMessage
                );
              } catch (emailError) {
                console.error('Gagal mengirim email peringatan:', emailError);
              }
            }
          }
        } else {
          console.log(`Peringatan ${alertType} sudah ada dan masih aktif, tidak membuat peringatan baru`);
        }
      }
    }
  } catch (error) {
    console.error('Error memproses pembacaan sensor:', error);
  }
};

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware yang lebih lengkap
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow credentials
  maxAge: 86400 // Cache preflight request for 1 day
}));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  // Log response time when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error yang tidak tertangani:', err);
  res.status(500).json({ 
    success: false,
    message: 'Kesalahan server internal',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/water-level', waterLevelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/esp32', esp32Routes);

// Basic root route
app.get('/', (req: Request, res: Response) => {
  res.send('API Pemantauan Ketinggian Air sedang berjalan...');
});

// Status endpoint yang ditingkatkan
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

// Add testing endpoint
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
const startServer = async () => {
  // Coba terhubung ke database terlebih dahulu
  await connectWithRetry(3, 3000);
  
  // Coba verifikasi koneksi email
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
  
  // Inisialisasi WebSocket server
  try {
    initWebSocketServer(server);
    serverStatus.wsInitialized = true;
  } catch (error) {
    console.error('Error initializing WebSocket server:', error);
    serverStatus.wsInitialized = false;
  }
  
  // Inisialisasi sensor
  if (process.env.NODE_ENV === 'production' && process.env.SIMULATE_SENSOR !== 'true') {
    // Inisialisasi sensor fisik
    try {
      initSensor();
      serverStatus.sensorInitialized = true;
      
      // Listen untuk pembacaan sensor
      sensorEvents.on('reading', handleSensorReading);
      
      console.log('Sensor hardware diinisialisasi');
    } catch (error) {
      console.error('Error initializing sensor hardware:', error);
      serverStatus.sensorInitialized = false;
    }
  } else {
    console.log('Berjalan dalam mode simulasi sensor');
  }
  
  // Mulai server
  server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Mode server: ${process.env.NODE_ENV || 'development'}`);
    
    // Simulate water level readings in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
      console.log('Memulai simulasi sensor ketinggian air...');
      serverStatus.simulationActive = true;
      
      // Simulasi pembacaan setiap 10 detik
      const simulationInterval = setInterval(() => {
        simulateWaterLevelReading(`http://localhost:${PORT}`)
          .catch(error => {
            console.error('Error dalam simulasi ketinggian air:', error);
            // Jika database tidak terhubung, hentikan simulasi untuk menghindari error log yang berlebihan
            if (error.message && error.message.includes('buffering timed out')) {
              console.warn('Menghentikan simulasi karena koneksi database tidak tersedia');
              clearInterval(simulationInterval);
              serverStatus.simulationActive = false;
            }
          });
      }, 10000); // Setiap 10 detik
      
      // Tambahkan listener untuk menghentikan simulasi saat server berhenti
      process.on('SIGINT', () => {
        console.log('Menghentikan simulasi...');
        clearInterval(simulationInterval);
        serverStatus.simulationActive = false;
        process.exit(0);
      });
    }
  });
};

// Start the server
startServer().catch(err => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Rejection yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error(`Exception yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
  // Close server & exit process
  server.close(() => process.exit(1));
});
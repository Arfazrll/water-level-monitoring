import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import connectDB from './config/db';
import { verifyEmailConnection } from './config/mailer';
import { initWebSocketServer, getWebSocketStatus } from './services/wsService';
import { initSensor, sensorEvents, getBuzzerStatus } from './services/sensorService';
import waterLevelRoutes from './routes/api/water-level';  
import alertsRoutes from './routes/api/alerts';
import pumpRoutes from './routes/api/pump';
import settingsRoutes from './routes/api/settings';
import esp32Routes from './routes/api/esp32';
import authRoutes from './routes/auth';

dotenv.config();

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 5000;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let serverStatus = {
  dbConnected: false,
  emailVerified: false,
  wsInitialized: false,
  sensorInitialized: false,
  serverStartTime: new Date()
};

app.use(bodyParser.json({ limit: '1mb' })); 
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, 
  maxAge: 86400, 
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} dari ${ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms dari ${ip}`);
  });
  
  next();
});

app.use('/api/water-level', waterLevelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/esp32', esp32Routes);
app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('API Pemantauan Ketinggian Air sedang berjalan...');
});

app.get('/api/status', (req: Request, res: Response) => {
  const wsStatus = getWebSocketStatus();
  
  res.json({
    success: true,
    message: 'Status server berhasil diambil',
    data: {
      status: 'online',
      version: '1.0.0',
      uptime: Math.floor((Date.now() - serverStatus.serverStartTime.getTime()) / 1000),
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
        active: serverStatus.sensorInitialized,
        buzzerActive: getBuzzerStatus()
      },
      email: {
        configured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD,
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

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const server = http.createServer(app);

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
    console.log(`Level air dari sensor diterima: ${data.level} ${data.unit}`);
  } catch (error) {
    console.error('Error memproses pembacaan sensor:', error);
  }
};

/**
 * Fungsi inisialisasi server dengan sekuens startup terstruktur
 * Implementasi pattern graceful startup dengan fallback modes
 */
const startServer = async () => {
  await connectWithRetry(3, 3000);
  
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
  
  // Inisialisasi sensor untuk hardware fisik
  try {
    initSensor();
    serverStatus.sensorInitialized = true;
    
    sensorEvents.on('reading', handleSensorReading);
    
    console.log('Sensor hardware diinisialisasi');
  } catch (error) {
    console.error('Error initializing sensor hardware:', error);
    serverStatus.sensorInitialized = false;
    console.warn('Sensor initialization failed. Check hardware connections and configuration.');
  }
  
  server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Mode server: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch(err => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
  console.error(`Rejection yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
});

process.on('uncaughtException', (err: Error) => {
  console.error(`Exception yang tidak tertangani: ${err.message}`);
  console.error(err.stack);
  // Graceful shutdown
  server.close(() => process.exit(1));
});

export default server;
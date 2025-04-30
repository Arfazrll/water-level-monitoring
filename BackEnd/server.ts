import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import connectDB from './config/db';
import { verifyEmailConnection } from './config/mailer';
import { initWebSocketServer } from './services/wsService';
import { simulateWaterLevelReading } from './utils/helpers';

// Import routes
import authRoutes from './routes/auth';
import waterLevelRoutes from './routes/api/Water-level';
import alertsRoutes from './routes/api/alerts';
import pumpRoutes from './routes/api/pump';
import settingsRoutes from './routes/api/settings';

// Load environment variables - do this first before any other code
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Fungsi untuk menunggu beberapa detik
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Connect to Database with retry mechanism
const connectWithRetry = async (retries = 5, interval = 5000) => {
  let currentRetry = 0;
  
  while (currentRetry < retries) {
    try {
      await connectDB();
      console.log('Koneksi MongoDB berhasil dibuat');
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

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error yang tidak tertangani:', err);
  res.status(500).json({ 
    message: 'Kesalahan server internal',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/water-level', waterLevelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/settings', settingsRoutes);

// Basic root route
app.get('/', (req: Request, res: Response) => {
  res.send('API Pemantauan Ketinggian Air sedang berjalan...');
});

// Status endpoint
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    time: new Date().toISOString(),
    db_connected: mongoose.connection.readyState === 1,
    mode: process.env.NODE_ENV || 'development'
  });
});

// Rute untuk memulai simulasi secara manual
app.post('/api/simulate', async (req: Request, res: Response) => {
  try {
    await simulateWaterLevelReading(`http://localhost:${PORT}`);
    res.json({ success: true, message: 'Simulasi ketinggian air berhasil' });
  } catch (error) {
    console.error('Error saat simulasi:', error);
    res.status(500).json({ success: false, message: 'Gagal menjalankan simulasi' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
let wsServer = initWebSocketServer(server);

// Start the server
const startServer = async () => {
  // Coba terhubung ke database terlebih dahulu
  await connectWithRetry(3, 3000);
  
  // Coba verifikasi koneksi email
  try {
    const emailConnected = await verifyEmailConnection();
    if (!emailConnected) {
      console.warn('Layanan email tidak terhubung. Email notifikasi tidak akan dikirim.');
      console.warn('Periksa variabel lingkungan EMAIL_* di file .env jika notifikasi email diperlukan.');
    }
  } catch (error) {
    console.error('Error saat memverifikasi koneksi email:', error);
    console.warn('Layanan notifikasi email tidak akan tersedia.');
  }
  
  // Mulai server meskipun koneksi gagal
  server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
    console.log(`Mode server: ${process.env.NODE_ENV || 'development'}`);
    
    // Simulate water level readings in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
      console.log('Memulai simulasi sensor ketinggian air...');
      
      // Simulasi pembacaan setiap 5 detik
      const simulationInterval = setInterval(() => {
        simulateWaterLevelReading(`http://localhost:${PORT}`)
          .catch(error => {
            console.error('Error dalam simulasi ketinggian air:', error);
            // Jika database tidak terhubung, hentikan simulasi untuk menghindari error log yang berlebihan
            if (error.message && error.message.includes('buffering timed out')) {
              console.warn('Menghentikan simulasi karena koneksi database tidak tersedia');
              clearInterval(simulationInterval);
            }
          });
      }, 10000); // Diperpanjang menjadi 10 detik
      
      // Tambahkan listener untuk menghentikan simulasi saat server berhenti
      process.on('SIGINT', () => {
        console.log('Menghentikan simulasi...');
        clearInterval(simulationInterval);
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
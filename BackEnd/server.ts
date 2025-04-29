import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
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

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Initialize email connection
verifyEmailConnection();

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/water-level', waterLevelRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pump', pumpRoutes);
app.use('/api/settings', settingsRoutes);

// Basic root route
app.get('/', (req: Request, res: Response) => {
  res.send('Water Level Monitoring API is running...');
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
initWebSocketServer(server);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Simulate water level readings in development mode
  if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
    console.log('Starting water level sensor simulation...');
    
    // Simulate readings every 5 seconds
    setInterval(() => {
      simulateWaterLevelReading(`http://localhost:${PORT}`);
    }, 5000);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
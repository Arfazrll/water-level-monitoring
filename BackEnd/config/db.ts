// BackEnd/config/db.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water-monitoring';

const connectDB = async (): Promise<void> => {
  try {
    if (!MONGO_URI) {
      throw new Error('MongoDB connection string tidak ditemukan di variabel lingkungan');
    }

    // Log connection string yang disanitasi (tanpa password)
    const sanitizedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Menggunakan connection string: ${sanitizedUri}`);

    // Opsi koneksi yang robust
    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000,  // Timeout 10 detik
      socketTimeoutMS: 45000,           // Socket timeout 45 detik
    };

    await mongoose.connect(MONGO_URI, options);
    
    console.log('MongoDB berhasil terhubung');
    
    const db = mongoose.connection.db;
    if (db) {
      console.log(`Terhubung ke database: ${db.databaseName}`);
      
      // Verifikasi collections yang diperlukan
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      const requiredCollections = ['waterlevels', 'alerts', 'settings', 'pumplogs', 'users'];
      for (const collection of requiredCollections) {
        if (!collectionNames.includes(collection)) {
          console.log(`Membuat collection "${collection}"...`);
          await db.createCollection(collection);
        }
      }
    }
    
    // Set up event handlers for the connection
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error: any) {
    console.error('Error koneksi MongoDB:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('MongoDB mungkin tidak berjalan. Pastikan MongoDB sudah terinstal dan service berjalan.');
      
      if (MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
        console.error('PETUNJUK: Cek MongoDB service di komputer lokal Anda');
      } else if (MONGO_URI.includes('mongodb+srv')) {
        console.error('PETUNJUK: Pastikan kredensial MongoDB Atlas dan IP whitelist sudah benar');
      }
    }
    
    throw error;
  }
};

export default connectDB;
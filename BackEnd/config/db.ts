import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water-monitoring';

const connectDB = async (): Promise<void> => {
  try {
    if (!MONGO_URI) {
      throw new Error('MongoDB connection tidak ditemukan');
    }

    // Log connection string yang disanitasi (tanpa password)
    const sanitizedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Menggunakan connection string: ${sanitizedUri}`);

    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000,  // Timeout 10 detik
      socketTimeoutMS: 45000,           // Socket timeout 45 detik
    };

    await mongoose.connect(MONGO_URI, options);
    
    console.log('MongoDB berhasil terhubung');
    
    // Pengecekan collection
    const db = mongoose.connection.db;
    if (db) {
      console.log(`Terhubung ke database: ${db.databaseName}`);
      
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
        console.error('Cek MongoDB service dilokal Anda');
      } else if (MONGO_URI.includes('mongodb+srv')) {
        console.error('Pastikan kredensial sudah benar');
      }
    }
    
    throw error;
  }
};

export default connectDB;
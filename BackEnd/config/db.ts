import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Ambil string koneksi MongoDB dari variabel lingkungan
const MONGO_URI = process.env.MONGO_URI || 'MONGO_URI=mongodb+srv://snbtin:<a84594325B.>@watermonitoringcluster.alhbftu.mongodb.net/?retryWrites=true&w=majority&appName=WaterMonitoringCluster';

const connectDB = async (): Promise<void> => {
  try {
    // Periksa apakah string koneksi tersedia
    if (!MONGO_URI) {
      throw new Error('String koneksi MongoDB tidak ditemukan di variabel lingkungan');
    }

    // Periksa apakah format string koneksi sesuai dengan MongoDB Atlas
    if (!MONGO_URI.includes('mongodb+srv://')) {
      console.warn('String koneksi tidak menggunakan format MongoDB Atlas (mongodb+srv://). Pastikan ini disengaja.');
    }

    // Mencoba untuk terhubung ke MongoDB Atlas
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Atlas berhasil terhubung');
  } catch (error: any) {
    // Tangani error dengan lebih baik
    if (error.message.includes('No addresses found at host')) {
      console.error('Error koneksi MongoDB Atlas: Tidak dapat menemukan alamat host');
      console.error('Periksa apakah cluster name dalam string koneksi sudah benar');
      console.error('Format yang benar: mongodb+srv://username:password@cluster-name.mongodb.net/database-name');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Error koneksi MongoDB Atlas: Server tidak ditemukan');
      console.error('Periksa koneksi internet Anda dan pastikan nama cluster sudah benar');
    } else if (error.message.includes('bad auth')) {
      console.error('Error otentikasi MongoDB Atlas: Username atau password tidak valid');
      console.error('Pastikan kredensial di string koneksi sudah benar');
    } else {
      console.error('Error koneksi MongoDB Atlas:', error.message);
    }
    
    console.error('Aplikasi tidak dapat berjalan tanpa koneksi ke database');
    process.exit(1);
  }
};

export default connectDB;
// BackEnd/config/mailer.ts

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Validasi format email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validasi email konfigurasi
const userEmail = process.env.EMAIL_USER;
if (!userEmail || !isValidEmail(userEmail)) {
  console.warn(`Email user tidak valid atau tidak dikonfigurasi: "${userEmail}". Email notifikasi tidak akan berfungsi.`);
}

// Fungsi untuk membuat transporter
const createTransporter = () => {
  // Verifikasi apakah kredensial email sudah dikonfigurasi
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Kredensial SMTP tidak dikonfigurasi. Notifikasi email tidak akan dikirim.');
    console.warn('Pastikan EMAIL_USER dan EMAIL_PASSWORD diatur di file .env');
    return null;
  }

  // Coba buat transporter dengan kredensial yang telah dikonfigurasi
  try {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      // Tambahkan opsi tambahan untuk lebih banyak logging dan debug
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

// Buat transporter
const transporter = createTransporter();

// Verifikasi koneksi email saat startup
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    // Jika kredensial email tidak dikonfigurasi, skip verifikasi
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
        process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.warn('Konfigurasi email tidak lengkap. Verifikasi email dilewati.');
      console.warn('Perbarui file .env dengan EMAIL_USER dan EMAIL_PASSWORD yang valid jika dibutuhkan.');
      return false;
    }
    
    // Jika transporter tidak berhasil dibuat, skip verifikasi
    if (!transporter) {
      console.warn('Email transporter tidak tersedia. Verifikasi email dilewati.');
      return false;
    }
    
    // Verifikasi koneksi
    await transporter.verify();
    console.log('Koneksi server email berhasil');
    
    return true;
  } catch (error: any) {
    if (error.code === 'EDNS') {
      console.error('Error koneksi email: Nama domain tidak valid. Periksa format EMAIL_USER.');
      console.error('EMAIL_USER harus berupa alamat email lengkap, bukan hanya username.');
    } else if (error.code === 'EAUTH') {
      console.error('Error otentikasi email: Username/password tidak diterima.');
      console.error('Jika Anda menggunakan Gmail, pastikan untuk:');
      console.error('1. Mengaktifkan verifikasi 2 langkah di akun Gmail');
      console.error('2. Membuat password aplikasi di https://myaccount.google.com/apppasswords');
      console.error('3. Menggunakan password aplikasi tersebut di file .env');
    } else {
      console.error('Error koneksi server email:', error);
    }
    console.warn('Layanan email tidak tersedia. Notifikasi email tidak akan berfungsi.');
    
    return false;
  }
};

// Fungsi untuk mengecek apakah email berfungsi
export const isEmailServiceEnabled = (): boolean => {
  return !!(transporter && 
            process.env.EMAIL_USER && 
            process.env.EMAIL_PASSWORD && 
            process.env.EMAIL_USER !== 'your_email@gmail.com');
};

export default transporter;
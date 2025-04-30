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

// Create reusable transporter object using SMTP transport
// Buat konfigurasi transporter langsung di createTransport tanpa menyimpannya ke variabel terpisah
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Tentukan host SMTP Gmail
  port: parseInt(process.env.EMAIL_PORT || '587'),  // Tentukan port SMTP Gmail (587 untuk TLS)
  secure: process.env.EMAIL_SECURE === 'true',     // Gunakan TLS jika aman
  auth: {
    user: userEmail || 'example@gmail.com', // default dummy
    pass: process.env.EMAIL_PASSWORD || 'dummy-password'
  }
});

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
  return !!(process.env.EMAIL_USER && 
            process.env.EMAIL_PASSWORD && 
            process.env.EMAIL_USER !== 'your_email@gmail.com');
};

export default transporter;
// BackEnd/config/mailer.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Validasi format email
const isValidEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validasi email konfigurasi
const userEmail = process.env.EMAIL_USER;
if (!userEmail || !isValidEmail(userEmail)) {
  console.warn(`Email user tidak valid atau tidak dikonfigurasi. Email notifikasi tidak akan berfungsi.`);
}

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Kredensial SMTP tidak dikonfigurasi. Notifikasi email tidak bisa dikirim.');
    console.warn('Pastikan EMAIL_USER dan EMAIL_PASSWORD diatur di file .env');
    return null;
  }

  const enableDebug = process.env.NODE_ENV === 'development' && process.env.EMAIL_DEBUG === 'true';
  
  try {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      debug: enableDebug,
      logger: enableDebug
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return null;
  }
};

const transporter = createTransporter();

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
        process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.warn('Konfigurasi email tidak lengkap.');
      return false;
    }
    
    if (!transporter) {
      console.warn('Email transporter tidak tersedia.');
      return false;
    }
    
    await transporter.verify();
    console.log('Koneksi server email berhasil');
    
    // Test email dihapus, hanya memverifikasi koneksi
    
    return true;
  } catch (error: any) {
    console.error('Error koneksi server email:', error);
    return false;
  }
};

export const isEmailServiceEnabled = (): boolean => {
  return !!(transporter && 
            process.env.EMAIL_USER && 
            process.env.EMAIL_PASSWORD && 
            process.env.EMAIL_USER !== 'your_email@gmail.com');
};

export default transporter;
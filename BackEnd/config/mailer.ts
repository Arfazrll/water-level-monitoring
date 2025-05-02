// BackEnd/config/mailer.ts (Perbaikan)
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

// Fungsi untuk membuat transporter
const createTransporter = () => {
  // Verifikasi apakah kredensial email sudah dikonfigurasi
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Kredensial SMTP tidak dikonfigurasi. Notifikasi email tidak akan dikirim.');
    console.warn('Pastikan EMAIL_USER dan EMAIL_PASSWORD diatur di file .env');
    return null;
  }

  // PERBAIKAN: Nonaktifkan debug dan logging di production
  const enableDebug = process.env.NODE_ENV === 'development' && process.env.EMAIL_DEBUG === 'true';
  
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
      // PERBAIKAN: Nonaktifkan debug dan logger di production untuk menghindari eksposur kredensial
      debug: enableDebug,
      logger: enableDebug
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
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || 
        process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.warn('Konfigurasi email tidak lengkap. Verifikasi email dilewati.');
      return false;
    }
    
    if (!transporter) {
      console.warn('Email transporter tidak tersedia. Verifikasi email dilewati.');
      return false;
    }
    
    await transporter.verify();
    console.log('Koneksi server email berhasil');
    
    // Kirim email tes
    console.log('Mengirim email tes...');
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
        to: process.env.EMAIL_USER,
        subject: 'Test Email - Water Monitoring System',
        text: 'Sistem monitoring level air berhasil dikonfigurasi.',
        html: '<p>Sistem monitoring level air berhasil dikonfigurasi.</p>'
      });
      // PERBAIKAN: Kurangi log yang mengandung informasi sensitif
      console.log('Email tes berhasil dikirim:', info.messageId);
    } catch (testError) {
      console.error('Gagal mengirim email tes:', testError);
    }
    
    return true;
  } catch (error: any) {
    // Error handling yang sudah ada
    console.error('Error koneksi server email:', error);
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
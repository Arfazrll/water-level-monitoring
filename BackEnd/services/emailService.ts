// BackEnd/services/emailService.ts

import transporter, { isEmailServiceEnabled } from '../config/mailer';

export const sendAlertEmail = async (
  to: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    // Periksa apakah layanan email sudah dikonfigurasi
    if (!isEmailServiceEnabled()) {
      console.warn('Notifikasi email dilewati: Layanan email tidak dikonfigurasi');
      return false;
    }
    
    // Don't send if email is empty
    if (!to) {
      console.warn('Notifikasi email dilewati: Alamat email penerima tidak ada');
      return false;
    }
    
    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.warn(`Notifikasi email dilewati: Format email tidak valid "${to}"`);
      return false;
    }
    
    // Cek lagi transporter
    if (!transporter) {
      console.warn('Transporter email tidak tersedia');
      return false;
    }
    
    // Build HTML email dengan informasi lebih lengkap dan desain yang lebih baik
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="background-color: ${subject.includes('DANGER') ? '#dc3545' : '#ffc107'}; padding: 15px; border-radius: 5px 5px 0 0;">
          <h2 style="color: white; text-align: center; margin: 0;">
            ${subject}
          </h2>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            ${message}
          </p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid ${subject.includes('DANGER') ? '#dc3545' : '#ffc107'}; margin: 20px 0; padding: 15px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Waktu Peringatan:</strong> ${new Date().toLocaleString()}
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #555;">
              <strong>Jenis Peringatan:</strong> ${subject.includes('DANGER') ? 'BAHAYA' : 'PERINGATAN'}
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #555;">
              <strong>Tindakan yang disarankan:</strong> ${subject.includes('DANGER') ? 
                'Segera periksa sistem dan ambil tindakan untuk menurunkan level air!' : 
                'Pantau level air dan siapkan tindakan jika terus naik.'}
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            Silakan periksa Dashboard Pemantauan Ketinggian Air untuk detail lebih lanjut dan mengontrol sistem secara langsung.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/dashboard" 
               style="display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Buka Dashboard
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e4e4e4; margin-top: 20px; padding-top: 20px;">
          <p style="font-size: 14px; color: #777; text-align: center;">
            Ini adalah pesan otomatis dari Sistem Pemantauan Ketinggian Air. 
            Jangan membalas email ini.
          </p>
        </div>
      </div>
    `;
    
    // Debug
    console.log(`Mencoba mengirim email ke: ${to}`);
    console.log(`Email from: ${process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>'}`);
    
    // Send email dengan retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        if (!transporter) {
          console.warn('Transporter email masih null saat pengiriman');
          return false;
        }

        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
          to,
          subject,
          text: message,
          html
        });
        
        console.log('Email notifikasi berhasil dikirim:', info.messageId);
        return true;
      } catch (sendError) {
        retryCount++;
        console.error(`Percobaan ke-${retryCount} gagal mengirim email:`, sendError);
        
        if (retryCount >= maxRetries) {
          throw sendError;
        }
        
        // Tunggu sebelum retry (dengan exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error saat mengirim email notifikasi:', error);
    
    // Log informasi spesifik jika tersedia
    if (error instanceof Error) {
      if (error.message.includes('EAUTH')) {
        console.error('Kesalahan otentikasi email. Periksa username dan password di .env');
      } else if (error.message.includes('ESOCKET')) {
        console.error('Kesalahan koneksi ke server email. Periksa koneksi internet atau firewall');
      }
    }
    
    return false;
  }
};

export const sendPumpNotification = async (
  to: string,
  isActivated: boolean,
  waterLevel: number,
  unit: string = 'cm'
): Promise<boolean> => {
  try {
    // Periksa apakah layanan email sudah dikonfigurasi
    if (!isEmailServiceEnabled()) {
      console.warn('Notifikasi pompa dilewati: Layanan email tidak dikonfigurasi');
      return false;
    }
    
    // Don't send if email is empty
    if (!to) {
      console.warn('Notifikasi pompa dilewati: Alamat email penerima tidak ada');
      return false;
    }
    
    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.warn(`Notifikasi pompa dilewati: Format email tidak valid "${to}"`);
      return false;
    }
    
    const subject = isActivated 
      ? 'Pompa Air Diaktifkan' 
      : 'Pompa Air Dinonaktifkan';
    
    const message = isActivated
      ? `Pompa air telah diaktifkan secara otomatis karena ketinggian air mencapai ${waterLevel} ${unit}.`
      : `Pompa air telah dinonaktifkan secara otomatis karena ketinggian air turun menjadi ${waterLevel} ${unit}.`;
    
    // Build HTML email dengan desain yang lebih baik
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="background-color: #0d6efd; padding: 15px; border-radius: 5px 5px 0 0;">
          <h2 style="color: white; text-align: center; margin: 0;">
            ${subject}
          </h2>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            ${message}
          </p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #0d6efd; margin: 20px 0; padding: 15px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Waktu:</strong> ${new Date().toLocaleString()}
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #555;">
              <strong>Status Pompa:</strong> ${isActivated ? 'Aktif' : 'Tidak Aktif'}
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #555;">
              <strong>Ketinggian Air:</strong> ${waterLevel} ${unit}
            </p>
            <p style="margin: 10px 0 0; font-size: 14px; color: #555;">
              <strong>Mode:</strong> Otomatis
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            Anda dapat memeriksa dashboard untuk memantau perubahan level air dan mengontrol pompa secara manual jika diperlukan.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:3000/dashboard" 
               style="display: inline-block; padding: 10px 20px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Buka Dashboard
            </a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e4e4e4; margin-top: 20px; padding-top: 20px;">
          <p style="font-size: 14px; color: #777; text-align: center;">
            Ini adalah pesan otomatis dari Sistem Pemantauan Ketinggian Air. 
            Jangan membalas email ini.
          </p>
        </div>
      </div>
    `;
    
    // Send email dengan retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        if (!transporter) {
          console.warn('Transporter email masih null saat pengiriman');
          return false;
        }

        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
          to,
          subject,
          text: message,
          html
        });
        
        console.log('Email notifikasi pompa berhasil dikirim:', info.messageId);
        return true;
      } catch (sendError) {
        retryCount++;
        console.error(`Percobaan ke-${retryCount} gagal mengirim email:`, sendError);
        
        if (retryCount >= maxRetries) {
          throw sendError;
        }
        
        // Tunggu sebelum retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error saat mengirim email notifikasi pompa:', error);
    return false;
  }
};

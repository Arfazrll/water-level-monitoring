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
    
    // Build HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
        <h2 style="color: ${subject.includes('DANGER') ? '#dc3545' : '#ffc107'}; text-align: center;">
          ${subject}
        </h2>
        <p style="font-size: 16px; line-height: 1.5; color: #333;">
          ${message}
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #333;">
          Silakan periksa Dashboard Pemantauan Ketinggian Air untuk detail lebih lanjut.
        </p>
        <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">
          Ini adalah pesan otomatis dari Sistem Pemantauan Ketinggian Air Anda. 
          Jangan membalas email ini.
        </p>
      </div>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
      to,
      subject,
      text: message,
      html
    });
    
    console.log('Email notifikasi berhasil dikirim:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error saat mengirim email notifikasi:', error);
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
    
    // Build HTML email
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
        <h2 style="color: #0d6efd; text-align: center;">
          ${subject}
        </h2>
        <p style="font-size: 16px; line-height: 1.5; color: #333;">
          ${message}
        </p>
        <p style="font-size: 16px; line-height: 1.5; color: #333;">
          Ketinggian air saat ini: ${waterLevel} ${unit}
        </p>
        <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">
          Ini adalah pesan otomatis dari Sistem Pemantauan Ketinggian Air Anda. 
          Jangan membalas email ini.
        </p>
      </div>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
      to,
      subject,
      text: message,
      html
    });
    
    console.log('Email notifikasi pompa berhasil dikirim:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error saat mengirim email notifikasi pompa:', error);
    return false;
  }
};
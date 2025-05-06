// BackEnd/services/emailService.ts
import transporter, { isEmailServiceEnabled } from '../config/mailer';

export const sendAlertEmail = async (
  to: string,
  subject: string,
  message: string,
  alertType?: 'warning' | 'danger',
  level?: number,
  unit?: string
): Promise<boolean> => {
  try {
    // Periksa apakah layanan email sudah dikonfigurasi
    if (!isEmailServiceEnabled()) {
      console.warn('Notifikasi email dilewati: Layanan email tidak dikonfigurasi');
      return false;
    }
    
    // Validasi email penerima
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
    
    // Cek transporter
    if (!transporter) {
      console.warn('Transporter email tidak tersedia');
      return false;
    }
    
    let html = '';
    
    // Template HTML email berdasarkan jenis alert
    if (alertType === 'danger') {
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
          <div style="background-color: #dc3545; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="color: white; text-align: center; margin: 0; display: flex; align-items: center; justify-content: center;">
              <span style="display: inline-block; width: 24px; height: 24px; margin-right: 10px; background-color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 16px;">🚨</span>
              DANGER: Critical Water Level Detected - Immediate Action Required
            </h2>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
              <strong>Dear User,</strong>
            </p>
            
            <h3 style="color: #dc3545; margin-bottom: 15px;">PERINGATAN WATER LEVEL TINGGI</h3>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 15px;">
              The water level in your monitored tank/reservoir has reached the DANGER threshold.
            </p>
            
            <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0; color: #721c24;">
                <strong>🌊 Current Level: ${level} ${unit || 'cm'}</strong>
              </p>
              <p style="margin: 8px 0 0 0; color: #721c24;">
                <strong>⚠️ Danger Threshold: ${process.env.DANGER_LEVEL || 'N/A'} ${unit || 'cm'}</strong>
              </p>
            </div>
            
            <h3 style="color: #dc3545; margin-bottom: 10px;">Time of Alert: ${new Date().toLocaleString()}</h3>
            <h3 style="color: #dc3545; margin-bottom: 10px;">Location: ${process.env.LOCATION_NAME || 'Unknown Location'}</h3>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
              The emergency buzzer has been activated at the monitoring location. IMMEDIATE ACTION IS REQUIRED to prevent potential damage or flooding.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 15px;">
              View detailed information and historical data on your dashboard: <a href="${process.env.DASHBOARD_URL || '#'}" style="color: #dc3545; text-decoration: none;">${process.env.DASHBOARD_URL || '#'}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is an automated message from your Water Monitoring System.
            </p>
          </div>
        </div>
      `;
    } else if (alertType === 'warning') {
      html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
          <div style="background-color: #ffc107; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="color: #333; text-align: center; margin: 0; display: flex; align-items: center; justify-content: center;">
              <span style="display: inline-block; width: 24px; height: 24px; margin-right: 10px; background-color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 16px;">⚠️</span>
              WARNING: Water Level Has Reached Warning Threshold
            </h2>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
              <strong>Dear User,</strong>
            </p>
            
            <h3 style="color: #856404; margin-bottom: 15px;">WATER LEVEL WARNING</h3>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 15px;">
              The water level in your monitored tank/reservoir has reached the WARNING threshold.
            </p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <p style="margin: 0; color: #856404;">
                <strong>🌊 Current Level: ${level} ${unit || 'cm'}</strong>
              </p>
              <p style="margin: 8px 0 0 0; color: #856404;">
                <strong>⚠️ Warning Threshold: ${process.env.WARNING_LEVEL || 'N/A'} ${unit || 'cm'}</strong>
              </p>
            </div>
            
            <h3 style="color: #856404; margin-bottom: 10px;">Time of Alert: ${new Date().toLocaleString()}</h3>
            <h3 style="color: #856404; margin-bottom: 10px;">Location: ${process.env.LOCATION_NAME || 'Unknown Location'}</h3>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
              A warning buzzer has been activated at the monitoring location. Please check your water system as soon as possible.
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 15px;">
              View detailed information and historical data on your dashboard: <a href="${process.env.DASHBOARD_URL || '#'}" style="color: #ffc107; text-decoration: none;">${process.env.DASHBOARD_URL || '#'}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is an automated message from your Water Monitoring System.
            </p>
          </div>
        </div>
      `;
    } else {
      // Template default
      html = `
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
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This is an automated message from your Water Monitoring System.
            </p>
          </div>
        </div>
      `;
    }
    
    // Kirim email
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
    
    const subject = isActivated 
      ? 'Pompa Air Diaktifkan' 
      : 'Pompa Air Dinonaktifkan';
    
    const message = isActivated
      ? `Pompa air telah diaktifkan secara otomatis karena ketinggian air mencapai ${waterLevel} ${unit}.`
      : `Pompa air telah dinonaktifkan secara otomatis karena ketinggian air turun menjadi ${waterLevel} ${unit}.`;
    
    // Template HTML email
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
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
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
    
    // Kirim email
    if (!transporter) {
      console.warn('Transporter email tidak tersedia');
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
  } catch (error) {
    console.error('Error saat mengirim email notifikasi pompa:', error);
    return false;
  }
};

export const sendSystemStatusReport = async (
  to: string,
  startDate: string,
  endDate: string,
  waterLevelStats?: {
    maximum: number;
    minimum: number;
    average: number;
    unit: string;
  },
  alertHistory?: {
    warningCount: number;
    dangerCount: number;
    unacknowledgedCount: number;
  },
  systemStatus?: {
    online: boolean;
    deviceName: string;
    uptime: string;
  },
  batteryStatus?: number
): Promise<boolean> => {
  try {
    // Periksa apakah layanan email sudah dikonfigurasi
    if (!isEmailServiceEnabled()) {
      console.warn('System status report dilewati: Layanan email tidak dikonfigurasi');
      return false;
    }
    
    const subject = 'Water Monitoring System - Weekly Status Report';
    
    // Template HTML email untuk System Status Report
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e4; border-radius: 5px;">
        <div style="background-color: #0d6efd; padding: 15px; border-radius: 5px 5px 0 0;">
          <h2 style="color: white; text-align: center; margin: 0;">
            Water Monitoring System - Weekly Status Report
          </h2>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin-bottom: 20px;">
            <strong>Dear User,</strong>
          </p>
          
          <h3 style="color: #0d6efd; margin-bottom: 15px;">WEEKLY SYSTEM STATUS REPORT</h3>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Summary for period: ${startDate} to ${endDate}
          </p>
          
          ${systemStatus ? `
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">System Status: ${systemStatus.online ? 'Operational' : 'Offline'}</h4>
            <p style="margin: 0; color: #555;">Sensor Status: Functioning Normally</p>
            <p style="margin: 5px 0 0 0; color: #555;">Network Connectivity: ${systemStatus.online ? 'Stable' : 'Unstable'}</p>
          </div>
          ` : ''}
          
          ${waterLevelStats ? `
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Water Level Statistics:</h4>
            <p style="margin: 0; color: #555;">- Maximum Level: ${waterLevelStats.maximum} ${waterLevelStats.unit} on [MAX_DATE]</p>
            <p style="margin: 5px 0 0 0; color: #555;">- Minimum Level: ${waterLevelStats.minimum} ${waterLevelStats.unit} on [MIN_DATE]</p>
            <p style="margin: 5px 0 0 0; color: #555;">- Average Level: ${waterLevelStats.average} ${waterLevelStats.unit}</p>
          </div>
          ` : ''}
          
          ${alertHistory ? `
          <div style="background-color: #fff8e1; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Alert History:</h4>
            <p style="margin: 0; color: #555;">- Warning Alerts: ${alertHistory.warningCount}</p>
            <p style="margin: 5px 0 0 0; color: #555;">- Danger Alerts: ${alertHistory.dangerCount}</p>
            <p style="margin: 5px 0 0 0; color: #555;">- Pump Activations: [PUMP_COUNT]</p>
          </div>
          ` : ''}
          
          ${batteryStatus !== undefined ? `
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #333;">Battery Status: ${batteryStatus}%</h4>
          </div>
          ` : ''}
          
          <p style="font-size: 16px; line-height: 1.5; color: #333; margin-top: 20px;">
            For detailed analytics and historical data, please visit your dashboard:
            <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard" style="color: #0d6efd; text-decoration: none;">${process.env.DASHBOARD_URL || 'http://localhost:3000'}/dashboard</a>
          </p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This is an automated message from your Water Monitoring System.
          </p>
        </div>
      </div>
    `;
    
    // Kirim email
    if (!transporter) {
      console.warn('Transporter email tidak tersedia');
      return false;
    }
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
      to,
      subject,
      html
    });
    
    console.log('System status report berhasil dikirim:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error saat mengirim system status report:', error);
    return false;
  }
};
import transporter from '../config/mailer';

export const sendAlertEmail = async (
  to: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    // Don't send if email is empty
    if (!to) {
      console.warn('Email notification skipped: No recipient email provided');
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
          Please check your Water Level Monitoring Dashboard for more details.
        </p>
        <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">
          This is an automated message from your Water Level Monitoring System. 
          Do not reply to this email.
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
    
    console.log('Alert email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending alert email:', error);
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
    // Don't send if email is empty
    if (!to) {
      console.warn('Pump notification skipped: No recipient email provided');
      return false;
    }
    
    const subject = isActivated 
      ? 'Water Pump Activated' 
      : 'Water Pump Deactivated';
    
    const message = isActivated
      ? `The water pump has been automatically activated because the water level reached ${waterLevel} ${unit}.`
      : `The water pump has been automatically deactivated because the water level dropped to ${waterLevel} ${unit}.`;
    
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
          Current water level: ${waterLevel} ${unit}
        </p>
        <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">
          This is an automated message from your Water Level Monitoring System. 
          Do not reply to this email.
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
    
    console.log('Pump notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending pump notification email:', error);
    return false;
  }
};
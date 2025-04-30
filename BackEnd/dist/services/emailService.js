"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPumpNotification = exports.sendAlertEmail = void 0;
const mailer_1 = __importDefault(require("../config/mailer"));
const sendAlertEmail = (to, subject, message) => __awaiter(void 0, void 0, void 0, function* () {
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
        const info = yield mailer_1.default.sendMail({
            from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
            to,
            subject,
            text: message,
            html
        });
        console.log('Alert email sent:', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending alert email:', error);
        return false;
    }
});
exports.sendAlertEmail = sendAlertEmail;
const sendPumpNotification = (to_1, isActivated_1, waterLevel_1, ...args_1) => __awaiter(void 0, [to_1, isActivated_1, waterLevel_1, ...args_1], void 0, function* (to, isActivated, waterLevel, unit = 'cm') {
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
        const info = yield mailer_1.default.sendMail({
            from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
            to,
            subject,
            text: message,
            html
        });
        console.log('Pump notification email sent:', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error sending pump notification email:', error);
        return false;
    }
});
exports.sendPumpNotification = sendPumpNotification;
//# sourceMappingURL=emailService.js.map
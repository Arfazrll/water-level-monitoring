"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPumpNotification = exports.sendAlertEmail = void 0;
const mailer_1 = __importStar(require("../config/mailer"));
const sendAlertEmail = (to, subject, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Periksa apakah layanan email sudah dikonfigurasi
        if (!(0, mailer_1.isEmailServiceEnabled)()) {
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
        const info = yield mailer_1.default.sendMail({
            from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
            to,
            subject,
            text: message,
            html
        });
        console.log('Email notifikasi berhasil dikirim:', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error saat mengirim email notifikasi:', error);
        return false;
    }
});
exports.sendAlertEmail = sendAlertEmail;
const sendPumpNotification = (to_1, isActivated_1, waterLevel_1, ...args_1) => __awaiter(void 0, [to_1, isActivated_1, waterLevel_1, ...args_1], void 0, function* (to, isActivated, waterLevel, unit = 'cm') {
    try {
        // Periksa apakah layanan email sudah dikonfigurasi
        if (!(0, mailer_1.isEmailServiceEnabled)()) {
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
        const info = yield mailer_1.default.sendMail({
            from: process.env.EMAIL_FROM || '"Water Monitor" <alert@watermonitor.com>',
            to,
            subject,
            text: message,
            html
        });
        console.log('Email notifikasi pompa berhasil dikirim:', info.messageId);
        return true;
    }
    catch (error) {
        console.error('Error saat mengirim email notifikasi pompa:', error);
        return false;
    }
});
exports.sendPumpNotification = sendPumpNotification;
//# sourceMappingURL=emailService.js.map
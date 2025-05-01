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
exports.isEmailServiceEnabled = exports.verifyEmailConnection = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Validasi format email
const isValidEmail = (email) => {
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
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Tentukan host SMTP Gmail
    port: parseInt(process.env.EMAIL_PORT || '587'), // Tentukan port SMTP Gmail (587 untuk TLS)
    secure: process.env.EMAIL_SECURE === 'true', // Gunakan TLS jika aman
    auth: {
        user: userEmail || 'example@gmail.com', // default dummy
        pass: process.env.EMAIL_PASSWORD || 'dummy-password'
    }
});
// Verifikasi koneksi email saat startup
const verifyEmailConnection = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Jika kredensial email tidak dikonfigurasi, skip verifikasi
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD ||
            process.env.EMAIL_USER === 'your_email@gmail.com') {
            console.warn('Konfigurasi email tidak lengkap. Verifikasi email dilewati.');
            console.warn('Perbarui file .env dengan EMAIL_USER dan EMAIL_PASSWORD yang valid jika dibutuhkan.');
            return false;
        }
        yield transporter.verify();
        console.log('Koneksi server email berhasil');
        return true;
    }
    catch (error) {
        if (error.code === 'EDNS') {
            console.error('Error koneksi email: Nama domain tidak valid. Periksa format EMAIL_USER.');
            console.error('EMAIL_USER harus berupa alamat email lengkap, bukan hanya username.');
        }
        else if (error.code === 'EAUTH') {
            console.error('Error otentikasi email: Username/password tidak diterima.');
            console.error('Jika Anda menggunakan Gmail, pastikan untuk:');
            console.error('1. Mengaktifkan verifikasi 2 langkah di akun Gmail');
            console.error('2. Membuat password aplikasi di https://myaccount.google.com/apppasswords');
            console.error('3. Menggunakan password aplikasi tersebut di file .env');
        }
        else {
            console.error('Error koneksi server email:', error);
        }
        console.warn('Layanan email tidak tersedia. Notifikasi email tidak akan berfungsi.');
        return false;
    }
});
exports.verifyEmailConnection = verifyEmailConnection;
// Fungsi untuk mengecek apakah email berfungsi
const isEmailServiceEnabled = () => {
    return !!(process.env.EMAIL_USER &&
        process.env.EMAIL_PASSWORD &&
        process.env.EMAIL_USER !== 'your_email@gmail.com');
};
exports.isEmailServiceEnabled = isEmailServiceEnabled;
exports.default = transporter;
//# sourceMappingURL=mailer.js.map
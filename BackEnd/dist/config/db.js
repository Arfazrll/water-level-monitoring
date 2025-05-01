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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Ambil string koneksi MongoDB dari variabel lingkungan
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/water-monitoring';
// Variable untuk retry management
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRIES = 5;
// Fungsi untuk menghubungkan ke database dengan retry mechanism
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    // Mencegah multiple koneksi simultan
    if (isConnecting)
        return;
    isConnecting = true;
    try {
        console.log('Mencoba terhubung ke MongoDB...');
        // Pastikan string koneksi tersedia
        if (!MONGO_URI) {
            throw new Error('String koneksi MongoDB tidak ditemukan di variabel lingkungan');
        }
        // Log koneksi yang digunakan (sanitasi password)
        const sanitizedUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`Menggunakan connection string: ${sanitizedUri}`);
        // Opsi koneksi yang lebih robust
        const options = {
            serverSelectionTimeoutMS: 10000, // Timeout 10 detik
            socketTimeoutMS: 45000, // Socket timeout 45 detik
            family: 4, // Paksa gunakan IPv4
        };
        // Connect ke MongoDB
        yield mongoose_1.default.connect(MONGO_URI, options);
        // Reset counter jika berhasil
        connectionAttempts = 0;
        isConnecting = false;
        // Setup event listeners untuk memantau koneksi
        mongoose_1.default.connection.on('connected', () => {
            console.log('MongoDB connection established');
        });
        mongoose_1.default.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('MongoDB disconnected, attempting to reconnect...');
            if (!isConnecting) {
                setTimeout(() => connectDB(), 5000);
            }
        });
        console.log('MongoDB berhasil terhubung');
        // Cek database yang aktif
        const db = mongoose_1.default.connection.db;
        if (db) {
            console.log(`Terhubung ke database: ${db.databaseName}`);
            // Periksa dan buat collection jika belum ada
            const collections = yield db.listCollections().toArray();
            const collectionNames = collections.map(c => c.name);
            console.log('Collections yang tersedia:', collectionNames);
            // Buat collection yang diperlukan jika belum ada
            const requiredCollections = ['waterlevels', 'alerts', 'settings', 'pumplogs', 'users'];
            for (const collection of requiredCollections) {
                if (!collectionNames.includes(collection)) {
                    console.log(`Membuat collection "${collection}"...`);
                    yield db.createCollection(collection);
                }
            }
        }
        else {
            console.error('Gagal mendapatkan objek db, koneksi MongoDB mungkin tidak berhasil.');
        }
    }
    catch (error) {
        // Increment counter dan reset flag
        connectionAttempts++;
        isConnecting = false;
        // Handle berbagai jenis error
        if (error.name === 'MongoServerSelectionError' || error.code === 'ECONNREFUSED') {
            console.error(`Error koneksi MongoDB: Server tidak dapat dijangkau (${connectionAttempts}/${MAX_RETRIES})`);
            console.error('MongoDB mungkin tidak berjalan atau tidak dapat diakses.');
            if (MONGO_URI.includes('localhost') || MONGO_URI.includes('127.0.0.1')) {
                console.error('PETUNJUK: Pastikan MongoDB sudah diinstal dan service MongoDB sedang berjalan');
                console.error('1. Cek service MongoDB di services.msc (Windows)');
                console.error('2. Jika belum terinstal, download dan instal dari mongodb.com');
                console.error('3. Pastikan port 27017 tidak diblokir oleh firewall');
            }
            else if (MONGO_URI.includes('mongodb+srv')) {
                console.error('PETUNJUK: Ini adalah koneksi ke MongoDB Atlas (cloud)');
                console.error('1. Pastikan kredensial (username/password) sudah benar');
                console.error('2. Pastikan IP address Anda sudah ditambahkan ke whitelist di MongoDB Atlas');
                console.error('3. Periksa koneksi internet Anda');
            }
        }
        else if (error.name === 'MongoParseError') {
            console.error('Error parsing MongoDB URI:', error.message);
        }
        else if (error.message.includes('bad auth')) {
            console.error('Error otentikasi MongoDB: Username atau password tidak valid');
        }
        else {
            console.error('Error koneksi MongoDB:', error.message);
        }
        // Retry logic dengan exponential backoff
        if (connectionAttempts < MAX_RETRIES) {
            const retryDelay = Math.min(5000 * connectionAttempts, 30000); // Max 30s
            console.log(`Mencoba kembali dalam ${retryDelay / 1000} detik... (Percobaan ${connectionAttempts}/${MAX_RETRIES})`);
            setTimeout(() => connectDB(), retryDelay);
        }
        else {
            console.error(`Gagal terhubung ke MongoDB setelah ${MAX_RETRIES} percobaan.`);
            console.error('Aplikasi mungkin tidak akan berfungsi dengan semestinya');
            console.error('Solusi:');
            console.error('1. Pastikan MongoDB service berjalan (services.msc di Windows)');
            console.error('2. Periksa alamat dan port MongoDB di file .env');
            console.error('3. Coba gunakan MongoDB Atlas sebagai alternatif');
        }
    }
});
exports.default = connectDB;
//# sourceMappingURL=db.js.map
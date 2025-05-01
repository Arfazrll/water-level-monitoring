"use strict";
// BackEnd/server.ts
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
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("./config/db"));
const mailer_1 = require("./config/mailer");
const wsService_1 = require("./services/wsService");
const helpers_1 = require("./utils/helpers");
// Import sensor service
// Perbarui imports di server.ts untuk menggunakan mock sensorService
const sensorService_1 = require("./services/sensorService");
// Import models 
const WaterLevel_1 = __importDefault(require("./models/WaterLevel"));
const Setting_1 = __importDefault(require("./models/Setting"));
const Alert_1 = __importDefault(require("./models/Alert"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const Water_level_1 = __importDefault(require("./routes/api/Water-level"));
const alerts_1 = __importDefault(require("./routes/api/alerts"));
const pump_1 = __importDefault(require("./routes/api/pump"));
const settings_1 = __importDefault(require("./routes/api/settings"));
const test_1 = __importDefault(require("./routes/api/test"));
// Import services
const wsService_2 = require("./services/wsService");
const emailService_1 = require("./services/emailService");
// Load environment variables - lakukan ini sebelum kode lainnya
dotenv_1.default.config();
// Initialize Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Fungsi untuk menunggu beberapa detik
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Connect to Database with retry mechanism
const connectWithRetry = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (retries = 5, interval = 5000) {
    var _a;
    let currentRetry = 0;
    while (currentRetry < retries) {
        try {
            yield (0, db_1.default)();
            console.log('Koneksi MongoDB berhasil dibuat');
            return true;
        }
        catch (error) {
            currentRetry++;
            console.error(`Percobaan koneksi database ke-${currentRetry} gagal. Mencoba lagi dalam ${interval / 1000} detik...`);
            // Jika MongoDB Atlas gagal, coba MongoDB lokal
            if (((_a = process.env.MONGO_URI) === null || _a === void 0 ? void 0 : _a.includes('mongodb+srv')) && currentRetry === 2) {
                console.log('Mencoba terhubung ke MongoDB lokal...');
                try {
                    mongoose_1.default.connection.close();
                    yield wait(1000);
                    process.env.MONGO_URI = 'mongodb://localhost:27017/water-monitoring';
                    yield (0, db_1.default)();
                    console.log('Berhasil terhubung ke MongoDB lokal');
                    return true;
                }
                catch (localError) {
                    console.error('Gagal terhubung ke MongoDB lokal:', localError);
                }
            }
            if (currentRetry === retries) {
                console.error('Semua percobaan koneksi database gagal. Memulai server tanpa database...');
                console.warn('Beberapa fitur mungkin tidak berfungsi tanpa koneksi database');
                return false;
            }
            // Wait before retrying
            yield wait(interval);
        }
    }
    return false;
});
// Handler untuk pembacaan sensor
const handleSensorReading = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Buat objek waterLevel baru
        const waterLevelReading = new WaterLevel_1.default({
            level: data.level,
            unit: data.unit || 'cm',
        });
        yield waterLevelReading.save();
        console.log(`Level air dari sensor tercatat: ${data.level} ${data.unit}`);
        // Broadcast ke WebSocket clients
        (0, wsService_2.broadcastWaterLevel)(waterLevelReading);
        // Periksa thresholds dan buat alert jika perlu
        const settings = yield Setting_1.default.findOne();
        if (settings) {
            const { thresholds, notifications } = settings;
            let alertType = null;
            let alertMessage = '';
            // Periksa threshold bahaya
            if (data.level >= thresholds.dangerLevel) {
                alertType = 'danger';
                alertMessage = `Level air telah mencapai ambang BAHAYA (${data.level} ${data.unit})`;
            }
            // Periksa threshold peringatan
            else if (data.level >= thresholds.warningLevel) {
                alertType = 'warning';
                alertMessage = `Level air telah mencapai ambang PERINGATAN (${data.level} ${data.unit})`;
            }
            // Buat peringatan jika threshold terlampaui
            if (alertType) {
                const alert = new Alert_1.default({
                    level: data.level,
                    type: alertType,
                    message: alertMessage,
                    acknowledged: false,
                });
                yield alert.save();
                console.log(`Peringatan dibuat: ${alertType} pada level ${data.level}`);
                // Aktifkan buzzer berdasarkan jenis peringatan
                (0, sensorService_1.activateBuzzer)(alertType);
                // Broadcast peringatan ke WebSocket clients
                (0, wsService_2.broadcastAlert)(alert);
                // Kirim notifikasi email jika diaktifkan
                if (notifications.emailEnabled) {
                    if ((alertType === 'warning' && notifications.notifyOnWarning) ||
                        (alertType === 'danger' && notifications.notifyOnDanger)) {
                        try {
                            yield (0, emailService_1.sendAlertEmail)(notifications.emailAddress, `Peringatan Level Air ${alertType.toUpperCase()}`, alertMessage);
                        }
                        catch (emailError) {
                            console.error('Gagal mengirim email peringatan:', emailError);
                        }
                    }
                }
            }
        }
    }
    catch (error) {
        console.error('Error memproses pembacaan sensor:', error);
    }
});
// Middleware
app.use(body_parser_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error yang tidak tertangani:', err);
    res.status(500).json({
        message: 'Kesalahan server internal',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/water-level', Water_level_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/pump', pump_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/test', test_1.default);
// Basic root route
app.get('/', (req, res) => {
    res.send('API Pemantauan Ketinggian Air sedang berjalan...');
});
// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        version: '1.0.0',
        time: new Date().toISOString(),
        db_connected: mongoose_1.default.connection.readyState === 1,
        mode: process.env.NODE_ENV || 'development',
        sensor_simulation: process.env.SIMULATE_SENSOR === 'true'
    });
});
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket server
const wsServer = (0, wsService_1.initWebSocketServer)(server);
// Start the server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    // Coba terhubung ke database terlebih dahulu
    yield connectWithRetry(3, 3000);
    // Coba verifikasi koneksi email
    try {
        const emailConnected = yield (0, mailer_1.verifyEmailConnection)();
        if (!emailConnected) {
            console.warn('Layanan email tidak terhubung. Email notifikasi tidak akan dikirim.');
            console.warn('Periksa variabel lingkungan EMAIL_* di file .env jika notifikasi email diperlukan.');
        }
    }
    catch (error) {
        console.error('Error saat memverifikasi koneksi email:', error);
        console.warn('Layanan notifikasi email tidak akan tersedia.');
    }
    // Inisialisasi sensor
    if (process.env.NODE_ENV === 'production' && process.env.SIMULATE_SENSOR !== 'true') {
        // Inisialisasi sensor fisik
        (0, sensorService_1.initSensor)();
        // Listen untuk pembacaan sensor
        sensorService_1.sensorEvents.on('reading', handleSensorReading);
        console.log('Sensor hardware diinisialisasi');
    }
    else {
        console.log('Berjalan dalam mode simulasi sensor');
    }
    // Mulai server meskipun koneksi gagal
    server.listen(PORT, () => {
        console.log(`Server berjalan di port ${PORT}`);
        console.log(`Mode server: ${process.env.NODE_ENV || 'development'}`);
        // Simulate water level readings in development mode
        if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
            console.log('Memulai simulasi sensor ketinggian air...');
            // Simulasi pembacaan setiap 5 detik
            const simulationInterval = setInterval(() => {
                (0, helpers_1.simulateWaterLevelReading)(`http://localhost:${PORT}`)
                    .catch(error => {
                    console.error('Error dalam simulasi ketinggian air:', error);
                    // Jika database tidak terhubung, hentikan simulasi untuk menghindari error log yang berlebihan
                    if (error.message && error.message.includes('buffering timed out')) {
                        console.warn('Menghentikan simulasi karena koneksi database tidak tersedia');
                        clearInterval(simulationInterval);
                    }
                });
            }, 10000); // Diperpanjang menjadi 10 detik
            // Tambahkan listener untuk menghentikan simulasi saat server berhenti
            process.on('SIGINT', () => {
                console.log('Menghentikan simulasi...');
                clearInterval(simulationInterval);
                process.exit(0);
            });
        }
    });
});
// Start the server
startServer().catch(err => {
    console.error('Gagal memulai server:', err);
    process.exit(1);
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Rejection yang tidak tertangani: ${err.message}`);
    console.error(err.stack);
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error(`Exception yang tidak tertangani: ${err.message}`);
    console.error(err.stack);
    // Close server & exit process
    server.close(() => process.exit(1));
});
//# sourceMappingURL=server.js.map
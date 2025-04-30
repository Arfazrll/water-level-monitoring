"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_1 = __importDefault(require("./config/db"));
const mailer_1 = require("./config/mailer");
const wsService_1 = require("./services/wsService");
const helpers_1 = require("./utils/helpers");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const Water_level_1 = __importDefault(require("./routes/api/Water-level"));
const alerts_1 = __importDefault(require("./routes/api/alerts"));
const pump_1 = __importDefault(require("./routes/api/pump"));
const settings_1 = __importDefault(require("./routes/api/settings"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to Database
(0, db_1.default)();
// Initialize email connection
(0, mailer_1.verifyEmailConnection)();
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
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/water-level', Water_level_1.default);
app.use('/api/alerts', alerts_1.default);
app.use('/api/pump', pump_1.default);
app.use('/api/settings', settings_1.default);
// Basic root route
app.get('/', (req, res) => {
    res.send('Water Level Monitoring API is running...');
});
// Create HTTP server
const server = http_1.default.createServer(app);
// Initialize WebSocket server
(0, wsService_1.initWebSocketServer)(server);
// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Simulate water level readings in development mode
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_SENSOR === 'true') {
        console.log('Starting water level sensor simulation...');
        // Simulate readings every 5 seconds
        setInterval(() => {
            (0, helpers_1.simulateWaterLevelReading)(`http://localhost:${PORT}`);
        }, 5000);
    }
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
//# sourceMappingURL=server.js.map
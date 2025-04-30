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
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastSettings = exports.broadcastPumpStatus = exports.broadcastAlert = exports.broadcastWaterLevel = exports.initWebSocketServer = void 0;
const ws_1 = __importStar(require("ws"));
let wss;
// Initialize WebSocket server
const initWebSocketServer = (server) => {
    wss = new ws_1.WebSocketServer({ server });
    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');
        // Send initial connection confirmation
        ws.send(JSON.stringify({
            type: 'connection',
            data: { status: 'connected' }
        }));
        // Handle client messages
        ws.on('message', (message) => {
            try {
                console.log(`Received message: ${message}`);
            }
            catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });
        // Handle disconnection
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });
    });
    console.log('WebSocket server initialized');
    return wss;
};
exports.initWebSocketServer = initWebSocketServer;
// Broadcast water level update to all connected clients
const broadcastWaterLevel = (waterLevel) => {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify({
                type: 'waterLevel',
                data: {
                    timestamp: waterLevel.createdAt.toISOString(),
                    level: waterLevel.level,
                    unit: waterLevel.unit
                }
            }));
        }
    });
};
exports.broadcastWaterLevel = broadcastWaterLevel;
// Broadcast alert to all connected clients
const broadcastAlert = (alert) => {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify({
                type: 'alert',
                data: {
                    id: alert._id,
                    timestamp: alert.createdAt.toISOString(),
                    level: alert.level,
                    type: alert.type,
                    message: alert.message,
                    acknowledged: alert.acknowledged
                }
            }));
        }
    });
};
exports.broadcastAlert = broadcastAlert;
// Broadcast pump status to all connected clients
const broadcastPumpStatus = (pumpStatus) => {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify({
                type: 'pumpStatus',
                data: pumpStatus
            }));
        }
    });
};
exports.broadcastPumpStatus = broadcastPumpStatus;
// Broadcast settings update to all connected clients
const broadcastSettings = (settings) => {
    if (!wss) {
        console.warn('WebSocket server not initialized');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify({
                type: 'settings',
                data: settings
            }));
        }
    });
};
exports.broadcastSettings = broadcastSettings;
//# sourceMappingURL=wsService.js.map
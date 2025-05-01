"use strict";
// BackEnd/services/wsService.ts
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
        // Handle client messages with improved error handling
        ws.on('message', (message) => {
            try {
                console.log(`Received WebSocket message: ${message}`);
                // Try to parse the message
                const data = JSON.parse(message.toString());
                // Handle specific message types
                if (data.type === 'acknowledgeAlert') {
                    // Validate the alert ID
                    if (!data.alertId || data.alertId === 'undefined' || data.alertId === 'null') {
                        console.error('Invalid alert ID in WebSocket message:', data);
                        // Send error response back to client
                        ws.send(JSON.stringify({
                            type: 'error',
                            data: { message: 'Invalid alert ID' }
                        }));
                        return;
                    }
                    // Handle alert acknowledgment - would need to implement API call here
                    console.log(`WebSocket request to acknowledge alert ID: ${data.alertId}`);
                    // You could call your alert service here
                    // acknowledgeAlertService(data.alertId)
                    //   .then(result => {
                    //     ws.send(JSON.stringify({
                    //       type: 'alertAcknowledged',
                    //       data: result
                    //     }));
                    //   })
                    //   .catch(error => {
                    //     ws.send(JSON.stringify({
                    //       type: 'error',
                    //       data: { message: error.message }
                    //     }));
                    //   });
                }
            }
            catch (error) {
                console.error('Error handling WebSocket message:', error);
                // Send error response back to client
                try {
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: { message: 'Invalid message format' }
                    }));
                }
                catch (sendError) {
                    console.error('Error sending error response via WebSocket:', sendError);
                }
            }
        });
        // Handle disconnection
        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });
        // Handle WebSocket errors
        ws.on('error', (error) => {
            console.error('WebSocket connection error:', error);
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
    if (!waterLevel || !waterLevel.createdAt) {
        console.warn('Invalid water level data for broadcast', waterLevel);
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'waterLevel',
                    data: {
                        timestamp: waterLevel.createdAt.toISOString(),
                        level: waterLevel.level,
                        unit: waterLevel.unit
                    }
                }));
            }
            catch (error) {
                console.error('Error broadcasting water level:', error);
            }
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
    // Validate alert object
    if (!alert || !alert._id || !alert.createdAt) {
        console.warn('Invalid alert data for broadcast', alert);
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            try {
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
            catch (error) {
                console.error('Error broadcasting alert:', error);
            }
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
    if (!pumpStatus) {
        console.warn('Invalid pump status data for broadcast');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'pumpStatus',
                    data: pumpStatus
                }));
            }
            catch (error) {
                console.error('Error broadcasting pump status:', error);
            }
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
    if (!settings) {
        console.warn('Invalid settings data for broadcast');
        return;
    }
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            try {
                client.send(JSON.stringify({
                    type: 'settings',
                    data: settings
                }));
            }
            catch (error) {
                console.error('Error broadcasting settings:', error);
            }
        }
    });
};
exports.broadcastSettings = broadcastSettings;
//# sourceMappingURL=wsService.js.map
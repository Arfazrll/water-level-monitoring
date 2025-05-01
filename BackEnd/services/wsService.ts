// BackEnd/services/wsService.ts (Perbaikan)

import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { WaterLevel } from '../models/WaterLevel';
import { Alert } from '../models/Alert';
import { ThresholdSettings } from '../models/Setting';

// Define PumpStatus interface
interface PumpStatus {
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}

// Pakai variabel lokal untuk websocket server, private di module ini
let wss: WebSocketServer | null = null;

// Set untuk melacak koneksi client aktif
const connectedClients = new Set<WebSocket>();

// Status koneksi untuk monitoring
let wsStatus = {
  isInitialized: false,
  activeConnections: 0,
  lastBroadcast: null as Date | null
};

// Initialize WebSocket server
export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  try {
    wss = new WebSocketServer({ server });
    wsStatus.isInitialized = true;
    
    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`Client connected to WebSocket from ${clientIp}`);
      
      // Tambahkan ke set koneksi
      connectedClients.add(ws);
      wsStatus.activeConnections = connectedClients.size;
      
      // Send initial connection confirmation
      try {
        sendToClient(ws, {
          type: 'connection',
          data: { 
            status: 'connected', 
            timestamp: new Date().toISOString(),
            message: 'Connected to Water Monitoring WebSocket Server'
          }
        });
      } catch (error) {
        console.error('Error sending connection confirmation:', error);
      }
      
      // Handle client messages with improved error handling
      ws.on('message', (message: WebSocket.Data) => {
        try {
          console.log(`Received WebSocket message: ${message}`);
          
          // Validasi message
          if (!message) {
            console.warn('Received empty WebSocket message');
            return;
          }
          
          // Try to parse the message
          const data = JSON.parse(message.toString());
          
          if (!data || !data.type) {
            throw new Error('Invalid message format: missing type field');
          }
          
          // Handle specific message types
          if (data.type === 'acknowledgeAlert') {
            // Validate the alert ID
            if (!data.alertId || data.alertId === 'undefined' || data.alertId === 'null') {
              console.error('Invalid alert ID in WebSocket message:', data);
              // Send error response back to client
              sendToClient(ws, {
                type: 'error',
                data: { message: 'ID peringatan tidak valid', timestamp: new Date().toISOString() }
              });
              return;
            }
            
            // Handle alert acknowledgment - would need to implement API call here
            console.log(`WebSocket request to acknowledge alert ID: ${data.alertId}`);
            
            // Acknowledge success message
            sendToClient(ws, {
              type: 'acknowledgeSuccess',
              data: { 
                alertId: data.alertId, 
                message: 'Peringatan berhasil diketahui',
                timestamp: new Date().toISOString() 
              }
            });
          }
          
          // Ping/pong for keep-alive check
          else if (data.type === 'ping') {
            sendToClient(ws, {
              type: 'pong',
              data: { timestamp: new Date().toISOString() }
            });
          }
          
          // Unknown message type
          else {
            console.warn(`Unknown WebSocket message type: ${data.type}`);
            sendToClient(ws, {
              type: 'error',
              data: { 
                message: `Tipe pesan tidak dikenal: ${data.type}`, 
                timestamp: new Date().toISOString() 
              }
            });
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          
          // Send error response back to client
          try {
            sendToClient(ws, {
              type: 'error',
              data: { 
                message: 'Format pesan tidak valid', 
                timestamp: new Date().toISOString() 
              }
            });
          } catch (sendError) {
            console.error('Error sending error response via WebSocket:', sendError);
          }
        }
      });
      
      // Handle disconnection
      ws.on('close', (code: number, reason: string) => {
        console.log(`Client disconnected from WebSocket. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
        connectedClients.delete(ws);
        wsStatus.activeConnections = connectedClients.size;
      });
      
      // Handle WebSocket errors with improved logging
      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
        try {
          sendToClient(ws, {
            type: 'error',
            data: { 
              message: 'Terjadi kesalahan koneksi WebSocket', 
              timestamp: new Date().toISOString() 
            }
          });
        } catch (sendError) {
          console.error('Failed to send error message to client:', sendError);
        }
        connectedClients.delete(ws);
        wsStatus.activeConnections = connectedClients.size;
      });
    });
    
    console.log('WebSocket server initialized successfully');
    
    // Improved ping mechanism to keep connections alive
    // Setiap 30 detik kirim ping ke semua client yang terhubung
    const pingInterval = setInterval(() => {
      if (!wss) {
        clearInterval(pingInterval);
        return;
      }
      
      let activePingCount = 0;
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping('', false, (err) => {
              if (err) {
                console.error('WebSocket ping error:', err);
              }
            });
            activePingCount++;
          } catch (error) {
            console.error('Error sending ping to client:', error);
            // Try to terminate bad connection
            try {
              client.terminate();
            } catch (termError) {
              console.error('Error terminating client connection:', termError);
            }
            connectedClients.delete(client);
          }
        } else if (client.readyState === WebSocket.CLOSING || client.readyState === WebSocket.CLOSED) {
          connectedClients.delete(client);
        }
      });
      
      // Update status
      wsStatus.activeConnections = connectedClients.size;
      console.log(`WebSocket ping sent to ${activePingCount} active clients`);
    }, 30000); // every 30 seconds
    
    // Handle WebSocket server errors
    wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      wsStatus.isInitialized = false;
    });
    
    return wss;
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
    wsStatus.isInitialized = false;
    throw error;
  }
};

// Safe helper function to send messages to clients with error handling
function sendToClient(client: WebSocket, data: any): boolean {
  if (client.readyState === WebSocket.OPEN) {
    try {
      const payload = JSON.stringify(data);
      client.send(payload);
      return true;
    } catch (error) {
      console.error('Error sending message to client:', error);
      return false;
    }
  }
  return false;
}

// Broadcast water level update to all connected clients
export const broadcastWaterLevel = (waterLevel: WaterLevel): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.warn('WebSocket server not initialized, cannot broadcast water level');
    return false;
  }
  
  if (!waterLevel) {
    console.warn('Invalid water level data for broadcast', waterLevel);
    return false;
  }
  
  const timestamp = waterLevel.createdAt instanceof Date 
    ? waterLevel.createdAt.toISOString() 
    : new Date().toISOString();
  
  const payload = {
    type: 'waterLevel',
    data: {
      timestamp: timestamp,
      level: waterLevel.level,
      unit: waterLevel.unit || 'cm'
    }
  };
  
  return broadcast(payload);
};

// Broadcast alert to all connected clients
export const broadcastAlert = (alert: Alert): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.warn('WebSocket server not initialized, cannot broadcast alert');
    return false;
  }
  
  // Validate alert object
  if (!alert || !alert._id) {
    console.warn('Invalid alert data for broadcast', alert);
    return false;
  }
  
  const timestamp = alert.createdAt instanceof Date 
    ? alert.createdAt.toISOString() 
    : new Date().toISOString();
  
  const payload = {
    type: 'alert',
    data: {
      id: alert._id.toString(),
      timestamp: timestamp,
      level: alert.level,
      type: alert.type,
      message: alert.message,
      acknowledged: alert.acknowledged
    }
  };
  
  return broadcast(payload);
};

// Broadcast pump status to all connected clients
export const broadcastPumpStatus = (pumpStatus: PumpStatus): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.warn('WebSocket server not initialized, cannot broadcast pump status');
    return false;
  }
  
  // Validate pump status object
  if (pumpStatus === undefined || pumpStatus === null) {
    console.warn('Invalid pump status data for broadcast', pumpStatus);
    return false;
  }
  
  const payload = {
    type: 'pumpStatus',
    data: {
      isActive: pumpStatus.isActive,
      mode: pumpStatus.mode,
      lastActivated: pumpStatus.lastActivated,
      timestamp: new Date().toISOString()
    }
  };
  
  return broadcast(payload);
};

// Broadcast settings to all connected clients
export const broadcastSettings = (settings: ThresholdSettings): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.warn('WebSocket server not initialized, cannot broadcast settings');
    return false;
  }
  
  // Validate settings object
  if (!settings) {
    console.warn('Invalid settings data for broadcast', settings);
    return false;
  }
  
  // Create a copy of settings we can safely modify for broadcast
  const settingsForBroadcast = {
    warningLevel: settings.warningLevel,
    dangerLevel: settings.dangerLevel,
    pumpActivationLevel: settings.pumpActivationLevel,
    pumpDeactivationLevel: settings.pumpDeactivationLevel,
    unit: settings.unit || 'cm',
    maxLevel: settings.maxLevel || 100,
    minLevel: settings.minLevel || 0,
    timestamp: new Date().toISOString()
  };
  
  // Get pump mode from elsewhere if needed
  // We can either get it from pumpState or fetch it from database
  // For now, we'll set a default
  const mode = 'auto'; // Default value
  
  const payload = {
    type: 'settings',
    data: {
      ...settingsForBroadcast,
      pumpMode: mode
    }
  };
  
  return broadcast(payload);
};

// Generic broadcast function with improved error handling
function broadcast(payload: any): boolean {
  if (!wss) {
    console.warn('WebSocket server not initialized, cannot broadcast');
    return false;
  }
  
  let successCount = 0;
  let failCount = 0;
  
  // Update last broadcast timestamp
  wsStatus.lastBroadcast = new Date();
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        const jsonPayload = JSON.stringify(payload);
        client.send(jsonPayload);
        successCount++;
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        failCount++;
        // Don't throw here since we're in a forEach and want to continue
      }
    }
  });
  
  if (failCount > 0) {
    console.warn(`Broadcast partially failed: ${successCount} successful, ${failCount} failed`);
  }
  
  return successCount > 0;
}

// Menambahkan fungsi untuk menentukan jumlah koneksi aktif
export const getActiveConnectionCount = (): number => {
  return connectedClients.size;
};

// Get WebSocket server status
export const getWebSocketStatus = () => {
  return {
    ...wsStatus,
    activeConnections: connectedClients.size
  };
};

// Fungsi untuk pengujian koneksi WebSocket
export const testWebSocket = (): boolean => {
  return wss !== null && wsStatus.isInitialized;
};
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { WaterLevel } from '../models/WaterLevel';
import { Alert } from '../models/Alert';
import { ThresholdSettings } from '../models/Setting';

// Define PumpStatus interface to match the structure in pump.ts
interface PumpStatus {
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}

let wss: WebSocketServer;

// Set untuk melacak koneksi client
const connectedClients = new Set<WebSocket>();

// Initialize WebSocket server
export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Tambahkan ke set koneksi
    connectedClients.add(ws);
    
    // Send initial connection confirmation
    sendToClient(ws, {
      type: 'connection',
      data: { status: 'connected', timestamp: new Date().toISOString() }
    });
    
    // Handle client messages with improved error handling
    ws.on('message', (message: WebSocket.Data) => {
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
            sendToClient(ws, {
              type: 'error',
              data: { message: 'ID peringatan tidak valid', timestamp: new Date().toISOString() }
            });
            return;
          }
          
          // Handle alert acknowledgment - would need to implement API call here
          console.log(`WebSocket request to acknowledge alert ID: ${data.alertId}`);
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
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      connectedClients.delete(ws);
    });
    
    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      connectedClients.delete(ws);
    });
  });
  
  console.log('WebSocket server initialized');
  
  // Setup ping mechanism to keep connections alive
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.ping();
        } catch (error) {
          console.error('Error sending ping to client:', error);
        }
      }
    });
  }, 30000); // every 30 seconds
  
  return wss;
};

// Safe helper function to send messages to clients
function sendToClient(client: WebSocket, data: any) {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(data));
    } catch (error) {
      console.error('Error sending message to client:', error);
      throw error; // Re-throw to be handled by caller
    }
  }
}

// Broadcast water level update to all connected clients
export const broadcastWaterLevel = (waterLevel: WaterLevel): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  if (!waterLevel) {
    console.warn('Invalid water level data for broadcast', waterLevel);
    return;
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
  
  broadcast(payload);
};

// Broadcast alert to all connected clients
export const broadcastAlert = (alert: Alert): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  // Validate alert object
  if (!alert || !alert._id) {
    console.warn('Invalid alert data for broadcast', alert);
    return;
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
  
  broadcast(payload);
};

// Broadcast pump status to all connected clients
export const broadcastPumpStatus = (pumpStatus: PumpStatus): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  // Validate pump status object
  if (pumpStatus === undefined || pumpStatus === null) {
    console.warn('Invalid pump status data for broadcast', pumpStatus);
    return;
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
  
  broadcast(payload);
};

// Broadcast settings to all connected clients
export const broadcastSettings = (settings: ThresholdSettings): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  // Validate settings object
  if (!settings) {
    console.warn('Invalid settings data for broadcast', settings);
    return;
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
  
  broadcast(payload);
};

// Generic broadcast function with error handling
function broadcast(payload: any): void {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(payload));
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        // Don't throw here since we're in a forEach and want to continue
      }
    }
  });
}

// Menambahkan fungsi untuk menentukan jumlah koneksi aktif
export const getActiveConnectionCount = (): number => {
  return connectedClients.size;
};
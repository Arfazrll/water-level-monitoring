import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { WaterLevel } from '../models/WaterLevel';
import { Alert } from '../models/Alert';
import { ThresholdSettings } from '../models/Setting';

let wss: WebSocketServer;

// Initialize WebSocket server
export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      data: { status: 'connected' }
    }));
    
    // Handle client messages
    ws.on('message', (message: string) => {
      try {
        console.log(`Received message: ${message}`);
      } catch (error) {
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

// Broadcast water level update to all connected clients
export const broadcastWaterLevel = (waterLevel: WaterLevel): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
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

// Broadcast alert to all connected clients
export const broadcastAlert = (alert: Alert): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
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

// Broadcast pump status to all connected clients
export const broadcastPumpStatus = (pumpStatus: { 
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'pumpStatus',
        data: pumpStatus
      }));
    }
  });
};

// Broadcast settings update to all connected clients
export const broadcastSettings = (settings: ThresholdSettings): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'settings',
        data: settings
      }));
    }
  });
};
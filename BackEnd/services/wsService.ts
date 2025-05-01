// BackEnd/services/wsService.ts

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
    
    // Handle client messages with improved error handling
    ws.on('message', (message: string) => {
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
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        
        // Send error response back to client
        try {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        } catch (sendError) {
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

// Broadcast water level update to all connected clients
export const broadcastWaterLevel = (waterLevel: WaterLevel): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  if (!waterLevel || !waterLevel.createdAt) {
    console.warn('Invalid water level data for broadcast', waterLevel);
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'waterLevel',
          data: {
            timestamp: waterLevel.createdAt.toISOString(),
            level: waterLevel.level,
            unit: waterLevel.unit
          }
        }));
      } catch (error) {
        console.error('Error broadcasting water level:', error);
      }
    }
  });
};

// Broadcast alert to all connected clients
export const broadcastAlert = (alert: Alert): void => {
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
    if (client.readyState === WebSocket.OPEN) {
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
      } catch (error) {
        console.error('Error broadcasting alert:', error);
      }
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
  
  if (!pumpStatus) {
    console.warn('Invalid pump status data for broadcast');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'pumpStatus',
          data: pumpStatus
        }));
      } catch (error) {
        console.error('Error broadcasting pump status:', error);
      }
    }
  });
};

// Broadcast settings update to all connected clients
export const broadcastSettings = (settings: ThresholdSettings): void => {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }
  
  if (!settings) {
    console.warn('Invalid settings data for broadcast');
    return;
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'settings',
          data: settings
        }));
      } catch (error) {
        console.error('Error broadcasting settings:', error);
      }
    }
  });
};
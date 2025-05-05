import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface WebSocketMessage {
  type: string;
  data?: any;
  id?: string;
  timestamp?: number | string;
}

let wsStatus = {
  isInitialized: false,
  activeConnections: 0,
  totalConnections: 0,
  lastBroadcast: null as Date | null,
  startTime: new Date()
};

const connectedClients = new Set<WebSocket>();

const clients = new Map<WebSocket, {
  id: string;
  ip: string;
  userAgent: string;
  connectedAt: Date;
  lastActivity: Date;
  pingCount: number;
  clientType: string;
}>();

let wss: WebSocketServer | null = null;

/**
 * Inisialisasi server WebSocket
 * @param server - Server HTTP yang sudah ada
 */
export const initWebSocketServer = (server: HttpServer): WebSocketServer => {
  try {
    if (wss) {
      console.log('WebSocket server sudah diinisialisasi');
      return wss;
    }
    
    wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });
    
    wsStatus.isInitialized = true;
    wsStatus.startTime = new Date();
    
    console.log('Server WebSocket berhasil diinisialisasi pada jalur: /ws');
    
    // Menangani event koneksi baru
    wss.on('connection', (ws: WebSocket, req) => {
      // Menetapkan ID unik untuk setiap koneksi
      const clientId = uuidv4();
      const ip = req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      clients.set(ws, {
        id: clientId,
        ip,
        userAgent,
        connectedAt: new Date(),
        lastActivity: new Date(),
        pingCount: 0,
        clientType: 'web' // default, bisa diubah berdasarkan info dari klien
      });
      
      connectedClients.add(ws);
      
      wsStatus.activeConnections = clients.size;
      wsStatus.totalConnections++;
      
      console.log(`Klien terhubung ke WebSocket dari ${ip} dengan ID: ${clientId}`);
      
      sendToClient(ws, {
        type: 'connection',
        data: { 
          status: 'connected', 
          timestamp: new Date().toISOString(),
          message: 'Terhubung ke Server WebSocket Monitor Air',
          clientId
        }
      });
      
      ws.on('message', (rawMessage) => {
        try {
          // Memperbarui timestamp aktivitas terakhir
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            clientInfo.lastActivity = new Date();
          }
          
          console.log(`Menerima pesan WebSocket dari klien ${clientId}`);
          const message = JSON.parse(rawMessage.toString());
          
          switch (message.type) {
            case 'ping':
              sendToClient(ws, {
                type: 'pong',
                data: {
                  timestamp: new Date().toISOString(),
                  originalTimestamp: message.data?.timestamp
                }
              });
              
              if (clientInfo) {
                clientInfo.pingCount++;
                if (message.data?.clientInfo) {
                  clientInfo.clientType = message.data.clientInfo;
                }
              }
              break;
              
            case 'subscribe':
              console.log(`Klien ${clientId} melakukan subscribe ke: ${message.data?.topics}`);
              break;
              
            case 'disconnect':
              console.log(`Klien ${clientId} meminta disconnect: ${message.data?.reason || 'Tidak ada alasan'}`);
              ws.close();
              break;
              
            default:
              console.log(`Menerima pesan dari klien ${clientId}:`, message);
              break;
          }
        } catch (err) {
          console.error('Error menangani pesan WebSocket:', err);
        }
      });
      
      ws.on('close', () => {
        console.log(`Klien WebSocket terputus: ${clientId}`);
        clients.delete(ws);
        connectedClients.delete(ws);
        wsStatus.activeConnections = clients.size;
      });
      
      ws.on('error', (error) => {
        console.error(`Error koneksi WebSocket untuk klien ${clientId}:`, error);
        clients.delete(ws);
        connectedClients.delete(ws);
      });
    });
    
    wss.on('error', (error) => {
      console.error('Error server WebSocket:', error);
    });

    setInterval(() => {
      cleanInactiveConnections();
    }, 30000); // Cek setiap 30 detik
    
    return wss;
  } catch (error) {
    console.error('Gagal menginisialisasi server WebSocket:', error);
    wsStatus.isInitialized = false;
    throw error;
  }
};

/**
 * Mengirim pesan ke klien tertentu
 * @param client - Koneksi klien WebSocket
 * @param message - Pesan yang akan dikirim
 */
export const sendToClient = (client: WebSocket, message: WebSocketMessage): boolean => {
  try {
    if (client.readyState === WebSocket.OPEN) {
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }
      
      if (!message.id) {
        message.id = uuidv4();
      }
      
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error mengirim pesan ke klien:', error);
    return false;
  }
};

/**
 * Broadcast pesan ke semua klien yang terhubung
 * @param message - Pesan yang akan di-broadcast
 * @param filter - Fungsi opsional untuk memfilter klien yang akan menerima pesan
 */
export const broadcast = (data: any): boolean => {
  if (!wss) {
    console.log('Server WebSocket belum diinisialisasi');
    return false;
  }
  
  let successCount = 0;
  
  try {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          successCount++;
        } catch (error) {
          console.error('Error mengirim pesan ke klien:', error);
        }
      }
    });
    
    wsStatus.lastBroadcast = new Date();
  } catch (error) {
    console.error('Error broadcast WebSocket:', error);
    return false;
  }
  
  return successCount > 0;
};

/**
 * Implementasi baru broadcast dengan fitur tambahan (kompatibilitas mundur)
 */
export const broadcastMessage = (
  message: WebSocketMessage,
  filter?: (client: WebSocket) => boolean
): number => {
  if (!wss) {
    console.warn('WebSocket server belum diinisialisasi');
    return 0;
  }
  
  let sentCount = 0;

  if (!message.timestamp) {
    message.timestamp = new Date().toISOString();
  }
  
  if (!message.id) {
    message.id = uuidv4();
  }
  
  const messageString = JSON.stringify(message);
  
  clients.forEach((clientInfo, client) => {
    try {
      if (filter && !filter(client)) {
        return;
      }
      
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
        sentCount++;
      }
    } catch (error) {
      console.error(`Error broadcast ke klien ${clientInfo.id}:`, error);
    }
  });
  
  wsStatus.lastBroadcast = new Date();
  
  return sentCount;
};

/**
 * Membersihkan koneksi yang tidak aktif
 */
const cleanInactiveConnections = (): void => {
  const now = new Date();
  const idleTimeout = 2 * 60 * 1000; // 2 menit
  
  clients.forEach((clientInfo, client) => {
    const idleTime = now.getTime() - clientInfo.lastActivity.getTime();
    
    if (idleTime > idleTimeout) {
      console.log(`Menutup koneksi idle: ${clientInfo.id}, idle selama ${idleTime / 1000}s`);
      
      try {
        sendToClient(client, {
          type: 'disconnect',
          data: {
            reason: 'Koneksi idle',
            idleTime: idleTime
          }
        });
        
        client.close();
        clients.delete(client);
        connectedClients.delete(client);
      } catch (error) {
        console.error(`Error menutup koneksi idle ${clientInfo.id}:`, error);
        clients.delete(client);
        connectedClients.delete(client);
      }
    } else {
      try {
        if (client.readyState === WebSocket.OPEN) {
          sendToClient(client, {
            type: 'ping',
            data: {
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        console.error(`Error mengirim ping ke klien ${clientInfo.id}:`, error);
      }
    }
  });
  
  wsStatus.activeConnections = clients.size;
};

/**
 * Mendapatkan status WebSocket server
 */
export const getWebSocketStatus = () => {
  return {
    isInitialized: wsStatus.isInitialized,
    activeConnections: wsStatus.activeConnections,
    totalConnections: wsStatus.totalConnections,
    lastBroadcast: wsStatus.lastBroadcast,
    uptime: wsStatus.isInitialized ? 
      Math.floor((new Date().getTime() - wsStatus.startTime.getTime()) / 1000) : 0
  };
};

/**
 * Broadcast data level air - implementasi dari kode lama
 */
export const broadcastWaterLevel = (waterLevel: any): boolean => {
  if (!waterLevel) return false;
  
  const payload = {
    type: 'waterLevel',
    data: {
      timestamp: waterLevel.createdAt instanceof Date ? waterLevel.createdAt.toISOString() : new Date().toISOString(),
      level: waterLevel.level,
      unit: waterLevel.unit || 'cm'
    }
  };
  
  return broadcast(payload);
};

/**
 * Broadcast peringatan - implementasi dari kode lama
 */
export const broadcastAlert = (alert: any): boolean => {
  if (!alert) return false;
  
  const payload = {
    type: 'alert',
    data: {
      id: alert._id ? alert._id.toString() : undefined,
      timestamp: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : new Date().toISOString(),
      level: alert.level,
      type: alert.type,
      message: alert.message,
      acknowledged: alert.acknowledged
    }
  };
  
  return broadcast(payload);
};

/**
 * Broadcast pengaturan sistem - implementasi untuk settings.ts
 */
export const broadcastSettings = (settings: any): boolean => {
  if (!settings) return false;
  
  const payload = {
    type: 'settings',
    data: {
      timestamp: new Date().toISOString(),
      // Jika settings adalah settings.thresholds (objek saja)
      ...(typeof settings === 'object' && !settings.thresholds ? settings : {}),
      // Jika settings adalah objek settings lengkap
      ...(settings.thresholds ? { 
        thresholds: settings.thresholds,
        notifications: settings.notifications,
        pumpMode: settings.pumpMode
      } : {})
    }
  };
  
  return broadcast(payload);
};

/**
 * Broadcast status pompa - implementasi untuk pump.ts
 */
export const broadcastPumpStatus = (pumpStatus: any): boolean => {
  if (!pumpStatus) return false;
  
  const payload = {
    type: 'pumpStatus',
    data: {
      timestamp: new Date().toISOString(),
      isActive: pumpStatus.isActive,
      mode: pumpStatus.mode,
      lastActivated: pumpStatus.lastActivated
    }
  };
  
  return broadcast(payload);
};

/**
 * Mengirim update ketinggian air ke semua klien - implementasi baru
 */
export const sendWaterLevelUpdate = (waterLevelData: any): number => {
  return broadcastMessage({
    type: 'water_level_update',
    data: waterLevelData
  });
};

/**
 * Mengirim notifikasi peringatan ke semua klien - implementasi baru
 */
export const sendAlert = (alertData: any): number => {
  return broadcastMessage({
    type: 'alert',
    data: alertData
  });
};

export default {
  initWebSocketServer,
  broadcast,
  broadcastMessage,
  sendToClient,
  getWebSocketStatus,
  broadcastWaterLevel,
  broadcastAlert,
  sendWaterLevelUpdate,
  sendAlert,
  broadcastPumpStatus,
  broadcastSettings
};
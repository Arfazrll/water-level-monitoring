// BackEnd/services/wsService.ts (Perbaikan untuk koneksi)
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;
const connectedClients = new Set<WebSocket>();

export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  try {
    // Periksa apakah wss sudah diinisialisasi
    if (wss) {
      console.log('WebSocket server sudah diinisialisasi');
      return wss;
    }
    
    wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });
    
    console.log('Server WebSocket berhasil diinisialisasi pada jalur: /ws');
    
    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`Klien terhubung ke WebSocket dari ${clientIp}`);
      
      connectedClients.add(ws);
      
      // Kirim konfirmasi koneksi inisial
      try {
        ws.send(JSON.stringify({
          type: 'connection',
          data: { 
            status: 'connected', 
            timestamp: new Date().toISOString(),
            message: 'Terhubung ke Server WebSocket Monitor Air'
          }
        }));
      } catch (error) {
        console.error('Error mengirim konfirmasi koneksi:', error);
      }
      
      // Penanganan pesan dari klien
      ws.on('message', (message: WebSocket.Data) => {
        try {
          console.log(`Menerima pesan WebSocket: ${message}`);
          const data = JSON.parse(message.toString());
          
          // Pemrosesan pesan berdasarkan jenis
          if (data.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              data: { timestamp: new Date().toISOString() }
            }));
          }
        } catch (error) {
          console.error('Error memproses pesan WebSocket:', error);
        }
      });
      
      // Penanganan pemutusan koneksi
      ws.on('close', () => {
        console.log(`Klien WebSocket terputus`);
        connectedClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('Error koneksi WebSocket:', error);
        connectedClients.delete(ws);
      });
    });
    
    return wss;
  } catch (error) {
    console.error('Gagal menginisialisasi server WebSocket:', error);
    throw error;
  }
};

// Broadcast data ke semua klien
export const broadcast = (data: any): boolean => {
  if (!wss) {
    console.log('Server WebSocket belum diinisialisasi');
    return false;
  }
  
  let successCount = 0;
  
  try {
    const payload = JSON.stringify(data);
    
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
  } catch (error) {
    console.error('Error broadcast WebSocket:', error);
    return false;
  }
  
  return successCount > 0;
};

// Broadcast data level air
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

// Broadcast peringatan
export const broadcastAlert = (alert: any): boolean => {
  if (!alert || !alert._id) return false;
  
  const payload = {
    type: 'alert',
    data: {
      id: alert._id.toString(),
      timestamp: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : new Date().toISOString(),
      level: alert.level,
      type: alert.type,
      message: alert.message,
      acknowledged: alert.acknowledged
    }
  };
  
  return broadcast(payload);
};

// Broadcast status WebSocket
export const getWebSocketStatus = () => {
  return {
    isInitialized: !!wss,
    activeConnections: connectedClients.size,
    lastBroadcast: new Date()
  };
};
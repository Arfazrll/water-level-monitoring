import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { WaterLevel } from '../models/WaterLevel';
import { Alert } from '../models/Alert';
import { ThresholdSettings } from '../models/Setting';

// Definisi antarmuka status pompa
interface PumpStatus {
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}

// Variabel server WebSocket dengan enkapsulasi privat
let wss: WebSocketServer | null = null;

// Struktur data untuk pelacakan koneksi klien
const connectedClients = new Set<WebSocket>();

// Objek status untuk pemantauan kondisi server
let wsStatus = {
  isInitialized: false,
  activeConnections: 0,
  lastBroadcast: null as Date | null,
  connectionErrors: 0,
  lastErrorTimestamp: null as Date | null
};

/**
 * Inisialisasi server WebSocket dengan konfigurasi optimal
 * @param server - Instance server HTTP untuk integrasi WebSocket
 * @returns Instance WebSocketServer yang telah dikonfigurasi
 */
export const initWebSocketServer = (server: http.Server): WebSocketServer => {
  try {
    wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        threshold: 1024
      }
    });
    wsStatus.isInitialized = true;
    
    console.log('Server WebSocket berhasil diinisialisasi pada jalur: /ws');
    
    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const clientIp = req.socket.remoteAddress || 'unknown';
      console.log(`Klien terhubung ke WebSocket dari ${clientIp}`);
      
      // Tambahkan ke set koneksi aktif
      connectedClients.add(ws);
      wsStatus.activeConnections = connectedClients.size;
      
      // Kirim konfirmasi koneksi inisial
      try {
        sendToClient(ws, {
          type: 'connection',
          data: { 
            status: 'connected', 
            timestamp: new Date().toISOString(),
            message: 'Terhubung ke Server WebSocket Monitor Air'
          }
        });
      } catch (error) {
        console.error('Error mengirim konfirmasi koneksi:', error);
      }
      
      // Penanganan pesan masuk dari klien
      ws.on('message', (message: WebSocket.Data) => {
        try {
          console.log(`Menerima pesan WebSocket: ${message}`);
          
          // Validasi format pesan
          if (!message) {
            console.warn('Menerima pesan WebSocket kosong');
            return;
          }
          
          // Parsing pesan dengan validasi
          const data = JSON.parse(message.toString());
          
          if (!data || !data.type) {
            throw new Error('Format pesan tidak valid: field type tidak ditemukan');
          }
          
          // Implementasi pemrosesan berdasarkan tipe pesan
          if (data.type === 'acknowledgeAlert') {
            // Validasi ID peringatan
            if (!data.alertId || data.alertId === 'undefined' || data.alertId === 'null') {
              console.error('ID peringatan tidak valid dalam pesan WebSocket:', data);
              sendToClient(ws, {
                type: 'error',
                data: { message: 'ID peringatan tidak valid', timestamp: new Date().toISOString() }
              });
              return;
            }
            
            console.log(`Permintaan WebSocket untuk mengakui peringatan ID: ${data.alertId}`);
            
            // Respon konfirmasi
            sendToClient(ws, {
              type: 'acknowledgeSuccess',
              data: { 
                alertId: data.alertId, 
                message: 'Peringatan berhasil diakui',
                timestamp: new Date().toISOString() 
              }
            });
          } else if (data.type === 'ping') {
            // Respons ping untuk keepalive
            sendToClient(ws, {
              type: 'pong',
              data: { timestamp: new Date().toISOString() }
            });
          } else {
            console.warn(`Tipe pesan WebSocket tidak dikenal: ${data.type}`);
            sendToClient(ws, {
              type: 'error',
              data: { 
                message: `Tipe pesan tidak dikenal: ${data.type}`, 
                timestamp: new Date().toISOString() 
              }
            });
          }
        } catch (error) {
          console.error('Error memproses pesan WebSocket:', error);
          
          try {
            sendToClient(ws, {
              type: 'error',
              data: { 
                message: 'Format pesan tidak valid', 
                timestamp: new Date().toISOString() 
              }
            });
          } catch (sendError) {
            console.error('Error mengirim respon error via WebSocket:', sendError);
          }
        }
      });
      
      // Penanganan pemutusan koneksi
      ws.on('close', (code: number, reason: string) => {
        console.log(`Klien terputus dari WebSocket. Kode: ${code}, Alasan: ${reason || 'Tidak ada alasan'}`);
        connectedClients.delete(ws);
        wsStatus.activeConnections = connectedClients.size;
      });
      
      // Penanganan error koneksi
      ws.on('error', (error) => {
        console.error('Error koneksi WebSocket:', error);
        wsStatus.connectionErrors++;
        wsStatus.lastErrorTimestamp = new Date();
        
        try {
          sendToClient(ws, {
            type: 'error',
            data: { 
              message: 'Terjadi kesalahan koneksi WebSocket', 
              timestamp: new Date().toISOString() 
            }
          });
        } catch (sendError) {
          console.error('Gagal mengirim pesan error ke klien:', sendError);
        }
        
        connectedClients.delete(ws);
        wsStatus.activeConnections = connectedClients.size;
      });
    });
    
    console.log('Server WebSocket berhasil diinisialisasi');
    
    // Implementasi mekanisme ping untuk menjaga koneksi tetap aktif
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
                console.error('Error ping WebSocket:', err);
              }
            });
            activePingCount++;
          } catch (error) {
            console.error('Error mengirim ping ke klien:', error);
            try {
              client.terminate();
            } catch (termError) {
              console.error('Error terminasi koneksi klien:', termError);
            }
            connectedClients.delete(client);
          }
        } else if (client.readyState === WebSocket.CLOSING || client.readyState === WebSocket.CLOSED) {
          connectedClients.delete(client);
        }
      });
      
      wsStatus.activeConnections = connectedClients.size;
      if (activePingCount > 0) {
        console.log(`Ping WebSocket dikirim ke ${activePingCount} klien aktif`);
      }
    }, 30000); // Interval 30 detik
    
    // Penanganan error server
    wss.on('error', (error) => {
      console.error('Error server WebSocket:', error);
      wsStatus.isInitialized = false;
      wsStatus.connectionErrors++;
      wsStatus.lastErrorTimestamp = new Date();
    });
    
    return wss;
  } catch (error) {
    console.error('Gagal menginisialisasi server WebSocket:', error);
    wsStatus.isInitialized = false;
    wsStatus.connectionErrors++;
    wsStatus.lastErrorTimestamp = new Date();
    throw error;
  }
};

/**
 * Fungsi utilitas untuk mengirim data ke klien dengan penanganan error
 * @param client - Koneksi WebSocket klien
 * @param data - Data yang akan dikirim
 * @returns Status keberhasilan pengiriman
 */
function sendToClient(client: WebSocket, data: any): boolean {
  if (client.readyState === WebSocket.OPEN) {
    try {
      const payload = JSON.stringify(data);
      client.send(payload);
      return true;
    } catch (error) {
      console.error('Error mengirim pesan ke klien:', error);
      return false;
    }
  }
  return false;
}

/**
 * Broadcast data level air ke semua klien terhubung
 * @param waterLevel - Data level air untuk disiarkan
 * @returns Status keberhasilan broadcast
 */
export const broadcastWaterLevel = (waterLevel: WaterLevel): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    // Pesan log level rendah untuk mengurangi noise
    console.log('Server WebSocket tidak diinisialisasi, tidak dapat menyiarkan level air');
    return false;
  }
  
  if (!waterLevel) {
    console.warn('Data level air tidak valid untuk broadcast', waterLevel);
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

/**
 * Broadcast data peringatan ke semua klien terhubung
 * @param alert - Data peringatan untuk disiarkan
 * @returns Status keberhasilan broadcast
 */
export const broadcastAlert = (alert: Alert): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.log('Server WebSocket tidak diinisialisasi, tidak dapat menyiarkan peringatan');
    return false;
  }
  
  if (!alert || !alert._id) {
    console.warn('Data peringatan tidak valid untuk broadcast', alert);
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

/**
 * Broadcast status pompa ke semua klien terhubung
 * @param pumpStatus - Data status pompa untuk disiarkan
 * @returns Status keberhasilan broadcast
 */
export const broadcastPumpStatus = (pumpStatus: PumpStatus): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.log('Server WebSocket tidak diinisialisasi, tidak dapat menyiarkan status pompa');
    return false;
  }
  
  if (pumpStatus === undefined || pumpStatus === null) {
    console.warn('Data status pompa tidak valid untuk broadcast', pumpStatus);
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

/**
 * Broadcast pengaturan ambang batas ke semua klien terhubung
 * @param settings - Data pengaturan untuk disiarkan
 * @returns Status keberhasilan broadcast
 */
export const broadcastSettings = (settings: ThresholdSettings): boolean => {
  if (!wss || !wsStatus.isInitialized) {
    console.log('Server WebSocket tidak diinisialisasi, tidak dapat menyiarkan pengaturan');
    return false;
  }
  
  if (!settings) {
    console.warn('Data pengaturan tidak valid untuk broadcast', settings);
    return false;
  }
  
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
  
  const mode = 'auto'; // Nilai default
  
  const payload = {
    type: 'settings',
    data: {
      ...settingsForBroadcast,
      pumpMode: mode
    }
  };
  
  return broadcast(payload);
};

/**
 * Fungsi generik untuk menyiarkan data ke semua klien terhubung
 * @param payload - Data untuk disiarkan
 * @returns Status keberhasilan broadcast
 */
function broadcast(payload: any): boolean {
  if (!wss || wss.clients.size === 0) {
    console.log('Tidak ada klien WebSocket terhubung, melewati broadcast');
    return false;
  }
  
  wsStatus.lastBroadcast = new Date();
  let successCount = 0;
  let failCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        const jsonPayload = JSON.stringify(payload);
        client.send(jsonPayload);
        successCount++;
      } catch (error) {
        console.error('Error broadcasting ke klien:', error);
        failCount++;
      }
    }
  });
  
  if (successCount > 0) {
    console.log(`Broadcast berhasil ke ${successCount} klien`);
  }
  
  if (failCount > 0) {
    console.warn(`Broadcast sebagian gagal: ${successCount} sukses, ${failCount} gagal`);
  }
  
  return successCount > 0;
}

/**
 * Mendapatkan jumlah koneksi aktif
 * @returns Jumlah koneksi klien aktif
 */
export const getActiveConnectionCount = (): number => {
  return connectedClients.size;
};

/**
 * Mendapatkan status server WebSocket
 * @returns Objek status server WebSocket
 */
export const getWebSocketStatus = () => {
  return {
    ...wsStatus,
    activeConnections: connectedClients.size
  };
};

/**
 * Pengujian konektivitas server WebSocket
 * @returns Status ketersediaan server WebSocket
 */
export const testWebSocket = (): boolean => {
  return wss !== null && wsStatus.isInitialized;
};
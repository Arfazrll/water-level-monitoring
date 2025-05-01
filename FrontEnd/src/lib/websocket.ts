import { Dispatch, SetStateAction } from 'react';
import { WebSocketMessage } from './types';

/**
 * Menginisialisasi dan mengelola koneksi WebSocket dengan mekanisme reconnect otomatis
 * @param setIsConnected - Fungsi state setter untuk status koneksi
 * @param handleWebSocketMessage - Callback handler untuk pesan yang diterima
 * @returns Fungsi cleanup untuk memutuskan koneksi
 */
export const connectWebSocket = (
  setIsConnected: Dispatch<SetStateAction<boolean>>,
  handleWebSocketMessage: (message: WebSocketMessage) => void
) => {
  let ws: WebSocket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const initialReconnectDelay = 1000; // 1 detik
  const maxReconnectDelay = 30000; // 30 detik
  
  /**
   * Menghitung delay reconnect berdasarkan algoritma exponential backoff
   * @returns Nilai delay dalam milidetik
   */
  const getReconnectDelay = () => {
    return Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttempts),
      maxReconnectDelay
    );
  };
  
  /**
   * Menginisialisasi koneksi WebSocket dengan penanganan error dan reconnect
   */
  const connect = () => {
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('Error menutup koneksi WebSocket yang ada:', e);
      }
    }
    
    // Determinasi URL WebSocket berdasarkan konfigurasi lingkungan
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL || `${window.location.hostname}:5000`;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Menghubungkan ke WebSocket:', wsUrl);
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Koneksi WebSocket berhasil');
        setIsConnected(true);
        reconnectAttempts = 0; // Reset percobaan pada koneksi sukses
        
        // Kirim ping inisial untuk menjaga koneksi
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 
            type: 'ping', 
            data: { 
              clientInfo: 'web-client',
              timestamp: Date.now()
            } 
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Log hanya pesan penting untuk mengurangi noise konsol
          if (message.type !== 'pong') {
            console.log('Pesan WebSocket diterima:', message.type);
          }
          
          // Penanganan ping/pong untuk keepalive
          if (message.type === 'pong') {
            // Jadwalkan ping berikutnya dalam 30 detik
            setTimeout(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'ping', 
                  data: { timestamp: Date.now() } 
                }));
              }
            }, 30000);
          } else {
            // Proses pesan lain melalui handler
            handleWebSocketMessage(message);
          }
        } catch (err) {
          console.error('Error memproses pesan WebSocket:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket terputus. Kode: ${event.code}, Alasan: ${event.reason || 'Tidak ada alasan'}`);
        setIsConnected(false);
        
        // Implementasi exponential backoff untuk percobaan koneksi ulang
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = getReconnectDelay();
          
          console.log(`Mencoba koneksi ulang dalam ${delay/1000} detik (Percobaan ${reconnectAttempts}/${maxReconnectAttempts})`);
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          
          reconnectTimer = setTimeout(connect, delay);
        } else {
          console.error(`Percobaan koneksi ulang maksimum (${maxReconnectAttempts}) tercapai. WebSocket terputus.`);
          // Reset setelah periode cool-down
          setTimeout(() => {
            reconnectAttempts = 0;
            connect();
          }, 60000); // 1 menit cool-down
        }
      };
      
      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
        // Biarkan onclose menangani logika reconnect
      };
    } catch (error) {
      console.error('Error membuat koneksi WebSocket:', error);
      setIsConnected(false);
      
      // Coba reconnect dengan backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = getReconnectDelay();
        
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        
        reconnectTimer = setTimeout(connect, delay);
      }
    }
  };
  
  // Koneksi inisial
  connect();
  
  // Fungsi cleanup untuk digunakan pada saat unmount komponen
  return () => {
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ 
            type: 'disconnect', 
            data: { reason: 'Client disconnected' } 
          }));
        } catch (e) {
          console.error('Error mengirim pesan pemutusan:', e);
        }
      }
      
      try {
        ws.close();
      } catch (e) {
        console.error('Error menutup WebSocket saat cleanup:', e);
      }
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  };
};
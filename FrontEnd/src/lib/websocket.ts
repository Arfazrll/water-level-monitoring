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
  const initialReconnectDelay = 1000;
  const maxReconnectDelay = 30000;
  
  const getReconnectDelay = () => {
    return Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttempts),
      maxReconnectDelay
    );
  };
  
  const connect = () => {
    if (ws) {
      try {
        ws.close();
      } catch (e) {
        console.error('Error closing existing WebSocket:', e);
      }
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL || 'localhost:5000';
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttempts = 0;
        
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
          const message = JSON.parse(event.data);
          
          if (message.type === 'ping') {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'pong',
                data: {
                  timestamp: Date.now(),
                  originalTimestamp: message.data?.timestamp
                }
              }));
            }
          } else if (message.type === 'pong') {
            if (message.data?.originalTimestamp) {
              const latency = Date.now() - message.data.originalTimestamp;
              console.log(`WebSocket latency: ${latency}ms`);
            }
          } else {
            handleWebSocketMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket terputus. Kode: ${event.code}, Alasan: ${event.reason || 'Tidak ada alasan'}`);
        setIsConnected(false);
        
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
          setTimeout(() => {
            reconnectAttempts = 0;
            connect();
          }, 60000); 
        }
      };
      
      ws.onerror = (error) => {
        console.error('Error WebSocket:', error);
      };
    } catch (error) {
      console.error('Error membuat koneksi WebSocket:', error);
      setIsConnected(false);
      
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
  
  connect();
  
  const pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'ping',
          data: {
            clientInfo: 'web-client',
            timestamp: Date.now()
          }
        }));
      } catch (e) {
        console.error('Error sending ping:', e);
      }
    }
  }, 30000); 
  
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
    
    clearInterval(pingInterval);
  };
};
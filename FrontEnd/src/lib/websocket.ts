// FrontEnd/src/lib/websocket.ts

import { Dispatch, SetStateAction } from 'react';
import { WebSocketMessage } from './types';  // Import from shared types

export const connectWebSocket = (
  setIsConnected: Dispatch<SetStateAction<boolean>>,
  handleWebSocketMessage: (message: WebSocketMessage) => void
) => {
  let ws: WebSocket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  const initialReconnectDelay = 1000; // 1 second
  const maxReconnectDelay = 30000; // 30 seconds
  
  // Calculate exponential backoff delay
  const getReconnectDelay = () => {
    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttempts),
      maxReconnectDelay
    );
    return delay;
  };
  
  const connect = () => {
    if (ws) {
      // Clean up existing connection
      try {
        ws.close();
      } catch (e) {
        console.error('Error closing existing WebSocket:', e);
      }
    }
    
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL || window.location.hostname + ':5000';
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts = 0; // Reset attempts on successful connection
        
        // Send a ping to server to maintain connection
        if (ws && ws.readyState === WebSocket.OPEN) { // Fixed null reference
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          // Log only non-ping messages to reduce noise
          if (message.type !== 'pong') {
            console.log('WebSocket message received:', message.type);
          }
          
          // Handle ping/pong for keepalive
          if (message.type === 'pong') {
            // Schedule next ping in 30 seconds
            setTimeout(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
              }
            }, 30000);
          } else {
            // Process other messages
            handleWebSocketMessage(message);
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
        setIsConnected(false);
        
        // Only attempt to reconnect if we haven't reached max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = getReconnectDelay();
          
          console.log(`Attempting to reconnect in ${delay/1000} seconds (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }
          
          reconnectTimer = setTimeout(connect, delay);
        } else {
          console.error(`Maximum reconnection attempts (${maxReconnectAttempts}) reached. WebSocket disconnected.`);
          // Reset attempts after a longer cool-down period
          setTimeout(() => {
            reconnectAttempts = 0;
            connect();
          }, 60000); // 1 minute cool-down
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Let onclose handle reconnection logic
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      
      // Try to reconnect with backoff
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
  
  // Initial connection
  connect();
  
  // Return cleanup function
  return () => {
    if (ws) {
      // Send a graceful close message if possible
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'disconnect', data: { reason: 'User navigated away' } }));
        } catch (e) {
          console.error('Error sending disconnect message:', e);
        }
      }
      
      try {
        ws.close();
      } catch (e) {
        console.error('Error closing WebSocket during cleanup:', e);
      }
    }
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  };
};
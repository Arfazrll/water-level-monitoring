// FrontEnd/src/context/AppContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WaterLevelData, AlertData, ThresholdSettings, PumpStatus, DeviceStatus } from '@/lib/types';
import { 
  fetchWaterLevelData, 
  fetchAlerts, 
  fetchSettings, 
  updateSettings, 
  acknowledgeAlert,
  acknowledgeAllAlerts,
  fetchBuzzerStatus
} from '@/lib/api';

// Define types for WebSocket messages
interface WebSocketMessage {
  type: string;
  data: unknown;
}

// Refined types for specific message types
interface WaterLevelMessage extends WebSocketMessage {
  type: 'waterLevel';
  data: WaterLevelData;
}

interface AlertMessage extends WebSocketMessage {
  type: 'alert';
  data: AlertData;
}

interface SettingsMessage extends WebSocketMessage {
  type: 'settings';
  data: ThresholdSettings;
}

interface PumpStatusMessage extends WebSocketMessage {
  type: 'pumpStatus';
  data: PumpStatus;
}

interface ConnectionMessage extends WebSocketMessage {
  type: 'connection';
  data: { status: string; timestamp: string };
}

interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  data: { code: string; message: string };
}

// Union type for all possible message types
type WSMessage = 
  | WaterLevelMessage
  | AlertMessage
  | SettingsMessage
  | PumpStatusMessage
  | ConnectionMessage
  | ErrorMessage;

interface AppContextType {
  waterLevelData: WaterLevelData[];
  currentLevel: WaterLevelData | null;
  alerts: AlertData[];
  settings: ThresholdSettings;
  pumpStatus: PumpStatus;
  deviceStatus: DeviceStatus;
  buzzerActive: boolean;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean; // Added to expose connection status
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
  togglePump: (active: boolean) => Promise<void>;
  togglePumpMode: (mode: 'auto' | 'manual') => Promise<void>;
  testBuzzer: (duration?: number) => Promise<void>;
  sendMessage?: (message: WSMessage) => void; // Updated type
}

const defaultSettings: ThresholdSettings = {
  warningLevel: 70,
  dangerLevel: 90,
  maxLevel: 100,
  minLevel: 0,
  pumpActivationLevel: 80,
  pumpDeactivationLevel: 40,
  unit: 'cm'
};

const defaultPumpStatus: PumpStatus = {
  isActive: false,
  mode: 'auto',
  lastActivated: null
};

const defaultDeviceStatus: DeviceStatus = {
  online: true,
  lastSeen: new Date().toISOString(),
  batteryLevel: 100,
  signalStrength: 100
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData[]>([]);
  const [currentLevel, setCurrentLevel] = useState<WaterLevelData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [settings, setSettings] = useState<ThresholdSettings>(defaultSettings);
  const [pumpStatus, setPumpStatus] = useState<PumpStatus>(defaultPumpStatus);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(defaultDeviceStatus);
  const [buzzerActive, setBuzzerActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Fetch initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch settings first
        const settingsData = await fetchSettings();
        setSettings(settingsData);
        
        // Fetch water level data
        const levelData = await fetchWaterLevelData();
        setWaterLevelData(levelData);
        
        if (levelData.length > 0) {
          setCurrentLevel(levelData[levelData.length - 1]);
        }
        
        // Fetch alerts
        const alertsData = await fetchAlerts();
        setAlerts(alertsData);
        
        // Fetch buzzer status
        try {
          const buzzerStatus = await fetchBuzzerStatus();
          setBuzzerActive(buzzerStatus.isActive);
        } catch {
          console.warn('Could not fetch buzzer status');
          // Set based on unacknowledged alerts
          setBuzzerActive(alertsData.some(alert => !alert.acknowledged));
        }
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load initial data');
        setIsLoading(false);
        console.error('Error initializing data:', err);
      }
    };
    
    initializeData();
  }, []);

  // Setup WebSocket or polling for real-time updates
  useEffect(() => {
    // For demo purposes, we'll simulate real-time updates with polling
    const interval = setInterval(async () => {
      try {
        // Fetch latest water level
        const levelData = await fetchWaterLevelData(1); // Get just the latest reading
        if (levelData.length > 0) {
          const latestReading = levelData[0];
          
          setWaterLevelData(prev => {
            // Keep only the last 100 readings for performance
            const updatedData = [...prev, latestReading].slice(-100);
            return updatedData;
          });
          
          setCurrentLevel(latestReading);
          
          // Update device status
          setDeviceStatus(prev => ({
            ...prev,
            online: true,
            lastSeen: new Date().toISOString()
          }));
          
          // Check for new alerts
          const alertsData = await fetchAlerts();
          setAlerts(alertsData);
          
          // Update buzzer status
          try {
            const buzzerStatus = await fetchBuzzerStatus();
            setBuzzerActive(buzzerStatus.isActive);
          } catch {
            // Set based on unacknowledged alerts
            setBuzzerActive(alertsData.some(alert => !alert.acknowledged));
          }
        }
      } catch (err) {
        console.error('Error fetching real-time updates:', err);
        // Update device status to offline if can't fetch data
        setDeviceStatus(prev => ({
          ...prev,
          online: false
        }));
      }
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update threshold settings
  const updateThresholds = async (newSettings: Partial<ThresholdSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to update settings');
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      
      // Update alerts in state
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
      
      // Check if there are still unacknowledged alerts
      const hasUnacknowledgedAlerts = alerts.some(
        alert => alert.id !== alertId && !alert.acknowledged
      );
      
      // Update buzzer status if there are no more unacknowledged alerts
      if (!hasUnacknowledgedAlerts) {
        setBuzzerActive(false);
      }
    } catch (err) {
      setError('Failed to acknowledge alert');
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };
  
  // Acknowledge all alerts
  const handleAcknowledgeAllAlerts = async () => {
    try {
      await acknowledgeAllAlerts();
      
      // Update all alerts in state
      setAlerts(prev => 
        prev.map(alert => ({ ...alert, acknowledged: true }))
      );
      
      // Update buzzer status
      setBuzzerActive(false);
    } catch (err) {
      setError('Failed to acknowledge all alerts');
      console.error('Error acknowledging all alerts:', err);
      throw err;
    }
  };

  // Toggle pump status
  const togglePump = async (active: boolean) => {
    try {
      // API call to control pump would go here
      // For example: await controlPump(active);
      
      setPumpStatus(prev => ({
        ...prev,
        isActive: active,
        lastActivated: active ? new Date().toISOString() : prev.lastActivated
      }));
    } catch (err) {
      setError('Failed to control pump');
      console.error('Error controlling pump:', err);
      throw err;
    }
  };

  // Toggle pump mode
  const togglePumpMode = async (mode: 'auto' | 'manual') => {
    try {
      // API call to change pump mode would go here
      // For example: await setPumpMode(mode);
      
      setPumpStatus(prev => ({
        ...prev,
        mode
      }));
    } catch (err) {
      setError('Failed to change pump mode');
      console.error('Error changing pump mode:', err);
      throw err;
    }
  };
  
  // Test buzzer
  const testBuzzer = async (duration: number = 3000) => {
    try {
      // API call to test buzzer
      await fetch('/api/test/buzzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          activate: true,
          duration
        }),
      });
      
      // Update state temporarily
      setBuzzerActive(true);
      
      // Reset state after duration
      setTimeout(() => {
        setBuzzerActive(false);
      }, duration + 500); // Add a little buffer
      
    } catch (err) {
      console.error('Error testing buzzer:', err);
      throw err;
    }
  };

  // Function to send WebSocket messages
  const sendMessage = (message: WSMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    
    const connectWebSocket = () => {
      // Tentukan URL berdasarkan environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          console.log('WebSocket message received:', message);
          
          if (message.type === 'waterLevel') {
            const newData = message.data as WaterLevelData;
            setWaterLevelData(prev => {
              // Keep only the last 100 readings
              const updatedData = [...prev, newData].slice(-100);
              return updatedData;
            });
            setCurrentLevel(newData);
          } else if (message.type === 'alert') {
            const newAlert = message.data as AlertData;
            setAlerts(prev => {
              // Check if this alert already exists
              const existingAlert = prev.find(a => a.id === newAlert.id);
              if (existingAlert) {
                // Update existing alert
                return prev.map(a => a.id === newAlert.id ? newAlert : a);
              } else {
                // Add new alert
                return [newAlert, ...prev];
              }
            });
            
            // Update buzzer status based on unacknowledged alerts
            const hasUnacknowledgedAlerts = (message.data as AlertData).acknowledged === false;
            if (hasUnacknowledgedAlerts) {
              setBuzzerActive(true);
            }
          } else if (message.type === 'settings') {
            setSettings(message.data as ThresholdSettings);
          } else if (message.type === 'pumpStatus') {
            setPumpStatus(message.data as PumpStatus);
          } else if (message.type === 'connection') {
            const connectionData = message.data as { status: string; timestamp: string };
            console.log('Connection confirmed:', connectionData);
          } else if (message.type === 'error') {
            const errorData = message.data as { message: string };
            console.error('WebSocket error message:', errorData);
            setError(errorData.message);
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, trying to reconnect...');
        setIsConnected(false);
        
        // Schedule reconnection
        reconnectTimer = setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        ws?.close();
      };
      
      setSocket(ws);
    };
    
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  const value = {
    waterLevelData,
    currentLevel,
    alerts,
    settings,
    pumpStatus,
    deviceStatus,
    buzzerActive,
    isLoading,
    error,
    isConnected, // Exposing connection status to consumers
    updateThresholds,
    acknowledgeAlert: handleAcknowledgeAlert,
    acknowledgeAllAlerts: handleAcknowledgeAllAlerts,
    togglePump,
    togglePumpMode,
    testBuzzer,
    sendMessage // Making WebSocket send function available
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
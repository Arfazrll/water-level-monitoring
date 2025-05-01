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
  controlPump,
  setPumpMode
} from '@/lib/api';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

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
  isConnected: boolean;
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
  togglePump: (active: boolean) => Promise<void>;
  togglePumpMode: (mode: 'auto' | 'manual') => Promise<void>;
  testBuzzer: (duration?: number) => Promise<void>;
}

const defaultSettings: ThresholdSettings = {
  warningLevel: 30, // Sesuai dengan ESP32 (30 cm)
  dangerLevel: 20,  // Sesuai dengan ESP32 (20 cm)
  maxLevel: 100,
  minLevel: 0,
  pumpActivationLevel: 40,
  pumpDeactivationLevel: 20,
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
        
        // Set buzzer status based on unacknowledged alerts
        setBuzzerActive(alertsData.some(alert => !alert.acknowledged));
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load initial data');
        setIsLoading(false);
        console.error('Error initializing data:', err);
      }
    };
    
    initializeData();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NEXT_PUBLIC_WS_URL || '172.20.10.6:5000';
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          
          if (message.type === 'waterLevel') {
            // Update water level data
            const newData = message.data as WaterLevelData;
            setWaterLevelData(prev => {
              const updatedData = [...prev, newData].slice(-100);
              return updatedData;
            });
            setCurrentLevel(newData as WaterLevelData);
          } else if (message.type === 'alert') {
            // Update alerts
            const newAlert = message.data as AlertData;
            setAlerts(prev => {
              const existingAlert = prev.find(a => a.id === newAlert.id);
              if (existingAlert) {
                return prev.map(a => a.id === newAlert.id ? newAlert : a);
              } else {
                return [newAlert, ...prev];
              }
            });
            
            // Update buzzer status based on unacknowledged alerts
            const hasUnacknowledgedAlerts = (message.data as AlertData).acknowledged === false;
            if (hasUnacknowledgedAlerts) {
              setBuzzerActive(true);
            }
          } else if (message.type === 'settings') {
            // Update settings
            setSettings(message.data as ThresholdSettings);
          } else if (message.type === 'pumpStatus') {
            // Update pump status
            setPumpStatus(message.data as PumpStatus);
          } else if (message.type === 'deviceStatus') {
            // Update device status (this uses setDeviceStatus to fix the unused variable)
            setDeviceStatus(message.data as DeviceStatus);
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
      
      // We don't need to save the socket instance since we're not using it elsewhere
      // This fixes the 'socket' is assigned a value but never used error
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
      await controlPump(active);
      
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
      await setPumpMode(mode);
      
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
      }, duration + 500);
      
    } catch (err) {
      console.error('Error testing buzzer:', err);
      throw err;
    }
  };

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
    isConnected,
    updateThresholds,
    acknowledgeAlert: handleAcknowledgeAlert,
    acknowledgeAllAlerts: handleAcknowledgeAllAlerts,
    togglePump,
    togglePumpMode,
    testBuzzer
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
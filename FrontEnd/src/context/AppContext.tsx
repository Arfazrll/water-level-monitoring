"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface WaterLevelData {
  timestamp: string;
  level: number;
  unit: string;
}

export interface AlertData {
  id: string;
  timestamp: string;
  level: number;
  type: 'warning' | 'danger';
  message: string;
  acknowledged: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string;
  notifyOnWarning: boolean;
  notifyOnDanger: boolean;
  notifyOnPumpActivation: boolean;
}

export interface ThresholdSettings {
  warningLevel: number;
  dangerLevel: number;
  maxLevel: number;
  minLevel: number;
  pumpActivationLevel: number;
  pumpDeactivationLevel: number;
  unit: string;
  notifications?: NotificationSettings;
}

export interface PumpStatus {
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}

export interface DeviceStatus {
  online: boolean;
  lastSeen: string;
}

// API endpoints
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AppContextType {
  waterLevelData: WaterLevelData[];
  currentLevel: WaterLevelData | null;
  alerts: AlertData[];
  settings: ThresholdSettings | null;
  pumpStatus: PumpStatus | null;
  deviceStatus: DeviceStatus;
  isLoading: boolean;
  error: string | null;
  dataAvailable: boolean;
  refreshData: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
  updateThresholds: (settings: ThresholdSettings) => Promise<void>;
  updateNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  togglePump: (active: boolean) => Promise<void>;
  togglePumpMode: (mode: 'auto' | 'manual') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData[]>([]);
  const [currentLevel, setCurrentLevel] = useState<WaterLevelData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [settings, setSettings] = useState<ThresholdSettings | null>(null);
  const [pumpStatus, setPumpStatus] = useState<PumpStatus | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ online: false, lastSeen: new Date().toISOString() });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dataAvailable, setDataAvailable] = useState<boolean>(false);

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const settingsResponse = await fetch(`${API_BASE_URL}/settings`);
      if (!settingsResponse.ok) throw new Error('Failed to fetch settings');
      const settingsData = await settingsResponse.json();
      
      const notificationsResponse = await fetch(`${API_BASE_URL}/settings/notifications`);
      let notificationsData = {};
      if (notificationsResponse.ok) {
        notificationsData = await notificationsResponse.json();
      }
      
      setSettings({ ...settingsData, notifications: notificationsData });
      
      const waterLevelResponse = await fetch(`${API_BASE_URL}/water-level?limit=24`);
      if (!waterLevelResponse.ok) throw new Error('Failed to fetch water level data');
      const waterLevelData = await waterLevelResponse.json();
      
      let hasData = false;
      
      if (waterLevelData.success && waterLevelData.data) {
        if (waterLevelData.data.length > 0) {
          setWaterLevelData(waterLevelData.data);
          setCurrentLevel(waterLevelData.data[waterLevelData.data.length - 1]);
          hasData = true;
        } else {
          setWaterLevelData([]);
          setCurrentLevel(null);
        }
      }
      
      const alertsResponse = await fetch(`${API_BASE_URL}/alerts`);
      if (!alertsResponse.ok) throw new Error('Failed to fetch alerts');
      const alertsData = await alertsResponse.json();
      
      if (alertsData.success && alertsData.data) {
        setAlerts(alertsData.data);
      }
      
      const pumpResponse = await fetch(`${API_BASE_URL}/pump/status`);
      if (!pumpResponse.ok) throw new Error('Failed to fetch pump status');
      const pumpData = await pumpResponse.json();
      setPumpStatus(pumpData);
      
      setDeviceStatus({
        online: true,
        lastSeen: new Date().toISOString()
      });
      
      setDataAvailable(hasData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to load data. Please try again.');
      setIsLoading(false);
      setDataAvailable(false);
    }
  }, []);

  const setupWebSocket = useCallback(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost = process.env.NEXT_PUBLIC_WS_URL || window.location.host;
    
    if (wsHost === window.location.hostname && process.env.NEXT_PUBLIC_API_URL) {
      try {
        const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL);
        wsHost = apiUrl.host;
      } catch (err) {
        console.error('Invalid API URL:', err);
      }
    }
    
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setDeviceStatus(prev => ({ ...prev, online: true }));
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setDeviceStatus(prev => ({ ...prev, online: false }));
      
      setTimeout(() => setupWebSocket(), 5000);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'waterLevel' && message.data) {
          if (typeof message.data.level === 'number' && message.data.timestamp) {
            setWaterLevelData(prev => {
              const newData = [...prev, message.data];
              return newData.slice(-100);
            });
            
            setCurrentLevel(message.data);
            
            setDeviceStatus({
              online: true,
              lastSeen: new Date().toISOString()
            });
          }
        } else if (message.type === 'alert' && message.data) {
          if (message.data.id && message.data.type && message.data.timestamp) {
            setAlerts(prev => {
              const existingAlertIndex = prev.findIndex(a => a.id === message.data.id);
              
              if (existingAlertIndex >= 0) {
                const updatedAlerts = [...prev];
                updatedAlerts[existingAlertIndex] = message.data;
                return updatedAlerts;
              } else {
                return [message.data, ...prev];
              }
            });
          }
        } else if (message.type === 'settings' && message.data) {
          if (typeof message.data.warningLevel === 'number' && 
              typeof message.data.dangerLevel === 'number') {
            setSettings(prev => ({
              ...message.data,
              notifications: prev?.notifications
            }));
          }
        } else if (message.type === 'pumpStatus' && message.data) {
          if (typeof message.data.isActive === 'boolean' && 
              (message.data.mode === 'auto' || message.data.mode === 'manual')) {
            setPumpStatus(message.data);
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };
    
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    refreshData();
    const cleanup = setupWebSocket();
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [refreshData, setupWebSocket]);

  const acknowledgeAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  }, []);

  const acknowledgeAllAlerts = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/acknowledge-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) throw new Error('Failed to acknowledge all alerts');
      
      setAlerts(prev => 
        prev.map(alert => ({ ...alert, acknowledged: true }))
      );
    } catch (err) {
      console.error('Error acknowledging all alerts:', err);
      throw err;
    }
  }, []);

  const updateThresholds = useCallback(async (newSettings: ThresholdSettings): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) throw new Error('Failed to update settings');
      
      const updatedSettings = await response.json();
      setSettings(prev => ({
        ...updatedSettings,
        notifications: prev?.notifications
      }));
    } catch (err) {
      console.error('Error updating settings:', err);
      throw err;
    }
  }, []);

  const updateNotificationSettings = useCallback(async (notificationSettings: NotificationSettings): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationSettings),
      });
      
      if (!response.ok) throw new Error('Failed to update notification settings');
      
      const updatedNotifications = await response.json();
      
      setSettings(prev => prev ? {
        ...prev,
        notifications: updatedNotifications
      } : null);
    } catch (err) {
      console.error('Error updating notification settings:', err);
      throw err;
    }
  }, []);

  const togglePump = useCallback(async (active: boolean): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/pump/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: active }),
      });
      
      if (!response.ok) throw new Error('Failed to control pump');
      
      const updatedPumpStatus = await response.json();
      setPumpStatus(updatedPumpStatus);
    } catch (err) {
      console.error('Error controlling pump:', err);
      throw err;
    }
  }, []);

  const togglePumpMode = useCallback(async (mode: 'auto' | 'manual'): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/pump/mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });
      
      if (!response.ok) throw new Error('Failed to change pump mode');
      
      const result = await response.json();
      setPumpStatus(prev => prev ? { ...prev, mode: result.mode } : null);
    } catch (err) {
      console.error('Error changing pump mode:', err);
      throw err;
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        waterLevelData,
        currentLevel,
        alerts,
        settings,
        pumpStatus,
        deviceStatus,
        isLoading,
        error,
        dataAvailable,
        refreshData,
        acknowledgeAlert,
        acknowledgeAllAlerts,
        updateThresholds,
        updateNotificationSettings,
        togglePump,
        togglePumpMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
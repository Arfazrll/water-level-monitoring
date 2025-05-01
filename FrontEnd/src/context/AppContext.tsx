// FrontEnd/src/context/AppContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  WaterLevelData, 
  AlertData, 
  ThresholdSettings, 
  PumpStatus, 
  DeviceStatus,
  WebSocketMessage  // Import the shared interface
} from '@/lib/types';
import { 
  fetchWaterLevelData, 
  fetchAlerts, 
  fetchSettings, 
  updateSettings, 
  acknowledgeAlert,
  acknowledgeAllAlerts,
  controlPump,
  setPumpMode,
  fetchPumpStatus,
  testServerConnection
} from '@/lib/api';

// Import the WebSocket utility
import { connectWebSocket } from '@/lib/websocket';

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
  refreshData: () => Promise<void>; 
}

// Nilai default yang lebih rasional berdasarkan hardware ESP32 dan setup
const defaultSettings: ThresholdSettings = {
  warningLevel: 30, // Sesuai dengan kode ESP32 (30 cm)
  dangerLevel: 20,  // Sesuai dengan kode ESP32 (20 cm)
  maxLevel: 100,    // Tinggi tangki sensor maksimum (100 cm)
  minLevel: 0,      // Level minimum (0 cm)
  pumpActivationLevel: 40, // Pompa aktif pada level 40 cm
  pumpDeactivationLevel: 20, // Pompa mati pada level 20 cm
  unit: 'cm'        // Satuan pengukuran
};

const defaultPumpStatus: PumpStatus = {
  isActive: false,
  mode: 'auto',
  lastActivated: null
};

const defaultDeviceStatus: DeviceStatus = {
  online: false, // Mulai dengan asumsi offline sampai terhubung
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

  // Penanganan pesan WebSocket
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    try {
      if (!message || !message.type) {
        console.warn('Received invalid WebSocket message format', message);
        return;
      }
      
      if (message.type === 'waterLevel') {
        // Update water level data
        const newData = message.data as WaterLevelData;
        setWaterLevelData(prev => {
          // Pastikan tidak ada duplikasi timestamp
          const isDuplicate = prev.some(item => 
            item.timestamp === newData.timestamp && 
            item.level === newData.level
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Tambahkan data baru dan jaga ukuran array (max 100 item)
          const updatedData = [...prev, newData]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-100);
          
          return updatedData;
        });
        
        setCurrentLevel(newData as WaterLevelData);
        
        // Update status perangkat
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
      } 
      else if (message.type === 'alert') {
        // Update alerts
        const newAlert = message.data as AlertData;
        
        setAlerts(prev => {
          const existingAlert = prev.find(a => a.id === newAlert.id);
          
          if (existingAlert) {
            // Update alert yang sudah ada
            return prev.map(a => a.id === newAlert.id ? newAlert : a);
          } else {
            // Tambahkan alert baru
            return [newAlert, ...prev].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }
        });
        
        // Update buzzer status based on unacknowledged alerts
        const hasUnacknowledgedAlerts = (message.data as AlertData).acknowledged === false;
        if (hasUnacknowledgedAlerts) {
          setBuzzerActive(true);
        } else {
          // Cek apakah masih ada alert yang belum diakui
          setAlerts(prev => {
            const stillHasUnacknowledged = prev.some(alert => 
              alert.id !== newAlert.id && !alert.acknowledged
            );
            
            if (!stillHasUnacknowledged) {
              setBuzzerActive(false);
            }
            
            return prev;
          });
        }
      } 
      else if (message.type === 'settings') {
        // Update settings
        setSettings(prev => ({
          ...prev,
          ...message.data as ThresholdSettings
        }));
      } 
      else if (message.type === 'pumpStatus') {
        // Update pump status
        setPumpStatus(message.data as PumpStatus);
      } 
      else if (message.type === 'deviceStatus') {
        // Update device status
        setDeviceStatus(message.data as DeviceStatus);
      } 
      else if (message.type === 'error') {
        console.error('WebSocket error message:', message.data);
      }
      else if (message.type === 'connection') {
        console.log('WebSocket connection message:', message.data);
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  }, []);

  // Fetch initial data with error handling and retries
  useEffect(() => {
    const initializeData = async (retryCount = 0, maxRetries = 3) => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Test server connection first
        const isServerConnected = await testServerConnection();
        
        if (!isServerConnected) {
          throw new Error('Cannot connect to server. Please check your network connection or server status.');
        }
        
        // Fetch settings first
        const settingsData = await fetchSettings();
        setSettings(settingsData);
        
        // Fetch water level data
        const levelData = await fetchWaterLevelData(24); // Last 24 data points
        
        if (levelData && levelData.length > 0) {
          setWaterLevelData(levelData);
          setCurrentLevel(levelData[levelData.length - 1]);
        }
        
        // Fetch alerts
        const alertsData = await fetchAlerts();
        setAlerts(alertsData);
        
        // Fetch pump status
        const pumpData = await fetchPumpStatus();
        setPumpStatus(pumpData);
        
        // Set buzzer status based on unacknowledged alerts
        const hasUnacknowledgedAlerts = alertsData.some(alert => !alert.acknowledged);
        setBuzzerActive(hasUnacknowledgedAlerts);
        
        // Update device status
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing data:', err);
        
        if (retryCount < maxRetries) {
          // Exponential backoff for retries
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            initializeData(retryCount + 1, maxRetries);
          }, delay);
        } else {
          setError('Gagal memuat data awal. Coba muat ulang halaman atau periksa koneksi server.');
          setIsLoading(false);
          
          // Set minimal offline status
          setDeviceStatus(prev => ({
            ...prev,
            online: false
          }));
        }
      }
    };
    
    initializeData();
  }, []);

  // WebSocket Connection
  useEffect(() => {
    // Use the improved WebSocket implementation
    const cleanupWebSocket = connectWebSocket(setIsConnected, handleWebSocketMessage);
    
    // Cleanup on unmount
    return cleanupWebSocket;
  }, [handleWebSocketMessage]);

  // Refresh data function that can be called manually
  // Modified to return void instead of boolean
  const refreshData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [settingsData, levelData, alertsData, pumpData] = await Promise.all([
        fetchSettings(),
        fetchWaterLevelData(24),
        fetchAlerts(),
        fetchPumpStatus()
      ]);
      
      // Update state with fresh data
      setSettings(settingsData);
      
      if (levelData && levelData.length > 0) {
        setWaterLevelData(levelData);
        setCurrentLevel(levelData[levelData.length - 1]);
      }
      
      setAlerts(alertsData);
      setPumpStatus(pumpData);
      
      // Update buzzer status
      const hasUnacknowledgedAlerts = alertsData.some(alert => !alert.acknowledged);
      setBuzzerActive(hasUnacknowledgedAlerts);
      
      // Update device status
      setDeviceStatus(prev => ({
        ...prev,
        online: true,
        lastSeen: new Date().toISOString()
      }));
      
      setIsLoading(false);
      
      // No return value (void)
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Gagal memperbarui data. Coba lagi atau periksa koneksi server.');
      setIsLoading(false);
    }
  };

  // Update threshold settings
  const updateThresholds = async (newSettings: Partial<ThresholdSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Gagal memperbarui pengaturan ambang batas');
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const result = await acknowledgeAlert(alertId);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
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
      setError('Gagal mengakui peringatan');
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };
  
  // Acknowledge all alerts
  const handleAcknowledgeAllAlerts = async () => {
    try {
      const result = await acknowledgeAllAlerts();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Update all alerts in state
      setAlerts(prev => 
        prev.map(alert => ({ ...alert, acknowledged: true }))
      );
      
      // Update buzzer status
      setBuzzerActive(false);
    } catch (err) {
      setError('Gagal mengakui semua peringatan');
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
      setError('Gagal mengontrol pompa');
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
      setError('Gagal mengubah mode pompa');
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
    testBuzzer,
    refreshData
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
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
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  acknowledgeAllAlerts: () => Promise<void>;
  togglePump: (active: boolean) => Promise<void>;
  togglePumpMode: (mode: 'auto' | 'manual') => Promise<void>;
  testBuzzer: (duration?: number) => Promise<void>;
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
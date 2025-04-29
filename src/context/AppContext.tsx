"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WaterLevelData, AlertData, ThresholdSettings, PumpStatus, DeviceStatus } from '@/lib/types';
import { fetchWaterLevelData, fetchAlerts, fetchSettings, updateSettings } from '@/lib/api';

interface AppContextType {
  waterLevelData: WaterLevelData[];
  currentLevel: WaterLevelData | null;
  alerts: AlertData[];
  settings: ThresholdSettings;
  pumpStatus: PumpStatus;
  deviceStatus: DeviceStatus;
  isLoading: boolean;
  error: string | null;
  updateThresholds: (newSettings: Partial<ThresholdSettings>) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  togglePump: (active: boolean) => Promise<void>;
  togglePumpMode: (mode: 'auto' | 'manual') => Promise<void>;
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
  const acknowledgeAlert = async (alertId: string) => {
    try {
      // API call to acknowledge alert would go here
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
    } catch (err) {
      setError('Failed to acknowledge alert');
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };

  // Toggle pump status
  const togglePump = async (active: boolean) => {
    try {
      // API call to control pump would go here
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

  const value = {
    waterLevelData,
    currentLevel,
    alerts,
    settings,
    pumpStatus,
    deviceStatus,
    isLoading,
    error,
    updateThresholds,
    acknowledgeAlert,
    togglePump,
    togglePumpMode
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
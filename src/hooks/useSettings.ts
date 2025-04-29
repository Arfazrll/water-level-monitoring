import { useState, useEffect } from 'react';
import { ThresholdSettings } from '@/lib/types';
import { fetchSettings, updateSettings as apiUpdateSettings } from '@/lib/api';

const defaultSettings: ThresholdSettings = {
  warningLevel: 70,
  dangerLevel: 90,
  maxLevel: 100,
  minLevel: 0,
  pumpActivationLevel: 80,
  pumpDeactivationLevel: 40,
  unit: 'cm'
};

export function useSettings() {
  const [settings, setSettings] = useState<ThresholdSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Fetch settings
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settingsData = await fetchSettings();
        setSettings(settingsData);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to fetch settings');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Update settings
  const updateSettings = async (newSettings: Partial<ThresholdSettings>) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const updatedSettings = await apiUpdateSettings({
        ...settings,
        ...newSettings
      });
      
      setSettings(updatedSettings);
      setIsUpdating(false);
      
      return true;
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings');
      setIsUpdating(false);
      
      return false;
    }
  };

  // Validate settings before updating
  const validateSettings = (newSettings: Partial<ThresholdSettings>): { isValid: boolean; message?: string } => {
    // Combine current and new settings for validation
    const combined = { ...settings, ...newSettings };
    
    // Warning level must be less than danger level
    if (combined.warningLevel >= combined.dangerLevel) {
      return {
        isValid: false,
        message: 'Warning level must be lower than danger level'
      };
    }
    
    // Pump deactivation level must be less than pump activation level
    if (combined.pumpDeactivationLevel >= combined.pumpActivationLevel) {
      return {
        isValid: false,
        message: 'Pump deactivation level must be lower than pump activation level'
      };
    }
    
    // All levels must be within min/max range
    if (
      combined.warningLevel > combined.maxLevel ||
      combined.dangerLevel > combined.maxLevel ||
      combined.pumpActivationLevel > combined.maxLevel ||
      combined.pumpDeactivationLevel > combined.maxLevel
    ) {
      return {
        isValid: false,
        message: 'Threshold levels cannot exceed maximum level'
      };
    }
    
    if (
      combined.warningLevel < combined.minLevel ||
      combined.dangerLevel < combined.minLevel ||
      combined.pumpActivationLevel < combined.minLevel ||
      combined.pumpDeactivationLevel < combined.minLevel
    ) {
      return {
        isValid: false,
        message: 'Threshold levels cannot be below minimum level'
      };
    }
    
    return { isValid: true };
  };

  return {
    settings,
    isLoading,
    error,
    isUpdating,
    updateSettings,
    validateSettings
  };
}
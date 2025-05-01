// FrontEnd/src/lib/api.ts

import { WaterLevelData, AlertData, ThresholdSettings } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Fetch water level data
export async function fetchWaterLevelData(limit?: number): Promise<WaterLevelData[]> {
  try {
    const url = limit 
      ? `${API_BASE_URL}/water-level?limit=${limit}` 
      : `${API_BASE_URL}/water-level`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching water level data:', error);
    
    // For development/demo purposes, return mock data if API fails
    if (process.env.NODE_ENV === 'development') {
      return generateMockWaterLevelData(limit || 24);
    }
    
    throw error;
  }
}

// Fetch alerts
export async function fetchAlerts(): Promise<AlertData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching alerts:', error);
    
    // For development/demo purposes, return mock data if API fails
    if (process.env.NODE_ENV === 'development') {
      return generateMockAlerts();
    }
    
    throw error;
  }
}

// Fetch threshold settings
export async function fetchSettings(): Promise<ThresholdSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching settings:', error);
    
    // For development/demo purposes, return mock data if API fails
    if (process.env.NODE_ENV === 'development') {
      return {
        warningLevel: 70,
        dangerLevel: 90,
        maxLevel: 100,
        minLevel: 0,
        pumpActivationLevel: 80,
        pumpDeactivationLevel: 40,
        unit: 'cm'
      };
    }
    
    throw error;
  }
}

// Fetch buzzer status
export async function fetchBuzzerStatus(): Promise<{ isActive: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/test/buzzer/status`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching buzzer status:', error);
    
    // For development/demo purposes, return mock data if API fails
    if (process.env.NODE_ENV === 'development') {
      // Asumsi buzzer aktif jika ada alert yang belum diakui
      const alerts = await fetchAlerts();
      const isActive = alerts.some(alert => !alert.acknowledged);
      return { isActive };
    }
    
    throw error;
  }
}

// Test buzzer
export async function testBuzzer(duration: number = 3000): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/test/buzzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        activate: true,
        duration
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error testing buzzer:', error);
    throw error;
  }
}

// Update threshold settings
export async function updateSettings(settings: ThresholdSettings): Promise<ThresholdSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

// Acknowledge all alerts
export async function acknowledgeAllAlerts(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/acknowledge-all`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error acknowledging all alerts:', error);
    throw error;
  }
}

// Control pump
export async function controlPump(isActive: boolean): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/pump/control`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error controlling pump:', error);
    throw error;
  }
}

// Set pump mode
export async function setPumpMode(mode: 'auto' | 'manual'): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/pump/mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mode }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error setting pump mode:', error);
    throw error;
  }
}

// Calibrate sensor
export async function calibrateSensor(minLevel: number, maxLevel: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/test/sensor-calibration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ minLevel, maxLevel }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error calibrating sensor:', error);
    throw error;
  }
}

// Generate mock water level data for development
function generateMockWaterLevelData(count: number): WaterLevelData[] {
  const data: WaterLevelData[] = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 3600000); // hourly data
    // Generate a wave pattern with some randomness
    const baseLevel = 50 + 20 * Math.sin(i / 4);
    const randomness = Math.random() * 10 - 5;
    const level = Math.max(0, Math.min(100, baseLevel + randomness));
    
    data.push({
      timestamp: timestamp.toISOString(),
      level: Math.round(level * 10) / 10, // Round to 1 decimal place
      unit: 'cm'
    });
  }
  
  return data;
}

// Generate mock alerts for development
function generateMockAlerts(): AlertData[] {
  const alerts: AlertData[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      level: 75.5,
      type: 'warning',
      message: 'Level air telah mencapai ambang peringatan (75.5 cm)',
      acknowledged: true
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      level: 92.3,
      type: 'danger',
      message: 'Level air telah mencapai ambang bahaya (92.3 cm)',
      acknowledged: false
    }
  ];
  
  return alerts;
}
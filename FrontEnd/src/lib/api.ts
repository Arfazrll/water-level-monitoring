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
    
    // Default to false if error
    return { isActive: false };
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

// Acknowledge alert - IMPROVED VERSION
export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean, message: string }> {
  try {
    // Validate alertId first
    if (!alertId || alertId === 'undefined' || alertId === 'null') {
      console.error('Invalid alert ID:', alertId);
      return { 
        success: false, 
        message: 'Invalid alert ID. Please try again or refresh the page.'
      };
    }
    
    console.log(`Sending acknowledge request for alert ID: ${alertId}`);
    
    const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Log response for debugging
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`API Response (${response.status}):`, responseText);
    } catch (e) {
      console.log(`Could not get response text: ${e}`);
    }
    
    if (!response.ok) {
      return { 
        success: false, 
        message: `Server error: ${response.status}${responseText ? ` - ${responseText}` : ''}`
      };
    }
    
    console.log(`Alert ${alertId} successfully acknowledged`);
    return { 
      success: true, 
      message: 'Alert successfully acknowledged'
    };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Acknowledge all alerts
export async function acknowledgeAllAlerts(): Promise<{ success: boolean, message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts/acknowledge-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Log response for debugging
    let responseText = '';
    try {
      responseText = await response.text();
      console.log(`API Response (${response.status}):`, responseText);
    } catch (e) {
      console.log(`Could not get response text: ${e}`);
    }
    
    if (!response.ok) {
      return {
        success: false,
        message: `Server error: ${response.status}${responseText ? ` - ${responseText}` : ''}`
      };
    }
    
    console.log('All alerts successfully acknowledged');
    return {
      success: true,
      message: 'All alerts successfully acknowledged'
    };
  } catch (error) {
    console.error('Error acknowledging all alerts:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
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
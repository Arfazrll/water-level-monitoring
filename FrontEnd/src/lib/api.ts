import { WaterLevelData, AlertData, ThresholdSettings } from './types';

// Gunakan environment variable dengan fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function untuk pemeriksaan respons API
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    // Try to get error message from response if possible
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parsing error, use default error message
      // No variable name needed in catch
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // Handle API response format variations
  // Some endpoints return { success, message, data }
  // Others return data directly
  if (data && data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    return data.data;
  }
  
  return data;
};

// Fetch water level data
export async function fetchWaterLevelData(limit?: number): Promise<WaterLevelData[]> {
  try {
    const url = limit 
      ? `${API_BASE_URL}/water-level?limit=${limit}` 
      : `${API_BASE_URL}/water-level`;
    
    const response = await fetch(url);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching water level data:', error);
    throw error;
  }
}

// Fetch alerts
export async function fetchAlerts(): Promise<AlertData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/alerts`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
}

// Fetch threshold settings
export async function fetchSettings(): Promise<ThresholdSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/settings`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching settings:', error);
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
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

// Acknowledge alert
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
    
    // Just await the response handling without storing unused data
    await handleApiResponse(response);
    
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
    
    // Just await the response handling without storing unused data
    await handleApiResponse(response);
    
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
    
    await handleApiResponse(response);
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
    
    await handleApiResponse(response);
  } catch (error) {
    console.error('Error setting pump mode:', error);
    throw error;
  }
}

// Fetch pump status
export async function fetchPumpStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/pump/status`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching pump status:', error);
    throw error;
  }
}

// Test server connection
export async function testServerConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      return false;
    }
    
    await response.json();
    return true;
  } catch (error) {
    console.error('Server connection test failed:', error);
    return false;
  }
}
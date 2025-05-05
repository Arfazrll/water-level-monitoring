import { WaterLevelData, AlertData, ThresholdSettings } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

if (process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string;
  notifyOnWarning: boolean;
  notifyOnDanger: boolean;
  notifyOnPumpActivation: boolean;
}

/**
 * Implementasi fetch dengan mekanisme retry dan exponential backoff
 * @param url - URL endpoint API
 * @param options - Opsi request fetch
 * @param maxRetries - Jumlah maksimum percobaan
 * @returns Objek Response dari fetch
 */
const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> => {
  let retries = 0;
  let lastError;

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error;
      retries++;
      if (retries >= maxRetries) break;
      
      const baseDelay = Math.min(1000 * Math.pow(2, retries), 10000);
      const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
      const delay = baseDelay + jitter;
      
      console.log(`Retry ${retries}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Penanganan respon API dengan validasi dan ekstraksi data
 * @param response - Objek Response dari fetch
 * @returns Data dari respons API
 */
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  if (data && data.hasOwnProperty('success')) {
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }
    return data.data;
  }
  
  return data;
};

/**
 * Pengujian konektivitas server
 * @returns Status keberhasilan koneksi
 */
export async function testServerConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetchWithRetry(`${API_BASE_URL}/status`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
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

/**
 * Pengambilan data level air
 * @param limit - Batas jumlah data yang diambil
 * @returns Array data level air
 */
export async function fetchWaterLevelData(limit?: number): Promise<WaterLevelData[]> {
  try {
    const url = limit 
      ? `${API_BASE_URL}/water-level?limit=${limit}` 
      : `${API_BASE_URL}/water-level`;
    
    const response = await fetchWithRetry(url);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching water level data:', error);
    throw error;
  }
}

/**
 * Pengambilan data peringatan
 * @returns Array data peringatan
 */
export async function fetchAlerts(): Promise<AlertData[]> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/alerts`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
}

/**
 * Pengambilan pengaturan ambang batas
 * @returns Objek pengaturan ambang batas
 */
export async function fetchSettings(): Promise<ThresholdSettings> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/settings`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
}

/**
 * Pembaruan pengaturan ambang batas
 * @param settings - Objek pengaturan yang akan diperbarui
 * @returns Objek pengaturan yang telah diperbarui
 */
export async function updateSettings(settings: ThresholdSettings): Promise<ThresholdSettings> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/settings`, {
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

/**
 * Pengakuan peringatan
 * @param alertId - ID peringatan yang akan diakui
 * @returns Objek status operasi
 */
export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean, message: string }> {
  try {
    if (!alertId || alertId === 'undefined' || alertId === 'null') {
      console.error('Invalid alert ID:', alertId);
      return { 
        success: false, 
        message: 'ID peringatan tidak valid. Silakan coba lagi atau muat ulang halaman.'
      };
    }
    
    console.log(`Mengirim permintaan pengakuan untuk ID peringatan: ${alertId}`);
    
    const response = await fetchWithRetry(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    await handleApiResponse(response);
    
    return { 
      success: true, 
      message: 'Peringatan berhasil diakui'
    };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

/**
 * Pengakuan semua peringatan
 * @returns Objek status operasi
 */
export async function acknowledgeAllAlerts(): Promise<{ success: boolean, message: string }> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/alerts/acknowledge-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    await handleApiResponse(response);
    
    return {
      success: true,
      message: 'Semua peringatan berhasil diakui'
    };
  } catch (error) {
    console.error('Error acknowledging all alerts:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

/**
 * Kontrol status pompa
 * @param isActive - Status aktivasi pompa
 */
export async function controlPump(isActive: boolean): Promise<void> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/pump/control`, {
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

/**
 * Pengaturan mode pompa
 * @param mode - Mode operasi pompa
 */
export async function setPumpMode(mode: 'auto' | 'manual'): Promise<void> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/pump/mode`, {
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

/**
 * Pengambilan status pompa
 * @returns Objek status pompa
 */
export async function fetchPumpStatus() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/pump/status`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching pump status:', error);
    throw error;
  }
}

/**
 * Pengambilan pengaturan notifikasi
 * @returns Objek pengaturan notifikasi
 */
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/settings/notifications`);
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }
}

/**
 * Pembaruan pengaturan notifikasi
 * @param settings - Objek pengaturan notifikasi yang akan diperbarui
 * @returns Objek pengaturan notifikasi yang telah diperbarui
 */
export async function updateNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/settings/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    return handleApiResponse(response);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}
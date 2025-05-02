// FrontEnd/src/context/AppContext.tsx

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  WaterLevelData, 
  AlertData, 
  ThresholdSettings, 
  PumpStatus, 
  DeviceStatus,
  WebSocketMessage
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

// Impor utilitas WebSocket
import { connectWebSocket } from '@/lib/websocket';

/**
 * Definisi sistematis tipe data konteks aplikasi
 * Mengenkapsulasi seluruh variabel state dan fungsi interaktif
 */
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

// Konfigurasi nilai default rasional untuk pengaturan sistem
const defaultSettings: ThresholdSettings = {
  warningLevel: 30,    // Ambang batas peringatan (30 cm)
  dangerLevel: 20,     // Ambang batas bahaya (20 cm)
  maxLevel: 100,       // Kapasitas volumetrik maksimum (100 cm)
  minLevel: 0,         // Batas inferior pengukuran (0 cm)
  pumpActivationLevel: 40,  // Titik aktivasi pompa (40 cm)
  pumpDeactivationLevel: 20, // Titik deaktivasi pompa (20 cm)
  unit: 'cm'           // Satuan metrik standar pengukuran
};

// Konfigurasi default status pompa
const defaultPumpStatus: PumpStatus = {
  isActive: false,
  mode: 'auto',
  lastActivated: null
};

// Konfigurasi default status perangkat
const defaultDeviceStatus: DeviceStatus = {
  online: false,  // Inisialisasi dengan asumsi offline hingga koneksi terkonfirmasi
  lastSeen: new Date().toISOString(),
  batteryLevel: 100,
  signalStrength: 100
};

// Inisialisasi konteks dengan nilai awal undefined
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Komponen provider untuk manajemen state global dengan integrasi WebSocket
 * dan implementasi mekanisme resilience
 */
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Deklarasi state dengan tipe data yang terdefinisi dengan ketat
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

  /**
   * Handler untuk pemrosesan pesan WebSocket
   * Implementasi pattern callback dengan memoization untuk optimasi performa
   */
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    try {
      // Validasi integritas pesan
      if (!message || !message.type) {
        console.warn('Format pesan WebSocket tidak valid', message);
        return;
      }
      
      // Pemrosesan pesan berdasarkan tipe
      if (message.type === 'waterLevel') {
        // Pembaruan data level air
        const newData = message.data as WaterLevelData;
        setWaterLevelData(prev => {
          // Verifikasi redundansi data
          const isDuplicate = prev.some(item => 
            item.timestamp === newData.timestamp && 
            item.level === newData.level
          );
          
          if (isDuplicate) {
            return prev;
          }
          
          // Agregasi data baru dengan batasan kardinalitas
          const updatedData = [...prev, newData]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-100);  // Pembatasan kardinalitas array (max 100 item)
          
          return updatedData;
        });
        
        setCurrentLevel(newData as WaterLevelData);
        
        // Sinkronisasi status perangkat
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
      } 
      else if (message.type === 'alert') {
        // Pemrosesan notifikasi peringatan
        const newAlert = message.data as AlertData;
        
        setAlerts(prev => {
          const existingAlert = prev.find(a => a.id === newAlert.id);
          
          if (existingAlert) {
            // Pembaruan peringatan existing
            return prev.map(a => a.id === newAlert.id ? newAlert : a);
          } else {
            // Penambahan peringatan baru dengan urutan kronologis
            return [newAlert, ...prev].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }
        });
        
        // Determinasi status buzzer berdasarkan status acknowledgement
        const hasUnacknowledgedAlerts = (message.data as AlertData).acknowledged === false;
        if (hasUnacknowledgedAlerts) {
          setBuzzerActive(true);
        } else {
          // Verifikasi kondisi peringatan lainnya
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
        // Sinkronisasi pengaturan ambang batas
        setSettings(prev => ({
          ...prev,
          ...message.data as ThresholdSettings
        }));
      } 
      else if (message.type === 'pumpStatus') {
        // Sinkronisasi status operasional pompa
        setPumpStatus(message.data as PumpStatus);
      } 
      else if (message.type === 'deviceStatus') {
        // Sinkronisasi status perangkat
        setDeviceStatus(message.data as DeviceStatus);
      } 
      else if (message.type === 'error') {
        console.error('Pesan error WebSocket:', message.data);
      }
      else if (message.type === 'connection') {
        console.log('Pesan koneksi WebSocket:', message.data);
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Error pemrosesan pesan WebSocket:', err);
    }
  }, []);

  /**
   * Inisialisasi data awal dengan mekanisme error handling dan retry
   * Implementasi pattern reliable data fetching dengan exponential backoff
   */
  useEffect(() => {
    const initializeData = async (retryCount = 0, maxRetries = 5) => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Verifikasi konektivitas server dengan batas waktu
        const connectionPromise = testServerConnection();
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 5000);
        });
        
        const isServerConnected = await Promise.race([connectionPromise, timeoutPromise]);
        
        if (!isServerConnected) {
          throw new Error('Tidak dapat terhubung ke server. Periksa koneksi jaringan atau status server.');
        }
        
        // Prioritaskan akuisisi data pengaturan fundamental
        const settingsData = await fetchSettings();
        setSettings(settingsData);
        
        // Akuisisi paralel data operasional lainnya
        const [levelData, alertsData, pumpData] = await Promise.all([
          fetchWaterLevelData(24), // 24 titik data terakhir
          fetchAlerts(),
          fetchPumpStatus()
        ]);
        
        // Pemrosesan data ketinggian air dengan validasi existensi
        if (levelData && levelData.length > 0) {
          setWaterLevelData(levelData);
          setCurrentLevel(levelData[levelData.length - 1]);
        }
        
        // Inisialisasi state peringatan dan status pompa
        setAlerts(alertsData);
        setPumpStatus(pumpData);
        
        // Determinasi status buzzer berdasarkan kondisi acknowledgement
        const hasUnacknowledgedAlerts = alertsData.some(alert => !alert.acknowledged);
        setBuzzerActive(hasUnacknowledgedAlerts);
        
        // Sinkronisasi status perangkat
        setDeviceStatus(prev => ({
          ...prev,
          online: true,
          lastSeen: new Date().toISOString()
        }));
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error inisialisasi data:', err);
        
        if (retryCount < maxRetries) {
          // Implementasi exponential backoff dengan jitter untuk mencegah thundering herd
          const baseDelay = Math.min(2000 * Math.pow(2, retryCount), 30000);
          const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
          const delay = baseDelay + jitter;
          
          console.log(`Mencoba ulang dalam ${Math.round(delay/1000)} detik... (Percobaan ${retryCount + 1}/${maxRetries})`);
          
          setTimeout(() => {
            initializeData(retryCount + 1, maxRetries);
          }, delay);
        } else {
          setError('Gagal memuat data awal. Coba muat ulang halaman atau periksa koneksi server.');
          setIsLoading(false);
          
          // Tetapkan status offline
          setDeviceStatus(prev => ({
            ...prev,
            online: false
          }));
        }
      }
    };
    
    initializeData();
  }, []);

  /**
   * Inisialisasi koneksi WebSocket dan implementasi cleanup
   */
  useEffect(() => {
    // Koneksi WebSocket dengan manajemen status
    const cleanupWebSocket = connectWebSocket(setIsConnected, handleWebSocketMessage);
    
    // Cleanup pada unmount
    return cleanupWebSocket;
  }, [handleWebSocketMessage]);

  /**
   * Fungsi untuk refresh data secara manual
   * Implementasi pattern data synchronization dengan comprehensive error handling
   */
  const refreshData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Akuisisi paralel semua data operasional
      const [settingsData, levelData, alertsData, pumpData] = await Promise.all([
        fetchSettings(),
        fetchWaterLevelData(24),
        fetchAlerts(),
        fetchPumpStatus()
      ]);
      
      // Sinkronisasi state dengan data baru
      setSettings(settingsData);
      
      if (levelData && levelData.length > 0) {
        setWaterLevelData(levelData);
        setCurrentLevel(levelData[levelData.length - 1]);
      }
      
      setAlerts(alertsData);
      setPumpStatus(pumpData);
      
      // Sinkronisasi status buzzer
      const hasUnacknowledgedAlerts = alertsData.some(alert => !alert.acknowledged);
      setBuzzerActive(hasUnacknowledgedAlerts);
      
      // Sinkronisasi status perangkat
      setDeviceStatus(prev => ({
        ...prev,
        online: true,
        lastSeen: new Date().toISOString()
      }));
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error refresh data:', err);
      setError('Gagal memperbarui data. Coba lagi atau periksa koneksi server.');
      setIsLoading(false);
    }
  };

  /**
   * Fungsi untuk pembaruan pengaturan ambang batas
   * @param newSettings - Objek pengaturan parsial untuk diperbarui
   */
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

  /**
   * Fungsi untuk acknowledgement peringatan tunggal
   * @param alertId - Identifier unik peringatan
   */
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const result = await acknowledgeAlert(alertId);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Pembaruan state peringatan lokal
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
      
      // Verifikasi kondisi peringatan lainnya
      const hasUnacknowledgedAlerts = alerts.some(
        alert => alert.id !== alertId && !alert.acknowledged
      );
      
      // Pembaruan status buzzer jika tidak ada lagi peringatan yang belum diakui
      if (!hasUnacknowledgedAlerts) {
        setBuzzerActive(false);
      }
    } catch (err) {
      setError('Gagal mengakui peringatan');
      console.error('Error acknowledging alert:', err);
      throw err;
    }
  };
  
  /**
   * Fungsi untuk acknowledgement semua peringatan
   */
  const handleAcknowledgeAllAlerts = async () => {
    try {
      const result = await acknowledgeAllAlerts();
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      // Pembaruan semua peringatan dalam state
      setAlerts(prev => 
        prev.map(alert => ({ ...alert, acknowledged: true }))
      );
      
      // Deaktivasi buzzer
      setBuzzerActive(false);
    } catch (err) {
      setError('Gagal mengakui semua peringatan');
      console.error('Error acknowledging all alerts:', err);
      throw err;
    }
  };

  /**
   * Fungsi untuk kontrol status pompa
   * @param active - Status aktivasi yang diinginkan
   */
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

  /**
   * Fungsi untuk pengaturan mode pompa
   * @param mode - Mode operasi pompa (auto/manual)
   */
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
  
  /**
   * Fungsi untuk pengujian buzzer
   * @param duration - Durasi aktivasi dalam milidetik
   */
  const testBuzzer = async (duration: number = 3000) => {
    try {
      // Eksekusi API pengujian buzzer
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
      
      // Pembaruan state sementara
      setBuzzerActive(true);
      
      // Reset state setelah durasi
      setTimeout(() => {
        setBuzzerActive(false);
      }, duration + 500);
      
    } catch (err) {
      console.error('Error pengujian buzzer:', err);
      throw err;
    }
  };

  // Konstruksi objek konteks dengan seluruh state dan fungsi
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

  // Penyediaan konteks untuk komponen anak
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Hook untuk akses konteks aplikasi dengan validasi
 * @returns Objek konteks aplikasi
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext harus digunakan dalam AppProvider');
  }
  return context;
};
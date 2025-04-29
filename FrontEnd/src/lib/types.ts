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

export interface ThresholdSettings {
  warningLevel: number;
  dangerLevel: number;
  maxLevel: number;
  minLevel: number;
  pumpActivationLevel: number;
  pumpDeactivationLevel: number;
  unit: string;
}

export interface PumpStatus {
  isActive: boolean;
  mode: 'auto' | 'manual';
  lastActivated: string | null;
}

export interface EmailSettings {
  enabled: boolean;
  emailAddress: string;
  notifyOnWarning: boolean;
  notifyOnDanger: boolean;
}

export interface DeviceStatus {
  online: boolean;
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
}
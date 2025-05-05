"use client";

import React from 'react';
import { AlertData, ThresholdSettings } from '../../context/AppContext';

interface AlertStatusProps {
  alerts: AlertData[];
  settings: ThresholdSettings;
  onAcknowledge: (alertId: string) => Promise<void>;
  onAcknowledgeAll: () => Promise<void>;
  isLoading?: boolean; 
}

const AlertStatus: React.FC<AlertStatusProps> = ({ alerts, settings, onAcknowledge, onAcknowledgeAll, isLoading = false }) => {
  const latestAlert = alerts
    .filter(alert => !alert.acknowledged)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;
  const buzzerActive = unacknowledgedCount > 0;
  
  const getAlarmStatus = () => {
    if (latestAlert && latestAlert.type === 'danger') {
      return {
        level: 'BAHAYA',
        message: 'Level air telah mencapai ambang BAHAYA!',
        icon: '🚨',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        pulseColor: 'bg-red-600',
        alertClasses: 'bg-red-50 border-red-200 text-red-700',
      };
    }
    
    if (latestAlert && latestAlert.type === 'warning') {
      return {
        level: 'PERINGATAN',
        message: 'Level air telah mencapai ambang PERINGATAN',
        icon: '⚠️',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        pulseColor: 'bg-yellow-500',
        alertClasses: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      };
    }
    
    return {
      level: 'NORMAL',
      message: 'Level air dalam rentang normal',
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      pulseColor: 'bg-green-500',
      alertClasses: 'bg-green-50 border-green-200 text-green-700',
    };
  };
  
  const alarmStatus = getAlarmStatus();
  const isAlarmActive = !!latestAlert;

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Alarm</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Alarm</h2>
      
      <div className={`flex items-center p-4 ${alarmStatus.bgColor} rounded-md`}>
        <div className="mr-4 text-2xl">{alarmStatus.icon}</div>
        
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${alarmStatus.color}`}>
            {alarmStatus.level}
          </h3>
          <p className={`${alarmStatus.color} text-sm`}>{alarmStatus.message}</p>
        </div>
        
        {isAlarmActive && (
          <div className="relative">
            <span className={`absolute h-4 w-4 ${alarmStatus.pulseColor} rounded-full`}></span>
            <span className={`animate-ping absolute h-4 w-4 ${alarmStatus.pulseColor} rounded-full opacity-75`}></span>
          </div>
        )}
      </div>
      
      {settings && (
        <div className="mt-4">
          <h3 className="font-medium text-sm text-gray-700 mb-2">Pengaturan Ambang Batas Saat Ini:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-yellow-50 p-2 rounded">
              <span className="text-yellow-600 font-medium">Level Peringatan:</span>
              <span className="ml-1 text-gray-700">{settings.warningLevel} {settings.unit}</span>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <span className="text-red-600 font-medium">Level Bahaya:</span>
              <span className="ml-1 text-gray-700">{settings.dangerLevel} {settings.unit}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Buzzer */}
      {isAlarmActive && (
        <div className="mt-4">
          <div className="flex items-center mb-2">
            <span className={`inline-block w-3 h-3 ${buzzerActive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'} rounded-full mr-2`}></span>
            <span className="text-sm font-medium">
              Status Buzzer: {buzzerActive ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
          {buzzerActive && (
            <button
              onClick={onAcknowledgeAll}
              className="w-full mt-2 py-2 px-4 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Matikan Semua Alarm
            </button>
          )}
        </div>
      )}
      
      {/* Recent alerts list */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">Peringatan Terbaru</h3>
          <span className="text-xs text-gray-500">Total: {alerts.length}</span>
        </div>
        
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Tidak ada peringatan</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {alerts.slice(0, 5).map(alert => (
              <div 
                key={alert.id} 
                className={`p-2 rounded border ${alert.type === 'danger' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} ${!alert.acknowledged ? 'animate-pulse-slow' : ''}`}
              >
                <div className="flex justify-between">
                  <span className={`text-xs font-medium ${alert.type === 'danger' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {alert.type === 'danger' ? 'BAHAYA' : 'PERINGATAN'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{alert.message}</p>
                
                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className={`mt-1 text-xs px-2 py-1 rounded ${
                      alert.type === 'danger' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    Tandai sudah diketahui
                  </button>
                )}
              </div>
            ))}
            
            {alerts.length > 5 && (
              <a 
                href="/history" 
                className="block text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                Lihat semua peringatan →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertStatus;
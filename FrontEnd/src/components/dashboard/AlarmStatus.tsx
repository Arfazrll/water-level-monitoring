"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

const AlarmStatus: React.FC = () => {
  const { currentLevel, settings, alerts, acknowledgeAllAlerts } = useAppContext();
  const [buzzerActive, setBuzzerActive] = useState(false);
  
  // Dapatkan peringatan terbaru yang belum diketahui, jika ada
  const latestAlert = alerts
    .filter(alert => !alert.acknowledged)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  // Tentukan apakah alarm aktif
  const isAlarmActive = !!latestAlert || 
    (currentLevel && settings && (
      currentLevel.level >= settings.dangerLevel || 
      currentLevel.level >= settings.warningLevel
    ));
  
  // Set status buzzer berdasarkan peringatan yang belum diakui
  useEffect(() => {
    setBuzzerActive(alerts.some(alert => !alert.acknowledged));
  }, [alerts]);
  
  // Menangani pengakuan semua peringatan dan mematikan buzzer
  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAllAlerts();
    } catch (error) {
      console.error('Error acknowledging all alerts:', error);
    }
  };
  
  // Tentukan level alarm
  const getAlarmStatus = () => {
    if (!currentLevel || !settings) return null;
    
    // Jika ada peringatan bahaya atau level saat ini di atas ambang bahaya
    if (
      (latestAlert && latestAlert.type === 'danger') ||
      currentLevel.level >= settings.dangerLevel
    ) {
      return {
        level: 'BAHAYA',
        message: 'Level air telah mencapai ambang BAHAYA!',
        icon: '🚨',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        pulseColor: 'bg-red-600',
      };
    }
    
    // Jika ada peringatan awas atau level saat ini di atas ambang peringatan
    if (
      (latestAlert && latestAlert.type === 'warning') ||
      currentLevel.level >= settings.warningLevel
    ) {
      return {
        level: 'AWAS',
        message: 'Level air telah mencapai ambang PERINGATAN',
        icon: '⚠️',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        pulseColor: 'bg-yellow-500',
      };
    }
    
    // Status normal
    return {
      level: 'NORMAL',
      message: 'Level air dalam rentang normal',
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      pulseColor: 'bg-green-500',
    };
  };
  
  const alarmStatus = getAlarmStatus();
  
  if (!alarmStatus || !settings) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Alarm</h2>
        <p className="text-gray-500">Memuat data...</p>
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
              onClick={handleAcknowledgeAll}
              className="w-full mt-2 py-2 px-4 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Matikan Semua Alarm
            </button>
          )}
        </div>
      )}
      
      {latestAlert && (
        <div className="mt-4 text-sm">
          <h3 className="font-medium text-gray-700 mb-2">Peringatan Terbaru:</h3>
          <div className={`p-2 rounded ${latestAlert.type === 'danger' ? 'bg-red-50' : 'bg-yellow-50'}`}>
            <p className={latestAlert.type === 'danger' ? 'text-red-600' : 'text-yellow-600'}>
              {latestAlert.message}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {new Date(latestAlert.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlarmStatus;
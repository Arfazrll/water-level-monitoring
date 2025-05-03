// src/app/dashboard/page.tsx
"use client";

import React from 'react';
import { useAppContext } from '../../context/AppContext';
import WaterLevelChart from '../../components/dashboard/WaterLevelChart';
import TankVisualizer from '../../components/dashboard/TankVisualizer';
import AlertStatus from '../../components/dashboard/AlertStatus';
import PumpControl from '../../components/dashboard/PumpControl';
import StatusCards from '../../components/dashboard/StatusCards';

export default function DashboardPage() {
  const { 
    waterLevelData, 
    currentLevel, 
    alerts, 
    settings, 
    pumpStatus, 
    deviceStatus,
    isLoading, 
    error, 
    refreshData, 
    acknowledgeAlert, 
    acknowledgeAllAlerts, 
    togglePump, 
    togglePumpMode 
  } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto my-10 p-6 bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-xl font-semibold text-red-700 mb-3">Error Memuat Dashboard</h2>
        <p className="text-red-600">{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={() => refreshData()}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  // Count unacknowledged alerts
  const activeAlerts = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header with status summary */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Monitoring Level Air</h1>
        <p className="text-gray-600">Pemantauan dan kendali level air secara real-time</p>
      </div>
      
      {/* Status cards row */}
      <StatusCards 
        currentLevel={currentLevel} 
        settings={settings}
        pumpStatus={pumpStatus}
        activeAlerts={activeAlerts}
      />
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Water level chart */}
          <WaterLevelChart 
            data={waterLevelData}
            settings={settings}
            onRefresh={refreshData}
          />
          
          {/* Alert status component */}
          <AlertStatus 
            alerts={alerts} 
            settings={settings}
            onAcknowledge={acknowledgeAlert}
            onAcknowledgeAll={acknowledgeAllAlerts}
          />
        </div>
        
        {/* Side column */}
        <div className="space-y-6">
          {/* Current water level visualization */}
          <TankVisualizer 
            currentLevel={currentLevel} 
            settings={settings} 
          />
          
          {/* Pump control component */}
          <PumpControl 
            pumpStatus={pumpStatus} 
            settings={settings}
            onTogglePump={togglePump}
            onToggleMode={togglePumpMode}
          />
          
          {/* Quick actions card */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Aksi Cepat</h2>
            
            <div className="space-y-3">
              <a 
                href="/settings" 
                className="block py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">Konfigurasi Ambang Batas</span>
                </div>
              </a>
              
              <a 
                href="/history" 
                className="block py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Lihat Riwayat Peringatan</span>
                </div>
              </a>
              
              <button 
                onClick={acknowledgeAllAlerts}
                className="block w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
                disabled={activeAlerts === 0}
              >
                <div className="flex items-center justify-center">
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Matikan Semua Alarm</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* System status */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Sistem</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sensor:</span>
                <span className={`font-medium ${deviceStatus.online ? 'text-green-600' : 'text-red-600'}`}>
                  {deviceStatus.online ? 'Daring' : 'Luring'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sistem Alarm:</span>
                <span className="font-medium text-green-600">Aktif</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kendali Pompa:</span>
                <span className="font-medium text-green-600">Operasional</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pembaruan Terakhir:</span>
                <span className="font-medium">
                  {currentLevel ? new Date(currentLevel.timestamp).toLocaleString() : 'Tidak tersedia'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
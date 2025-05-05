import React from 'react';
import { WaterLevelData, ThresholdSettings, PumpStatus } from '../../context/AppContext';

interface StatusCardsProps {
  currentLevel: WaterLevelData | null;
  settings: ThresholdSettings | null;
  pumpStatus: PumpStatus | null;
  activeAlerts: number;
  isLoading?: boolean;
}

const StatusCards: React.FC<StatusCardsProps> = ({ 
  currentLevel, 
  settings, 
  pumpStatus, 
  activeAlerts,
  isLoading = false
}) => {

  if (isLoading || !settings) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-4">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!currentLevel || !pumpStatus) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-500">Level Air Saat Ini</h3>
          <div className="mt-2 text-gray-400">Data tidak tersedia</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-500">Status Pompa</h3>
          <div className="mt-2 text-gray-400">Data tidak tersedia</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-500">Status Peringatan</h3>
          <div className="mt-2 text-gray-400">Data tidak tersedia</div>
        </div>
      </div>
    );
  }

  const getLevelStatus = () => {
    if (currentLevel.level >= settings.dangerLevel) {
      return { text: 'BAHAYA', color: 'text-red-600' };
    }
    
    if (currentLevel.level >= settings.warningLevel) {
      return { text: 'PERINGATAN', color: 'text-yellow-600' };
    }
    
    return { text: 'Normal', color: 'text-green-600' };
  };
  
  const levelStatus = getLevelStatus();
  
  const percentageFilled = Math.min(Math.max((currentLevel.level / settings.maxLevel) * 100, 0), 100);
  
  const getPumpStatusInfo = () => {
    if (pumpStatus.isActive) {
      return {
        text: 'Aktif',
        color: 'text-green-600',
        icon: (
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      };
    } else {
      return {
        text: 'Tidak Aktif',
        color: 'text-gray-600',
        icon: (
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    }
  };
  
  const pumpStatusInfo = getPumpStatusInfo();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Level Card */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Level Air Saat Ini</h3>
            <div className="mt-1 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {currentLevel.level.toFixed(1)} {currentLevel.unit}
              </p>
              <p className={`ml-2 text-sm font-medium ${levelStatus.color}`}>
                {levelStatus.text}
              </p>
            </div>
          </div>
          <div className="p-2 bg-blue-50 rounded-md">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-3 relative max-w-xl rounded-full overflow-hidden">
          <div className="w-full h-full bg-gray-200 absolute"></div>
          <div 
            className={`h-full ${
              currentLevel.level >= settings.dangerLevel 
                ? 'bg-red-500' 
                : currentLevel.level >= settings.warningLevel 
                  ? 'bg-yellow-500' 
                  : 'bg-blue-500'
            } absolute`} 
            style={{ width: `${percentageFilled}%` }}
          ></div>
        </div>
        
        <div className="mt-1 text-xs text-gray-500">
          Kapasitas: {percentageFilled.toFixed(1)}%
        </div>
      </div>
      
      {/* Pump Status Card */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status Pompa</h3>
            <div className="mt-1 flex items-baseline">
              <p className={`text-2xl font-semibold ${pumpStatusInfo.color}`}>
                {pumpStatusInfo.text}
              </p>
              <p className="ml-2 text-sm font-medium text-gray-600">
                Mode: {pumpStatus.mode === 'auto' ? 'Otomatis' : 'Manual'}
              </p>
            </div>
          </div>
          <div className="p-2 bg-blue-50 rounded-md">
            {pumpStatusInfo.icon}
          </div>
        </div>
        
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-green-50 rounded text-green-700">
              <span className="font-medium">Aktivasi:</span> {settings.pumpActivationLevel} {settings.unit}
            </div>
            <div className="p-2 bg-red-50 rounded text-red-700">
              <span className="font-medium">Deaktivasi:</span> {settings.pumpDeactivationLevel} {settings.unit}
            </div>
          </div>
        </div>
      </div>
      
      {/* Alerts Card */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Status Peringatan</h3>
            <div className="mt-1 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {activeAlerts}
              </p>
              <p className="ml-2 text-sm font-medium text-gray-600">
                Peringatan Aktif
              </p>
            </div>
          </div>
          <div className={`p-2 ${activeAlerts > 0 ? 'bg-red-50' : 'bg-green-50'} rounded-md`}>
            {activeAlerts > 0 ? (
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-yellow-50 rounded text-yellow-700">
              <span className="font-medium">Ambang Peringatan:</span> {settings.warningLevel} {settings.unit}
            </div>
            <div className="p-2 bg-red-50 rounded text-red-700">
              <span className="font-medium">Ambang Bahaya:</span> {settings.dangerLevel} {settings.unit}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusCards;
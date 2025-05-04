import React from 'react';
import { WaterLevelData, ThresholdSettings } from '../../context/AppContext';

// Definisi interface untuk props
interface TankVisualizerProps {
  currentLevel: WaterLevelData | null;
  settings: ThresholdSettings | null;
  isLoading?: boolean;
}

const TankVisualizer: React.FC<TankVisualizerProps> = ({ 
  currentLevel, 
  settings,
  isLoading = false
}) => {
  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!currentLevel) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md border border-gray-200">
          <div className="text-center p-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600">Belum ada data level air</p>
            <p className="text-sm text-gray-500 mt-2">
              Tunggu pembacaan sensor berikutnya atau periksa koneksi sensor
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Determine water level percentage relative to max
  const percentage = Math.min(Math.max((currentLevel.level / settings.maxLevel) * 100, 0), 100);
  
  // Determine status based on current level
  const getStatusInfo = () => {
    const level = currentLevel.level;
    
    if (level >= settings.dangerLevel) {
      return {
        label: 'BAHAYA',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: (
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    } else if (level >= settings.warningLevel) {
      return {
        label: 'PERINGATAN',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: (
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    } else {
      return {
        label: 'NORMAL',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: (
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
      };
    }
  };

  const statusInfo = getStatusInfo();
  
  // Format timestamp for display
  const formattedTime = new Date(currentLevel.timestamp).toLocaleString();

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
      
      {/* Status indicator */}
      <div className={`flex items-center p-3 mb-4 ${statusInfo.bgColor} rounded-md`}>
        {statusInfo.icon}
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${statusInfo.color}`}>
            Status: {statusInfo.label}
          </h3>
          <p className={`text-sm ${statusInfo.color}`}>
            Level saat ini: {currentLevel.level.toFixed(1)} {currentLevel.unit}
          </p>
        </div>
      </div>
      
      {/* Water tank visualization */}
      <div className="relative w-full h-64 border-2 border-gray-300 rounded-md bg-gray-50 overflow-hidden">
        {/* Water level */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-1000"
          style={{ height: `${percentage}%` }}
        >
          {/* Water waves animation */}
          <div className="absolute inset-0 overflow-hidden opacity-70">
            <div className="water-wave"></div>
          </div>
        </div>
        
        {/* Threshold markers */}
        {/* Danger level marker */}
        <div 
          className="absolute w-full flex items-center"
          style={{ bottom: `${(settings.dangerLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-red-500"></div>
          <div className="absolute right-0 -top-5 bg-red-100 text-red-800 text-xs px-1 rounded">
            Bahaya ({settings.dangerLevel} {settings.unit})
          </div>
        </div>
        
        {/* Warning level marker */}
        <div 
          className="absolute w-full flex items-center"
          style={{ bottom: `${(settings.warningLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-yellow-500"></div>
          <div className="absolute right-0 -top-5 bg-yellow-100 text-yellow-800 text-xs px-1 rounded">
            Peringatan ({settings.warningLevel} {settings.unit})
          </div>
        </div>
        
        {/* Pump activation level marker */}
        <div 
          className="absolute w-full flex items-center"
          style={{ bottom: `${(settings.pumpActivationLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-blue-500"></div>
          <div className="absolute left-0 -top-5 bg-blue-100 text-blue-800 text-xs px-1 rounded">
            Pompa Aktif ({settings.pumpActivationLevel} {settings.unit})
          </div>
        </div>
        
        {/* Pump deactivation level marker */}
        <div 
          className="absolute w-full flex items-center"
          style={{ bottom: `${(settings.pumpDeactivationLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-green-500"></div>
          <div className="absolute left-0 -top-5 bg-green-100 text-green-800 text-xs px-1 rounded">
            Pompa Mati ({settings.pumpDeactivationLevel} {settings.unit})
          </div>
        </div>
        
        {/* Current level display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 px-3 py-2 rounded-md text-lg font-bold shadow">
            {currentLevel.level.toFixed(1)} {currentLevel.unit}
          </div>
        </div>
      </div>
      
      {/* Additional info */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <span className="font-medium">Level Min:</span> {settings.minLevel} {settings.unit}
        </div>
        <div>
          <span className="font-medium">Level Maks:</span> {settings.maxLevel} {settings.unit}
        </div>
        <div className="col-span-2">
          <span className="font-medium">Pembaruan terakhir:</span> {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default TankVisualizer;
// src/components/dashboard/TankVisualizer.tsx
import React from 'react';
import { WaterLevelData, ThresholdSettings } from '../../context/AppContext';

// Definisi interface untuk props
interface TankVisualizerProps {
  currentLevel: WaterLevelData | null;
  settings: ThresholdSettings;
}

const TankVisualizer: React.FC<TankVisualizerProps> = ({ currentLevel, settings }) => {
  if (!currentLevel) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
          <p className="text-gray-500">Data tidak tersedia</p>
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
  
  // Determine water color based on level
  const getWaterColor = () => {
    if (currentLevel.level >= settings.dangerLevel) {
      return 'from-red-200 to-red-500';
    }
    if (currentLevel.level >= settings.warningLevel) {
      return 'from-yellow-200 to-yellow-400';
    }
    return 'from-blue-200 to-blue-500';
  };
  
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
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getWaterColor()} transition-all duration-1000 ease-in-out`}
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
          className="absolute w-full flex items-center pointer-events-none"
          style={{ bottom: `${(settings.dangerLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-red-500"></div>
          <div className="absolute right-0 -top-5 bg-red-100 text-red-800 text-xs px-1 py-0.5 rounded">
            Bahaya ({settings.dangerLevel} {settings.unit})
          </div>
        </div>
        
        {/* Warning level marker */}
        <div 
          className="absolute w-full flex items-center pointer-events-none"
          style={{ bottom: `${(settings.warningLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-yellow-500"></div>
          <div className="absolute right-0 -top-5 bg-yellow-100 text-yellow-800 text-xs px-1 py-0.5 rounded">
            Peringatan ({settings.warningLevel} {settings.unit})
          </div>
        </div>
        
        {/* Pump activation level marker */}
        <div 
          className="absolute w-full flex items-center pointer-events-none"
          style={{ bottom: `${(settings.pumpActivationLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-blue-500"></div>
          <div className="absolute left-0 -top-5 bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded">
            Pompa Aktif ({settings.pumpActivationLevel} {settings.unit})
          </div>
        </div>
        
        {/* Pump deactivation level marker */}
        <div 
          className="absolute w-full flex items-center pointer-events-none"
          style={{ bottom: `${(settings.pumpDeactivationLevel / settings.maxLevel) * 100}%` }}
        >
          <div className="h-0.5 w-full bg-green-500"></div>
          <div className="absolute left-0 -top-5 bg-green-100 text-green-800 text-xs px-1 py-0.5 rounded">
            Pompa Mati ({settings.pumpDeactivationLevel} {settings.unit})
          </div>
        </div>
        
        {/* Current level display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white bg-opacity-80 px-3 py-2 rounded text-lg font-bold shadow">
            {currentLevel.level.toFixed(1)} {currentLevel.unit}
          </div>
        </div>
      </div>
      
      {/* Additional level details */}
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
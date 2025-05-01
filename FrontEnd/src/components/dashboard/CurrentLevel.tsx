import React from 'react';
import { useAppContext } from '@/context/AppContext';

const CurrentLevel: React.FC = () => {
  const { currentLevel, settings } = useAppContext();

  if (!currentLevel) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <p className="text-gray-500">Memuat data...</p>
      </div>
    );
  }

  // Tentukan status berdasarkan ambang batas
  const getStatusInfo = () => {
    const level = currentLevel.level;
    
    if (level >= settings.dangerLevel) {
      return {
        label: 'BAHAYA',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
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
        label: 'AWAS',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
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
        borderColor: 'border-green-200',
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
  const percentage = (currentLevel.level / settings.maxLevel) * 100;

  // Format timestamp
  const formattedTime = new Date(currentLevel.timestamp).toLocaleString();
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
      
      <div className={`flex items-center p-4 mb-4 ${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md`}>
        {statusInfo.icon}
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${statusInfo.color}`}>Status: {statusInfo.label}</h3>
          <div className="mt-2 text-sm">
            <p className={statusInfo.color}>
              Level saat ini adalah {currentLevel.level} {currentLevel.unit}
            </p>
          </div>
        </div>
      </div>

      {/* Visualisasi tangki air */}
      <div className="w-full h-64 border border-gray-300 rounded-md bg-gray-50 mb-4 relative overflow-hidden">
        {/* Level air */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
          style={{ 
            height: `${Math.min(percentage, 100)}%`, 
            backgroundColor: percentage >= 90 
              ? '#ef4444' // red for danger
              : percentage >= 70 
                ? '#f59e0b' // amber for warning
                : '#3b82f6' // blue for normal
          }}
        >
          {/* Animasi gelombang */}
          <div className="wave"></div>
        </div>
        
        {/* Marker untuk level bahaya */}
        <div 
          className="absolute w-full h-0.5 bg-red-500 flex items-center"
          style={{ bottom: `${(settings.dangerLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -right-1 -top-5 bg-red-100 text-red-800 text-xs px-1 rounded">
            Bahaya ({settings.dangerLevel}{settings.unit})
          </span>
        </div>
        
        {/* Marker untuk level peringatan */}
        <div 
          className="absolute w-full h-0.5 bg-yellow-500 flex items-center"
          style={{ bottom: `${(settings.warningLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -right-1 -top-5 bg-yellow-100 text-yellow-800 text-xs px-1 rounded">
            Awas ({settings.warningLevel}{settings.unit})
          </span>
        </div>
        
        {/* Marker untuk pump activation */}
        <div 
          className="absolute w-full h-0.5 bg-blue-500 flex items-center"
          style={{ bottom: `${(settings.pumpActivationLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -left-1 -top-5 bg-blue-100 text-blue-800 text-xs px-1 rounded">
            Pompa Aktif ({settings.pumpActivationLevel}{settings.unit})
          </span>
        </div>

        {/* Marker untuk pump deactivation */}
        <div 
          className="absolute w-full h-0.5 bg-green-500 flex items-center"
          style={{ bottom: `${(settings.pumpDeactivationLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -left-1 -top-5 bg-green-100 text-green-800 text-xs px-1 rounded">
            Pompa Mati ({settings.pumpDeactivationLevel}{settings.unit})
          </span>
        </div>
        
        {/* Teks level air di tengah */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 px-2 py-1 rounded text-lg font-bold shadow">
            {currentLevel.level} {currentLevel.unit}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Pembacaan:</span> {currentLevel.level} {currentLevel.unit}
        </div>
        <div>
          <span className="font-medium">Level Maksimum:</span> {settings.maxLevel} {settings.unit}
        </div>
        <div>
          <span className="font-medium">Peringatan pada:</span> {settings.warningLevel} {settings.unit}
        </div>
        <div>
          <span className="font-medium">Bahaya pada:</span> {settings.dangerLevel} {settings.unit}
        </div>
        <div className="col-span-2">
          <span className="font-medium">Terakhir diperbarui:</span> {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default CurrentLevel;
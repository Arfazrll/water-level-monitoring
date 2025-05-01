// FrontEnd/src/components/dashboard/CurrentLevel.tsx

import React from 'react';
import { useAppContext } from '@/context/AppContext';

/**
 * Komponen untuk visualisasi level air real-time dengan kapabilitas degradasi anggun
 * pada kondisi konektivitas suboptimal
 */
const CurrentLevel: React.FC = () => {
  const { currentLevel, settings, isLoading, error, refreshData } = useAppContext();

  // Penanganan status loading dengan indikator visual
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Memuat data sensor...</p>
        </div>
      </div>
    );
  }

  // Penanganan status error dengan resolusi interaktif
  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          <p className="font-medium">Error: {error}</p>
          <p className="mt-2 text-sm">
            Sistem melakukan upaya rekoneksi otomatis. Anomali konektivitas terdeteksi antara layer presentasi dan layer data.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => refreshData()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Inisiasi Reload Manual
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Penanganan kondisi data tidak tersedia dengan visualisasi informatif
  if (!currentLevel) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Air Saat Ini</h2>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="font-medium text-yellow-700">Ambiguitas Data Terdeteksi</h3>
          <p className="mt-2 text-sm text-gray-600">
            Sistem dalam fase inisialisasi atau menunggu sinyal sensor primer. Kondisi ini dapat terjadi 
            akibat latensi propagasi data atau ketidakstabilan konektivitas sensor.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => refreshData()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Inisiasi Sinkronisasi Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determinasi status berdasarkan parameter ambang batas
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
  
  // Kalkulasi persentase untuk visualisasi tingkat
  const percentage = (currentLevel.level / settings.maxLevel) * 100;

  // Standardisasi format temporal
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
              Level saat ini adalah {currentLevel.level.toFixed(1)} {currentLevel.unit}
            </p>
          </div>
        </div>
      </div>

      {/* Visualisasi tangki air dengan indikator level dinamis */}
      <div className="w-full h-64 border border-gray-300 rounded-md bg-gray-50 mb-4 relative overflow-hidden">
        {/* Representasi volumetrik level air */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
          style={{ 
            height: `${Math.min(percentage, 100)}%`, 
            backgroundColor: percentage >= 90 
              ? '#ef4444' // merah untuk kondisi bahaya
              : percentage >= 70 
                ? '#f59e0b' // amber untuk kondisi awas
                : '#3b82f6' // biru untuk kondisi normal
          }}
        >
          {/* Simulasi gelombang dengan animasi */}
          <div className="wave"></div>
        </div>
        
        {/* Indikator ambang batas level bahaya */}
        <div 
          className="absolute w-full h-0.5 bg-red-500 flex items-center"
          style={{ bottom: `${(settings.dangerLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -right-1 -top-5 bg-red-100 text-red-800 text-xs px-1 rounded">
            Bahaya ({settings.dangerLevel}{settings.unit})
          </span>
        </div>
        
        {/* Indikator ambang batas level peringatan */}
        <div 
          className="absolute w-full h-0.5 bg-yellow-500 flex items-center"
          style={{ bottom: `${(settings.warningLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -right-1 -top-5 bg-yellow-100 text-yellow-800 text-xs px-1 rounded">
            Awas ({settings.warningLevel}{settings.unit})
          </span>
        </div>
        
        {/* Indikator level aktivasi pompa */}
        <div 
          className="absolute w-full h-0.5 bg-blue-500 flex items-center"
          style={{ bottom: `${(settings.pumpActivationLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -left-1 -top-5 bg-blue-100 text-blue-800 text-xs px-1 rounded">
            Pompa Aktif ({settings.pumpActivationLevel}{settings.unit})
          </span>
        </div>

        {/* Indikator level deaktivasi pompa */}
        <div 
          className="absolute w-full h-0.5 bg-green-500 flex items-center"
          style={{ bottom: `${(settings.pumpDeactivationLevel / settings.maxLevel) * 100}%` }}
        >
          <span className="absolute -left-1 -top-5 bg-green-100 text-green-800 text-xs px-1 rounded">
            Pompa Mati ({settings.pumpDeactivationLevel}{settings.unit})
          </span>
        </div>
        
        {/* Visualisasi numerik level air */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 px-2 py-1 rounded text-lg font-bold shadow">
            {currentLevel.level.toFixed(1)} {currentLevel.unit}
          </div>
        </div>
      </div>

      {/* Tabulasi informasi parametrik level air */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Pembacaan:</span> {currentLevel.level.toFixed(1)} {currentLevel.unit}
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
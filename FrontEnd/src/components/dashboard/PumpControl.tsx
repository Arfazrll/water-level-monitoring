import React from 'react';
import { PumpStatus, ThresholdSettings } from '../../context/AppContext';

// Definisi tipe props untuk PumpControl
interface PumpControlProps {
  pumpStatus: PumpStatus | null;
  settings: ThresholdSettings | null;
  onTogglePump: (active: boolean) => Promise<void>;
  onToggleMode: (mode: 'auto' | 'manual') => Promise<void>;
  isLoading?: boolean;
}

const PumpControl: React.FC<PumpControlProps> = ({ 
  pumpStatus, 
  settings, 
  onTogglePump, 
  onToggleMode,
  isLoading = false
}) => {
  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Kontrol Pompa</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // No data state
  if (!pumpStatus) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Kontrol Pompa</h2>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
          <div className="text-center py-4">
            <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600">Tidak ada data pompa</p>
            <p className="text-sm text-gray-500 mt-2">
              Menunggu koneksi ke sistem pompa
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle pump toggle
  const handleTogglePump = () => {
    onTogglePump(!pumpStatus.isActive);
  };

  // Handle mode toggle
  const handleToggleMode = () => {
    onToggleMode(pumpStatus.mode === 'auto' ? 'manual' : 'auto');
  };
  
  // Format the last activation time
  const formattedLastActivated = pumpStatus.lastActivated 
    ? new Date(pumpStatus.lastActivated).toLocaleString()
    : 'Tidak ada data';

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Kontrol Pompa</h2>
      
      {/* Pump status indicator */}
      <div className="flex items-center justify-between mb-6 p-3 rounded-md bg-gray-50">
        <div className="flex items-center">
          <div className={`w-4 h-4 rounded-full mr-2 ${pumpStatus.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm font-medium text-gray-700">
            Status Pompa
          </span>
        </div>
        <span className={`text-sm font-medium ${pumpStatus.isActive ? 'text-green-600' : 'text-gray-500'}`}>
          {pumpStatus.isActive ? 'Aktif' : 'Tidak Aktif'}
        </span>
      </div>
      
      {/* Mode selection */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Mode Operasi:</span>
          <span className={`text-sm font-medium ${pumpStatus.mode === 'auto' ? 'text-blue-600' : 'text-purple-600'}`}>
            {pumpStatus.mode === 'auto' ? 'Otomatis' : 'Manual'}
          </span>
        </div>
        
        <div className="relative">
          <div
            className="block w-14 h-7 bg-gray-200 rounded-full p-1 cursor-pointer"
            onClick={handleToggleMode}
          >
            <div
              className={`w-5 h-5 rounded-full transition-transform duration-300 ${
                pumpStatus.mode === 'auto' ? 'bg-blue-600 transform translate-x-7' : 'bg-purple-600'
              }`}
            ></div>
          </div>
          <div className="flex text-xs mt-1">
            <span className={`mr-auto ${pumpStatus.mode === 'manual' ? 'font-bold' : ''}`}>Manual</span>
            <span className={`ml-auto ${pumpStatus.mode === 'auto' ? 'font-bold' : ''}`}>Otomatis</span>
          </div>
        </div>
      </div>
      
      {/* Manual control button (only visible in manual mode) */}
      {pumpStatus.mode === 'manual' && (
        <div className="mb-6">
          <button
            onClick={handleTogglePump}
            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
              pumpStatus.isActive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            } transition-colors`}
          >
            {pumpStatus.isActive ? 'Matikan Pompa' : 'Nyalakan Pompa'}
          </button>
        </div>
      )}
      
      {/* Auto settings info */}
      <div className="p-3 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-700 mb-2">Pengaturan Kontrol Otomatis:</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-600">
          <div>Aktifkan pada:</div>
          <div className="font-medium">{settings.pumpActivationLevel} {settings.unit}</div>
          <div>Nonaktifkan pada:</div>
          <div className="font-medium">{settings.pumpDeactivationLevel} {settings.unit}</div>
        </div>
      </div>
      
      {/* Last activation time */}
      {pumpStatus.lastActivated && (
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Terakhir diaktifkan: {formattedLastActivated}
        </div>
      )}
    </div>
  );
};

export default PumpControl;
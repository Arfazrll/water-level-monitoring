import React from 'react';
import { useAppContext } from '@/context/AppContext';

const PumpControl: React.FC = () => {
  const { pumpStatus, togglePump, togglePumpMode, settings } = useAppContext();

  const handleTogglePump = () => {
    togglePump(!pumpStatus.isActive);
  };

  const handleToggleMode = () => {
    togglePumpMode(pumpStatus.mode === 'auto' ? 'manual' : 'auto');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Pump Control</h2>
      
      <div className="flex items-center mb-6">
        <div className={`w-4 h-4 rounded-full mr-2 ${pumpStatus.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        <span className="text-sm font-medium text-gray-700">
          Status: {pumpStatus.isActive ? 'Running' : 'Stopped'}
        </span>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Mode:</span>
          <span className={`text-sm font-medium ${pumpStatus.mode === 'auto' ? 'text-blue-600' : 'text-purple-600'}`}>
            {pumpStatus.mode === 'auto' ? 'Automatic' : 'Manual'}
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
            <span className={`ml-auto ${pumpStatus.mode === 'auto' ? 'font-bold' : ''}`}>Auto</span>
          </div>
        </div>
      </div>
      
      {pumpStatus.mode === 'manual' && (
        <div className="mb-6">
          <button
            onClick={handleTogglePump}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              pumpStatus.isActive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {pumpStatus.isActive ? 'Stop Pump' : 'Start Pump'}
          </button>
        </div>
      )}
      
      <div className="text-sm text-gray-600">
        <h3 className="font-medium mb-2">Automatic Control Settings:</h3>
        <div className="grid grid-cols-2 gap-y-2">
          <div>
            <span className="font-medium">Activate at:</span>
          </div>
          <div>
            {settings.pumpActivationLevel} {settings.unit}
          </div>
          <div>
            <span className="font-medium">Deactivate at:</span>
          </div>
          <div>
            {settings.pumpDeactivationLevel} {settings.unit}
          </div>
        </div>
      </div>
      
      {pumpStatus.lastActivated && (
        <div className="mt-4 text-xs text-gray-500">
          Last activated: {new Date(pumpStatus.lastActivated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default PumpControl;
import React from 'react';
import { useAppContext } from '@/context/AppContext';

const CurrentLevel: React.FC = () => {
  const { currentLevel, settings } = useAppContext();

  if (!currentLevel) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Water Level</h2>
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }

  // Determine status based on thresholds
  const getStatusInfo = () => {
    const level = currentLevel.level;
    
    if (level >= settings.dangerLevel) {
      return {
        label: 'DANGER',
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
        label: 'WARNING',
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
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Water Level</h2>
      
      <div className={`flex items-center p-4 mb-4 ${statusInfo.bgColor} ${statusInfo.borderColor} border rounded-md`}>
        {statusInfo.icon}
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${statusInfo.color}`}>Status: {statusInfo.label}</h3>
          <div className="mt-2 text-sm">
            <p className={statusInfo.color}>
              Current level is {currentLevel.level} {currentLevel.unit}
            </p>
          </div>
        </div>
      </div>

      {/* Water level visual indicator */}
      <div className="w-full bg-gray-200 rounded-full h-6 mb-4">
        <div
          className={`h-6 rounded-full ${
            percentage >= 90 ? 'bg-red-600' : percentage >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span className="font-medium">Reading:</span> {currentLevel.level} {currentLevel.unit}
        </div>
        <div>
          <span className="font-medium">Max Level:</span> {settings.maxLevel} {settings.unit}
        </div>
        <div>
          <span className="font-medium">Warning at:</span> {settings.warningLevel} {settings.unit}
        </div>
        <div>
          <span className="font-medium">Danger at:</span> {settings.dangerLevel} {settings.unit}
        </div>
        <div className="col-span-2">
          <span className="font-medium">Last updated:</span> {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default CurrentLevel;
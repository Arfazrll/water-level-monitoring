import React from 'react';
import { useAppContext } from '@/context/AppContext';

const AlarmStatus: React.FC = () => {
  const { currentLevel, settings, alerts } = useAppContext();
  
  // Get the most recent unacknowledged alert, if any
  const latestAlert = alerts
    .filter(alert => !alert.acknowledged)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  // Determine if alarm is active
  const isAlarmActive = !!latestAlert || 
    (currentLevel && (
      currentLevel.level >= settings.dangerLevel || 
      currentLevel.level >= settings.warningLevel
    ));
  
  // Determine alarm level
  const getAlarmStatus = () => {
    if (!currentLevel) return null;
    
    // If there's a danger alert or current level above danger threshold
    if (
      (latestAlert && latestAlert.type === 'danger') ||
      currentLevel.level >= settings.dangerLevel
    ) {
      return {
        level: 'DANGER',
        message: 'Water level has reached DANGER threshold!',
        icon: '🚨',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        pulseColor: 'bg-red-600',
      };
    }
    
    // If there's a warning alert or current level above warning threshold
    if (
      (latestAlert && latestAlert.type === 'warning') ||
      currentLevel.level >= settings.warningLevel
    ) {
      return {
        level: 'WARNING',
        message: 'Water level has reached WARNING threshold',
        icon: '⚠️',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        pulseColor: 'bg-yellow-500',
      };
    }
    
    // Normal status
    return {
      level: 'NORMAL',
      message: 'Water level is within normal range',
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      pulseColor: 'bg-green-500',
    };
  };
  
  const alarmStatus = getAlarmStatus();
  
  if (!alarmStatus) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Alarm Status</h2>
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Alarm Status</h2>
      
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
        <h3 className="font-medium text-sm text-gray-700 mb-2">Current Threshold Settings:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-yellow-50 p-2 rounded">
            <span className="text-yellow-600 font-medium">Warning Level:</span>
            <span className="ml-1 text-gray-700">{settings.warningLevel} {settings.unit}</span>
          </div>
          <div className="bg-red-50 p-2 rounded">
            <span className="text-red-600 font-medium">Danger Level:</span>
            <span className="ml-1 text-gray-700">{settings.dangerLevel} {settings.unit}</span>
          </div>
        </div>
      </div>
      
      {latestAlert && (
        <div className="mt-4 text-sm">
          <h3 className="font-medium text-gray-700 mb-2">Latest Alert:</h3>
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
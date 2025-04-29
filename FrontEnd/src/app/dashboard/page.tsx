'use client';

import React from 'react';
import WaterLevelChart from '@/components/dashboard/WaterLevelChart';
import CurrentLevel from '@/components/dashboard/CurrentLevel';
import AlarmStatus from '@/components/dashboard/AlarmStatus';
import PumpControl from '@/components/dashboard/PumpControl';
import { useAppContext } from '@/context/AppContext';

const DashboardPage: React.FC = () => {
  const { isLoading, error } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Error</h2>
        <p>{error}</p>
        <p className="mt-2">Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Water Level Monitoring Dashboard</h1>
        <p className="text-gray-600">Real-time monitoring and control of water levels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <WaterLevelChart />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CurrentLevel />
            <AlarmStatus />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <PumpControl />
          
          {/* Quick Actions Card */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <a 
                href="/settings" 
                className="block py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Adjust Threshold Settings</span>
                </div>
              </a>
              
              <a 
                href="/history" 
                className="block py-2 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>View Alert History</span>
                </div>
              </a>
              
              <button 
                className="block w-full py-2 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                onClick={() => alert('System test functionality not implemented in this demo')}
              >
                <div className="flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Alarm System</span>
                </div>
              </button>
            </div>
          </div>
          
          {/* System Status */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">System Status</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Sensor:</span>
                <span className="font-medium text-green-600">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alarm:</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pump:</span>
                <span className="font-medium text-green-600">Operational</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Check:</span>
                <span className="font-medium">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
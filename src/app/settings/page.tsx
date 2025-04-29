'use client';

import React, { useState } from 'react';
import ThresholdForm from '@/components/settings/ThresholdForm';
import { useAppContext } from '@/context/AppContext';

const SettingsPage: React.FC = () => {
  const { isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState<'thresholds' | 'notifications' | 'system'>('thresholds');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Configure system thresholds, notifications, and more</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'thresholds'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('thresholds')}
          >
            Threshold Settings
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Notification Settings
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'system'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('system')}
          >
            System Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'thresholds' && <ThresholdForm />}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Notification Settings</h2>
              
              {/* Email Notifications */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Email Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Enable Email Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive alerts and status updates via email
                      </p>
                    </div>
                    <div className="relative">
                      <div className="block w-14 h-7 bg-gray-200 rounded-full p-1 cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full shadow-md transform"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="your-email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notification Types
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify-warning"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="notify-warning" className="ml-2 text-sm text-gray-700">
                          Warning level alerts
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify-danger"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="notify-danger" className="ml-2 text-sm text-gray-700">
                          Danger level alerts
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify-system"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notify-system" className="ml-2 text-sm text-gray-700">
                          System status updates
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* SMS Notifications */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">SMS Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Enable SMS Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive urgent alerts via SMS
                      </p>
                    </div>
                    <div className="relative">
                      <div className="block w-14 h-7 bg-gray-200 rounded-full p-1 cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full shadow-md transform"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="+1 (123) 456-7890"
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">
                      SMS notifications are only sent for critical alerts to avoid message overload
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  Save Notification Settings
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">System Settings</h2>
              
              {/* System settings content */}
              <div className="space-y-6">
                {/* Device Settings */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Device Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Device Name
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        defaultValue="Water Level Monitor"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sensor Type
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Ultrasonic</option>
                        <option>Float</option>
                        <option>Pressure</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Measurement Units
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Centimeters (cm)</option>
                        <option>Inches (in)</option>
                        <option>Millimeters (mm)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Data Collection */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Data Collection</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reading Interval
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Every 5 seconds</option>
                        <option>Every 10 seconds</option>
                        <option>Every 30 seconds</option>
                        <option>Every minute</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Retention
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>1 week</option>
                        <option>1 month</option>
                        <option>3 months</option>
                        <option>6 months</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Maintenance */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">System Maintenance</h3>
                  
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 font-medium rounded-md hover:bg-yellow-200"
                    >
                      Calibrate Sensor
                    </button>
                    
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-100 text-blue-800 font-medium rounded-md hover:bg-blue-200"
                    >
                      Test Alarm System
                    </button>
                    
                    <button
                      type="button"
                      className="px-4 py-2 bg-red-100 text-red-800 font-medium rounded-md hover:bg-red-200"
                    >
                      Reset System
                    </button>
                  </div>
                </div>
                
                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                  >
                    Save System Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
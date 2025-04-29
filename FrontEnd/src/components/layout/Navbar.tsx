"use client";

import React from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/AppContext';

const Navbar: React.FC = () => {
  const { deviceStatus, alerts } = useAppContext();
  
  // Hitung peringatan yang belum diketahui
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged).length;
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <svg 
                className="h-8 w-8 text-blue-600" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M12 2v20M2 12h20M12 9a3 3 0 0 0 0 6h0a3 3 0 0 0 0-6z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-800">Monitor Air</span>
            </Link>
          </div>

          <div className="flex items-center">
            {/* Indikator status perangkat */}
            <div className="flex items-center mr-4">
              <div className={`h-3 w-3 rounded-full ${deviceStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="ml-2 text-sm font-medium text-gray-600">
                {deviceStatus.online ? 'Daring' : 'Luring'}
              </span>
            </div>
            
            {/* Indikator peringatan */}
            {unacknowledgedAlerts > 0 && (
              <Link href="/history" className="flex items-center text-red-600 mr-4">
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                  />
                </svg>
                <span className="ml-1 text-sm font-bold">{unacknowledgedAlerts}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
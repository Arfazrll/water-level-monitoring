"use client";

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { WaterLevelData, ThresholdSettings } from '../../context/AppContext';

// Definisi tipe props untuk WaterLevelChart
interface WaterLevelChartProps {
  data: WaterLevelData[];
  settings: ThresholdSettings | null;
  onRefresh: () => Promise<void>;
  isLoading?: boolean;
}

// Definisi tipe untuk CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: WaterLevelData;
  }>;
}

const WaterLevelChart: React.FC<WaterLevelChartProps> = ({ 
  data, 
  settings, 
  onRefresh,
  isLoading = false
}) => {
  // Loading state
  if (isLoading || !settings) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Riwayat Level Air</h2>
        </div>
        <div className="h-72 bg-gray-50 rounded-md flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Format time for x-axis - PERBAIKAN DISINI
  const formatTime = (timestamp: string) => {
    try {
      if (!timestamp) return 'No Data';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'No Data';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error("Error formatting timestamp:", error, "Timestamp:", timestamp);
      return 'No Data';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold text-gray-800">{new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-blue-600">
            Level: {data.level.toFixed(1)} {data.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Riwayat Level Air</h2>
        <button 
          onClick={onRefresh} 
          className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {!data || data.length === 0 ? (
        <div className="h-72 flex items-center justify-center bg-gray-50 rounded-md">
          <div className="text-center p-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600">Belum ada data riwayat</p>
            <p className="text-sm text-gray-500 mt-2">
              Data riwayat akan muncul setelah beberapa pembacaan sensor
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  interval="preserveStartEnd"
                  minTickGap={50}
                />
                <YAxis 
                  domain={[0, settings.maxLevel]} 
                  label={{ value: `Level Air (${settings.unit})`, angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference lines */}
                <ReferenceLine 
                  y={settings.warningLevel} 
                  label="Peringatan" 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3" 
                />
                <ReferenceLine 
                  y={settings.dangerLevel} 
                  label="Bahaya" 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                />
                <ReferenceLine 
                  y={settings.pumpActivationLevel} 
                  label="Pompa Aktif" 
                  stroke="#3b82f6" 
                  strokeDasharray="3 3" 
                />
                <ReferenceLine 
                  y={settings.pumpDeactivationLevel} 
                  label="Pompa Mati" 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                />
                
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-2 text-xs text-right text-gray-500">
            Menampilkan {data.length} titik data
          </div>
        </>
      )}
    </div>
  );
};

export default WaterLevelChart;
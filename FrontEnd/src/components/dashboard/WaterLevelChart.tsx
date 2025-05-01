// FrontEnd/src/components/dashboard/WaterLevelChart.tsx (Perbaikan)

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
  ReferenceLine,
  TooltipProps
} from 'recharts';
import { useAppContext } from '@/context/AppContext';

// Mendefinisikan props tooltip kustom dengan type yang benar
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    payload: {
      timestamp: string;
      level: number;
      unit: string;
    };
  }>;
}

// Fungsi untuk memformat timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Waktu tidak valid';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Error tanggal';
  }
};

const WaterLevelChart: React.FC = () => {
  const { waterLevelData, settings, isLoading, error, refreshData } = useAppContext();

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Level Air</h2>
        <div className="flex justify-center items-center h-72">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Level Air</h2>
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <p>Error: {error}</p>
          <p className="mt-2 text-sm">Coba muat ulang data atau periksa koneksi server.</p>
          <button 
            onClick={() => refreshData()} 
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Muat Ulang Data
          </button>
        </div>
      </div>
    );
  }

  // Handle empty data state
  if (!waterLevelData || waterLevelData.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Riwayat Level Air</h2>
        <div className="flex flex-col items-center justify-center h-72 bg-gray-50 rounded-md border border-gray-200">
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="mt-4 text-gray-600">Tidak ada data level air tersedia</p>
        </div>
      </div>
    );
  }

  // Tooltip kustom dengan type yang benar dan menghapus parameter label yang tidak digunakan
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
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
          onClick={() => refreshData()} 
          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={waterLevelData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTimestamp}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis 
              domain={[0, settings.maxLevel + 5]} 
              label={{ 
                value: `Level Air (${settings.unit})`, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Reference lines untuk ambang batas */}
            <ReferenceLine 
              y={settings.warningLevel} 
              label="Peringatan" 
              stroke="orange" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.dangerLevel} 
              label="Bahaya" 
              stroke="red" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.pumpActivationLevel} 
              label="Pompa Aktif" 
              stroke="blue" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.pumpDeactivationLevel} 
              label="Pompa Mati" 
              stroke="green" 
              strokeDasharray="3 3" 
            />
            
            <Line 
              type="monotone" 
              dataKey="level" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 6 }}
              name="Level Air"
              isAnimationActive={true}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-right">
        Menampilkan {waterLevelData.length} data titik pengukuran
      </div>
    </div>
  );
};

export default WaterLevelChart;
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

// Define the data structure for waterLevelData
interface WaterLevelDataPoint {
  timestamp: string;
  level: number;
  unit: string;
}

// Define custom tooltip props with proper typing
interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    payload: WaterLevelDataPoint;
  }>;
}

const WaterLevelChart: React.FC = () => {
  const { waterLevelData, settings } = useAppContext();

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Custom tooltip with proper typing and removed unused label parameter
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-bold text-gray-800">{new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-blue-600">
            Level: {data.level} {data.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Water Level History</h2>
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
              domain={[0, settings.maxLevel]} 
              label={{ 
                value: `Water Level (${settings.unit})`, 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Reference lines for thresholds */}
            <ReferenceLine 
              y={settings.warningLevel} 
              label="Warning" 
              stroke="orange" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.dangerLevel} 
              label="Danger" 
              stroke="red" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.pumpActivationLevel} 
              label="Pump On" 
              stroke="blue" 
              strokeDasharray="3 3" 
            />
            <ReferenceLine 
              y={settings.pumpDeactivationLevel} 
              label="Pump Off" 
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
              name="Water Level"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WaterLevelChart;
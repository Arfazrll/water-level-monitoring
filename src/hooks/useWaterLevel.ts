import { useState, useEffect } from 'react';
import { WaterLevelData } from '@/lib/types';
import { fetchWaterLevelData } from '@/lib/api';

interface UseWaterLevelOptions {
  limit?: number;
  pollingInterval?: number; // in milliseconds
  initialData?: WaterLevelData[];
}

export function useWaterLevel({
  limit = 24,
  pollingInterval = 5000, // 5 seconds default
  initialData = []
}: UseWaterLevelOptions = {}) {
  const [data, setData] = useState<WaterLevelData[]>(initialData);
  const [currentLevel, setCurrentLevel] = useState<WaterLevelData | null>(
    initialData.length > 0 ? initialData[initialData.length - 1] : null
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const waterLevelData = await fetchWaterLevelData(limit);
        setData(waterLevelData);
        
        if (waterLevelData.length > 0) {
          setCurrentLevel(waterLevelData[waterLevelData.length - 1]);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching water level data:', err);
        setError('Failed to fetch water level data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [limit]);

  // Setup polling for real-time updates
  useEffect(() => {
    if (pollingInterval <= 0) return; // Disable polling if interval is 0 or negative
    
    const intervalId = setInterval(async () => {
      try {
        // Fetch just the latest reading
        const latestData = await fetchWaterLevelData(1);
        
        if (latestData.length > 0) {
          const latestReading = latestData[0];
          
          setData(prev => {
            // Add the new reading and keep only the last 'limit' readings
            const updatedData = [...prev, latestReading].slice(-limit);
            return updatedData;
          });
          
          setCurrentLevel(latestReading);
        }
      } catch (err) {
        console.error('Error polling water level data:', err);
        // We don't set the error state here to avoid disrupting the UI
        // for transient polling errors
      }
    }, pollingInterval);
    
    return () => clearInterval(intervalId);
  }, [limit, pollingInterval]);

  return {
    data,
    currentLevel,
    isLoading,
    error
  };
}
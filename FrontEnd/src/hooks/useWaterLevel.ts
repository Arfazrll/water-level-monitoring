import { useState, useEffect, useCallback } from 'react';
import { WaterLevelData } from '../context/AppContext';

interface UseWaterLevelDataOptions {
  limit?: number;
  pollingInterval?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useWaterLevelData = ({ 
  limit = 24, 
  pollingInterval = 5000 
}: UseWaterLevelDataOptions = {}) => {
  const [data, setData] = useState<WaterLevelData[]>([]);
  const [currentLevel, setCurrentLevel] = useState<WaterLevelData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/water-level?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch water level data');
      }
      
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        setData(result.data);
        
        if (result.data.length > 0) {
          setCurrentLevel(result.data[result.data.length - 1]);
        }
      } else {
        setData([]);
        setCurrentLevel(null);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching water level data:', err);
      setError('Failed to fetch water level data');
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (pollingInterval <= 0) return;
    
    const intervalId = setInterval(fetchData, pollingInterval);
    
    return () => clearInterval(intervalId);
  }, [pollingInterval, fetchData]);

  return { data, currentLevel, isLoading, error, refresh: fetchData };
};
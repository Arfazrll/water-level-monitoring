import { useState, useEffect, useCallback } from 'react';
import { AlertData } from '@/lib/types';
import { fetchAlerts, acknowledgeAlert as apiAcknowledgeAlert } from '@/lib/api';

interface UseAlertsOptions {
  pollingInterval?: number; // in milliseconds
  filter?: 'all' | 'warning' | 'danger';
  acknowledged?: boolean;
  initialData?: AlertData[];
}

export function useAlerts({
  pollingInterval = 10000, // 10 seconds default
  filter = 'all',
  acknowledged,
  initialData = []
}: UseAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<AlertData[]>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch alerts with optional filtering
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('type', filter);
      }
      if (acknowledged !== undefined) {
        params.append('acknowledged', acknowledged.toString());
      }
      
      const alertsData = await fetchAlerts();
      
      // Apply filtering on client side (in a real app, this would be done by the API)
      let filteredAlerts = [...alertsData];
      
      if (filter !== 'all') {
        filteredAlerts = filteredAlerts.filter(alert => alert.type === filter);
      }
      
      if (acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(alert => alert.acknowledged === acknowledged);
      }
      
      setAlerts(filteredAlerts);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to fetch alerts');
      setIsLoading(false);
    }
  }, [filter, acknowledged]);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup polling for real-time updates
  useEffect(() => {
    if (pollingInterval <= 0) return; // Disable polling if interval is 0 or negative
    
    const intervalId = setInterval(fetchData, pollingInterval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, pollingInterval]);

  // Acknowledge an alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiAcknowledgeAlert(alertId);
      
      // Update local state
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Failed to acknowledge alert');
      return false;
    }
  };

  // Get counts of different alert types
  const counts = {
    total: alerts.length,
    warning: alerts.filter(alert => alert.type === 'warning').length,
    danger: alerts.filter(alert => alert.type === 'danger').length,
    unacknowledged: alerts.filter(alert => !alert.acknowledged).length
  };

  return {
    alerts,
    isLoading,
    error,
    counts,
    acknowledgeAlert,
    refreshAlerts: fetchData
  };
}
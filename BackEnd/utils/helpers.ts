// Format date as YYYY-MM-DD HH:MM:SS
export const formatDate = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };
  
  // Calculate duration between two dates in minutes
  export const calculateDuration = (startTime: Date, endTime: Date): number => {
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  };
  
  // Generate random water level data for testing
  export const generateMockWaterLevel = (min: number = 30, max: number = 90): number => {
    return Math.round((Math.random() * (max - min) + min) * 10) / 10;
  };
  
  // Simulate water level sensor reading (for testing without hardware)
  export const simulateWaterLevelReading = async (baseUrl: string): Promise<void> => {
    try {
      // Generate random water level with a sinusoidal pattern
      const time = Date.now() / 10000; // Slow oscillation
      const baseLevel = 50; // Center point
      const amplitude = 30; // Variation range
      const noise = Math.random() * 5 - 2.5; // Random noise
      
      const level = baseLevel + amplitude * Math.sin(time) + noise;
      const roundedLevel = Math.round(Math.max(0, Math.min(100, level)) * 10) / 10;
      
      // Post to the water level endpoint
      await fetch(`${baseUrl}/api/water-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: roundedLevel,
          unit: 'cm'
        }),
      });
      
      console.log(`Simulated water level: ${roundedLevel} cm`);
    } catch (error) {
      console.error('Error simulating water level reading:', error);
    }
  };
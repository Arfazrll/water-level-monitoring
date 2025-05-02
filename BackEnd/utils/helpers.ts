// Format date as YYYY-MM-DD HH:MM:SS
export const formatDate = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };
  
  // Calculate duration between two dates in minutes
  export const calculateDuration = (startTime: Date, endTime: Date): number => {
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  };
  
  
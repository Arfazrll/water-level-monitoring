export const formatDate = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };
  
  export const calculateDuration = (startTime: Date, endTime: Date): number => {
    return Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  };
  
  
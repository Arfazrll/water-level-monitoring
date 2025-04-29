import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { ThresholdSettings } from '@/lib/types';

const ThresholdForm: React.FC = () => {
  const { settings, updateThresholds } = useAppContext();
  
  const [formState, setFormState] = useState<ThresholdSettings>({
    ...settings
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  const validateForm = (): boolean => {
    // Reset messages
    setError(null);
    
    // Validation rules
    if (formState.warningLevel >= formState.dangerLevel) {
      setError('Warning level must be lower than danger level');
      return false;
    }
    
    if (formState.pumpDeactivationLevel >= formState.pumpActivationLevel) {
      setError('Pump deactivation level must be lower than pump activation level');
      return false;
    }
    
    if (formState.warningLevel > formState.maxLevel || 
        formState.dangerLevel > formState.maxLevel || 
        formState.pumpActivationLevel > formState.maxLevel) {
      setError('Threshold levels cannot exceed maximum level');
      return false;
    }
    
    if (formState.warningLevel < formState.minLevel || 
        formState.dangerLevel < formState.minLevel || 
        formState.pumpActivationLevel < formState.minLevel || 
        formState.pumpDeactivationLevel < formState.minLevel) {
      setError('Threshold levels cannot be below minimum level');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateThresholds(formState);
      
      setSuccess('Threshold settings updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError('Failed to update threshold settings. Please try again.');
      console.error('Error updating thresholds:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Threshold Settings</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Warning Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warning Level ({settings.unit})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-yellow-500">⚠️</span>
                </div>
                <input
                  type="number"
                  name="warningLevel"
                  value={formState.warningLevel}
                  onChange={handleChange}
                  step="0.1"
                  min={settings.minLevel}
                  max={settings.maxLevel}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Level at which warning alerts are triggered
              </p>
            </div>
            
            {/* Danger Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Danger Level ({settings.unit})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-red-500">🚨</span>
                </div>
                <input
                  type="number"
                  name="dangerLevel"
                  value={formState.dangerLevel}
                  onChange={handleChange}
                  step="0.1"
                  min={settings.minLevel}
                  max={settings.maxLevel}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Level at which danger alerts are triggered
              </p>
            </div>
            
            {/* Pump Activation Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Activation Level ({settings.unit})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-blue-500">🔼</span>
                </div>
                <input
                  type="number"
                  name="pumpActivationLevel"
                  value={formState.pumpActivationLevel}
                  onChange={handleChange}
                  step="0.1"
                  min={settings.minLevel}
                  max={settings.maxLevel}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Level at which the pump will automatically activate
              </p>
            </div>
            
            {/* Pump Deactivation Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pump Deactivation Level ({settings.unit})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-green-500">🔽</span>
                </div>
                <input
                  type="number"
                  name="pumpDeactivationLevel"
                  value={formState.pumpDeactivationLevel}
                  onChange={handleChange}
                  step="0.1"
                  min={settings.minLevel}
                  max={settings.maxLevel}
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Level at which the pump will automatically deactivate
              </p>
            </div>
          </div>
          
          {/* Max/Min Levels */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">System Limits</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Level ({settings.unit})
                </label>
                <input
                  type="number"
                  name="maxLevel"
                  value={formState.maxLevel}
                  onChange={handleChange}
                  step="0.1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Maximum possible water level
                </p>
              </div>
              
              {/* Min Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Level ({settings.unit})
                </label>
                <input
                  type="number"
                  name="minLevel"
                  value={formState.minLevel}
                  onChange={handleChange}
                  step="0.1"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Minimum possible water level
                </p>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
      
      {/* Visual representation of thresholds */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Threshold Visualization</h3>
        
        <div className="relative h-64 bg-gradient-to-b from-white to-blue-100 rounded-md border border-gray-300">
          {/* Max level marker */}
          <div className="absolute w-full flex items-center" style={{ top: '0%' }}>
            <div className="h-px w-full bg-gray-400 flex-grow"></div>
            <div className="bg-gray-200 text-gray-700 text-xs px-1 rounded">Max {formState.maxLevel}{settings.unit}</div>
          </div>
          
          {/* Danger level marker */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.dangerLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-red-500 flex-grow"></div>
            <div className="bg-red-100 text-red-700 text-xs px-1 rounded">Danger {formState.dangerLevel}{settings.unit}</div>
          </div>
          
          {/* Warning level marker */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.warningLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-yellow-500 flex-grow"></div>
            <div className="bg-yellow-100 text-yellow-700 text-xs px-1 rounded">Warning {formState.warningLevel}{settings.unit}</div>
          </div>
          
          {/* Pump activation marker */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.pumpActivationLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-blue-500 flex-grow"></div>
            <div className="bg-blue-100 text-blue-700 text-xs px-1 rounded">Pump On {formState.pumpActivationLevel}{settings.unit}</div>
          </div>
          
          {/* Pump deactivation marker */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.pumpDeactivationLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-green-500 flex-grow"></div>
            <div className="bg-green-100 text-green-700 text-xs px-1 rounded">Pump Off {formState.pumpDeactivationLevel}{settings.unit}</div>
          </div>
          
          {/* Min level marker */}
          <div className="absolute w-full flex items-center" style={{ top: '100%' }}>
            <div className="h-px w-full bg-gray-400 flex-grow"></div>
            <div className="bg-gray-200 text-gray-700 text-xs px-1 rounded">Min {formState.minLevel}{settings.unit}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThresholdForm;
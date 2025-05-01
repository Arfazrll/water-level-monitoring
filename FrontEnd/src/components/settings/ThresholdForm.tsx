// FrontEnd/src/components/settings/ThresholdForm.tsx

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
  
  // State tambahan untuk pengujian perangkat
  const [isBuzzerTestActive, setIsBuzzerTestActive] = useState(false);
  const [isSensorCalibrating, setIsSensorCalibrating] = useState(false);
  const [calibrationValues, setCalibrationValues] = useState({
    minLevel: settings.minLevel,
    maxLevel: settings.maxLevel
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  const validateForm = (): boolean => {
    // Reset pesan
    setError(null);
    
    // Aturan validasi
    if (formState.warningLevel >= formState.dangerLevel) {
      setError('Level peringatan harus lebih rendah dari level bahaya');
      return false;
    }
    
    if (formState.pumpDeactivationLevel >= formState.pumpActivationLevel) {
      setError('Level deaktivasi pompa harus lebih rendah dari level aktivasi pompa');
      return false;
    }
    
    if (formState.warningLevel > formState.maxLevel || 
        formState.dangerLevel > formState.maxLevel || 
        formState.pumpActivationLevel > formState.maxLevel) {
      setError('Level ambang batas tidak dapat melebihi level maksimum');
      return false;
    }
    
    if (formState.warningLevel < formState.minLevel || 
        formState.dangerLevel < formState.minLevel || 
        formState.pumpActivationLevel < formState.minLevel || 
        formState.pumpDeactivationLevel < formState.minLevel) {
      setError('Level ambang batas tidak dapat di bawah level minimum');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi formulir
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateThresholds(formState);
      
      setSuccess('Pengaturan ambang batas berhasil diperbarui');
      
      // Hapus pesan sukses setelah 3 detik
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError('Gagal memperbarui pengaturan ambang batas. Silakan coba lagi.');
      console.error('Error updating thresholds:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Pengujian buzzer
  const handleBuzzerTest = async () => {
    try {
      setIsBuzzerTestActive(true);
      // API call untuk menguji buzzer
      await fetch('/api/test/buzzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          activate: true,
          duration: 3000 // 3 detik
        }),
      });
      
      // Buzzer akan otomatis dimatikan oleh API setelah waktu tertentu
      // Tetapi kita tetap atur state UI setelah timeout
      setTimeout(() => {
        setIsBuzzerTestActive(false);
      }, 3500); // sedikit lebih lama dari durasi sebenarnya untuk memastikan
      
    } catch (err) {
      console.error('Error saat menguji buzzer:', err);
      setIsBuzzerTestActive(false);
      setError('Gagal menguji buzzer. Periksa koneksi ke server.');
    }
  };
  
  // Kalibrasi sensor
  const handleCalibration = async () => {
    try {
      if (isSensorCalibrating) {
        // Simpan hasil kalibrasi
        setIsSensorCalibrating(false);
        
        // API call untuk menyimpan nilai kalibrasi
        const response = await fetch('/api/test/sensor-calibration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calibrationValues),
        });
        
        if (response.ok) {
          // Tidak lagi menyimpan hasil dalam variabel 'result' yang tidak digunakan
          await response.json();
          setSuccess('Sensor berhasil dikalibrasi');
          
          // Perbarui pengaturan min/max level
          await updateThresholds(calibrationValues);
          
          // Hapus pesan sukses setelah 3 detik
          setTimeout(() => {
            setSuccess(null);
          }, 3000);
        } else {
          setError('Gagal menyimpan kalibrasi sensor');
        }
      } else {
        // Mulai proses kalibrasi
        setIsSensorCalibrating(true);
      }
    } catch (err) {
      console.error('Error kalibrasi sensor:', err);
      setIsSensorCalibrating(false);
      setError('Gagal melakukan kalibrasi sensor');
    }
  };
  
  // Handler untuk perubahan nilai kalibrasi
  const handleCalibrationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCalibrationValues(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Pengaturan Ambang Batas</h2>
      
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
            {/* Level Peringatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Peringatan ({settings.unit})
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
                Level di mana peringatan awas akan terpicu
              </p>
            </div>
            
            {/* Level Bahaya */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Bahaya ({settings.unit})
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
                Level di mana peringatan bahaya akan terpicu
              </p>
            </div>
            
            {/* Level Aktivasi Pompa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Aktivasi Pompa ({settings.unit})
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
                Level di mana pompa akan otomatis diaktifkan
              </p>
            </div>
            
            {/* Level Deaktivasi Pompa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level Deaktivasi Pompa ({settings.unit})
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
                Level di mana pompa akan otomatis dinonaktifkan
              </p>
            </div>
          </div>
          
          {/* Level Max/Min */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Batas Sistem</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Level Max */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level Maksimum ({settings.unit})
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
                  Level air maksimum yang mungkin
                </p>
              </div>
              
              {/* Level Min */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Level Minimum ({settings.unit})
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
                  Level air minimum yang mungkin
                </p>
              </div>
            </div>
          </div>
          
          {/* Tombol Submit */}
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </form>
      
      {/* Pengujian Perangkat */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-3">Pengujian Perangkat</h3>
        
        <div className="space-y-4">
          {/* Pengujian Buzzer */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
            <div>
              <p className="text-sm font-medium text-gray-700">Uji Buzzer Alarm</p>
              <p className="text-xs text-gray-500">Aktifkan buzzer selama 3 detik untuk menguji</p>
            </div>
            
            <button
              type="button"
              onClick={handleBuzzerTest}
              disabled={isBuzzerTestActive}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isBuzzerTestActive
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isBuzzerTestActive ? 'Buzzer Aktif...' : 'Uji Buzzer'}
            </button>
          </div>
          
          {/* Kalibrasi Sensor */}
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Kalibrasi Sensor</p>
                <p className="text-xs text-gray-500">Kalibrasi sensor level air</p>
              </div>
              
              <button
                type="button"
                onClick={handleCalibration}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  isSensorCalibrating
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSensorCalibrating ? 'Simpan Kalibrasi' : 'Mulai Kalibrasi'}
              </button>
            </div>
            
            {isSensorCalibrating && (
              <div className="mt-3 p-3 bg-white rounded-md shadow-sm">
                <p className="text-sm text-gray-600 mb-3">
                  Masukkan nilai kalibrasi sistem:
                </p>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Level Minimum ({settings.unit})
                    </label>
                    <input
                      type="number"
                      name="minLevel"
                      value={calibrationValues.minLevel}
                      onChange={handleCalibrationChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Level Maksimum ({settings.unit})
                    </label>
                    <input
                      type="number"
                      name="maxLevel"
                      value={calibrationValues.maxLevel}
                      onChange={handleCalibrationChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                
                <p className="mt-2 text-xs text-gray-500">
                  Nilai ini akan digunakan untuk mengkalibrasi pembacaan sensor level air.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Representasi visual dari ambang batas */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-800 mb-4">Visualisasi Ambang Batas</h3>
        
        <div className="relative h-64 bg-gradient-to-b from-white to-blue-100 rounded-md border border-gray-300">
          {/* Penanda level maksimum */}
          <div className="absolute w-full flex items-center" style={{ top: '0%' }}>
            <div className="h-px w-full bg-gray-400 flex-grow"></div>
            <div className="bg-gray-200 text-gray-700 text-xs px-1 rounded">Maks {formState.maxLevel}{settings.unit}</div>
          </div>
          
          {/* Penanda level bahaya */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.dangerLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-red-500 flex-grow"></div>
            <div className="bg-red-100 text-red-700 text-xs px-1 rounded">Bahaya {formState.dangerLevel}{settings.unit}</div>
          </div>
          
          {/* Penanda level peringatan */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.warningLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-yellow-500 flex-grow"></div>
            <div className="bg-yellow-100 text-yellow-700 text-xs px-1 rounded">Peringatan {formState.warningLevel}{settings.unit}</div>
          </div>
          
          {/* Penanda aktivasi pompa */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.pumpActivationLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-blue-500 flex-grow"></div>
            <div className="bg-blue-100 text-blue-700 text-xs px-1 rounded">Pompa Aktif {formState.pumpActivationLevel}{settings.unit}</div>
          </div>
          
          {/* Penanda deaktivasi pompa */}
          <div 
            className="absolute w-full flex items-center" 
            style={{ top: `${(1 - formState.pumpDeactivationLevel / formState.maxLevel) * 100}%` }}
          >
            <div className="h-px w-full bg-green-500 flex-grow"></div>
            <div className="bg-green-100 text-green-700 text-xs px-1 rounded">Pompa Mati {formState.pumpDeactivationLevel}{settings.unit}</div>
          </div>
          
          {/* Penanda level minimum */}
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
import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';

interface NotificationFormState {
  emailEnabled: boolean;
  emailAddress: string;
  notifyOnWarning: boolean;
  notifyOnDanger: boolean;
  notifyOnPumpActivation: boolean;
}

const NotificationForm: React.FC = () => {
  const { settings, updateNotificationSettings } = useAppContext();
  
  const [formState, setFormState] = useState<NotificationFormState>({
    emailEnabled: false,
    emailAddress: '',
    notifyOnWarning: true,
    notifyOnDanger: true,
    notifyOnPumpActivation: false
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    if (settings?.notifications) {
      setFormState({
        emailEnabled: settings.notifications.emailEnabled || false,
        emailAddress: settings.notifications.emailAddress || '',
        notifyOnWarning: settings.notifications.notifyOnWarning !== undefined ? settings.notifications.notifyOnWarning : true,
        notifyOnDanger: settings.notifications.notifyOnDanger !== undefined ? settings.notifications.notifyOnDanger : true,
        notifyOnPumpActivation: settings.notifications.notifyOnPumpActivation || false
      });
    }
  }, [settings]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const validateForm = (): boolean => {
    setError(null);
    
    if (formState.emailEnabled && !formState.emailAddress) {
      setError('Alamat email diperlukan jika notifikasi email diaktifkan');
      return false;
    }
    
    if (formState.emailEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.emailAddress)) {
      setError('Alamat email tidak valid');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateNotificationSettings(formState);
      
      setSuccess('Pengaturan notifikasi berhasil diperbarui');
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      setError('Gagal memperbarui pengaturan notifikasi. Silakan coba lagi.');
      console.error('Error updating notification settings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Pengaturan Notifikasi</h2>
      
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
        {/* Notifikasi Email */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Notifikasi Email</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Aktifkan Notifikasi Email
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Terima peringatan dan pembaruan status melalui email
                </p>
              </div>
              <div className="relative">
                <div 
                  onClick={() => setFormState(prev => ({ ...prev, emailEnabled: !prev.emailEnabled }))}
                  className={`block w-14 h-7 ${formState.emailEnabled ? 'bg-blue-600' : 'bg-gray-200'} rounded-full p-1 cursor-pointer`}
                >
                  <div 
                    className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                      formState.emailEnabled ? 'translate-x-7' : ''
                    }`}
                  ></div>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                name="emailAddress"
                value={formState.emailAddress}
                onChange={handleChange}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="email-anda@contoh.com"
                disabled={!formState.emailEnabled}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Notifikasi
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifyOnWarning"
                    name="notifyOnWarning"
                    checked={formState.notifyOnWarning}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!formState.emailEnabled}
                  />
                  <label htmlFor="notifyOnWarning" className="ml-2 text-sm text-gray-700">
                    Peringatan level awas
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifyOnDanger"
                    name="notifyOnDanger"
                    checked={formState.notifyOnDanger}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!formState.emailEnabled}
                  />
                  <label htmlFor="notifyOnDanger" className="ml-2 text-sm text-gray-700">
                    Peringatan level bahaya
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="notifyOnPumpActivation"
                    name="notifyOnPumpActivation"
                    checked={formState.notifyOnPumpActivation}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!formState.emailEnabled}
                  />
                  <label htmlFor="notifyOnPumpActivation" className="ml-2 text-sm text-gray-700">
                    Aktivasi/deaktivasi pompa
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tombol Simpan */}
        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-4 py-2 ${
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium rounded-md`}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan Notifikasi'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationForm;
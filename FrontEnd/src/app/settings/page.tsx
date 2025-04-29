'use client';

import React, { useState } from 'react';
import ThresholdForm from '@/components/settings/ThresholdForm';
import { useAppContext } from '@/context/AppContext';

const SettingsPage: React.FC = () => {
  const { isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState<'thresholds' | 'notifications' | 'system'>('thresholds');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
        <p className="text-gray-600">Konfigurasikan ambang batas sistem, notifikasi, dan lainnya</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Tab */}
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'thresholds'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('thresholds')}
          >
            Pengaturan Ambang Batas
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'notifications'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            Pengaturan Notifikasi
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'system'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('system')}
          >
            Pengaturan Sistem
          </button>
        </div>

        {/* Konten Tab */}
        <div className="p-6">
          {activeTab === 'thresholds' && <ThresholdForm />}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Pengaturan Notifikasi</h2>
              
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
                      <div className="block w-14 h-7 bg-gray-200 rounded-full p-1 cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full shadow-md transform"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Email
                    </label>
                    <input
                      type="email"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="email-anda@contoh.com"
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
                          id="notify-warning"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="notify-warning" className="ml-2 text-sm text-gray-700">
                          Peringatan level awas
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify-danger"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          defaultChecked
                        />
                        <label htmlFor="notify-danger" className="ml-2 text-sm text-gray-700">
                          Peringatan level bahaya
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="notify-system"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="notify-system" className="ml-2 text-sm text-gray-700">
                          Pembaruan status sistem
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notifikasi SMS */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Notifikasi SMS</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Aktifkan Notifikasi SMS
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Terima peringatan mendesak melalui SMS
                      </p>
                    </div>
                    <div className="relative">
                      <div className="block w-14 h-7 bg-gray-200 rounded-full p-1 cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full shadow-md transform"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">
                      Notifikasi SMS hanya dikirim untuk peringatan kritis untuk menghindari kelebihan pesan
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tombol Simpan */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                  Simpan Pengaturan Notifikasi
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Pengaturan Sistem</h2>
              
              {/* Konten pengaturan sistem */}
              <div className="space-y-6">
                {/* Pengaturan Perangkat */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Pengaturan Perangkat</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Perangkat
                      </label>
                      <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        defaultValue="Monitor Level Air"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jenis Sensor
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Ultrasonik</option>
                        <option>Pelampung</option>
                        <option>Tekanan</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Satuan Pengukuran
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Sentimeter (cm)</option>
                        <option>Inci (in)</option>
                        <option>Milimeter (mm)</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Pengumpulan Data */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Pengumpulan Data</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Interval Pembacaan
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>Setiap 5 detik</option>
                        <option>Setiap 10 detik</option>
                        <option>Setiap 30 detik</option>
                        <option>Setiap menit</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Retensi Data
                      </label>
                      <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option>1 minggu</option>
                        <option>1 bulan</option>
                        <option>3 bulan</option>
                        <option>6 bulan</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Pemeliharaan */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Pemeliharaan Sistem</h3>
                  
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 font-medium rounded-md hover:bg-yellow-200"
                    >
                      Kalibrasi Sensor
                    </button>
                    
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-100 text-blue-800 font-medium rounded-md hover:bg-blue-200"
                    >
                      Uji Sistem Alarm
                    </button>
                    
                    <button
                      type="button"
                      className="px-4 py-2 bg-red-100 text-red-800 font-medium rounded-md hover:bg-red-200"
                    >
                      Reset Sistem
                    </button>
                  </div>
                </div>
                
                {/* Tombol Simpan */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                  >
                    Simpan Pengaturan Sistem
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
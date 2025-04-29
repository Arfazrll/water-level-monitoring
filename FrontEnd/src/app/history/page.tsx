'use client';

import React from 'react';
import AlertsTable from '@/components/history/AlertsTable';
import { useAppContext } from '@/context/AppContext';

const HistoryPage: React.FC = () => {
  const { isLoading, error } = useAppContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Memuat riwayat peringatan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Kesalahan</h2>
        <p>{error}</p>
        <p className="mt-2">Silakan muat ulang halaman atau hubungi dukungan jika masalah berlanjut.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Peringatan</h1>
        <p className="text-gray-600">Lihat dan kelola riwayat peringatan level air</p>
      </div>

      <div className="space-y-6">
        <AlertsTable />
        
        {/* Opsi Laporan Tambahan */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Opsi Laporan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-2">Ekspor Riwayat Peringatan</h3>
              <p className="text-sm text-gray-600 mb-4">
                Unduh riwayat peringatan sebagai file CSV atau PDF untuk catatan Anda.
              </p>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">
                  Ekspor sebagai CSV
                </button>
                <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200">
                  Ekspor sebagai PDF
                </button>
              </div>
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-2">Buat Laporan</h3>
              <p className="text-sm text-gray-600 mb-4">
                Buat laporan komprehensif dengan statistik dan visualisasi.
              </p>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200">
                  Laporan Bulanan
                </button>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200">
                  Laporan Kustom
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ringkasan Analitik */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Analitik Cepat</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-md bg-blue-50">
              <div className="text-blue-800 text-2xl font-bold mb-1">24</div>
              <div className="text-sm text-blue-700">Total Peringatan (30 Hari Terakhir)</div>
            </div>
            
            <div className="p-4 border rounded-md bg-yellow-50">
              <div className="text-yellow-800 text-2xl font-bold mb-1">18</div>
              <div className="text-sm text-yellow-700">Peringatan Level Awas</div>
            </div>
            
            <div className="p-4 border rounded-md bg-red-50">
              <div className="text-red-800 text-2xl font-bold mb-1">6</div>
              <div className="text-sm text-red-700">Peringatan Level Bahaya</div>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-gray-800 mb-2">Periode Kritis Terbaru</h3>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                <span className="font-medium">26 April 2023 (08:30 - 11:45):</span> Level air melebihi ambang bahaya selama 3 jam 15 menit, mencapai puncak 93,5 cm.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
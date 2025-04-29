import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

const AlertsTable: React.FC = () => {
  const { alerts, acknowledgeAlert } = useAppContext();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'warning' | 'danger'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Filter peringatan berdasarkan filter yang dipilih
  const filteredAlerts = alerts.filter(alert => {
    if (selectedFilter === 'all') return true;
    return alert.type === selectedFilter;
  });

  // Urutkan peringatan berdasarkan urutan yang dipilih
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-lg font-semibold text-gray-800">Riwayat Peringatan</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          {/* Filter dropdown */}
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as 'all' | 'warning' | 'danger')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="all">Semua Peringatan</option>
            <option value="warning">Peringatan Level Awas</option>
            <option value="danger">Peringatan Level Bahaya</option>
          </select>
          
          {/* Sort dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="newest">Terbaru Dulu</option>
            <option value="oldest">Terlama Dulu</option>
          </select>
        </div>
      </div>
      
      {sortedAlerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
            />
          </svg>
          <p className="mt-2 text-sm font-medium">Tidak ada peringatan ditemukan</p>
          <p className="text-xs">Peringatan akan muncul di sini ketika terpicu</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pesan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tindakan
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAlerts.map((alert) => (
                <tr key={alert.id} className={alert.acknowledged ? '' : 'bg-yellow-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        alert.acknowledged 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alert.acknowledged ? 'Diketahui' : 'Baru'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        alert.type === 'danger' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {alert.type === 'danger' ? 'BAHAYA' : 'AWAS'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alert.level} cm
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {alert.type === 'danger' 
                      ? `Level air telah mencapai ambang bahaya (${alert.level} cm)` 
                      : `Level air telah mencapai ambang peringatan (${alert.level} cm)`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(alert.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Tandai Diketahui
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        Menampilkan {sortedAlerts.length} dari {alerts.length} peringatan
      </div>
    </div>
  );
};

export default AlertsTable;
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white shadow-sm border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sistem Monitoring Level Air
          </div>
          <div className="text-sm text-gray-500">
            <span>Dikembangkan oleh Kelompok 2</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
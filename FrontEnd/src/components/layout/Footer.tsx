import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white shadow-sm border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sistem Pemantauan Level Air
          </div>
          <div className="text-sm text-gray-500">
            <span>Versi 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
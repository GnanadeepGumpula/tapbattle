import React from 'react';
import { useTheme, ThemeButton } from '../contexts/ThemeContext';

const PageLayout = ({ children, className = '' }) => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center p-2 sm:p-6 transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-[#0B1437] via-[#1E245E] to-[#0F172A]'
        : 'bg-gradient-to-br from-[#EBF8FF] via-[#BEE3F8] to-[#90CDF4]'
    }`}>
      <div className={`w-full max-w-4xl mx-auto flex flex-col gap-8 ${className}`}>
        <div className="flex justify-end mb-4">
          <ThemeButton />
        </div>
        {children}
      </div>
    </div>
  );
};

export default PageLayout;

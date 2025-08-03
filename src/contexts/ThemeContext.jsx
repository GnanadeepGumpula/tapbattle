import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mq.matches ? 'dark' : 'light');
      mq.onchange = (e) => setTheme(e.matches ? 'dark' : 'light');
    }
    document.documentElement.classList.remove('dark', 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    if (theme === 'light') document.documentElement.classList.add('light');
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'system') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('system');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeButton = () => {
  const { theme, cycleTheme } = useTheme();

  return (
    <button
      onClick={cycleTheme}
      className={`p-3 rounded-full border-2 ${
        theme === 'system'
          ? 'border-purple-400 bg-gradient-to-r from-indigo-500 to-purple-500'
          : theme === 'dark'
          ? 'border-indigo-400 bg-[#1A1F35]'
          : 'border-blue-400 bg-white'
      } shadow-lg transition-all hover:scale-105 group relative`}
      title={
        theme === 'system'
          ? 'Using System Theme'
          : theme === 'dark'
          ? 'Switch to Light Mode'
          : 'Switch to System Theme'
      }
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {theme === 'system' ? (
          <div className="absolute inset-0 animate-fade-in flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
            <div className="w-6 h-6 border-2 border-white rounded-full absolute" />
          </div>
        ) : theme === 'dark' ? (
          <div className="absolute inset-0 animate-fade-in flex items-center justify-center text-indigo-400">
            <div className="w-6 h-6 rounded-full bg-[#1A1F35] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-indigo-400" />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 animate-fade-in flex items-center justify-center text-blue-500">
            <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

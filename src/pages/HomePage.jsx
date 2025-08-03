import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Crown, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import PageLayout from '../components/PageLayout';

const HomePage = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <PageLayout>

        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="relative">
              <Zap className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 ${theme === 'dark' ? 'text-indigo-500' : 'text-blue-500'} animate-pulse filter ${theme === 'dark' ? 'drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} />
              <div className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 ${theme === 'dark' ? 'bg-purple-500 border-indigo-400' : 'bg-purple-400 border-blue-500'} rounded-full animate-bounce-slow border-2 sm:border-4`}></div>
            </div>
          </div>
          <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-3 sm:mb-4 uppercase tracking-wide sm:tracking-widest flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2`}>
            <span className={`${theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'} filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]`}>Tap</span>
            <span className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} filter drop-shadow-[0_0_15px_rgba(167,139,250,0.3)]`}>Battle</span>
          </h1>
          <p className={`text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 font-medium px-4 sm:px-0 ${theme === 'dark' ? 'text-indigo-200' : 'text-gray-700'}`}>Host interactive quizzes and games with <span className={theme === 'dark' ? 'text-purple-400 font-bold' : 'text-purple-600 font-bold'}>real-time</span> participation</p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-8">
          <div 
            className={`p-8 rounded-2xl backdrop-blur-md ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/60 hover:bg-white/80'} hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border-2 ${theme === 'dark' ? 'border-indigo-500/30' : 'border-blue-300'} animate-fade-in`}
            onClick={() => navigate('/join')}
          >
            <div className="text-center">
              <div className="mb-6">
                <Users className={`w-24 h-24 ${theme === 'dark' ? 'text-purple-400' : 'text-blue-500'} mx-auto mb-4 animate-bounce filter ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]' : 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'}`} />
                <h2 className={`text-4xl font-extrabold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} uppercase tracking-wider`}>Join Game</h2>
                <p className={`${theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'} leading-relaxed`}>Enter a joining code to participate in an existing quiz session</p>
              </div>
              <button className={`w-full py-4 rounded-xl font-bold text-xl ${theme === 'dark' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500/30' : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-blue-300'} border-2 hover:scale-105 hover:shadow-xl transition-all`}>Join Now</button>
            </div>
          </div>

          <div 
            className={`p-8 rounded-2xl backdrop-blur-md ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-white/60 hover:bg-white/80'} hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border-2 ${theme === 'dark' ? 'border-purple-500/30' : 'border-purple-300'} animate-fade-in`}
            onClick={() => navigate('/host-login')}
          >
            <div className="text-center">
              <div className="mb-6">
                <Crown className={`w-24 h-24 ${theme === 'dark' ? 'text-indigo-400' : 'text-purple-500'} mx-auto mb-4 animate-pulse filter ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]'}`} />
                <h2 className={`text-4xl font-extrabold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} uppercase tracking-wider`}>Host Game</h2>
                <p className={`${theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'} leading-relaxed`}>Create and manage your own quiz sessions with real-time tracking</p>
              </div>
              <button className={`w-full py-4 rounded-xl font-bold text-xl ${theme === 'dark' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/30' : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-300'} border-2 hover:scale-105 hover:shadow-xl transition-all`}>Host Now</button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center animate-fade-in">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-blue-100 border-blue-300'} border-2 filter ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]'}`}>
              <Zap className={`w-10 h-10 animate-pulse ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
            </div>
            <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} uppercase tracking-wide`}>Real-time</h3>
            <p className={`${theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'}`}>Instant updates and live tracking</p>
          </div>
          <div className="text-center animate-fade-in">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${theme === 'dark' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-purple-100 border-purple-300'} border-2 filter ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(167,139,250,0.2)]' : 'drop-shadow-[0_0_8px_rgba(147,51,234,0.2)]'}`}>
              <Users className={`w-10 h-10 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`} />
            </div>
            <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} uppercase tracking-wide`}>Multi-user</h3>
            <p className={`${theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'}`}>Support for multiple participants</p>
          </div>
          <div className="text-center animate-fade-in">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${theme === 'dark' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-blue-100 border-blue-300'} border-2 filter ${theme === 'dark' ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'drop-shadow-[0_0_8px_rgba(59,130,246,0.2)]'}`}>
              <Crown className={`w-10 h-10 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} />
            </div>
            <h3 className={`font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} uppercase tracking-wide`}>Easy Setup</h3>
            <p className={`${theme === 'dark' ? 'text-indigo-200' : 'text-gray-600'}`}>Quick and simple to get started</p>
          </div>
        </div>
    </PageLayout>
  );
};

export default HomePage;

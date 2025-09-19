

import React from 'react';
import { Screen, TranslationKey } from '../types';

interface WelcomeScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  playClick: () => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, t, playClick }) => {

  const handleStart = () => {
    playClick();
    try {
      const userProfile = localStorage.getItem(USER_PROFILE_KEY);
      if (userProfile) {
        onNavigate(Screen.Chat);
      } else {
        onNavigate(Screen.Onboarding);
      }
    } catch (error) {
      console.error("Could not access local storage:", error);
      // Fallback to onboarding if storage is inaccessible
      onNavigate(Screen.Onboarding);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
      <div className="flex-grow flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Mann Mitra 💙</h1>
        
        <svg width="200" height="200" viewBox="0 0 100 100" className="my-8">
          <defs>
            <linearGradient id="calmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#89f7fe', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#66a6ff', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <path d="M 10,50 A 40,40 0 0,1 90,50 A 40,40 0 0,1 10,50" fill="url(#calmGradient)" opacity="0.3" />
          <path d="M 20,50 A 30,30 0 0,1 80,50 A 30,30 0 0,1 20,50" fill="url(#calmGradient)" opacity="0.6" />
          <circle cx="50" cy="50" r="20" fill="url(#calmGradient)" />
        </svg>

        <p className="text-lg text-gray-600 max-w-xs">
          {t('yourMindsFriend')}
        </p>
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 transition-colors duration-300"
      >
        {t('startConversation')}
      </button>
    </div>
  );
};

export default WelcomeScreen;
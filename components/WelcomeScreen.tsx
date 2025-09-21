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
    
    // Check if a user profile exists
    try {
      const profile = localStorage.getItem(USER_PROFILE_KEY);
      if (profile) {
        onNavigate(Screen.Chat);
      } else {
        onNavigate(Screen.Onboarding);
      }
    } catch (error) {
      console.error("Failed to check for user profile, proceeding to onboarding:", error);
      onNavigate(Screen.Onboarding);
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8 bg-white dark:bg-slate-900 animate-fadeIn">
      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="w-24 h-24 mb-6 rounded-full flex items-center justify-center bg-ai-gradient shadow-lg">
          <span className="text-4xl">💙</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2">Mann Mitra</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xs">
          {t('yourMindsFriend')}
        </p>
      </div>
      <div className="w-full flex-shrink-0">
        <button
          onClick={handleStart}
          className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          {t('startConversation')}
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;

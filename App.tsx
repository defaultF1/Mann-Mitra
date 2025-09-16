
import React, { useState, useEffect } from 'react';
import { Screen, translations, TranslationKey, Language } from './types';
import OnboardingScreen from './components/OnboardingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ChatScreen from './components/ChatScreen';
import JournalScreen from './components/JournalScreen';
import BreathingScreen from './components/BreathingScreen';
import ResourcesScreen from './components/ResourcesScreen';

const USER_PROFILE_KEY = 'mann-mitra-user-profile';
const APP_LANGUAGE_KEY = 'mann-mitra-app-language';


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const userProfile = localStorage.getItem(USER_PROFILE_KEY);
      if (userProfile) {
        setCurrentScreen(Screen.Welcome);
      } else {
        setCurrentScreen(Screen.Onboarding);
      }
      
      const savedLanguage = localStorage.getItem(APP_LANGUAGE_KEY) as Language | null;
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }

    } catch (error) {
      console.error("Could not access local storage:", error);
      setCurrentScreen(Screen.Onboarding);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    try {
      localStorage.setItem(APP_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error("Could not save language to local storage:", error);
    }
  };

  const t = (key: TranslationKey): string => {
    // Extract the base language code (e.g., 'en' from 'en-US').
    const langCode = language.split('-')[0];

    // Check if a translation set exists for the language code.
    // The type assertion is safe because we fall back to 'en'.
    const translationSet = (translations as Record<string, typeof translations.en>)[langCode] || translations.en;

    // Return the specific translation, falling back to English if the key is missing.
    return translationSet[key] || translations.en[key];
  };


  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Onboarding:
        return <OnboardingScreen onNavigate={setCurrentScreen} t={t} language={language} setLanguage={setLanguage} />;
      case Screen.Welcome:
        return <WelcomeScreen onNavigate={setCurrentScreen} t={t} />;
      case Screen.Chat:
        return <ChatScreen onNavigate={setCurrentScreen} t={t} language={language} setLanguage={setLanguage} />;
      case Screen.Journal:
        return <JournalScreen onNavigate={setCurrentScreen} t={t} language={language} />;
      case Screen.Breathing:
        return <BreathingScreen onNavigate={setCurrentScreen} t={t} />;
      case Screen.Resources:
        return <ResourcesScreen onNavigate={setCurrentScreen} t={t} />;
      default:
        // Render a loading state or null while checking for the profile
        return (
          <div className="flex items-center justify-center h-full">
            <svg className="animate-spin h-8 w-8 text-apple-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="font-sans bg-transparent max-w-md mx-auto h-screen flex flex-col shadow-2xl">
      <div className="flex-grow overflow-y-auto">
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;

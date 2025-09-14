import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import OnboardingScreen from './components/OnboardingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ChatScreen from './components/ChatScreen';
import JournalScreen from './components/JournalScreen';
import BreathingScreen from './components/BreathingScreen';
import ResourcesScreen from './components/ResourcesScreen';

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);

  useEffect(() => {
    try {
      const userProfile = localStorage.getItem(USER_PROFILE_KEY);
      if (userProfile) {
        setCurrentScreen(Screen.Welcome);
      } else {
        setCurrentScreen(Screen.Onboarding);
      }
    } catch (error) {
      console.error("Could not access local storage:", error);
      setCurrentScreen(Screen.Onboarding);
    }
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Onboarding:
        return <OnboardingScreen onNavigate={setCurrentScreen} />;
      case Screen.Welcome:
        return <WelcomeScreen onNavigate={setCurrentScreen} />;
      case Screen.Chat:
        return <ChatScreen onNavigate={setCurrentScreen} />;
      case Screen.Journal:
        return <JournalScreen onNavigate={setCurrentScreen} />;
      case Screen.Breathing:
        return <BreathingScreen onNavigate={setCurrentScreen} />;
      case Screen.Resources:
        return <ResourcesScreen onNavigate={setCurrentScreen} />;
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

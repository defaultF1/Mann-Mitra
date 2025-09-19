import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, translations, TranslationKey, Language } from './types';
import OnboardingScreen from './components/OnboardingScreen';
import WelcomeScreen from './components/WelcomeScreen';
import ChatScreen from './components/ChatScreen';
import JournalScreen from './components/JournalScreen';
import BreathingScreen from './components/BreathingScreen';
import ResourcesScreen from './components/ResourcesScreen';

const APP_LANGUAGE_KEY = 'mann-mitra-app-language';

// Custom hook to detect online status
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const isOnline = useOnlineStatus();
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound effects logic
  const initAudioContext = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    }
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      audioCtxRef.current = new AudioContext();
      return audioCtxRef.current;
    }
    return null;
  }, []);

  const playSound = useCallback((nodes: ((ctx: AudioContext, time: number) => void)[]) => {
    // initAudioContext must be called from a user interaction.
    // The play functions below are only called from clicks, so this is safe.
    const audioContext = initAudioContext();
    if (!audioContext) return;
    const now = audioContext.currentTime;
    nodes.forEach(nodeFn => nodeFn(audioContext, now));
  }, [initAudioContext]);

  const playClick = useCallback(() => {
    playSound([(ctx, time) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, time);
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.2, time + 0.01);
      oscillator.start(time);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, time + 0.1);
      oscillator.stop(time + 0.1);
    }]);
  }, [playSound]);

  const playNotification = useCallback(() => {
    playSound([
      (ctx, time) => { // C5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
        osc.start(time);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.1);
        osc.stop(time + 0.1);
      },
      (ctx, time) => { // E5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(659.25, time + 0.1);
        gain.gain.setValueAtTime(0, time + 0.1);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.11);
        osc.start(time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.2);
        osc.stop(time + 0.2);
      }
    ]);
  }, [playSound]);

  const playSuccess = useCallback(() => {
     playSound([
      (ctx, time) => { // C5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(523.25, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.15);
        osc.start(time);
        osc.stop(time + 0.15);
      },
      (ctx, time) => { // G5
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(783.99, time + 0.15);
        gain.gain.setValueAtTime(0, time + 0.15);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.17);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.3);
        osc.start(time + 0.15);
        osc.stop(time + 0.3);
      }
    ]);
  }, [playSound]);


  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered successfully:', registration);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      };
      // Register after the 'load' event has fired to avoid contention
      // for resources on the initial page load.
      window.addEventListener('load', registerSW);
      return () => window.removeEventListener('load', registerSW);
    }
  }, []);
  
  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem(APP_LANGUAGE_KEY) as Language | null;
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error("Could not access local storage for language settings:", error);
    }
    // The app will now always start on the Welcome screen.
    setCurrentScreen(Screen.Welcome);
  }, []);

  const setLanguage = (lang: Language) => {
    try {
      localStorage.setItem(APP_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error("Could not save language to local storage:", error);
    }
  };

  const t = useCallback((key: TranslationKey): string => {
    // Prioritize the full language code if a translation set exists for it (e.g., 'hi-Latn')
    if (language in translations) {
        const specificTranslationSet = translations[language as keyof typeof translations];
        // The cast is needed because TS doesn't know 'language' is a valid key here
        return specificTranslationSet[key] || translations.en[key];
    }

    // Fallback to the base language code (e.g., 'hi' from 'hi-Latn')
    const langCode = language.split('-')[0];
    const baseTranslationSet = (langCode in translations)
      ? translations[langCode as keyof typeof translations]
      : translations.en;

    return baseTranslationSet[key] || translations.en[key];
}, [language]);


  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.Onboarding:
        return <OnboardingScreen onNavigate={setCurrentScreen} t={t} language={language} setLanguage={setLanguage} playClick={playClick} />;
      case Screen.Welcome:
        return <WelcomeScreen onNavigate={setCurrentScreen} t={t} playClick={playClick} />;
      case Screen.Chat:
        return <ChatScreen onNavigate={setCurrentScreen} t={t} language={language} setLanguage={setLanguage} isOnline={isOnline} playClick={playClick} playNotification={playNotification} />;
      case Screen.Journal:
        return <JournalScreen onNavigate={setCurrentScreen} t={t} language={language} playClick={playClick} playSuccess={playSuccess} />;
      case Screen.Breathing:
        return <BreathingScreen onNavigate={setCurrentScreen} t={t} playClick={playClick} />;
      case Screen.Resources:
        return <ResourcesScreen onNavigate={setCurrentScreen} t={t} isOnline={isOnline} playClick={playClick} />;
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
      {!isOnline && (
        <div className="bg-yellow-500 text-center text-black font-semibold text-sm py-1" role="status" aria-live="polite">
          Offline Mode
        </div>
      )}
      <div className="flex-grow overflow-y-auto" style={{ height: isOnline ? '100%' : 'calc(100% - 20px)' }}>
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;

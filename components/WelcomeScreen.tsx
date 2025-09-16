import React from 'react';
import { Screen, TranslationKey } from '../types';

interface WelcomeScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
}

const playClickSound = () => {
  // Create audio context only when needed, with fallback for Safari
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const audioContext = new AudioContext();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Sound parameters for a short, pleasant "blip"
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick fade in

  oscillator.start(audioContext.currentTime);
  // Fade out and stop the sound quickly
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
  oscillator.stop(audioContext.currentTime + 0.1);

  // Close the context after a short delay to free up resources
  setTimeout(() => audioContext.close(), 500);
};


const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, t }) => {

  const handleStart = () => {
    playClickSound();
    onNavigate(Screen.Chat);
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
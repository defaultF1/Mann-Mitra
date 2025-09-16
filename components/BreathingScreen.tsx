import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, TranslationKey } from '../types';

interface BreathingScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
}

const BreathingScreen: React.FC<BreathingScreenProps> = ({ onNavigate, t }) => {
  const [instruction, setInstruction] = useState(t('getReady'));
  const [isStarted, setIsStarted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Function to create and play a sound using the Web Audio API
  const playSound = useCallback((frequency: number, duration: number) => {
    const audioContext = audioCtxRef.current;
    if (!audioContext || audioContext.state === 'closed') return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Sound parameters
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Gentle fade in and out to avoid harsh clicks
    const FADE_TIME = 0.5;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + FADE_TIME);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - FADE_TIME);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }, []);

  const handleStart = () => {
    if (!audioCtxRef.current) {
      // Create AudioContext on user interaction, with fallback for Safari
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
      }
    }
    // Resume context if it was suspended by the browser
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
    }
    
    setIsStarted(true);
  };

  // Play sound when instruction changes
  useEffect(() => {
    if (!isStarted) return;

    if (instruction.startsWith(t('inhale').substring(0,6))) { // Using substring to match start
      playSound(440, 4); // A4 note (440 Hz) for 4 seconds
    } else if (instruction.startsWith(t('exhale').substring(0,6))) {
      playSound(330, 4); // E4 note (approx 330 Hz) for 4 seconds
    }
  }, [instruction, isStarted, playSound, t]);

  // Manage the breathing instruction cycle
  useEffect(() => {
    if (!isStarted) return;

    const sequence = [
      { text: t('inhale'), duration: 4000 },
      { text: t('hold'), duration: 2000 },
      { text: t('exhale'), duration: 4000 },
      { text: t('pause'), duration: 2000 },
    ];
    let currentIndex = 0;
    setInstruction(sequence[currentIndex].text); // Set initial instruction
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % sequence.length;
      setInstruction(sequence[currentIndex].text);
    }, sequence[currentIndex].duration);

    return () => {
      clearInterval(interval);
    };
  }, [isStarted, t]);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(e => console.error("Error closing AudioContext:", e));
    };
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center bg-white relative p-6">
      {!isStarted ? (
        <div className="text-center animate-fadeIn flex flex-col items-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('takeADeepBreath')}</h1>
            <p className="text-lg text-gray-600 mb-8 max-w-xs">
              {t('breathingExerciseDescription')}
            </p>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-apple-blue mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <button
                onClick={handleStart}
                className="bg-apple-blue text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:bg-blue-600 transition-colors"
                aria-label="Begin breathing exercise"
            >
                {t('startBreathing')}
            </button>
        </div>
      ) : (
        <>
            <h2 className="text-2xl text-gray-600 font-medium absolute top-20 text-center" aria-live="assertive">
                {instruction}
            </h2>

            <div className="w-64 h-64 rounded-full bg-apple-blue/20 flex items-center justify-center animate-breathe">
                <div className="w-48 h-48 rounded-full bg-apple-blue/40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-apple-blue/60"></div>
                </div>
            </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-8">
        <button
          onClick={() => onNavigate(Screen.Chat)}
          className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 transition-colors"
        >
          {isStarted ? t('endSessionAndReturn') : t('backToChat')}
        </button>
      </div>
    </div>
  );
};

export default BreathingScreen;
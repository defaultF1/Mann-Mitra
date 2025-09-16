import React, { useState } from 'react';
import { Screen, UserProfile, TranslationKey, Language, LANGUAGES } from '../types';

interface OnboardingScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate, t, language, setLanguage }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!name.trim() || !gender || !dob) {
      setError(t('pleaseFillAllFields'));
      return;
    }
    
    const userProfile: UserProfile = { name, gender, dob };
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      onNavigate(Screen.Welcome);
    } catch (e) {
      setError(t('couldNotSaveDetails'));
      console.error("Failed to save profile:", e);
    }
  };

  return (
    <div className="flex flex-col h-full text-left p-8 bg-white animate-fadeIn">
      <div className="flex-grow flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('welcomeToMannMitra')}</h1>
        <p className="text-gray-600 mb-8">{t('letsGetToKnowYou')}</p>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-md font-medium text-gray-700 mb-1">{t('whatShouldICallYou')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('yourName')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-gray-800 placeholder:text-gray-400 bg-white"
              aria-label="Your Name"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-md font-medium text-gray-700 mb-1">{t('gender')}</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${gender ? 'text-gray-800' : 'text-gray-400'}`}
              aria-label="Gender"
            >
              <option value="" disabled>{t('selectYourGender')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="other">{t('other')}</option>
              <option value="prefer_not_to_say">{t('preferNotToSay')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-md font-medium text-gray-700 mb-1">{t('preferredLanguage')}</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white text-gray-800`}
              aria-label="Preferred Language"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label htmlFor="dob" className="block text-md font-medium text-gray-700 mb-1">{t('dateOfBirth')}</label>
            <input
              type="date"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${dob ? 'text-gray-800' : 'text-gray-400'}`}
              aria-label="Date of Birth"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </div>

      <button
        onClick={handleContinue}
        className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 transition-colors"
      >
        {t('saveAndContinue')}
      </button>
    </div>
  );
};

export default OnboardingScreen;
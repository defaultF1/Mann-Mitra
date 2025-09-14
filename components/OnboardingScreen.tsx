import React, { useState } from 'react';
import { Screen, UserProfile } from '../types';

interface OnboardingScreenProps {
  onNavigate: (screen: Screen) => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!name.trim() || !gender || !dob) {
      setError('Please fill in all fields to continue.');
      return;
    }
    
    const userProfile: UserProfile = { name, gender, dob };
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      onNavigate(Screen.Welcome);
    } catch (e) {
      setError('Could not save your details. Please ensure your browser supports local storage.');
      console.error("Failed to save profile:", e);
    }
  };

  return (
    <div className="flex flex-col h-full text-left p-8 bg-white animate-fadeIn">
      <div className="flex-grow flex flex-col justify-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Mann Mitra 💙</h1>
        <p className="text-gray-600 mb-8">Let's get to know you a bit. This stays on your device and helps personalize your experience.</p>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-md font-medium text-gray-700 mb-1">What should I call you?</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-gray-800 placeholder:text-gray-400 bg-white"
              aria-label="Your Name"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-md font-medium text-gray-700 mb-1">Gender</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${gender ? 'text-gray-800' : 'text-gray-400'}`}
              aria-label="Gender"
            >
              <option value="" disabled>Select your gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="dob" className="block text-md font-medium text-gray-700 mb-1">Date of Birth</label>
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
        Save & Continue
      </button>
    </div>
  );
};

export default OnboardingScreen;
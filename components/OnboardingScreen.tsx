import React, { useState } from 'react';
import { Screen, UserProfile, TranslationKey, Language, LANGUAGES, COUNTRIES, EmergencyContact, COUNTRY_CODES } from '../types';

interface OnboardingScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  playClick: () => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate, t, language, setLanguage, playClick }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ relation: '', countryCode: '+91', phone: '' }]);
  const [error, setError] = useState('');
  const [isDobFocused, setIsDobFocused] = useState(false);

  const handleContactChange = (index: number, field: keyof EmergencyContact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleAddContact = () => {
    playClick();
    if (contacts.length < 3) {
      setContacts([...contacts, { relation: '', countryCode: '+91', phone: '' }]);
    } else {
      setError(t('contactLimitReached'));
    }
  };
  
  const handleRemoveContact = (index: number) => {
    playClick();
    const newContacts = contacts.filter((_, i) => i !== index);
    setContacts(newContacts);
  };

  const handleContinue = () => {
    playClick();
    const validContacts = contacts.filter(c => c.relation.trim() && c.countryCode.trim() && c.phone.trim());

    if (!name.trim() || !gender || !dob || !country || validContacts.length === 0) {
      if (validContacts.length === 0) {
        setError(t('atLeastOneContact'));
      } else {
        setError(t('pleaseFillAllFields'));
      }
      return;
    }
    
    const userProfile: UserProfile = { name, gender, dob, country, emergencyContacts: validContacts };
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      onNavigate(Screen.Chat);
    } catch (e) {
      setError(t('couldNotSaveDetails'));
      console.error("Failed to save profile:", e);
    }
  };

  const relationOptions = [
    { key: 'parent', label: t('parent') },
    { key: 'guardian', label: t('guardian') },
    { key: 'sibling', label: t('sibling') },
    { key: 'spouse', label: t('spouse') },
    { key: 'friend', label: t('friend') },
    { key: 'other', label: t('other') },
  ];

  return (
    <div className="flex flex-col h-full text-left p-6 bg-white animate-fadeIn">
      <div className="flex-grow flex flex-col overflow-y-auto pr-2 -mr-2">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('welcomeToMannMitra')}</h1>
        <p className="text-gray-600 mb-6">{t('letsGetToKnowYou')}</p>

        <div className="space-y-4">
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
            <label htmlFor="country" className="block text-md font-medium text-gray-700 mb-1">{t('country')}</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${country ? 'text-gray-800' : 'text-gray-400'}`}
              aria-label="Country"
            >
              <option value="" disabled>{t('selectYourCountry')}</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
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
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName === lang.name ? lang.name : `${lang.nativeName} (${lang.name})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dob" className="block text-md font-medium text-gray-700 mb-1">{t('dateOfBirth')}</label>
            <input
              type={isDobFocused || dob ? 'date' : 'text'}
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              onFocus={() => setIsDobFocused(true)}
              onBlur={() => setIsDobFocused(false)}
              placeholder="dd·mm·yyyy"
              className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${dob ? 'text-gray-800' : 'text-gray-400'}`}
              aria-label="Date of Birth"
            />
          </div>

          <div className="pt-2">
            <h2 className="text-md font-medium text-gray-700">{t('emergencyContacts')}</h2>
            <p className="text-sm text-gray-500 mb-3">{t('emergencyContactsDescription')}</p>
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="p-3 border rounded-lg bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                     <select
                        value={contact.relation}
                        onChange={(e) => handleContactChange(index, 'relation', e.target.value)}
                        className={`w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white ${contact.relation ? 'text-gray-800' : 'text-gray-400'}`}
                      >
                        <option value="" disabled>{t('selectRelation')}</option>
                        {relationOptions.map(opt => <option key={opt.key} value={opt.label}>{opt.label}</option>)}
                      </select>
                     {contacts.length > 1 && (
                      <button onClick={() => handleRemoveContact(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full flex-shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                  </div>
                   <div className="flex items-center gap-2">
                    <select
                      value={contact.countryCode}
                      onChange={(e) => handleContactChange(index, 'countryCode', e.target.value)}
                      className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white text-gray-800"
                      aria-label="Country Code"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.dial_code}>
                          {c.flag} {c.dial_code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder={t('phoneNumber')}
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-gray-800 placeholder:text-gray-400 bg-white"
                      aria-label={t('phoneNumber')}
                    />
                  </div>
                </div>
              ))}
              {contacts.length < 3 && (
                <button onClick={handleAddContact} className="w-full text-center py-2 text-apple-blue font-semibold rounded-lg hover:bg-blue-50">
                  {t('addContact')}
                </button>
              )}
            </div>
          </div>

        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
      </div>

      <div className="pt-4 flex-shrink-0">
          <button
            onClick={handleContinue}
            className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 transition-colors"
          >
            {t('saveAndContinue')}
          </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
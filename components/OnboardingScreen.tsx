import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, TranslationKey, Language, LANGUAGES, COUNTRIES, EmergencyContact, COUNTRY_CODES } from '../types';

interface OnboardingScreenProps {
  onNavigate: (screen: Screen) => void;
  // FIX: Added isEditing prop to support profile editing mode.
  isEditing: boolean;
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  playClick: () => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNavigate, t, language, setLanguage, playClick, isEditing }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([{ relation: '', countryCode: '+91', phone: '' }]);
  const [error, setError] = useState('');
  const [isDobFocused, setIsDobFocused] = useState(false);

  // FIX: Added useEffect to load user data when in editing mode.
  useEffect(() => {
    if (isEditing) {
      try {
        const profileString = localStorage.getItem(USER_PROFILE_KEY);
        if (profileString) {
          const profile: UserProfile = JSON.parse(profileString);
          setName(profile.name);
          setGender(profile.gender);
          setDob(profile.dob);
          setCountry(profile.country);
          // Ensure contacts is an array with at least one item for the UI
          setContacts(profile.emergencyContacts.length > 0 ? profile.emergencyContacts : [{ relation: '', countryCode: '+91', phone: '' }]);
        }
      } catch (error) {
        console.error("Failed to load profile for editing:", error);
      }
    }
  }, [isEditing]);

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
    <div className="flex flex-col h-full text-left p-6 bg-white dark:bg-slate-900 animate-fadeIn">
      <div className="flex-grow flex flex-col overflow-y-auto pr-2 -mr-2">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{isEditing ? t('updateYourInfo') : t('welcomeToMannMitra')}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{isEditing ? t('emergencyContactsDescription') : t('letsGetToKnowYou')}</p>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-md font-medium text-slate-700 dark:text-slate-300 mb-1">{t('whatShouldICallYou')}</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('yourName')}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800"
              aria-label="Your Name"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-md font-medium text-slate-700 dark:text-slate-300 mb-1">{t('gender')}</label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-800 custom-select ${gender ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
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
            <label htmlFor="country" className="block text-md font-medium text-slate-700 dark:text-slate-300 mb-1">{t('country')}</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-800 custom-select ${country ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
              aria-label="Country"
            >
              <option value="" disabled>{t('selectYourCountry')}</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="language" className="block text-md font-medium text-slate-700 dark:text-slate-300 mb-1">{t('preferredLanguage')}</label>
            <select
              id="language"
              value={language}
              // FIX: The value from the onChange event is a generic string, but setLanguage expects the specific 'Language' type. Casting the value resolves the TypeScript error.
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 custom-select`}
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
            <label htmlFor="dob" className="block text-md font-medium text-slate-700 dark:text-slate-300 mb-1">{t('dateOfBirth')}</label>
            <input
              type={isDobFocused || dob ? 'date' : 'text'}
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              onFocus={() => setIsDobFocused(true)}
              onBlur={() => setIsDobFocused(false)}
              placeholder="dd·mm·yyyy"
              className={`w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-800 ${dob ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
              aria-label="Date of Birth"
            />
          </div>

          <div className="pt-2">
            <h2 className="text-md font-medium text-slate-700 dark:text-slate-300">{t('emergencyContacts')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('emergencyContactsDescription')}</p>
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div key={index} className="p-3 border dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center gap-2">
                     <select
                        value={contact.relation}
                        onChange={(e) => handleContactChange(index, 'relation', e.target.value)}
                        className={`w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-700 custom-select ${contact.relation ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}
                      >
                        <option value="" disabled>{t('selectRelation')}</option>
                        {relationOptions.map(opt => <option key={opt.key} value={opt.label}>{opt.label}</option>)}
                      </select>
                     {contacts.length > 1 && (
                      <button onClick={() => handleRemoveContact(index)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full flex-shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                  </div>
                   <div className="flex items-center gap-2">
                    <select
                      value={contact.countryCode}
                      onChange={(e) => handleContactChange(index, 'countryCode', e.target.value)}
                      className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 custom-select"
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
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-700"
                      aria-label={t('phoneNumber')}
                    />
                  </div>
                </div>
              ))}
              {contacts.length < 3 && (
                <button onClick={handleAddContact} className="w-full text-center py-2 text-apple-blue font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10">
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
            className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            {isEditing ? t('saveChanges') : t('saveAndContinue')}
          </button>
          {isEditing && (
            <button onClick={() => { playClick(); onNavigate(Screen.Chat); }} className="w-full text-center py-3 text-sm text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mt-2 transition-colors">
              {t('cancel')}
            </button>
          )}
      </div>
    </div>
  );
};

export default OnboardingScreen;
import React, { useState, useEffect } from 'react';
import { Screen, JournalEntry, TranslationKey, Language, UserProfile, Mood, MoodEntry } from '../types';
import { GoogleGenAI } from "@google/genai";

interface JournalScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
  playClick: () => void;
  playSuccess: () => void;
}

const JOURNAL_ENTRIES_KEY = 'mann-mitra-journal-entries';
const USER_PROFILE_KEY = 'mann-mitra-user-profile';
const MOOD_ENTRIES_KEY = 'mann-mitra-mood-entries';

const JournalScreen: React.FC<JournalScreenProps> = ({ onNavigate, t, language, playClick, playSuccess }) => {
  const [title, setTitle] = useState('');
  const [entry, setEntry] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);

  // New state for mood logging
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [moodNote, setMoodNote] = useState('');


  // Load entries and user profile from localStorage on mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem(JOURNAL_ENTRIES_KEY);
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
      const profile = localStorage.getItem(USER_PROFILE_KEY);
      if (profile) {
        setUserProfile(JSON.parse(profile));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }, []);
  
  const checkForCrisis = async (text: string) => {
    if (!process.env.API_KEY || (userProfile?.emergencyContacts?.length ?? 0) === 0) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `You are a safety classification model. Analyze the following user text for any indication of self-harm, suicide, immediate danger to self or others, or severe crisis. Respond with only one word: 'CRISIS' if such content is present, or 'SAFE' if it is not. Do not provide any explanation or other text.\n\nUser text: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      if (response.text.trim().toUpperCase() === 'CRISIS') {
        setShowCrisisModal(true);
      }
    } catch (error) {
      console.error("Crisis check failed:", error);
    }
  };

  const handleSave = async () => {
    if (entry.trim() === '') return;
    
    // Check for crisis before saving
    await checkForCrisis(entry.trim());

    const defaultTitle = `${t('reflectionOn')}${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}`;
    
    const newEntry: JournalEntry = {
      id: Date.now(),
      title: title.trim() || defaultTitle,
      text: entry.trim(),
      date: new Date().toISOString(),
    };
    
    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    
    try {
      localStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updatedEntries));
    } catch (error) {
      console.error("Failed to save journal entry:", error);
    }

    setTitle('');
    setEntry('');
    setShowMoodModal(true); // Show mood modal instead of generic popup
  };

  const handleSaveMood = () => {
    if (!selectedMood) return;
    playSuccess();

    const newMoodEntry: MoodEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      mood: selectedMood,
      note: moodNote.trim() || undefined,
    };

    try {
      const existingMoods = localStorage.getItem(MOOD_ENTRIES_KEY);
      const moods = existingMoods ? JSON.parse(existingMoods) : [];
      const updatedMoods = [newMoodEntry, ...moods];
      localStorage.setItem(MOOD_ENTRIES_KEY, JSON.stringify(updatedMoods));
    } catch (error) {
      console.error("Failed to save mood entry:", error);
    }

    // Reset and show confirmation
    setShowMoodModal(false);
    setSelectedMood(null);
    setMoodNote('');
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };
  
  const handleDelete = (id: number) => {
    playClick();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }

    const updatedEntries = entries.filter(e => e.id !== id);
    setEntries(updatedEntries);
    localStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(updatedEntries));
    
    setViewingEntry(null);
    setConfirmDelete(false);
  };
  
  const handleBackButton = () => {
    playClick();
    if (viewingEntry) {
      setViewingEntry(null);
      setConfirmDelete(false);
    } else if (showHistory) {
      setShowHistory(false);
    } else {
      onNavigate(Screen.Chat);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const datePart = date.toLocaleDateString('en-GB').replace(/\//g, '-');
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  };
  
  const moodOptions: { mood: Mood, emoji: string, labelKey: TranslationKey }[] = [
    { mood: 'happy', emoji: '😃', labelKey: 'happy' },
    { mood: 'neutral', emoji: '😐', labelKey: 'neutral' },
    { mood: 'sad', emoji: '😔', labelKey: 'sad' },
    { mood: 'stressed', emoji: '😫', labelKey: 'stressed' },
  ];

  const renderContent = () => {
    if (viewingEntry) {
      return (
        <div className="flex flex-col h-full animate-fadeIn">
          <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 shadow-inner">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{viewingEntry.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 border-b pb-3 border-slate-200 dark:border-slate-700">{formatDate(viewingEntry.date)}</p>
            <div className="prose dark:prose-invert max-w-none">
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{viewingEntry.text}</p>
            </div>
          </div>
          <div className="mt-4 flex-shrink-0">
            <button
              onClick={() => handleDelete(viewingEntry.id)}
              className={`w-full text-center py-3 font-semibold rounded-full mb-2 transition-colors ${confirmDelete ? 'bg-red-500 text-white' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-500/30'}`}
            >
              {confirmDelete ? t('confirmDeletion') : t('deleteEntry')}
            </button>
            <button onClick={handleBackButton} className="w-full text-center py-3 text-sm text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {t('backToReflections')}
            </button>
          </div>
        </div>
      );
    }

    if (showHistory) {
      return (
        <div className="flex flex-col h-full animate-fadeIn">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">{t('yourReflections')}</h1>
          {entries.length > 0 ? (
            <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
              {entries.map(e => (
                <div key={e.id} onClick={() => { playClick(); setViewingEntry(e); }} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:shadow-sm transition-all duration-200">
                  <div className="flex justify-between items-center">
                    <div className="flex-grow overflow-hidden">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{e.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(e.date)}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 dark:text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="font-semibold">{t('noJournalEntries')}</p>
              <p>{t('savedReflectionsAppearHere')}</p>
            </div>
          )}
          <div className="mt-4 flex-shrink-0">
            <button onClick={handleBackButton} className="w-full text-center py-3 text-sm text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {t('backToJournal')}
            </button>
          </div>
        </div>
      );
    }
    
    // Main screen to write a new entry
    return (
      <div className="flex flex-col h-full animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('yourSafeSpace')}</h1>
             <button onClick={() => { playClick(); setShowHistory(true); }} className="flex items-center gap-1.5 text-xs font-semibold text-apple-blue bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 py-2 px-3 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <span>{t('yourReflections')}</span>
            </button>
        </div>
        
        <div className="flex-grow flex flex-col bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-inner overflow-hidden">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('giveYourReflectionTitle')}
            className="w-full p-4 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:outline-none text-lg font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
          />
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder={t('writeDownYourThoughts')}
            className="w-full flex-grow p-4 bg-transparent focus:outline-none text-slate-700 dark:text-slate-300 resize-none leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex-shrink-0 pt-4">
          <button
            onClick={handleSave}
            disabled={!entry.trim()}
            className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-4 px-4 rounded-full text-lg shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:bg-blue-300 dark:disabled:bg-blue-800"
          >
            {t('saveMyReflection')}
          </button>
          <button onClick={handleBackButton} className="w-full text-center py-3 text-sm text-slate-600 dark:text-slate-400 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mt-2 transition-colors">
            {t('backToChat')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col bg-white dark:bg-slate-900 relative">
      {/* Crisis Modal */}
      {showCrisisModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="crisis-title" aria-describedby="crisis-body">
            <h2 id="crisis-title" className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('crisisWarningTitle')}</h2>
            <p id="crisis-body" className="text-slate-600 dark:text-slate-400 mt-2 mb-6">{t('crisisWarningBody')}</p>
            <div className="space-y-3">
              {(userProfile?.emergencyContacts ?? []).map((contact, index) => (
                <a 
                  key={index}
                  href={`tel:${(contact.countryCode + contact.phone).replace(/[+\s-()]/g, '')}`}
                  onClick={() => playClick()}
                  className="w-full flex items-center justify-between text-left p-3 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{contact.relation}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{contact.countryCode} {contact.phone}</p>
                  </div>
                  <div className="bg-green-500 p-2 rounded-full flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
            <button
              onClick={() => { playClick(); setShowCrisisModal(false); }}
              className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-3 px-4 rounded-full mt-6 hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* Mood Logging Modal */}
      {showMoodModal && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-30 animate-fadeInBackdrop">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="mood-title">
            <h2 id="mood-title" className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">{t('howAreYouFeeling')}</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {moodOptions.map(({ mood, emoji, labelKey }) => (
                <button
                  key={mood}
                  onClick={() => { playClick(); setSelectedMood(mood); }}
                  className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${selectedMood === mood ? 'border-apple-blue bg-blue-50 dark:bg-blue-500/20' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  aria-pressed={selectedMood === mood}
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className={`text-xs mt-1 font-semibold ${selectedMood === mood ? 'text-apple-blue' : 'text-slate-600 dark:text-slate-300'}`}>{t(labelKey)}</span>
                </button>
              ))}
            </div>
            <textarea
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder={t('addANote')}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-apple-blue text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-700"
              rows={2}
            />
            <button
              onClick={handleSaveMood}
              disabled={!selectedMood}
              className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-3 px-4 rounded-full mt-4 disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
            >
              {t('saveMood')}
            </button>
          </div>
        </div>
      )}

      {/* Pop-up */}
      {showPopup && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-semibold py-2 px-4 rounded-full animate-fadeIn z-20">
          {t('greatJobJournaling')}
        </div>
      )}

      {renderContent()}
    </div>
  );
};

export default JournalScreen;
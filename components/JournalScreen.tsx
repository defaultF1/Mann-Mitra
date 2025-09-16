import React, { useState, useEffect } from 'react';
import { Screen, JournalEntry, TranslationKey, Language } from '../types';

interface JournalScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
}

const JOURNAL_ENTRIES_KEY = 'mann-mitra-journal-entries';

const JournalScreen: React.FC<JournalScreenProps> = ({ onNavigate, t, language }) => {
  const [title, setTitle] = useState('');
  const [entry, setEntry] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);


  // Load entries from localStorage on mount
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem(JOURNAL_ENTRIES_KEY);
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    } catch (error) {
      console.error("Failed to load journal entries:", error);
    }
  }, []);

  const handleSave = () => {
    if (entry.trim() === '') return;

    const locale = language === 'hi' ? 'hi-IN' : 'en-US';
    const defaultTitle = `${t('reflectionOn')}${new Date().toLocaleDateString(locale)}`;
    
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
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };
  
  const handleDelete = (id: number) => {
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
  
  const renderBackButton = () => {
    if (viewingEntry) {
      return (
        <button onClick={() => { setViewingEntry(null); setConfirmDelete(false); }} className="text-apple-blue font-medium">
            {t('backToReflections')}
        </button>
      );
    }
    if (showHistory) {
      return (
        <button onClick={() => setShowHistory(false)} className="text-apple-blue font-medium">
          {t('backToJournal')}
        </button>
      );
    }
    return (
      <button onClick={() => onNavigate(Screen.Chat)} className="text-apple-blue font-medium">
        {t('backToChat')}
      </button>
    );
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const locale = language === 'hi' ? 'hi-IN' : 'en-US';
    return new Intl.DateTimeFormat(locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    }).format(date);
  };
  
  const renderContent = () => {
    if (viewingEntry) {
      return (
        <div className="flex-grow flex flex-col animate-fadeIn">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold text-gray-800 truncate pr-4">{viewingEntry.title}</h1>
            <button
              onClick={() => handleDelete(viewingEntry.id)}
              className={`p-2 rounded-full transition-colors ${confirmDelete ? 'bg-yellow-400 text-black' : 'text-gray-500 hover:bg-red-100 hover:text-red-600'}`}
              aria-label={confirmDelete ? t('confirmDeletion') : t('deleteEntry')}
            >
              {confirmDelete ? (
                 <span className="text-sm px-1 font-semibold">{t('confirm')}</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-gray-500 text-sm mb-4">{formatDate(viewingEntry.date)}</p>
          <div className="flex-grow overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-gray-800 whitespace-pre-wrap">{viewingEntry.text}</p>
          </div>
        </div>
      );
    }

    if (showHistory) {
      return (
        <>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('yourReflections')}</h1>
          <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
            {entries.length > 0 ? (
              entries.map(item => (
                <button
                  key={item.id}
                  onClick={() => setViewingEntry(item)}
                  className="w-full text-left p-4 rounded-lg bg-gray-50 border border-gray-200 animate-fadeIn transition-all duration-300 hover:border-apple-blue hover:shadow-sm"
                  aria-label={`View entry titled ${item.title}`}
                >
                  <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">{item.title}</h3>
                  <p className="text-gray-500 text-sm">{formatDate(item.date)}</p>
                </button>
              ))
            ) : (
              <div className="text-center text-gray-500 pt-16">
                <p>{t('noJournalEntries')}</p>
                <p>{t('savedReflectionsAppearHere')}</p>
              </div>
            )}
          </div>
        </>
      );
    }
    
    // Editor View
    return (
      <>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{t('yourSafeSpace')}</h1>
        <div className="flex-grow flex flex-col">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('giveYourReflectionTitle')}
            className="w-full p-3 mb-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-apple-blue text-lg flex-shrink-0"
            aria-label="Journal entry title"
          />
          <textarea
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder={t('writeDownYourThoughts')}
            className="w-full flex-grow p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-apple-blue text-lg"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={entry.trim() === ''}
          className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg mt-4 shadow-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 flex-shrink-0"
        >
          {t('saveMyReflection')}
        </button>
      </>
    );
  };


  return (
    <div className="p-6 h-full flex flex-col bg-white">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        {renderBackButton()}
        {!viewingEntry && (
            <button onClick={() => setShowHistory(!showHistory)} className="text-red-400 hover:text-red-500 transition-colors" aria-label="View journal history">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
            </button>
        )}
      </div>
      
      {renderContent()}

      {showPopup && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg animate-fadeIn">
          <p>{t('greatJobJournaling')}</p>
        </div>
      )}
    </div>
  );
};

export default JournalScreen;
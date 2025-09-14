import React, { useState } from 'react';
import { Screen } from '../types';

interface JournalScreenProps {
  onNavigate: (screen: Screen) => void;
}

const JournalScreen: React.FC<JournalScreenProps> = ({ onNavigate }) => {
  const [entry, setEntry] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  const handleSave = () => {
    if (entry.trim() === '') return;
    // In a real app, you would save this entry.
    console.log('Saved entry:', entry);
    setEntry('');
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      <button onClick={() => onNavigate(Screen.Chat)} className="self-start text-apple-blue mb-4">
        ← Back to Chat
      </button>

      <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Safe Space ✨</h1>
      
      <textarea
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        placeholder="Write down your thoughts, feelings, or anything on your mind. This is your private corner 💛"
        className="w-full flex-grow p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-apple-blue text-lg"
      />
      
      <button
        onClick={handleSave}
        className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg mt-4 shadow-lg hover:bg-blue-600 transition-colors"
      >
        Save My Reflection 📝
      </button>

      {showPopup && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg animate-fadeIn">
          <p>Great job journaling ✨ Writing reduces stress by 30%.</p>
        </div>
      )}
    </div>
  );
};

export default JournalScreen;
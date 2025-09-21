import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Screen, TranslationKey, Language, MoodEntry, Mood } from '../types';

interface MoodTrendsScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
  playClick: () => void;
}

const MOOD_ENTRIES_KEY = 'mann-mitra-mood-entries';

const moodConfig: { [key in Mood]: { color: string, darkColor: string, score: number, emoji: string } } = {
  happy: { color: 'bg-green-400', darkColor: 'dark:bg-green-500', score: 4, emoji: '😃' },
  neutral: { color: 'bg-yellow-400', darkColor: 'dark:bg-yellow-500', score: 3, emoji: '😐' },
  sad: { color: 'bg-red-400', darkColor: 'dark:bg-red-500', score: 1, emoji: '😔' },
  stressed: { color: 'bg-blue-400', darkColor: 'dark:bg-blue-500', score: 2, emoji: '😫' },
};

// --- Calendar View Component ---
const MoodCalendar = ({ moods, currentDate, t, playClick }: { moods: MoodEntry[], currentDate: Date, t: (key: TranslationKey) => string, playClick: () => void }) => {
  const [selectedDay, setSelectedDay] = useState<MoodEntry | null>(null);

  const daysInMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const days: (Date | null)[] = [];
    const firstDayIndex = (date.getDay() + 6) % 7; // Monday is 0
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    while (date.getMonth() === currentDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const moodsByDate = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    moods.forEach(mood => {
      const dateKey = new Date(mood.date).toISOString().split('T')[0];
      if (!map.has(dateKey)) { // Only show the first mood of the day
        map.set(dateKey, mood);
      }
    });
    return map;
  }, [moods]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl shadow-inner animate-fadeIn">
       {selectedDay && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-slate-700 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl">{moodConfig[selectedDay.mood].emoji}</span>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t(selectedDay.mood)}</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{new Date(selectedDay.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            {selectedDay.note && <p className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 p-3 rounded-lg">{selectedDay.note}</p>}
             <button onClick={() => { playClick(); setSelectedDay(null); }} className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-2 px-4 rounded-full mt-6 text-sm hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors">{t('close')}</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        {weekDays.map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;
          const moodEntry = moodsByDate.get(day.toISOString().split('T')[0]);
          return (
            <div key={day.toISOString()} className="aspect-square flex items-center justify-center">
              <button
                onClick={() => { if (moodEntry) { playClick(); setSelectedDay(moodEntry); }}}
                className={`w-full h-full rounded-full transition-all duration-200 flex items-center justify-center text-sm ${
                  moodEntry 
                    ? `${moodConfig[moodEntry.mood].color} ${moodConfig[moodEntry.mood].darkColor} text-white shadow-sm hover:scale-110` 
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                aria-label={moodEntry ? `Mood for ${day.getDate()}: ${moodEntry.mood}` : `Date ${day.getDate()}`}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Graph View Component ---
const MoodGraph = ({ moods, t }: { moods: MoodEntry[], t: (key: TranslationKey) => string }) => {
  const [activePoint, setActivePoint] = useState<{ mood: MoodEntry, x: number, y: number } | null>(null);

  const graphData = useMemo(() => {
    if (moods.length < 2) return null;

    const width = 300;
    const height = 150;
    const padding = 20;

    const sortedMoods = [...moods].reverse(); // oldest to newest
    const firstDate = new Date(sortedMoods[0].date).getTime();
    const lastDate = new Date(sortedMoods[sortedMoods.length - 1].date).getTime();
    const dateRange = lastDate - firstDate || 1; // Avoid division by zero

    const points = sortedMoods.map(mood => {
      const x = ((new Date(mood.date).getTime() - firstDate) / dateRange) * (width - 2 * padding) + padding;
      const y = height - padding - ((moodConfig[mood.mood].score - 1) / 3) * (height - 2 * padding);
      return { x, y, mood };
    });

    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');

    return { width, height, padding, points, pathD };
  }, [moods]);

  if (!graphData) return <div className="text-center p-8 text-slate-500">{t('logMoodsToSeeTrends')}</div>;

  const { width, height, padding, points, pathD } = graphData;

  return (
    <div className="relative animate-fadeIn">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {/* Y-Axis Labels */}
        <text x={padding - 15} y={padding + 5} fontSize="8" fill="currentColor" className="text-slate-400">😃</text>
        <text x={padding - 15} y={height - padding + 3} fontSize="8" fill="currentColor" className="text-slate-400">😔</text>
        {/* Graph Path */}
        <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="4" 
            fill="white" 
            stroke="url(#lineGradient)" 
            strokeWidth="2" 
            className="cursor-pointer"
            onClick={() => setActivePoint({ mood: p.mood, x: p.x, y: p.y })}
          />
        ))}
      </svg>
      {activePoint && (
          <div 
            className="absolute p-2 text-xs bg-slate-800 text-white rounded-md shadow-lg pointer-events-none"
            style={{
                left: `${(activePoint.x / width) * 100}%`,
                top: `${(activePoint.y / height) * 100}%`,
                transform: `translate(-50%, -120%)`,
            }}
           >
            <p className="font-bold">{t(activePoint.mood.mood)}</p>
            <p>{new Date(activePoint.mood.date).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
};


const MoodTrendsScreen: React.FC<MoodTrendsScreenProps> = ({ onNavigate, t, language, playClick }) => {
  const [allMoods, setAllMoods] = useState<MoodEntry[]>([]);
  const [view, setView] = useState<'calendar' | 'graph'>('calendar');
  const [filter, setFilter] = useState<'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    try {
      const savedMoods = localStorage.getItem(MOOD_ENTRIES_KEY);
      if (savedMoods) {
        setAllMoods(JSON.parse(savedMoods));
      }
    } catch (error) {
      console.error("Failed to load mood entries:", error);
    }
  }, []);

  const filteredMoods = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (filter === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (filter === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (filter === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    
    // For calendar view, filter by the currently displayed month
    if (view === 'calendar') {
        return allMoods.filter(mood => {
            const moodDate = new Date(mood.date);
            return moodDate.getFullYear() === currentDate.getFullYear() && moodDate.getMonth() === currentDate.getMonth();
        });
    }

    return allMoods.filter(mood => new Date(mood.date) >= startDate);
  }, [allMoods, filter, view, currentDate]);

  const handleNav = (screen: Screen) => {
    playClick();
    onNavigate(screen);
  };
  
  const changeMonth = (delta: number) => {
      playClick();
      setCurrentDate(prev => {
          const newDate = new Date(prev);
          newDate.setMonth(newDate.getMonth() + delta);
          return newDate;
      });
  };

  const renderView = () => {
    if (filteredMoods.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <p className="font-semibold">{t('noMoodsLogged')}</p>
          <p className="max-w-xs">{t('logMoodsToSeeTrends')}</p>
        </div>
      );
    }

    return view === 'calendar' 
      ? <MoodCalendar moods={filteredMoods} currentDate={currentDate} t={t} playClick={playClick} /> 
      : <MoodGraph moods={filteredMoods} t={t} />;
  };

  const renderFilterControls = () => {
    if (view === 'calendar') {
      return (
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200">{currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
        </div>
      )
    }
    // Graph filters
    return (
      <div className="flex justify-center bg-slate-200 dark:bg-slate-700 p-1 rounded-full">
        {(['week', 'month', 'year'] as const).map(f => (
          <button
            key={f}
            onClick={() => { playClick(); setFilter(f); }}
            className={`w-full text-center py-1.5 px-3 rounded-full text-sm font-semibold transition-colors ${filter === f ? 'bg-white dark:bg-slate-800 text-apple-blue shadow' : 'text-slate-600 dark:text-slate-300'}`}
          >
            {t(f)}
          </button>
        ))}
      </div>
    );
  };
  

  return (
    <div className="p-6 h-full flex flex-col bg-white dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">{t('moodTrends')}</h1>
      
      {/* View Toggle */}
      <div className="flex justify-center bg-slate-200 dark:bg-slate-700 p-1 rounded-full mb-4">
        <button onClick={() => { playClick(); setView('calendar'); }} className={`w-full text-center py-2 px-4 rounded-full font-semibold transition-colors ${view === 'calendar' ? 'bg-white dark:bg-slate-800 text-apple-blue shadow' : 'text-slate-600 dark:text-slate-300'}`}>{t('calendar')}</button>
        <button onClick={() => { playClick(); setView('graph'); }} className={`w-full text-center py-2 px-4 rounded-full font-semibold transition-colors ${view === 'graph' ? 'bg-white dark:bg-slate-800 text-apple-blue shadow' : 'text-slate-600 dark:text-slate-300'}`}>{t('graph')}</button>
      </div>
      
      {/* Filter Controls */}
      <div className="mb-4">
          {renderFilterControls()}
      </div>

      <div className="flex-grow">
        {renderView()}
      </div>
      
      <button
        onClick={() => handleNav(Screen.Chat)}
        className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-4 px-4 rounded-full text-lg mt-6 shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
      >
        {t('backToChat')}
      </button>
    </div>
  );
};

export default MoodTrendsScreen;
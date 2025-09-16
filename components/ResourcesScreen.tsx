import React from 'react';
import { Screen, TranslationKey } from '../types';

interface ResourcesScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
}

interface HelplineItemProps {
  name: string;
  description: string;
  number: string;
}

const HelplineItem: React.FC<HelplineItemProps> = ({ name, description, number }) => (
  <div className="bg-gray-100 p-4 rounded-2xl flex items-center justify-between gap-4">
    <div className="flex-grow">
      <p className="font-bold text-gray-800">{name}</p>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
      <p className="text-gray-600 mt-1">{number}</p>
    </div>
    <a 
      href={`tel:${number.replace(/[+\s-]/g, '')}`} 
      className="bg-green-500 p-3 rounded-full flex-shrink-0 hover:bg-green-600 transition-colors"
      aria-label={`Call ${name}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    </a>
  </div>
);


const ResourcesScreen: React.FC<ResourcesScreenProps> = ({ onNavigate, t }) => {
  const helplines = [
    { name: t('helplineKiran'), description: t('helplineKiranDesc'), number: '1800-599-0019' },
    { name: t('helplineVandrevala'), description: t('helplineVandrevalaDesc'), number: '+91-9999-666-555' },
    { name: t('helplineAasra'), description: t('helplineAasraDesc'), number: '+91-98204-66726' },
    { name: t('helplineIcall'), description: t('helplineIcallDesc'), number: '+91-9152987821' },
  ];

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">{t('youAreNotAlone')}</h1>
      
      <div className="space-y-4 flex-grow overflow-y-auto">
        {helplines.map((line) => (
          <HelplineItem key={line.name} name={line.name} description={line.description} number={line.number} />
        ))}
      </div>

      <p className="text-center text-gray-500 text-sm mt-6">
        {t('immediateDangerWarning')}
      </p>

      <button
        onClick={() => onNavigate(Screen.Chat)}
        className="w-full bg-apple-blue text-white font-bold py-4 px-4 rounded-full text-lg mt-4 shadow-lg hover:bg-blue-600 transition-colors"
      >
        {t('backToChat')}
      </button>
    </div>
  );
};

export default ResourcesScreen;
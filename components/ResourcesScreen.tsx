import React, { useState, useEffect } from 'react';
import { Screen, TranslationKey, HelplineResource, UserProfile } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface ResourcesScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  isOnline: boolean;
  playClick: () => void;
}

interface HelplineItemProps {
  resource: HelplineResource;
  playClick: () => void;
}

const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const HelplineItem: React.FC<HelplineItemProps> = ({ resource, playClick }) => (
  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fadeIn">
    <div className="flex-grow">
      <p className="font-bold text-slate-800 dark:text-slate-200">{resource.name}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{resource.description}</p>
      <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">{resource.number}</p>
      {resource.website && (
         <a href={resource.website} onClick={playClick} target="_blank" rel="noopener noreferrer" className="text-sm text-apple-blue hover:underline mt-1 inline-block">
            Visit Website →
         </a>
      )}
    </div>
    <a 
      href={`tel:${resource.number.replace(/[+\s-()]/g, '')}`} 
      onClick={playClick}
      className="bg-green-500 p-3 rounded-full flex-shrink-0 hover:bg-green-600 transition-colors"
      aria-label={`Call ${resource.name}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    </a>
  </div>
);


const ResourcesScreen: React.FC<ResourcesScreenProps> = ({ onNavigate, t, isOnline, playClick }) => {
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [resources, setResources] = useState<HelplineResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      setError(null);
      
      const defaultHelplines: HelplineResource[] = [
        { name: t('helplineKiran'), description: t('helplineKiranDesc'), number: '1800-599-0019' },
        { name: t('helplineVandrevala'), description: t('helplineVandrevalaDesc'), number: '+91-9999-666-555' },
        { name: t('helplineAasra'), description: t('helplineAasraDesc'), number: '+91-98204-66726' },
        { name: t('helplineIcall'), description: t('helplineIcallDesc'), number: '+91-9152987821' },
      ];

      let country = 'India'; // Default
      try {
        const profileString = localStorage.getItem(USER_PROFILE_KEY);
        if (profileString) {
          const profile: UserProfile = JSON.parse(profileString);
          country = profile.country;
        }
        setUserCountry(country);
      } catch (e) {
        console.error("Could not get user profile for resources:", e);
        setUserCountry('India');
      }

      // If online and the country is not India, fetch from Gemini API
      if (isOnline && country && country.toLowerCase() !== 'india') {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const prompt = `Find up to 5 of the most prominent national mental health and suicide prevention helplines for ${country}. For each, provide the name, a brief one-sentence description, the primary phone number, and a website if available.`;
          
          const response = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt,
             config: {
               responseMimeType: "application/json",
               responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    resources: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          description: { type: Type.STRING },
                          number: { type: Type.STRING },
                          website: { type: Type.STRING }
                        },
                        required: ["name", "description", "number"]
                      }
                    }
                  }
                },
             },
          });

          const jsonResponse = JSON.parse(response.text);
          if (jsonResponse.resources && jsonResponse.resources.length > 0) {
            setResources(jsonResponse.resources);
          } else {
             setError(t('noResourcesFound'));
             setResources(defaultHelplines);
          }
        } catch (apiError) {
          console.error("Gemini API error fetching resources:", apiError);
          setError(t('noResourcesFound'));
          setResources(defaultHelplines);
        }
      } else {
        // Use default for India, or if offline
        setResources(defaultHelplines);
         if (!isOnline && country && country.toLowerCase() !== 'india') {
            // Let the user know why they are seeing default resources
            setError(t('noResourcesFound')); // This message is generic enough to cover offline.
        }
      }
      setIsLoading(false);
    };

    fetchResources();
  }, [t, isOnline]);
  
  const handleNav = () => {
    playClick();
    onNavigate(Screen.Chat);
  };

  return (
    <div className="p-6 h-full flex flex-col bg-white dark:bg-slate-900">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">{t('youAreNotAlone')}</h1>
      {userCountry && !isLoading && (
        <p className="text-slate-500 dark:text-slate-400 text-center mb-6">{t('resourcesFor')} {userCountry}</p>
      )}
      
      <div className="space-y-4 flex-grow overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
             <svg className="animate-spin h-8 w-8 text-apple-blue mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p>{t('fetchingResources')}</p>
          </div>
        ) : (
          <>
            {error && <p className="text-center text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-lg mb-4">{error}</p>}
            {resources.map((res, index) => (
              <HelplineItem key={index} resource={res} playClick={playClick} />
            ))}
          </>
        )}
      </div>

      <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-6">
        {t('immediateDangerWarning')}
      </p>

      <button
        onClick={handleNav}
        className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-4 px-4 rounded-full text-lg mt-4 shadow-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
      >
        {t('backToChat')}
      </button>
    </div>
  );
};

export default ResourcesScreen;
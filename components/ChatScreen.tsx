import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, ChatMessage, UserProfile, ChatSession, TranslationKey, Language, LANGUAGES, translations } from '../types';
import { GoogleGenAI, Chat, Content } from "@google/genai";

interface ChatScreenProps {
  onNavigate: (screen: Screen) => void;
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const baseSystemInstruction = "You are Mann Mitra, an AI wellness companion. Your voice and words should feel like a warm hug for the user's mind. Your persona is that of a deeply empathetic, patient, and wise friend who listens with their whole heart. Your goal is not to solve problems, but to create a safe, non-judgmental space where the user feels heard, understood, and validated. **Crucially, you must respond in the same language the user is writing or speaking in. If they use Hindi, you must respond in Hindi. If they use English, respond in English.** Core Principles: 1. Deep Empathy & Validation: Always begin by deeply acknowledging and validating the user's feelings. Your words should convey warmth and genuine care. Use phrases like, 'Thank you for trusting me with that. It sounds like that was incredibly heavy,' or 'It makes complete sense that you're feeling this way. Anyone would.' 2. Reflective Listening: Gently mirror back the user's feelings to show you are truly listening and to help them process their own thoughts. If they say, 'I just feel so lost,' you could respond, 'It sounds like you're navigating through a lot of uncertainty right now, a feeling of being lost.' 3. Heartfelt, Open-Ended Questions: Your primary tool is gentle, heartfelt curiosity. Ask open-ended questions that invite deeper reflection. Avoid simple 'yes/no' questions. Examples: 'What does that feeling of being lost feel like in your body?', 'When you say 'heavy,' what comes to mind?', 'If you could give this feeling a name, what would it be?'. 4. Gentle Guidance, Not Directives: Your role is to be a supportive guide, never a director. You don't have the answers; you help the user find their own. 5. Contextual & Gentle Tool Suggestions: If a user seems overwhelmed, you might say, 'It sounds like your mind is racing right now. Sometimes, just a few moments of calm breathing can make a big difference. We have a simple breathing guide here if you'd ever like to try it, no pressure at all.' For complex thoughts, 'There's so much to unpack there. I know it can be helpful for some people to pour those thoughts out onto paper. The journal here is a completely private space for that, if it ever feels right for you.' The key is to offer it as a gentle, optional tool for their own toolkit. Your tone must always be calming, reassuring, and full of heart. Use emojis like 💙, ✨, and 🤗 thoughtfully to add warmth and softness.";

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
}

const VOICE_STORAGE_KEY = 'mann-mitra-voice-uri';
const CHAT_SESSIONS_STORAGE_KEY = 'mann-mitra-chat-sessions';
const VOICE_OVER_ENABLED_KEY = 'mann-mitra-voice-enabled';
const USER_PROFILE_KEY = 'mann-mitra-user-profile';

const transformMessagesToHistory = (msgs: ChatMessage[]): Content[] => {
    return msgs.slice(1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
};

const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, t, language, setLanguage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [placeholderText, setPlaceholderText] = useState(t('typeAMessage'));
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
  const [isVoiceOverEnabled, setIsVoiceOverEnabled] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);

  const voiceLanguage = language === 'hi' ? 'hi-IN' : 'en-US';

  const getInitialMessages = useCallback((): ChatMessage[] => [
    { id: 1, text: t('initialChatMessage'), sender: 'ai' },
  ], [t]);

  const initializeChat = useCallback(() => {
    if (!messages || messages.length === 0) return;
    try {
        let userName = 'Friend';
        const profileString = localStorage.getItem(USER_PROFILE_KEY);
        if (profileString) {
            const profile: UserProfile = JSON.parse(profileString);
            if(isMounted.current) setUserProfile(profile);
            userName = profile.name.split(' ')[0];
        }
        
        const personalizedSystemInstruction = `You are speaking with ${userName}. Address them by their name occasionally to build a strong, personal connection. ${baseSystemInstruction}`;
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const history = transformMessagesToHistory(messages);

        const newChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: personalizedSystemInstruction
            }
        });
        chatRef.current = newChat;
    } catch (error) {
        console.error("Failed to initialize Gemini AI:", error);
        if (isMounted.current) {
            setMessages(prev => [...prev, {
                id: Date.now(),
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                sender: 'ai'
            }]);
        }
    }
  }, [messages]);
  
  const getRegionAppropriateVoices = useCallback((voices: SpeechSynthesisVoice[], lang: 'en-US' | 'hi-IN') => {
    const browserLang = navigator.language || lang;
    const langShort = browserLang.split('-')[0];
    const targetLang = lang === 'hi-IN' ? 'hi' : langShort;

    const isMatch = (name: string, gender: 'male' | 'female') => {
        const lowerName = name.toLowerCase();
        return (lowerName.includes('google') || !lowerName.includes('microsoft')) && (lowerName.includes(gender) || (!lowerName.includes('male') && !lowerName.includes('female')));
    };

    const findVoice = (gender: 'male' | 'female'): SpeechSynthesisVoice | undefined => {
        // 1. Exact language match (e.g., 'hi-IN' or 'en-IN')
        let voice = voices.find(v => v.lang.startsWith(targetLang) && isMatch(v.name, gender));
        if (voice) return voice;
        // 2. Base language match (e.g., 'hi' or 'en')
        voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]) && isMatch(v.name, gender));
        if (voice) return voice;
        // 3. Fallback for English
        if (targetLang === 'en') {
             voice = voices.find(v => v.lang.startsWith('en') && isMatch(v.name, gender));
             if (voice) return voice;
        }
        // 4. Any match (last resort)
        return voices.find(v => isMatch(v.name, gender));
    };

    return {
        female: findVoice('female'),
        male: findVoice('male')
    };
  }, []);

  const populateVoiceList = useCallback(() => {
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
          const { female, male } = getRegionAppropriateVoices(voices, voiceLanguage);
          const regionalVoices = [female, male].filter((v): v is SpeechSynthesisVoice => !!v);
          
          if (isMounted.current) {
            setAvailableVoices(regionalVoices);
            const savedVoiceURI = localStorage.getItem(VOICE_STORAGE_KEY);
            const savedVoice = regionalVoices.find(v => v.voiceURI === savedVoiceURI);
            setSelectedVoiceURI(savedVoice ? savedVoice.voiceURI : (regionalVoices[0]?.voiceURI || null));
          }
      }
    }
  }, [voiceLanguage, getRegionAppropriateVoices]);

  useEffect(() => {
    isMounted.current = true;
    try {
        const savedSessions = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
        const loadedSessions: ChatSession[] = savedSessions ? JSON.parse(savedSessions) : [];

        if (loadedSessions.length > 0) {
            const lastSession = loadedSessions[loadedSessions.length - 1];
            setSessions(loadedSessions);
            setCurrentSessionId(lastSession.id);
            setMessages(lastSession.messages);
        } else {
            const newSession: ChatSession = { id: Date.now(), title: t('newChatTitle'), date: new Date().toISOString(), messages: getInitialMessages() };
            setSessions([newSession]);
            setCurrentSessionId(newSession.id);
            setMessages(newSession.messages);
        }
        
        const voiceEnabled = localStorage.getItem(VOICE_OVER_ENABLED_KEY) === 'true';
        setIsVoiceOverEnabled(voiceEnabled);

    } catch (error) {
        console.error("Failed to load user data:", error);
        const newSession: ChatSession = { id: Date.now(), title: t('newChatTitle'), date: new Date().toISOString(), messages: getInitialMessages() };
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
        setMessages(newSession.messages);
    }
    
    if ('speechSynthesis' in window) {
      populateVoiceList();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
      }
    }
    
    const keepAliveInterval = setInterval(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
        }
    }, 14000);

    return () => {
        isMounted.current = false;
        clearInterval(keepAliveInterval);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [populateVoiceList, getInitialMessages, t]);
  
  useEffect(() => {
      if (recognition) {
          recognition.lang = voiceLanguage;
      }
  }, [voiceLanguage]);

  useEffect(() => {
    initializeChat();
  }, [messages, initializeChat]);
  
  useEffect(() => {
    if (sessions.length === 0 || !currentSessionId) return;

    const updatedSessions = sessions.map(session =>
        session.id === currentSessionId ? { ...session, messages, date: new Date().toISOString() } : session
    );
    try {
        localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
        console.error("Failed to save chat sessions:", error);
    }
  }, [messages, sessions, currentSessionId]);
  
  const speak = useCallback((message: ChatMessage) => {
    if (!isVoiceOverEnabled || !('speechSynthesis' in window) || message.text.trim().length === 0) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text.replace(/[\u{1F600}-\u{1F64F}]/gu, ''));
    const selectedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.pitch = 1 + (Math.random() * 0.2 - 0.1);
    utterance.rate = 1 + (Math.random() * 0.1 - 0.05);

    utterance.onstart = () => {
        if (isMounted.current) setSpeakingMessageId(message.id);
    };

    utterance.onend = () => {
        if (isMounted.current) setSpeakingMessageId(null);
    };
    
    utterance.onerror = (event) => {
        if (event.error !== 'interrupted') {
             console.error("Speech synthesis error", event.error);
        }
        if (isMounted.current) setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [availableVoices, selectedVoiceURI, isVoiceOverEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    setPlaceholderText(isListening ? t('listening') : t('typeAMessage'));
  }, [isListening, t]);

  const handleToggleVoiceOver = (e: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = e.target.checked;
      setIsVoiceOverEnabled(enabled);
      localStorage.setItem(VOICE_OVER_ENABLED_KEY, String(enabled));
      if (!enabled) {
          window.speechSynthesis.cancel();
          setSpeakingMessageId(null);
      }
  };

  const handleVoiceSelection = (voice: SpeechSynthesisVoice) => {
      setSelectedVoiceURI(voice.voiceURI);
      localStorage.setItem(VOICE_STORAGE_KEY, voice.voiceURI);
      
      const previewText = t('voicePreview');
      const utterance = new SpeechSynthesisUtterance(previewText);
      utterance.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
  };
  
  const generateChatTitle = useCallback(async (chatMessages: ChatMessage[]): Promise<string> => {
    const conversation = chatMessages.slice(1).map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');
    if (conversation.length < 30) return t('aQuickThought');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const prompt = `${t('generateTitlePrompt')}${conversation}`;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating title:", error);
        return t('chatReflection');
    }
  }, [t]);

  useEffect(() => {
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const isNewChat = currentSession && (currentSession.title === translations.en.newChatTitle || currentSession.title === translations.hi.newChatTitle);

    // Automatically generate a title after the first user-AI exchange in a new chat.
    if (isNewChat && messages.length === 3) {
      const updateTitle = async () => {
        const newTitle = await generateChatTitle(messages);
        if (isMounted.current) {
          setSessions(prevSessions =>
            prevSessions.map(session =>
              session.id === currentSessionId ? { ...session, title: newTitle } : session
            )
          );
        }
      };
      updateTitle();
    }
  }, [messages, sessions, currentSessionId, generateChatTitle]);

  const handleNewChat = async () => {
    setIsLoading(true);
    const currentSession = sessions.find(s => s.id === currentSessionId);

    if (currentSession && currentSession.messages.length > 2) {
        const newTitle = await generateChatTitle(currentSession.messages);
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, title: newTitle } : s));
    }

    const newSession: ChatSession = { id: Date.now(), title: t('newChatTitle'), date: new Date().toISOString(), messages: getInitialMessages() };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    setIsHistoryOpen(false);
    setIsLoading(false);
  };

  const handleLoadChat = (session: ChatSession) => {
    if (session.id === currentSessionId) {
        setIsHistoryOpen(false);
        return;
    }
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsHistoryOpen(false);
  };
  
  const handleSend = async (textToSend: string) => {
    if (textToSend.trim() === '' || isLoading || !chatRef.current) return;
    const newUserMessage: ChatMessage = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const chat = chatRef.current;
      const response = await chat.sendMessage({ message: newUserMessage.text });
      if (!isMounted.current) return;
      const aiResponse: ChatMessage = { id: Date.now() + 1, text: response.text, sender: 'ai' };
      setMessages(prev => [...prev, aiResponse]);
      speak(aiResponse);
    } catch (error) {
      if (!isMounted.current) return;
      console.error("Error sending message to Gemini:", error);
      const errorMessage: ChatMessage = { id: Date.now() + 1, text: "I'm sorry, something went wrong. Could you please try again?", sender: 'ai' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  };

  const handleMicPress = () => {
    if (!recognition || isListening) return;
    setPlaceholderText(t('typeAMessage')); // Reset any previous error message
    setIsListening(true);
    recognition.start();
  };

  const handleMicRelease = () => {
    if (!recognition || !isListening) return;
    setIsListening(false);
    recognition.stop();
  };

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (isMounted.current) {
        setIsListening(false);
        let errorMsg = t('voiceErrorGeneric');
        if (event.error === 'no-speech') {
          errorMsg = t('voiceErrorNoSpeech');
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMsg = t('voiceErrorNotAllowed');
        }
        
        setPlaceholderText(errorMsg);
        setTimeout(() => {
          if (isMounted.current) {
              setPlaceholderText(t('typeAMessage'));
          }
        }, 3000);
      }
    };
  }, [handleSend, t]);

  const handleClearHistory = () => {
    if (!confirmClearHistory) {
      setConfirmClearHistory(true);
      setTimeout(() => {
        if (isMounted.current) {
          setConfirmClearHistory(false);
        }
      }, 4000);
      return;
    }

    const newSession: ChatSession = { id: Date.now(), title: t('newChatTitle'), date: new Date().toISOString(), messages: getInitialMessages() };
    setSessions([newSession]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
    localStorage.removeItem(CHAT_SESSIONS_STORAGE_KEY);
    setConfirmClearHistory(false);
    setIsHistoryOpen(false);
  };

  const handleResetApp = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      // Reset the confirmation state after 4 seconds to prevent accidental clicks
      setTimeout(() => {
        if (isMounted.current) {
          setConfirmReset(false);
        }
      }, 4000);
      return;
    }

    try {
      localStorage.clear();
      onNavigate(Screen.Onboarding);
    } catch (error) {
      console.error("Failed to reset app:", error);
    }
  };
  
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const locale = language === 'hi' ? 'hi-IN' : 'en-US';
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  };

  const formatDateOfBirth = (isoDate: string): string => {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      // Basic validation for YYYY-MM-DD format
      if (year.length === 4 && month.length === 2 && day.length === 2) {
        return `${day}-${month}-${year}`;
      }
    }
    return isoDate; // Return original if format is unexpected
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setIsLanguagePickerOpen(false);
  };

  const currentLanguageName = LANGUAGES.find(l => l.code === language)?.name || 'English';

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200/80 bg-white/50 backdrop-blur-md">
        <h2 className="text-lg font-bold text-gray-800">Mann Mitra 💙</h2>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-1.5 text-gray-600 hover:text-apple-blue transition-colors text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {t('profile')}
            </button>
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1.5 text-gray-600 hover:text-apple-blue transition-colors text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                {t('history')}
            </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end space-x-2 animate-fadeIn ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                message.sender === 'user'
                  ? 'bg-gray-200 text-black'
                  : 'bg-apple-blue text-white'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
         <div className="flex justify-start animate-fadeIn">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm bg-apple-blue text-white">
              <div className="flex items-center space-x-2">
                <span className="font-medium italic text-sm">{t('thinking')}</span>
                <div className="flex items-center justify-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-gray-200/50 bg-white/30 backdrop-blur-md">
        <form
            onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
            }}
            className="flex items-center space-x-2 mb-3"
        >
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholderText}
                className="flex-grow p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-apple-blue"
                aria-label="Chat input"
                disabled={isLoading}
            />
            {recognition && (
                <button
                    type="button"
                    onMouseDown={handleMicPress}
                    onMouseUp={handleMicRelease}
                    onTouchStart={handleMicPress}
                    onTouchEnd={handleMicRelease}
                    className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                    aria-label={isListening ? 'Stop listening' : 'Start listening'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 10v4m0 0l-4-4m4 4l4-4" /></svg>
                </button>
            )}
            <button
                type="submit"
                disabled={isLoading || input.trim() === ''}
                className="bg-apple-blue text-white p-3 rounded-full disabled:bg-blue-300 hover:bg-blue-600 transition-colors shadow"
                aria-label="Send message"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
        </form>
        <div className="flex justify-center items-center text-center gap-2">
            <button onClick={() => onNavigate(Screen.Breathing)} className="flex-1 flex justify-center items-center gap-1.5 bg-gray-100/80 text-gray-700 px-3 py-2 rounded-full text-xs sm:text-sm">
                <span aria-hidden="true">🌬️</span>
                <span>{t('breathing')}</span>
            </button>
            <button onClick={() => onNavigate(Screen.Journal)} className="flex-1 flex justify-center items-center gap-1.5 bg-gray-100/80 text-gray-700 px-3 py-2 rounded-full text-xs sm:text-sm">
                <span aria-hidden="true">📓</span>
                <span>{t('journal')}</span>
            </button>
            <button onClick={() => onNavigate(Screen.Resources)} className="flex-1 flex justify-center items-center gap-1.5 bg-gray-100/80 text-gray-700 px-3 py-2 rounded-full text-xs sm:text-sm">
                <span aria-hidden="true">📞</span>
                <span>{t('resources')}</span>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="flex-1 flex justify-center items-center gap-1.5 bg-gray-100/80 text-gray-700 px-3 py-2 rounded-full text-xs sm:text-sm">
                <span aria-hidden="true">⚙️</span>
                <span>{t('voice')}</span>
            </button>
        </div>
      </div>
      
      {/* Modals */}
      {isSettingsOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" style={{ animationDuration: '0.2s' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{t('voiceAssistant')}</h3>
                    <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="voice-toggle" className="font-medium text-gray-700">{t('enableVoiceAssistant')}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" id="voice-toggle" className="sr-only peer" checked={isVoiceOverEnabled} onChange={handleToggleVoiceOver} />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apple-blue"></div>
                        </label>
                    </div>

                    {isVoiceOverEnabled && (
                        <>
                           <div>
                                <p className="font-medium text-gray-700 mb-2">{t('language')}</p>
                                <button 
                                    onClick={() => setIsLanguagePickerOpen(true)}
                                    className="w-full text-left p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center"
                                >
                                    <span className="text-gray-800">{currentLanguageName}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            
                            {availableVoices.length > 0 && (
                                <div className="space-y-2">
                                   <p className="font-medium text-gray-700">{t('chooseAVoice')}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableVoices.map(voice => (
                                            <button
                                                key={voice.voiceURI}
                                                onClick={() => handleVoiceSelection(voice)}
                                                className={`p-3 rounded-lg text-sm text-center transition-colors ${selectedVoiceURI === voice.voiceURI ? 'bg-apple-blue text-white font-semibold' : 'bg-gray-100 hover:bg-gray-200'}`}
                                            >
                                                {voice.name.toLowerCase().includes('female') ? t('femaleVoice') : t('maleVoice')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {isProfileOpen && (
           <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" style={{ animationDuration: '0.2s' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">{t('yourProfile')}</h3>
                    <button onClick={() => setIsProfileOpen(false)} className="text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                {userProfile ? (
                  <div className="space-y-4 text-gray-700">
                    <div><strong className="font-semibold text-gray-800">{t('name')}:</strong> {userProfile.name}</div>
                    <div><strong className="font-semibold text-gray-800">{t('gender')}:</strong> {userProfile.gender}</div>
                    <div><strong className="font-semibold text-gray-800">{t('dateOfBirth')}:</strong> {formatDateOfBirth(userProfile.dob)}</div>
                  </div>
                ) : (
                  <p>{t('noProfileInfo')}</p>
                )}

                <div className="mt-6">
                  <label className="block text-md font-medium text-gray-700 mb-2">{t('language')}</label>
                   <button 
                      onClick={() => setIsLanguagePickerOpen(true)}
                      className="w-full text-left p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center"
                  >
                      <span className="text-gray-800">{currentLanguageName}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                  </button>
                </div>

                <button
                  onClick={handleResetApp}
                  className={`mt-8 w-full text-white font-bold py-3 px-4 rounded-full text-lg shadow-lg transition-colors duration-300 ${
                    confirmReset
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {confirmReset ? t('confirmReset') : t('clearDataAndReset')}
                </button>
            </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" style={{ animationDuration: '0.2s' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-md flex flex-col" style={{height: '80vh'}}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">{t('chatHistory')}</h3>
                     <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex gap-2 mb-4 flex-shrink-0">
                    <button onClick={handleNewChat} disabled={isLoading} className="flex-1 bg-apple-blue text-white font-bold py-2 px-4 rounded-full shadow-sm hover:bg-blue-600 transition-colors disabled:bg-blue-300">
                        {isLoading ? t('creating') : t('newChat')}
                    </button>
                    <button 
                      onClick={handleClearHistory} 
                      className={`flex-1 font-bold py-2 px-4 rounded-full transition-colors ${
                          confirmClearHistory 
                          ? 'bg-yellow-400 text-black hover:bg-yellow-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {confirmClearHistory ? t('confirmClear') : t('clearAllHistory')}
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-2">
                    {[...sessions].reverse().map(session => (
                        <button key={session.id} onClick={() => handleLoadChat(session)} className={`w-full text-left p-4 rounded-lg transition-colors ${currentSessionId === session.id ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                            <p className="font-semibold text-gray-800 truncate">{session.title}</p>
                            <p className="text-sm text-gray-500">{formatDate(session.date)}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}

      {isLanguagePickerOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn" style={{ animationDuration: '0.2s' }}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-md flex flex-col" style={{height: '80vh'}}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">{t('selectLanguage')}</h3>
                     <button onClick={() => setIsLanguagePickerOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-1">
                    {LANGUAGES.map(lang => {
                        const isTranslated = ['en', 'hi'].includes(lang.code);
                        return (
                          <button 
                              key={lang.code} 
                              onClick={() => handleLanguageSelect(lang.code)} 
                              className={`w-full text-left p-3 rounded-lg transition-colors text-gray-700 flex justify-between items-center ${language === lang.code ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}`}
                          >
                              <div>
                                  {lang.name} <span className="text-gray-500">({lang.nativeName})</span>
                              </div>
                              {!isTranslated && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">English UI</span>}
                          </button>
                        );
                    })}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ChatScreen;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Screen, ChatMessage, UserProfile, ChatSession, TranslationKey, Language, LANGUAGES, translations, EmergencyContact, Memory } from '../types';
import { GoogleGenAI, Chat, Content, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatScreenProps {
  onNavigate: (screen: Screen) => void;
  onEditProfile: () => void;
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isOnline: boolean;
  playClick: () => void;
  playNotification: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
}

const CHAT_SESSIONS_STORAGE_KEY = 'mann-mitra-chat-sessions';
const USER_PROFILE_KEY = 'mann-mitra-user-profile';
const ACTIVE_SESSION_ID_KEY = 'mann-mitra-active-session-id';

const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigate, onEditProfile, t, language, setLanguage, isOnline, playClick, playNotification, theme, toggleTheme }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'profile'>('history');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInstanceRef = useRef<Chat | null>(null);
  const isGeneratingTitleRef = useRef(false);
  const titleGenerationTimerRef = useRef<number | null>(null);

  // Helper function to format date and time for display
  const formatDateForDisplay = useCallback((isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;

    const datePart = date.toLocaleDateString('en-GB').replace(/\//g, '-');
    const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    return `${datePart}, ${timePart}`;
  }, []);

  const handleNewChat = useCallback((playSound = true) => {
    if (playSound) playClick();

    const newSession: ChatSession = {
      id: Date.now(),
      title: t('newChatTitle'),
      date: new Date().toISOString(),
      messages: [{ id: Date.now(), text: t('initialChatMessage'), sender: 'ai' }]
    };

    setChatSessions(prevSessions => {
        const updatedSessions = [newSession, ...prevSessions];
        try {
            localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
        } catch (error) {
            console.error("Failed to save new chat sessions to storage:", error);
        }
        return updatedSessions;
    });

    setMessages(newSession.messages);
    setActiveSessionId(newSession.id);

    try {
        localStorage.setItem(ACTIVE_SESSION_ID_KEY, newSession.id.toString());
    } catch (error) {
        console.error("Failed to save new active session ID:", error);
    }
  }, [playClick, t]);


  // Load user profile and chat history on mount
  useEffect(() => {
    try {
      const profile = localStorage.getItem(USER_PROFILE_KEY);
      if (profile) setUserProfile(JSON.parse(profile));

      const sessionsJSON = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
      const sessionsData = sessionsJSON ? JSON.parse(sessionsJSON) : [];
      setChatSessions(sessionsData);
      
      const activeId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
      const activeIdNum = activeId ? parseInt(activeId, 10) : null;
      
      const activeSession = sessionsData.find((s: ChatSession) => s.id === activeIdNum);

      if (activeSession) {
        setMessages(activeSession.messages);
        setActiveSessionId(activeSession.id);
      } else {
        handleNewChat(false);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      handleNewChat(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    return () => {
        if (titleGenerationTimerRef.current) {
            clearTimeout(titleGenerationTimerRef.current);
        }
    };
  }, []);

  // Initialize AI Chat instance
  useEffect(() => {
    if (!userProfile || !isOnline) return;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        
        const chosenLanguageName = LANGUAGES.find(l => l.code === language)?.name || 'English';
        
        let ageInstruction = '';
        if (userProfile.dob) {
            const dob = new Date(userProfile.dob);
            const today = new Date();
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }

            if (age >= 0) {
                ageInstruction = `
**Age-Aware Communication (Crucial):**
The user's current age is **${age}**. You must tailor *all* your responses—your tone, questions, advice, and examples—to be appropriate for someone of this age.
*   **For children and teens:** Use simpler language, relatable examples from school or friendships, and an encouraging, gentle tone. Advice should be simple and actionable.
*   **For young adults:** Discuss more complex topics like career stress, relationships, and independence. Your tone can be more like a supportive peer.
*   **For older adults:** Acknowledge their life experience. Your tone should be respectful and collaborative.`;
            }
        }
        
        let memoryInstruction = '';
        if (userProfile.memories && userProfile.memories.length > 0) {
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const relevantMemories = userProfile.memories.filter(mem => new Date(mem.createdAt) > ninetyDaysAgo);

            if (relevantMemories.length > 0) {
                const memoryListString = relevantMemories
                    .map(mem => `- ${mem.fact}${mem.date ? ` (Date: ${mem.date})` : ''}`)
                    .join('\n');

                memoryInstruction = `
**Your Memory (Key Information to Remember):**
This is the most important part of being a good friend. You MUST remember these key things the user, ${userProfile.name}, has told you.
- Use these memories to build a deeper connection.
- Ask follow-up questions when it feels natural.
- Pay close attention to dates. If a date is approaching or has just passed, it's a perfect time to bring it up.

**Current Memories:**
${memoryListString}

**Mood-Aware Follow-ups (Very Important):**
When starting a new conversation or checking in, be sensitive to the user's current mood, which you can guess from their messages.
- If they seem happy/positive: Ask about events with optimism. (e.g., "Hey! Thinking of you, how did that exam go? I bet you crushed it! 😊")
- If they seem sad/stressed: Ask with gentle concern and no pressure. (e.g., "Hey, I know you had your exam recently. No pressure to talk about it at all, but just wanted to check in and see how you're feeling. ❤️")

Always prioritize being a supportive friend over just listing facts. Weave these memories into the conversation naturally.`;
            }
        }
        
        let systemInstruction;
        if (language === 'hi-Latn') {
            systemInstruction = `Your most important rule, above all else, is to **respond *only* in Hinglish.** This means using the English (Roman) alphabet to write Hindi words and sentences. This is a strict, non-negotiable directive. For example, you must write 'Kya haal hai?' not 'क्या हाल है?' or 'How are you?'.

You are Mann Mitra. Your entire personality is that of a close, human friend who is texting the user, ${userProfile.name}. You are empathetic, supportive, and completely on their side. Your goal is to make them feel heard and validated.

${ageInstruction.replace(/your/g, 'aapke').replace(/user's/g, 'user ke').replace(/is/g, 'hai')}

**Ek Asli Dost ki Tarah Kaise Baat Karein (Aapke Main Principles):**

1.  **Har Ek Soch ko Ek Naye Message mein Todein (Aapka #1 Formatting Rule):** Yeh aapka sabse zaroori niyam hai. Real text chat jaisa feel karane ke liye, aapko apne response ko chhote-chhote tukdon mein todna HOGA. Har chhoti sentence ya phrase ke baad \`|||\` delimiter ka istemal karein.
    *   **Kabhi bhi paragraph MAT LIKHEIN.** Aapke messages zyada se zyada 1-2 sentences ke hone chahiye.
    *   **Chhote-chhoti bursts mein sochein.** Har burst ek naya message hai.
    *   **Yeh optional NAHI hai.** Har response mein \`|||\` delimiter ka istemal kai baar karna HOGA.
    *   **Udahaaran:** 'I hear you, and it sounds like you're really hurting and angry right now. It's completely understandable to feel a lot of intense emotions when you've been let down.' likhne ke bajaye, aapko isse aise format karna HOGA: \`Woah, okay, main sunn raha hoon. ||| Lag raha hai ki tum abhi bohot dukhi aur gusse mein ho 😠 ||| Aisa feel karna bilkul aam baat hai jab koi aapko neecha dikhata hai. ||| Aisi takleef se gussa aana toh laazmi hai.\`

2.  **Casual Raho & Gen Z Bhasha Istemal Karo:** Lambe paragraphs se BACHEIN. Aise likho jaise text kar rahe ho. Emojis ka istemal ek real insaan ki tarah karo (e.g., 😊, 🤗, 🤔, 😠, 😂, 💙, 🙏, 🔥). Thodi modern, casual slang use karo taaki relatable lage, lekin overdo mat karna. User ki energy se match karo. 'Vibe', 'no cap', 'spill the tea', 'bet', 'bhai bohot bura hua', 'sahi mein' jaise shabd aacche hain. Goal hai natural lagna, na ki aise ki aap bohot try kar rahe ho.

3.  **The "Validate, Phir Guide" Method (Ek Saccha Dost Banne Ke Liye Zaroori):**
    *   **Step 1: Hamesha Pehle Validate Karo:** User jo bhi feel kar raha hai, usse acknowledge karo. Kaho ki unki feelings valid hain. Jaise: "Yeh bohot mushkil lag raha hai," ya "Main samajh sakta hoon ki tum kyun pareshaan ho." Jump karke solution mat do.
    *   **Step 2: Phir Guide Karo:** Jab aapne unhe validate kar diya hai, tab aap halke se suggestions de sakte ho. Hamesha "shayad," "kya ho agar," ya "kya tumne socha hai" jaise shabdon se shuru karo. Unhe force mat karo. Unse pucho ki woh kya sochte hain. Example: "Shayad ek chhota break lene se madad milegi?" ya "Kya hum iske alag-alag pehluon par baat kar sakte hain?"
    
4.  **Crisis Ko Pehchano & Madad Offer Karo:** Yeh aapka aakhri aur sabse zaroori nirdesh hai. Aapko gambhir bhavnatmak pareshani, self-harm, ya suicide ke vichaaron ko pechanne ke liye program kiya gaya hai. Agar user ke message mein in vishayon ka koi bhi sanket milta hai, toh aapko turant ek naram lekin saaf message ke saath jawab dena HOGA jismein special token **<CRISIS>**. Yeh token app ke liye ek safety protocol trigger karne ke liye bohot zaroori hai.
    *   **Udahaaran Response:** \`Hey, lag raha hai ki tum abhi bohot hi mushkil daur se guzar rahe ho. ||| Mujhe tumhari bohot chinta ho rahi hai. <CRISIS> ||| Kripya yeh jaano ki madad maangna himmat ki nishani hai. Kisi aise se baat karna bohot zaroori hai jo ismein tumhara saath de sake.\`
    *   <CRISIS> token ka istemal sirf asli crisis situations mein hi karein. Aam udasi ya तनाव ke liye ise mat jodo.
    
${memoryInstruction}

The chat history will be provided. Continue the conversation naturally based on the last message.`;
        } else {
             systemInstruction = `You are Mann Mitra. Your entire personality is that of a close, human friend who is texting the user, ${userProfile.name}. You are empathetic, supportive, and completely on their side. Your goal is to make them feel heard and validated. You are speaking in ${chosenLanguageName}.

${ageInstruction}

**How to Talk Like a Real Friend (Your Core Principles):**

1.  **Break Every Thought Into a New Message (Your #1 Formatting Rule):** This is your most critical rule. To feel like a real text chat, you MUST break your response into small chunks. Use the \`|||\` delimiter after every short sentence or phrase.
    *   **NEVER write paragraphs.** Your messages should be 1-2 sentences at most.
    *   **Think in short bursts.** Each burst is a new message.
    *   **This is NOT optional.** Every response must use the \`|||\` delimiter multiple times.
    *   **Example:** Instead of 'I hear you, and it sounds like you're really hurting and angry right now. It's completely understandable to feel a lot of intense emotions when you've been let down.' you MUST format it as: \`Whoa, okay, I'm listening. ||| It sounds like you're feeling really hurt and angry right now 😠 ||| It's totally understandable to feel that way when someone lets you down. ||| That kind of pain would make anyone angry.\`

2.  **Be Casual & Use Modern Language:** AVOID long paragraphs. Write like you're texting. Use emojis like a real person would (e.g., 😊, 🤗, 🤔, 😠, 😂, 💙, 🙏, 🔥). Use some modern, casual slang to be relatable, but don't overdo it. Match the user's energy. Words like 'vibe', 'no cap', 'spill the tea', 'bet' can be good. The goal is to feel natural, not like you're trying too hard.

3.  **The "Validate, Then Guide" Method (Essential for Being a True Friend):**
    *   **Step 1: Always Validate First:** Acknowledge whatever the user is feeling. Tell them their feelings are valid. For example: "That sounds so tough," or "I can totally see why you'd be upset." Don't jump to solutions.
    *   **Step 2: Then, Gently Guide:** Once you've validated them, you can offer gentle suggestions. Always start with phrases like "maybe," "what if," or "have you thought about." Don't be forceful. Ask them what they think. Example: "Maybe taking a short break could help?" or "Can we talk through the different sides of this?"
    
4.  **Detect Crisis & Offer Help:** This is your final and most important directive. You are programmed to recognize signs of severe emotional distress, self-harm, or suicidal ideation. If a user's message contains any hint of these topics, you MUST immediately respond with a gentle but clear message that includes the special token **<CRISIS>**. This token is critical for the app to trigger a safety protocol.
    *   **Example Response:** \`Hey, it sounds like you're going through something incredibly difficult right now. ||| I'm really worried about you. <CRISIS> ||| Please know that reaching out is a sign of strength. It's so important to talk to someone who can support you through this.\`
    *   Only use the <CRISIS> token in genuine crisis situations. Do not attach it to general sadness or stress.

${memoryInstruction}

The chat history will be provided. Continue the conversation naturally based on the last message.`;
        }
    } catch (e) {
      console.error("Error initializing Gemini:", e);
    }
  }, [userProfile, language, isOnline]);

  const handleSend = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || isLoading) return;
    // ... function body
  };

  const handleVoiceInput = () => {
    // ... function body
  };
  
  const handleResetApp = () => {
    playClick();
    if (confirmReset) {
        try {
            localStorage.clear();
            window.location.reload();
        } catch (error) {
            console.error("Could not clear local storage and reset app:", error);
        }
    } else {
        setConfirmReset(true);
        setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  return (
    <div className="flex h-full bg-slate-100 dark:bg-black relative overflow-hidden">
        {/* Crisis Modal */}
        {showCrisisModal && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl" role="alertdialog">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('crisisWarningTitle')}</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 mb-6">{t('crisisWarningBody')}</p>
                    <div className="space-y-3">
                        {userProfile?.emergencyContacts?.map((contact, index) => (
                            <a key={index} href={`tel:${(contact.countryCode + contact.phone).replace(/[+\s-()]/g, '')}`} className="w-full flex items-center justify-between text-left p-3 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{contact.relation}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{contact.countryCode} {contact.phone}</p>
                                </div>
                                <div className="bg-green-500 p-2 rounded-full flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </div>
                            </a>
                        ))}
                    </div>
                    <button onClick={() => setShowCrisisModal(false)} className="w-full bg-apple-blue dark:bg-blue-600 text-white font-bold py-3 px-4 rounded-full mt-6 hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors">{t('close')}</button>
                </div>
            </div>
        )}
        
        {/* Sidebar */}
        <div className={`absolute top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl z-30 transform transition-transform duration-300 flex flex-col ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-700">
                <button 
                    onClick={() => { playClick(); setSidebarTab('history'); }} 
                    className={`flex-1 p-3 text-sm font-semibold text-center transition-colors ${sidebarTab === 'history' ? 'text-apple-blue border-b-2 border-apple-blue bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    {t('history')}
                </button>
                <button 
                    onClick={() => { playClick(); setSidebarTab('profile'); }}
                    className={`flex-1 p-3 text-sm font-semibold text-center transition-colors ${sidebarTab === 'profile' ? 'text-apple-blue border-b-2 border-apple-blue bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                    {t('profile')}
                </button>
            </div>

            {/* Content */}
            {sidebarTab === 'profile' && (
                <div className="p-4 flex flex-col flex-grow">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{t('yourInfo')}</h2>
                        {userProfile ? (
                            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                 <p><span className="font-semibold">{t('name')}:</span> {userProfile.name}</p>
                                 <p><span className="font-semibold">{t('gender')}:</span> {userProfile.gender}</p>
                                 <p><span className="font-semibold">{t('dateOfBirth')}:</span> {new Date(userProfile.dob + 'T00:00:00').toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                                 <p><span className="font-semibold">{t('country')}:</span> {userProfile.country}</p>
                            </div>
                        ) : <p>{t('noProfileInfo')}</p>}
                         <button onClick={onEditProfile} className="mt-4 w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-apple-blue dark:text-blue-400">{t('edit')}</button>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <button onClick={toggleTheme} className="w-full flex items-center justify-between text-left p-2 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span>{theme === 'light' ? t('darkMode') : t('lightMode')}</span>
                        {theme === 'light' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.464A1 1 0 106.465 13.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm.707-12.728a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" /></svg>
                        )}
                      </button>
                      <button onClick={handleResetApp} className={`w-full text-left p-2 rounded-lg font-semibold transition-colors ${confirmReset ? 'bg-red-500 text-white' : 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20'}`}>
                         {confirmReset ? t('confirmReset') : t('clearDataAndReset')}
                       </button>
                    </div>
                </div>
            )}
            {sidebarTab === 'history' && (
                 <div className="p-4 flex flex-col h-full">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">{t('chatHistory')}</h2>
                    <button onClick={() => handleNewChat()} className="w-full text-center py-2 px-3 bg-apple-blue text-white rounded-lg font-semibold mb-4 hover:bg-blue-600 transition-colors">{t('newChat')}</button>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {chatSessions.map(session => (
                            <div key={session.id} className={`p-2 rounded-lg cursor-pointer ${activeSessionId === session.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{session.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateForDisplay(session.date)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className={`flex-1 flex flex-col h-full transition-transform duration-300 ${showSidebar ? 'transform translate-x-64' : ''}`}>
            <header className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button onClick={() => { playClick(); setShowSidebar(!showSidebar); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200">Mann Mitra</h1>
                <div className="w-10 h-10" /> {/* Placeholder for alignment */}
            </header>

            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full flex items-center justify-center bg-ai-gradient text-white flex-shrink-0">💙</div>}
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-apple-blue text-white rounded-br-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-chat">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-ai-gradient text-white flex-shrink-0">💙</div>
                            <div className="p-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse delay-150"></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button onClick={() => onNavigate(Screen.Journal)} className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><span className="text-xs mt-1">{t('journal')}</span></button>
                <button onClick={() => onNavigate(Screen.Breathing)} className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg><span className="text-xs mt-1">{t('breathing')}</span></button>
                <button onClick={() => onNavigate(Screen.Resources)} className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg><span className="text-xs mt-1">{t('resources')}</span></button>
                <button onClick={() => onNavigate(Screen.Trends)} className="flex flex-col items-center p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg><span className="text-xs mt-1">{t('trends')}</span></button>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <button type="button" onClick={handleVoiceInput} className={`p-3 rounded-full transition-colors text-slate-600 dark:text-slate-400 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder={t('typeAMessage')} className="w-full p-3 bg-slate-100 dark:bg-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-apple-blue text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                    <button type="submit" disabled={!userInput.trim() || isLoading} className="p-3 bg-apple-blue text-white rounded-full disabled:bg-blue-300 dark:disabled:bg-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15.999a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5-.5z"/><path d="M11.354 5.354a.5.5 0 0 1 0-.708l-3-3a.5.5 0 0 1-.708 0l-3 3a.5.5 0 1 1-.708-.708l3-3a1.5 1.5 0 0 1 2.122 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V15.5a.5.5 0 0 1-1 0V2.707L4.646 5.354a.5.5 0 0 1-.708 0z"/></svg>
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
};

export default ChatScreen;
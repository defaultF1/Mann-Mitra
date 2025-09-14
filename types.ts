// FIX: Removed self-import of 'Screen' which was causing a declaration conflict.

export enum Screen {
  Onboarding,
  Welcome,
  Chat,
  Journal,
  Breathing,
  Resources,
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export interface UserProfile {
  name: string;
  gender: string;
  dob: string;
}

// A new interface to structure saved chat conversations
export interface ChatSession {
  id: number; // Unique ID, can be a timestamp
  title: string; // AI-generated summary
  date: string; // ISO string date
  messages: ChatMessage[];
}
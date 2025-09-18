// Core data types for the High Frequency Words Learning App

export type Child = "Everley" | "Presley";
export type Tier = 1 | 2;
export type ItemType = "word" | "sentence";
export type Mode = "words" | "sentences";
export type Box = 1 | 2 | 3 | 4 | 5;

// Database Item interface
export interface Item {
  id: string;
  text: string;
  type: ItemType;
  child: Child;
  tier: Tier;
  box: Box;
  seen: number;
  correct: number;
  incorrect: number;
  lastSeen: number;
}

// Database Attempt interface
export interface Attempt {
  ts: number;
  child: Child;
  tier: Tier;
  itemId: string;
  isSentence: boolean;
  correct: boolean;
}

// App selection state
export interface Selection {
  subject: string;
  child: Child;
  tier: Tier;
  mode: Mode;
}

// Session state
export interface Session {
  queue: string[];
  currentItemId: string | null;
  loading: boolean;
}

// Settings state
export interface Settings {
  autoSpeak: boolean;
  speechRate: number;
  voice?: SpeechSynthesisVoice;
}

// Main app state for Zustand store
export interface AppState {
  selection: Selection;
  session: Session;
  settings: Settings;
  unlockedTiers: Record<Child, Tier[]>;
}

// Actions for the store
export interface AppActions {
  setSelection: (selection: Partial<Selection>) => void;
  setSession: (session: Partial<Session>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  markAnswer: (itemId: string, correct: boolean) => Promise<void>;
  nextItem: () => Promise<void>;
  unlockTier: (child: Child, tier: Tier) => void;
}

// Combined store type
export type AppStore = AppState & AppActions;

// Seed data structure
export interface SeedData {
  [key: string]: {
    tier1: {
      words: string[];
      sentences: string[];
    };
    tier2: {
      words: string[];
      sentences: string[];
    };
  };
}

// Speech synthesis types
export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

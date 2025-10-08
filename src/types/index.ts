// Core data types for the High Frequency Words Learning App

export type Child = "Everley" | "Presley";
export type Tier = 1 | 2;
// Expanded item types: retain existing plus a generic 'math' marker for generated problems
export type ItemType = "word" | "sentence" | "math";
export type Mode = "words" | "sentences";
export type Box = 1 | 2 | 3 | 4 | 5;

// Subjects supported in the app
export type Subject = "english" | "math";

// English activities map to existing modes
export type EnglishActivity = "words" | "sentences";

// Math activities (initial set – can expand later)
export type MathActivity =
  | "addition-0-10"
  | "counting-by-2s"
  | "counting-by-5s"
  | "subtraction-up-to-10"
  | "tens-frame";

export type Activity = EnglishActivity | MathActivity;

// Database Item interface
export interface Item {
  id: string;
  text: string; // For english items the display text; for math seed placeholders; runtime math problems generated separately
  type: ItemType; // word | sentence | math
  child: Child;
  tier: Tier;
  box: Box;
  seen: number;
  correct: number;
  incorrect: number;
  lastSeen: number;
  // New fields (added in schema v2):
  subject?: Subject; // Defaults to 'english' for legacy seeded items
  activity?: Activity; // words | sentences | math-* activity keys
  // New fields (added in schema v3 - spaced repetition):
  nextReview?: number; // Timestamp when item is due for review
  interval?: number; // Days until next review
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
  subject: Subject; // english | math
  child: Child;
  tier: Tier;
  mode: Mode; // Only meaningful when subject==='english'
  activity: Activity; // Generic activity (mirrors mode for english)
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
  unlockedTiers: Record<Child, Record<Subject, Tier[]>>;
}

// Actions for the store
export interface AppActions {
  setSelection: (selection: Partial<Selection>) => void;
  setSession: (session: Partial<Session>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  markAnswer: (itemId: string, correct: boolean) => Promise<void>;
  markAnswerNoAdvance?: (itemId: string, correct: boolean) => Promise<void>;
  nextItem: () => Promise<void>;
  unlockTier: (child: Child, subject: Subject, tier: Tier) => void;
  setSubject?: (subject: Subject) => void;
  setActivity?: (activity: Activity, tier?: Tier) => void;
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

// Math problem representation (generated at runtime, not stored directly – items act as placeholders for scheduling)
export interface MathProblem {
  type: "addition" | "subtraction" | "counting" | "tens-frame";
  operand1?: number;
  operand2?: number;
  answer: number;
  display: string; // Rendered prompt
  choices: number[]; // Multiple choice answers
}

// UI Feedback (lightweight optional types for consistency across screens)
export type FeedbackStatus = "correct" | "incorrect" | null;
export interface FeedbackState {
  status: FeedbackStatus;
  message: string;
}

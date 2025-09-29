import { create } from "zustand";
import { Selection, Session, Settings, Subject, Activity } from "../types";
import { dbUtils } from "../database";

// Default values
const defaultSelection: Selection = {
  subject: "english",
  child: "Everley",
  tier: 1,
  mode: "words", // english mode
  activity: "words", // aligns with mode for english
};

const defaultSession: Session = {
  queue: [],
  currentItemId: null,
  loading: false,
};

const defaultSettings: Settings = {
  autoSpeak: true,
  speechRate: 0.8,
  voice: undefined,
};

const defaultUnlockedTiers: Record<string, Record<string, number[]>> = {
  Everley: {
    english: [1],
    math: [1],
  },
  Presley: {
    english: [1],
    math: [1],
  },
};

// Store interface
interface AppStoreState {
  selection: Selection;
  session: Session;
  settings: Settings;
  unlockedTiers: Record<string, number[]>;
}

// Create the Zustand store
export const useAppStore = create<AppStoreState>(() => ({
  // Initial state
  selection: defaultSelection,
  session: defaultSession,
  settings: defaultSettings,
  unlockedTiers: defaultUnlockedTiers,
}));

// Actions
export const useAppActions = () => {
  const set = useAppStore.setState;
  const get = useAppStore.getState;

  return {
    setSelection: (selection: Partial<Selection>) => {
      set((state) => ({
        selection: { ...state.selection, ...selection },
        session: { ...state.session, queue: [], currentItemId: null },
      }));
    },

    setSession: (session: Partial<Session>) => {
      set((state) => ({
        session: { ...state.session, ...session },
      }));
    },

    setSettings: (settings: Partial<Settings>) => {
      set((state) => ({
        settings: { ...state.settings, ...settings },
      }));
    },

    markAnswer: async (itemId: string, correct: boolean) => {
      const state = get();
      const { child, tier, mode } = state.selection;

      try {
        // Update item statistics in database
        await dbUtils.updateItemStats(itemId, correct);

        // Record the attempt
        await dbUtils.recordAttempt(
          child,
          tier,
          itemId,
          mode === "sentences",
          correct
        );

        // Move to next item
        await nextItem();

        // Check if tier should be unlocked after this success
        await checkTierUnlocks();
      } catch (error) {
        console.error("Failed to mark answer:", error);
        throw error;
      }
    },

    // Record an answer but do NOT automatically advance (used for math manual progression)
    markAnswerNoAdvance: async (itemId: string, correct: boolean) => {
      const state = get();
      const { child, tier, mode } = state.selection;
      try {
        await dbUtils.updateItemStats(itemId, correct);
        await dbUtils.recordAttempt(
          child,
          tier,
            itemId,
            mode === "sentences",
            correct
        );
        // Tier unlock check still applies on correct
        if (correct) await checkTierUnlocks();
      } catch (error) {
        console.error("Failed to mark answer (no advance):", error);
        throw error;
      }
    },

    nextItem: async () => {
      // Get fresh state to ensure we have the latest selection
      const currentState = get();
      const { child, tier, mode, subject, activity } = currentState.selection;
      const { queue } = currentState.session;

      console.log("nextItem called with selection:", { child, tier, mode });

      try {
        set((state) => ({
          session: { ...state.session, loading: true },
        }));

        let nextItemId: string | null = null;
        let newQueue = [...queue];

        if (newQueue.length > 0) {
          // Get next item from queue
          nextItemId = newQueue.shift() || null;
          console.log("Using queued item:", nextItemId);
          console.log("🚨 QUEUE MODE - skipping database query");
        } else {
          // Queue is empty, get new items due for review
          let itemType: string;
          let queryTier = tier;
          if (subject === "english") {
            itemType = mode === "words" ? "word" : "sentence";
          } else {
            itemType = "math"; // math placeholder items
            queryTier = 1; // Math items are only available in tier 1
          }
          console.log(`🔍 Loading ${itemType} items for ${child}, tier ${queryTier}, subject: ${subject}, activity: ${activity}`);

          const dueItems = await dbUtils.getDueItems(
            child,
            queryTier,
            itemType,
            10,
            subject,
            activity
          );

          console.log(
            `✅ Found ${dueItems.length} ${itemType} items:`,
            dueItems.slice(0, 3).map((item: any) => ({
              id: item.id,
              type: item.type,
              text: item.text,
            }))
          );

          if (dueItems.length > 0) {
            nextItemId = dueItems[0].id;
            // Update queue with remaining items
            newQueue = dueItems.slice(1).map((item) => item.id);
          } else {
            console.warn(
              `No ${itemType} items found for ${child}, tier ${queryTier}, subject: ${subject}, activity: ${activity}`
            );

            // Special handling for math: try to reseed if no items found
            if (subject === "math") {
              console.log("🔄 No math items found, attempting to reseed...");
              try {
                const { seedMathItems } = await import("../database");
                await seedMathItems();
                console.log("✅ Math items reseeded, retrying query...");

                // Retry the query after reseeding
                const retryItems = await dbUtils.getDueItems(
                  child,
                  queryTier,
                  itemType,
                  10,
                  subject,
                  activity
                );

                if (retryItems.length > 0) {
                  nextItemId = retryItems[0].id;
                  newQueue = retryItems.slice(1).map((item) => item.id);
                  console.log("✅ Found math items after reseed:", retryItems.length);
                } else {
                  console.error("❌ Still no math items found after reseed");
                }
              } catch (reseedError) {
                console.error("Failed to reseed math items:", reseedError);
              }
            }
          }
        }

        // Update session with next item
        set((state) => ({
          session: {
            ...state.session,
            queue: newQueue,
            currentItemId: nextItemId,
            loading: false,
          },
        }));

        console.log("Set currentItemId to:", nextItemId);
      } catch (error) {
        console.error("Failed to get next item:", error);
        set((state) => ({
          session: { ...state.session, loading: false },
        }));
        throw error;
      }
    },

    unlockTier: (child: string, subject: Subject, tier: number) => {
      set((state) => {
        const currentChildTiers = state.unlockedTiers[child] || { english: [1], math: [1] };
        const currentSubjectTiers = currentChildTiers[subject] || [1];

        return {
          unlockedTiers: {
            ...state.unlockedTiers,
            [child]: {
              ...currentChildTiers,
              [subject]: [...currentSubjectTiers, tier].filter((t, i, arr) => arr.indexOf(t) === i).sort(),
            },
          },
        };
      });
    },

    setSubject: (subject: Subject) => {
      set((state) => ({
        selection: {
          ...state.selection,
          subject,
          // reset activity & mode when switching subjects
          mode: subject === "english" ? state.selection.mode : "words",
          activity: subject === "english" ? state.selection.mode : "addition-0-10",
          tier: 1,
        },
        session: { ...state.session, queue: [], currentItemId: null },
      }));
    },

    setActivity: (activity: Activity, tier?: number) => {
      set((state) => {
        const nextTier = (tier ?? state.selection.tier) as 1 | 2;
        const nextMode =
          state.selection.subject === "english" &&
          (activity === "words" || activity === "sentences")
            ? (activity as "words" | "sentences")
            : state.selection.mode;
        return {
          selection: {
            ...state.selection,
            activity,
            mode: nextMode,
            tier: nextTier,
          },
          session: { ...state.session, queue: [], currentItemId: null },
        };
      });
    },
  };
};

// Selectors for commonly used state slices
export const useSelection = () => useAppStore((state) => state.selection);

export const useSession = () => useAppStore((state) => state.session);

export const useSettings = () => useAppStore((state) => state.settings);

export const useUnlockedTiers = () =>
  useAppStore((state) => state.unlockedTiers);

// Initialize the store and database
export const initializeApp = async () => {
  try {
    // Initialize database
    await dbUtils.initialize();

    // Check for tier unlocks based on progress
    await checkTierUnlocks();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    throw error;
  }
};

// Helper function to add missing math items without clearing existing data
export const addMissingMathItems = async () => {
  try {
    console.log("🔄 Adding missing math items...");
    // This will only add items that don't already exist
    const { seedMathItems } = await import("../database");
    await seedMathItems();
    console.log("✅ Missing math items added successfully!");
  } catch (error) {
    console.error("Failed to add missing math items:", error);
    throw error;
  }
};

// Helper function to force reseed database (DANGER: deletes all data!)
export const forceReseedDatabase = async () => {
  try {
    console.log("🚨 WARNING: Clearing ALL data and reseeding database...");
    await dbUtils.clearAll();
    await dbUtils.initialize();
    console.log("✅ Database reseeded successfully!");
  } catch (error) {
    console.error("Failed to reseed database:", error);
    throw error;
  }
};

// Check if tiers should be unlocked based on mastery criteria
const checkTierUnlocks = async () => {
  const store = useAppStore.getState();
  const actions = useAppActions();

  for (const child of ["Everley", "Presley"] as const) {
    for (const subject of ["english", "math"] as const) {
      // Check Tier 1 mastery for Tier 2 unlock per subject
      if (!store.unlockedTiers[child]?.[subject]?.includes(2)) {
        const tier1Stats = await dbUtils.getStats(child, 1, subject);

        // Require "fully successful" - high accuracy AND substantial practice
        // This ensures the child has truly mastered tier 1 before advancing
        if (tier1Stats.accuracy >= 0.95 && tier1Stats.totalAttempts >= 75) {
          console.log(`🎉 ${child} has mastered ${subject} Tier 1! Unlocking ${subject} Tier 2.`);
          actions.unlockTier(child, subject, 2);
        }
      }
    }
  }
};

// Helper function for nextItem (used internally)
const nextItem = async () => {
  const actions = useAppActions();
  await actions.nextItem();
};

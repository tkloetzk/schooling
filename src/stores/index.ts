import { create } from "zustand";
import { Selection, Session, Settings } from "../types";
import { dbUtils } from "../database";

// Default values
const defaultSelection: Selection = {
  subject: "High Frequency Words",
  child: "Everley",
  tier: 1,
  mode: "words",
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

const defaultUnlockedTiers: Record<string, number[]> = {
  Everley: [1], // Start with only tier 1 unlocked for proper tier gating
  Presley: [1], // Start with only tier 1 unlocked for proper tier gating
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
        session: { ...state.session, queue: [], currentItemId: null }, // Clear session when selection changes
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

    nextItem: async () => {
      // Get fresh state to ensure we have the latest selection
      const currentState = get();
      const { child, tier, mode } = currentState.selection;
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
          const itemType = mode === "words" ? "word" : "sentence";
          console.log(
            `🔍 Loading ${itemType} items for ${child}, tier ${tier}`
          );
          console.log("🔍 MODE = ", mode, " ITEMTYPE = ", itemType);

          const dueItems = await dbUtils.getDueItems(
            child,
            tier,
            itemType,
            10 // Get 10 items at a time
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
              `No ${itemType} items found for ${child}, tier ${tier}`
            );
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

    unlockTier: (child: string, tier: number) => {
      set((state) => ({
        unlockedTiers: {
          ...state.unlockedTiers,
          [child]: [...(state.unlockedTiers[child] || []), tier].sort(),
        },
      }));
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

// Check if tiers should be unlocked based on mastery criteria
const checkTierUnlocks = async () => {
  const store = useAppStore.getState();
  const actions = useAppActions();

  for (const child of ["Everley", "Presley"] as const) {
    // Check Tier 1 mastery for Tier 2 unlock
    if (!store.unlockedTiers[child]?.includes(2)) {
      const tier1Stats = await dbUtils.getStats(child, 1);

      // Require "fully successful" - high accuracy AND substantial practice
      // This ensures the child has truly mastered tier 1 before advancing
      if (tier1Stats.accuracy >= 0.95 && tier1Stats.totalAttempts >= 75) {
        console.log(`🎉 ${child} has mastered Tier 1! Unlocking Tier 2.`);
        actions.unlockTier(child, 2);
      }
    }
  }
};

// Helper function for nextItem (used internally)
const nextItem = async () => {
  const actions = useAppActions();
  await actions.nextItem();
};

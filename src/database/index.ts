import Dexie, { Table } from "dexie";
import { Item, Attempt, SeedData, Subject, Activity, Child, Tier } from "../types";
import { seedData } from "../utils/seedData";

// Spaced repetition constants
// Maps box level to interval in days: [1→1, 2→3, 3→7, 4→14, 5→30]
export const BOX_TO_INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30
};

// Database class extending Dexie
export class AppDatabase extends Dexie {
  items!: Table<Item>;
  attempts!: Table<Attempt>;

  constructor() {
    super("HighFrequencyWordsDB");

    // v1: original schema (using string IDs, not auto-increment)
    this.version(1).stores({
      items:
        "id, text, type, child, tier, box, seen, correct, incorrect, lastSeen, [child+tier], [child+tier+type], [child+tier+box], [child+lastSeen]",
      attempts:
        "++ts, child, tier, itemId, isSentence, correct, [child+tier], [child+tier+correct], [child+ts]",
    });

    // v2: add subject + activity (non-breaking optional fields) & compound indexes including subject/activity for future queries
    this.version(2)
      .stores({
        items:
          "id, text, type, subject, activity, child, tier, box, seen, correct, incorrect, lastSeen, [child+tier], [child+tier+type], [child+tier+box], [child+lastSeen], [child+subject+activity], [child+subject+activity+tier]",
        attempts:
          "++ts, child, tier, itemId, isSentence, correct, [child+tier], [child+tier+correct], [child+ts]",
      })
      .upgrade(async (tx) => {
        const table = tx.table<Item>("items");
        const all = await table.toArray();
        for (const item of all) {
          // Backfill legacy english items
            if (!item.subject) {
              (item as any).subject = "english" as Subject;
            }
            if (!item.activity) {
              (item as any).activity = item.type === "word" ? "words" : item.type === "sentence" ? "sentences" : undefined;
            }
        }
        await table.bulkPut(all);
      });

    // v3: add spaced repetition fields (nextReview, interval) via upgrade function
    // No schema changes needed - fields are stored but not indexed
    this.version(3)
      .stores({
        items:
          "id, text, type, subject, activity, child, tier, box, seen, correct, incorrect, lastSeen, [child+tier], [child+tier+type], [child+tier+box], [child+lastSeen], [child+subject+activity], [child+subject+activity+tier]",
        attempts:
          "++ts, child, tier, itemId, isSentence, correct, [child+tier], [child+tier+correct], [child+ts]",
      })
      .upgrade(async (tx) => {
        const table = tx.table<Item>("items");
        const all = await table.toArray();

        // Backfill spaced repetition fields
        for (const item of all) {
          if (item.nextReview === undefined || item.interval === undefined) {
            const intervalDays = BOX_TO_INTERVAL_DAYS[item.box] || 1;

            if (item.seen === 0) {
              // Never seen before - due now
              (item as any).nextReview = 0;
              (item as any).interval = 1;
            } else {
              // Calculate nextReview based on lastSeen + interval
              const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
              (item as any).nextReview = item.lastSeen + intervalMs;
              (item as any).interval = intervalDays;
            }
          }
        }
        await table.bulkPut(all);
      });
  }
}

// Create and export database instance
export const db = new AppDatabase();

// Database utility functions
export const dbUtils = {
  // Initialize database with seed data if empty
  async initialize(): Promise<void> {
    try {
      const itemCount = await db.items.count();
      if (itemCount === 0) {
        console.log("Database is empty, seeding with initial data...");
        await seedDatabase();
        await seedMathItems();
        console.log("✅ Database seeded successfully!");
      } else {
        console.log(`Database already has ${itemCount} items - skipping seed`);
      }
    } catch (error: any) {
      console.error("Failed to initialize database:", error);
      console.error("⚠️ Database error detected. Your data is preserved.");
      console.error("💡 Use the backup/restore functions to save your progress.");
      throw error;
    }
  },

  // Clear all data (useful for testing or reset)
  async clearAll(): Promise<void> {
    await db.items.clear();
    await db.attempts.clear();
  },

  // Get item by ID
  async getItemById(id: string): Promise<Item | undefined> {
    return await db.items.get(id);
  },

  // Get items for a specific child/tier combination
  async getItemsForSession(
    child: string,
    tier: number,
    type: string,
    subject?: Subject,
    activity?: Activity
  ): Promise<Item[]> {
    // Prefer subject/activity query if provided
    if (subject && activity) {
      return await db.items
        .where("[child+subject+activity+tier]")
        .equals([child, subject, activity, tier])
        .toArray();
    }
    return await db.items
      .where("[child+tier+type]")
      .equals([child, tier, type])
      .toArray();
  },

  // Get items by box level for tooltips
  async getItemsByBox(
    child: string,
    tier: number,
    box: number,
    subject?: string
  ): Promise<Item[]> {
    let items = await db.items
      .where("[child+tier+box]")
      .equals([child, tier, box])
      .toArray();

    // Filter by subject if specified
    if (subject) {
      items = items.filter(item => item.subject === subject);
    }

    return items;
  },

  // Get total item count
  async getItemCounts(): Promise<{ total: number }> {
    const total = await db.items.count();
    return { total };
  },

  // Create a single item (idempotent - won't create duplicates)
  async createItem(item: Item): Promise<void> {
    await db.items.put(item);
  },

  // Get items due for review using spaced repetition algorithm
  // Includes cross-tier items (tier 1 non-mastered items when in tier 2)
  // If no items are due, returns items anyway (sorted by nextReview) to allow on-demand practice
  async getDueItems(
    child: string,
    tier: number,
    type: string,
    limit = 50,
    subject?: Subject,
    activity?: Activity
  ): Promise<Item[]> {
    const now = Date.now();
    let allItems: Item[] = [];

    // Get items for current tier
    let currentTierItems: Item[];
    if (subject && activity) {
      currentTierItems = await db.items
        .where("[child+subject+activity+tier]")
        .equals([child, subject, activity, tier])
        .toArray();
    } else {
      currentTierItems = await db.items
        .where("[child+tier+type]")
        .equals([child, tier, type])
        .toArray();
    }

    // Filter to items that are due (nextReview <= now or nextReview is null/undefined)
    const dueCurrentTierItems = currentTierItems.filter(item =>
      !item.nextReview || item.nextReview <= now
    );

    allItems.push(...dueCurrentTierItems);

    // If tier 2, also include tier 1 non-mastered items (box < 5) for the same subject/activity
    if (tier === 2 && subject && activity) {
      const tier1Items = await db.items
        .where("[child+subject+activity+tier]")
        .equals([child, subject, activity, 1])
        .toArray();

      // Filter to non-mastered items that are due
      const dueTier1Items = tier1Items.filter(item =>
        item.box < 5 && (!item.nextReview || item.nextReview <= now)
      );

      allItems.push(...dueTier1Items);
    }

    // Deduplicate by id (in case of any edge cases)
    let uniqueItems = Array.from(
      new Map(allItems.map(item => [item.id, item])).values()
    );

    // If no due items found, fallback to all items (sorted by nextReview)
    // This allows on-demand practice even when nothing is due
    if (uniqueItems.length === 0) {
      uniqueItems = currentTierItems;

      // For tier 2, also include tier 1 non-mastered items
      if (tier === 2 && subject && activity) {
        const tier1Items = await db.items
          .where("[child+subject+activity+tier]")
          .equals([child, subject, activity, 1])
          .toArray();

        uniqueItems = [...uniqueItems, ...tier1Items.filter(item => item.box < 5)];
      }

      // Deduplicate again
      uniqueItems = Array.from(
        new Map(uniqueItems.map(item => [item.id, item])).values()
      );
    }

    // Sort by nextReview (earliest first, treat null/undefined as 0)
    return uniqueItems
      .sort((a, b) => {
        const aReview = a.nextReview || 0;
        const bReview = b.nextReview || 0;
        return aReview - bReview;
      })
      .slice(0, limit);
  },

  // Update item statistics after an attempt with spaced repetition
  async updateItemStats(itemId: string, correct: boolean): Promise<void> {
    const item = await db.items.get(itemId);
    if (!item) return;

    const now = Date.now();
    const updates: Partial<Item> = {
      seen: item.seen + 1,
      lastSeen: now,
    };

    if (correct) {
      updates.correct = item.correct + 1;
      // Promote box (max 5)
      const newBox = Math.min(item.box + 1, 5);
      updates.box = newBox as any;

      // Calculate interval based on new box level
      const intervalDays = BOX_TO_INTERVAL_DAYS[newBox] || 1;
      updates.interval = intervalDays;

      // Calculate nextReview timestamp
      const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
      updates.nextReview = now + intervalMs;
    } else {
      updates.incorrect = item.incorrect + 1;
      // Demote to box 1
      updates.box = 1;
      updates.interval = 1;

      // Schedule for review in 1 day
      const intervalMs = 1 * 24 * 60 * 60 * 1000;
      updates.nextReview = now + intervalMs;
    }

    await db.items.update(itemId, updates);
  },

  // Record an attempt
  async recordAttempt(
    child: string,
    tier: number,
    itemId: string,
    isSentence: boolean,
    correct: boolean
  ): Promise<void> {
    await db.attempts.add({
      ts: Date.now(),
      child: child as any,
      tier: tier as any,
      itemId,
      isSentence,
      correct,
    });
  },

  // Check if a tier is unlocked for a child and subject
  async isTierUnlocked(child: string, tier: number, subject?: string): Promise<boolean> {
    // Tier 1 is always unlocked
    if (tier === 1) return true;

    // For tier 2, check if tier 1 is mastered for the specific subject (80% accuracy threshold)
    if (tier === 2) {
      const tier1Stats = await this.getStatsInternal(child, 1, subject);
      return tier1Stats.accuracy >= 0.80 && tier1Stats.totalAttempts >= 75;
    }

    return false;
  },

  // Internal stats function without tier validation (for tier unlock checking)
  async getStatsInternal(child: string, tier: number, subject?: string, excludeUnattended: boolean = false) {
    const attempts = await db.attempts
      .where("[child+tier]")
      .equals([child, tier])
      .toArray();

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter((a: Attempt) => a.correct).length;
    const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

    let items = await db.items
      .where("[child+tier]")
      .equals([child, tier])
      .toArray();

    // Filter by subject if specified
    if (subject) {
      items = items.filter(item => item.subject === subject);
    }

    // Filter out unattended items if requested
    if (excludeUnattended) {
      items = items.filter(item => item.seen > 0);
    }

    // Return box distribution in UI display order: [box5, box4, box3, box2, box1]
    // This matches the UI which displays [Mastered, Advanced, Progressing, Developing, Beginning]
    const boxDistribution = [5, 4, 3, 2, 1].map(
      (box) => items.filter((item: Item) => item.box === box).length
    );

    return {
      totalAttempts,
      correctAttempts,
      accuracy,
      boxDistribution,
      totalItems: items.length,
      attendedItems: items.filter(item => item.seen > 0).length,
      unattendedItems: items.filter(item => item.seen === 0).length,
    };
  },

  // Get statistics for a child/tier/subject (respects tier unlocking)
  async getStats(child: string, tier: number, subject?: string, excludeUnattended: boolean = false) {
    // Check if tier is unlocked (pass subject for subject-specific checking)
    const isUnlocked = await this.isTierUnlocked(child, tier, subject);

    if (!isUnlocked) {
      // Return empty stats for locked tiers
      return {
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
        boxDistribution: [0, 0, 0, 0, 0],
        totalItems: 0,
        attendedItems: 0,
        unattendedItems: 0,
        tierLocked: true,
      };
    }

    const stats = await this.getStatsInternal(child, tier, subject, excludeUnattended);
    return {
      ...stats,
      tierLocked: false,
    };
  },

  // Clean up duplicate items in database
  async cleanupDuplicates(): Promise<{ duplicatesFound: number; duplicatesRemoved: number }> {
    const allItems = await db.items.toArray();

    // Group items by their unique text+child+tier+type combination
    const itemGroups = new Map<string, Item[]>();

    for (const item of allItems) {
      const key = `${item.text}-${item.child}-${item.tier}-${item.type}`;
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    }

    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    const itemsToRemove: string[] = [];

    // Find duplicates and keep the one with the most progress
    for (const [key, items] of itemGroups) {
      if (items.length > 1) {
        duplicatesFound += items.length - 1;

        // Sort by progress (box level, then seen count)
        items.sort((a, b) => {
          if (a.box !== b.box) return b.box - a.box; // Higher box first
          if (a.seen !== b.seen) return b.seen - a.seen; // More seen first
          return b.correct - a.correct; // More correct first
        });

        // Keep the first (most progressed), remove the rest
        for (let i = 1; i < items.length; i++) {
          itemsToRemove.push(items[i].id);
        }
      }
    }

    // Remove duplicates
    if (itemsToRemove.length > 0) {
      await db.items.bulkDelete(itemsToRemove);
      duplicatesRemoved = itemsToRemove.length;
    }

    console.log(`🧹 Cleanup complete: Found ${duplicatesFound} duplicates, removed ${duplicatesRemoved}`);

    return { duplicatesFound, duplicatesRemoved };
  },

  // Investigate database contents for a specific child/tier
  async investigateDatabase(child?: string, tier?: number): Promise<{
    totalItems: number;
    breakdown: Record<string, any>;
    duplicates: Array<{ text: string; count: number; ids: string[] }>;
    samples: Item[];
  }> {
    const allItems = await db.items.toArray();

    // Filter by child/tier if specified
    const filteredItems = allItems.filter(item =>
      (!child || item.child === child) &&
      (!tier || item.tier === tier)
    );

    console.log(`🔍 Database Investigation for ${child || 'ALL'} Tier ${tier || 'ALL'}:`);
    console.log(`📊 Total items found: ${filteredItems.length}`);

    // Breakdown by various categories
    const breakdown = {
      byChild: filteredItems.reduce((acc, item) => {
        acc[item.child] = (acc[item.child] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      byTier: filteredItems.reduce((acc, item) => {
        acc[item.tier] = (acc[item.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      byType: filteredItems.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      bySubject: filteredItems.reduce((acc, item) => {
        acc[item.subject || 'undefined'] = (acc[item.subject || 'undefined'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),

      byActivity: filteredItems.reduce((acc, item) => {
        acc[item.activity || 'undefined'] = (acc[item.activity || 'undefined'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Find duplicates by text content
    const textGroups = new Map<string, Item[]>();
    for (const item of filteredItems) {
      const key = item.text.toLowerCase().trim();
      if (!textGroups.has(key)) {
        textGroups.set(key, []);
      }
      textGroups.get(key)!.push(item);
    }

    const duplicates = Array.from(textGroups.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([text, items]) => ({
        text,
        count: items.length,
        ids: items.map(item => item.id)
      }))
      .sort((a, b) => b.count - a.count);

    console.log(`📈 Breakdown:`, breakdown);
    console.log(`🔄 Duplicates found: ${duplicates.length} different texts with multiple entries`);

    if (duplicates.length > 0) {
      console.log(`📋 Top duplicates:`, duplicates.slice(0, 10));
    }

    return {
      totalItems: filteredItems.length,
      breakdown,
      duplicates,
      samples: filteredItems.slice(0, 10)
    };
  },

  // Debug function to check what math items exist
  async debugMathItems(): Promise<void> {
    const allItems = await db.items.toArray();
    const mathItems = allItems.filter(item => item.subject === "math");

    console.log(`🔍 Total items in database: ${allItems.length}`);
    console.log(`🔢 Math items found: ${mathItems.length}`);

    if (mathItems.length > 0) {
      console.log(`📊 Math items breakdown:`, mathItems.slice(0, 5).map(item => ({
        id: item.id,
        child: item.child,
        tier: item.tier,
        subject: item.subject,
        activity: item.activity,
        type: item.type
      })));

      // Check distribution by child and activity
      const byChild = mathItems.reduce((acc, item) => {
        acc[item.child] = (acc[item.child] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byActivity = mathItems.reduce((acc, item) => {
        acc[item.activity || 'undefined'] = (acc[item.activity || 'undefined'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`👥 Math items by child:`, byChild);
      console.log(`🎯 Math items by activity:`, byActivity);
    }
  },

  // Export all data as JSON
  async exportData(): Promise<string> {
    const items = await db.items.toArray();
    const attempts = await db.attempts.toArray();

    return JSON.stringify(
      {
        items,
        attempts,
        exportDate: new Date().toISOString(),
        version: "1.0",
      },
      null,
      2
    );
  },

  // Import data from JSON
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      if (data.items && Array.isArray(data.items)) {
        await db.items.bulkPut(data.items);
      }

      if (data.attempts && Array.isArray(data.attempts)) {
        await db.attempts.bulkPut(data.attempts);
      }

      console.log("✅ Data imported successfully!");
    } catch (error) {
      console.error("Failed to import data:", error);
      throw new Error("Invalid data format");
    }
  },

  // Download backup as a file
  async downloadBackup(): Promise<void> {
    try {
      const jsonData = await this.exportData();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schooling-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("✅ Backup downloaded successfully!");
    } catch (error) {
      console.error("Failed to download backup:", error);
      throw error;
    }
  },

  // Restore from uploaded file
  async restoreFromFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      await this.importData(text);
      console.log("✅ Data restored successfully!");
    } catch (error) {
      console.error("Failed to restore from file:", error);
      throw error;
    }
  },

  // Auto-backup to localStorage (limited but survives cache clears better)
  async autoBackupToStorage(): Promise<void> {
    try {
      const jsonData = await this.exportData();
      const timestamp = Date.now();

      // Keep last 3 backups
      const backups = [];
      for (let i = 0; i < 3; i++) {
        const key = `schooling-backup-${i}`;
        const existing = localStorage.getItem(key);
        if (existing) {
          backups.push({ key, data: existing, timestamp: JSON.parse(existing).exportDate });
        }
      }

      // Add new backup and remove oldest if needed
      localStorage.setItem('schooling-backup-0', jsonData);
      if (backups.length >= 3) {
        localStorage.removeItem('schooling-backup-2');
      }

      console.log("✅ Auto-backup saved to localStorage");
    } catch (error) {
      console.error("Failed to auto-backup:", error);
      // Don't throw - auto-backup failures shouldn't break the app
    }
  },

  // Restore from localStorage backup
  async restoreFromStorage(index: number = 0): Promise<void> {
    try {
      const key = `schooling-backup-${index}`;
      const jsonData = localStorage.getItem(key);

      if (!jsonData) {
        throw new Error("No backup found in storage");
      }

      await this.importData(jsonData);
      console.log("✅ Data restored from localStorage!");
    } catch (error) {
      console.error("Failed to restore from storage:", error);
      throw error;
    }
  },
};

// Seed data seeding function
async function seedDatabase(): Promise<void> {
  const items: Item[] = [];

  for (const [childName, childData] of Object.entries(seedData as SeedData)) {
    for (const [tierName, tierData] of Object.entries(childData)) {
      const tier = tierName === "tier1" ? 1 : 2;

      // Add words
      for (const word of tierData.words) {
        const itemId = `${childName}-${tier}-word-${word.replace(/\s+/g, "-")}`;

        // Check if item already exists
        const existing = await db.items.get(itemId);
        if (existing) {
          continue; // Skip if already exists
        }

        items.push({
          id: itemId,
          text: word,
          type: "word",
          child: childName as Child,
          tier: tier as Tier,
          box: 1,
          seen: 0,
          correct: 0,
          incorrect: 0,
          lastSeen: 0,
          subject: "english",
          activity: "words",
          nextReview: 0,
          interval: 1,
        });
      }

      // Add sentences
      for (const sentence of tierData.sentences) {
        const itemId = `${childName}-${tier}-sentence-${sentence
          .replace(/\s+/g, "-")
          .substring(0, 20)}`;

        // Check if item already exists
        const existing = await db.items.get(itemId);
        if (existing) {
          continue; // Skip if already exists
        }

        items.push({
          id: itemId,
          text: sentence,
          type: "sentence",
          child: childName as Child,
          tier: tier as Tier,
          box: 1,
          seen: 0,
          correct: 0,
          incorrect: 0,
          lastSeen: 0,
          subject: "english",
          activity: "sentences",
          nextReview: 0,
          interval: 1,
        });
      }
    }
  }

  if (items.length > 0) {
    await db.items.bulkPut(items);
    console.log(`Seeded database with ${items.length} new items`);
  } else {
    console.log("No new items to seed - all items already exist");
  }
}

// Seed initial math placeholder items (used only for scheduling; problem content generated dynamically)
export async function seedMathItems(): Promise<void> {
  const mathItems: Item[] = [];

  const pushItem = async (child: Child, tier: Tier, activity: Activity, index: number, label: string) => {
    const id = `${child}-${tier}-math-${activity}-${index}`;

    // Check if item already exists
    const existing = await db.items.get(id);
    if (existing) {
      return; // Skip if already exists
    }

    mathItems.push({
      id,
      text: label, // not displayed directly for generated problems
      type: "math",
      child,
      tier,
      box: 1,
      seen: 0,
      correct: 0,
      incorrect: 0,
      lastSeen: 0,
      subject: "math",
      activity,
      nextReview: 0,
      interval: 1,
    });
  };

  // Addition 0-10 problems (roughly 36 unique pairs) for both children
  for (let i = 0; i < 36; i++) {
    await pushItem("Everley", 1, "addition-0-10", i, `addition-${i}`);
    await pushItem("Presley", 1, "addition-0-10", i, `addition-${i}`);
  }

  // Counting by 2s & 5s for both children (tier 1)
  for (let i = 0; i < 20; i++) {
    await pushItem("Everley", 1, "counting-by-2s", i, `count2s-${i}`);
    await pushItem("Presley", 1, "counting-by-2s", i, `count2s-${i}`);
    await pushItem("Everley", 1, "counting-by-5s", i, `count5s-${i}`);
    await pushItem("Presley", 1, "counting-by-5s", i, `count5s-${i}`);
  }

  // Subtraction up to 10 for both children (tier 1)
  for (let i = 0; i < 30; i++) {
    await pushItem("Everley", 1, "subtraction-up-to-10", i, `sub-${i}`);
    await pushItem("Presley", 1, "subtraction-up-to-10", i, `sub-${i}`);
  }

  // Tens frame for both children (tier 1)
  for (let i = 0; i < 10; i++) {
    await pushItem("Everley", 1, "tens-frame", i, `tens-${i}`);
    await pushItem("Presley", 1, "tens-frame", i, `tens-${i}`);
  }

  if (mathItems.length) {
    await db.items.bulkAdd(mathItems);
    console.log(`Seeded math items: ${mathItems.length}`);
  }
}

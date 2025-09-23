import Dexie, { Table } from "dexie";
import { Item, Attempt, SeedData, Subject, Activity, Child, Tier } from "../types";
import { seedData } from "../utils/seedData";

// Database class extending Dexie
export class AppDatabase extends Dexie {
  items!: Table<Item>;
  attempts!: Table<Attempt>;

  constructor() {
    super("HighFrequencyWordsDB");

    // v1: original schema
    this.version(1).stores({
      items:
        "++id, text, type, child, tier, box, seen, correct, incorrect, lastSeen, [child+tier], [child+tier+type], [child+tier+box], [child+lastSeen]",
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
    } catch (error) {
      console.error("Failed to initialize database:", error);
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

  // Get items due for review (lowest box first, then oldest lastSeen)
  async getDueItems(
    child: string,
    tier: number,
    type: string,
    limit = 50,
    subject?: Subject,
    activity?: Activity
  ): Promise<Item[]> {
    let items: Item[];
    if (subject && activity) {
      items = await db.items
        .where("[child+subject+activity+tier]")
        .equals([child, subject, activity, tier])
        .toArray();
    } else {
      items = await db.items
        .where("[child+tier+type]")
        .equals([child, tier, type])
        .toArray();
    }

    return items
      .sort((a, b) => a.box - b.box || a.lastSeen - b.lastSeen)
      .slice(0, limit);
  },

  // Update item statistics after an attempt
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
      updates.box = Math.min(item.box + 1, 5) as any;
    } else {
      updates.incorrect = item.incorrect + 1;
      // Demote to box 1
      updates.box = 1;
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

  // Check if a tier is unlocked for a child
  async isTierUnlocked(child: string, tier: number): Promise<boolean> {
    // Tier 1 is always unlocked
    if (tier === 1) return true;

    // For tier 2, check if tier 1 is mastered
    if (tier === 2) {
      const tier1Stats = await this.getStatsInternal(child, 1);
      return tier1Stats.accuracy >= 0.95 && tier1Stats.totalAttempts >= 75;
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
    // Check if tier is unlocked
    const isUnlocked = await this.isTierUnlocked(child, tier);

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
        await db.items.bulkAdd(data.items);
      }

      if (data.attempts && Array.isArray(data.attempts)) {
        await db.attempts.bulkAdd(data.attempts);
      }
    } catch (error) {
      console.error("Failed to import data:", error);
      throw new Error("Invalid data format");
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

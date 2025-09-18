import Dexie, { Table } from "dexie";
import { Item, Attempt, SeedData } from "../types";
import { seedData } from "../utils/seedData";

// Database class extending Dexie
export class AppDatabase extends Dexie {
  items!: Table<Item>;
  attempts!: Table<Attempt>;

  constructor() {
    super("HighFrequencyWordsDB");

    // Define schema
    this.version(1).stores({
      items:
        "++id, text, type, child, tier, box, seen, correct, incorrect, lastSeen, [child+tier], [child+tier+type], [child+tier+box], [child+lastSeen]",
      attempts:
        "++ts, child, tier, itemId, isSentence, correct, [child+tier], [child+tier+correct], [child+ts]",
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
    type: string
  ): Promise<Item[]> {
    return await db.items
      .where("[child+tier+type]")
      .equals([child, tier, type])
      .toArray();
  },

  // Get items by box level for tooltips
  async getItemsByBox(
    child: string,
    tier: number,
    box: number
  ): Promise<Item[]> {
    return await db.items
      .where("[child+tier+box]")
      .equals([child, tier, box])
      .toArray();
  },

  // Get total item count
  async getItemCounts(): Promise<{ total: number }> {
    const total = await db.items.count();
    return { total };
  },

  // Create a single item
  async createItem(item: Item): Promise<void> {
    await db.items.add(item);
  },

  // Get items due for review (lowest box first, then oldest lastSeen)
  async getDueItems(
    child: string,
    tier: number,
    type: string,
    limit = 50
  ): Promise<Item[]> {
    return await db.items
      .where("[child+tier+type]")
      .equals([child, tier, type])
      .sortBy("box")
      .then((items: Item[]) =>
        items.sort((a: Item, b: Item) => a.lastSeen - b.lastSeen)
      )
      .then((items) => items.slice(0, limit));
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

  // Get statistics for a child/tier
  async getStats(child: string, tier: number) {
    const attempts = await db.attempts
      .where("[child+tier]")
      .equals([child, tier])
      .toArray();

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter((a: Attempt) => a.correct).length;
    const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

    const items = await db.items
      .where("[child+tier]")
      .equals([child, tier])
      .toArray();

    const boxDistribution = [1, 2, 3, 4, 5].map(
      (box) => items.filter((item: Item) => item.box === box).length
    );

    return {
      totalAttempts,
      correctAttempts,
      accuracy,
      boxDistribution,
      totalItems: items.length,
    };
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
        items.push({
          id: `${childName}-${tier}-word-${word.replace(/\s+/g, "-")}`,
          text: word,
          type: "word",
          child: childName as any,
          tier: tier as any,
          box: 1,
          seen: 0,
          correct: 0,
          incorrect: 0,
          lastSeen: 0,
        });
      }

      // Add sentences
      for (const sentence of tierData.sentences) {
        items.push({
          id: `${childName}-${tier}-sentence-${sentence
            .replace(/\s+/g, "-")
            .substring(0, 20)}`,
          text: sentence,
          type: "sentence",
          child: childName as any,
          tier: tier as any,
          box: 1,
          seen: 0,
          correct: 0,
          incorrect: 0,
          lastSeen: 0,
        });
      }
    }
  }

  await db.items.bulkAdd(items);
  console.log(`Seeded database with ${items.length} items`);
}

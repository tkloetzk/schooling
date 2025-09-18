import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dbUtils } from "../database";
import { Child, Tier, Item } from "../types";
import { Button } from "./ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Container } from "./ui/Container";

// Import seed data for auto-population
const SEED_DATA = {
  Everley: {
    tier1: {
      words: [
        "the",
        "of",
        "and",
        "a",
        "to",
        "in",
        "is",
        "you",
        "that",
        "it",
        "he",
        "was",
        "for",
        "on",
        "are",
        "I",
        "we",
        "see",
        "look",
        "at",
        "like",
        "can",
        "my",
        "she",
        "go",
        "up",
        "me",
        "am",
        "no",
        "so",
      ],
      sentences: [
        "I see the cat.",
        "We look at the sun.",
        "It is a red bus.",
        "He can go to the map.",
        "She was on the log.",
        "You are in the van.",
        "I like my hat.",
        "That dog is in a pen.",
        "It is a cup of milk.",
        "We can go to the park.",
        "The hen and the pig are in a pen.",
        "It is for me.",
        "Look at my dad.",
        "You and I can see it.",
        "He was at the top.",
        "We are on a bus.",
        "She can go in it.",
        "We look for a bug.",
      ],
    },
    tier2: {
      words: [
        "so",
        "do",
        "an",
        "am",
        "no",
        "up",
        "me",
        "come",
        "yes",
        "play",
        "as",
        "with",
        "his",
        "they",
        "be",
        "this",
        "have",
        "from",
      ],
      sentences: [
        "I am at the bus.",
        "Can you come with me?",
        "Yes we can play.",
        "They go up the hill.",
        "Do we have a map?",
        "This is an ant.",
        "His hat is on the bed.",
        "I have no pen.",
        "Be on the mat.",
        "We play as we go.",
        "I got a pen from dad.",
        "It is so fun.",
        "He and she come up.",
        "They are with his cat.",
        "This can be for me.",
        "Yes they have it.",
        "I am up at the top.",
        "No I do this.",
      ],
    },
  },
  Presley: {
    tier1: {
      words: [
        "that",
        "then",
        "if",
        "but",
        "as",
        "of",
        "them",
        "with",
        "will",
        "all",
        "her",
        "us",
        "did",
        "get",
        "was",
        "his",
        "from",
        "be",
      ],
      sentences: [
        "That dog can run.",
        "If it is hot, sit.",
        "We run then rest.",
        "I like cats but not bees.",
        "He is as tall as dad.",
        "All of us can help.",
        "I will play with you.",
        "Give it to her.",
        "We see them here.",
        "He sat with his dog.",
        "We will get the ball.",
        "She was on her bed.",
        "His hat is red.",
        "I got it from Sam.",
        "Be on the mat.",
        "That was his hat.",
        "She did all that.",
        "Come with us to play.",
      ],
    },
    tier2: {
      words: [
        "they",
        "back",
        "each",
        "first",
        "want",
        "this",
        "have",
        "jump",
        "little",
        "went",
        "by",
        "what",
        "were",
        "when",
        "your",
        "going",
        "called",
        "has",
        "boy",
        "girl",
        "him",
        "said",
        "there",
        "put",
        "or",
        "more",
        "other",
        "here",
        "now",
        "down",
        "out",
        "about",
        "make",
        "made",
        "came",
        "time",
        "write",
        "read",
        "saw",
        "one",
        "use",
        "some",
        "these",
        "would",
        "could",
        "away",
        "may",
        "day",
        "way",
        "eat",
        "because",
        "been",
        "than",
        "too",
        "two",
        "who",
        "find",
        "very",
        "many",
        "off",
      ],
      sentences: [
        "They went back.",
        "Each kid went first.",
        "They were here first.",
        "I want this and have that.",
        "The little frogs jump.",
        "Sit by me when your mom is here.",
        "He is going to a game called Tag.",
        "The boy said the girl will help him.",
        "Put it there or get more.",
        "The other kids are here now.",
        "Go down and out to read about ants.",
        "We made it on time.",
        "She came at one.",
        "We read and write each day.",
        "Use these to make some art for one pal.",
        "We would go if we could.",
        "May we go away?",
        "We eat each day this way because mom said so.",
        "It has been more than two days, too.",
        "Who can find the very big box?",
        "Many are off.",
        "What did you see?",
        "I saw them at the park.",
      ],
    },
  },
};

interface StatsScreenProps {}

interface StatsData {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  boxDistribution: number[];
  totalItems: number;
}

// Tooltip component for showing words/phrases in each box
interface TooltipProps {
  items: Item[];
  box: number;
  isVisible: boolean;
  position: { top: number; left: number };
}

const BoxTooltip: React.FC<TooltipProps> = ({
  items,
  box,
  isVisible,
  position,
}) => {
  console.log("BoxTooltip render:", {
    items: items.length,
    box,
    isVisible,
    position,
  });

  if (!isVisible || items.length === 0) {
    console.log("BoxTooltip not rendering - not visible or no items");
    return null;
  }

  console.log("BoxTooltip rendering with", items.length, "items");

  return (
    <div
      style={{
        position: "fixed",
        top: Math.max(10, Math.min(position.top, window.innerHeight - 300)),
        left: Math.max(10, Math.min(position.left, window.innerWidth - 320)),
        background: "rgba(0, 0, 0, 0.95)",
        color: "white",
        padding: "1rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        maxWidth: "300px",
        maxHeight: "250px",
        overflowY: "auto",
        zIndex: 1000,
        fontSize: "0.9rem",
        pointerEvents: "none",
      }}
      role="tooltip"
      aria-live="polite"
    >
      <div
        style={{
          fontSize: "1rem",
          fontWeight: "bold",
          marginBottom: "0.5rem",
          color: "#fbbf24",
        }}
      >
        📚 Box {box} Words/Phrases ({items.length})
      </div>
      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {items.slice(0, 20).map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: "0.25rem 0",
              borderBottom:
                index < items.length - 1
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "none",
              fontStyle: item.type === "sentence" ? "italic" : "normal",
            }}
          >
            {item.type === "sentence" ? "💬 " : "📝 "}
            {item.text}
          </div>
        ))}
        {items.length > 20 && (
          <div
            style={{
              padding: "0.25rem 0",
              fontStyle: "italic",
              color: "#9ca3af",
              borderTop: "1px solid rgba(255,255,255,0.2)",
              marginTop: "0.25rem",
            }}
          >
            ...and {items.length - 20} more items
          </div>
        )}
      </div>
    </div>
  );
};

interface ItemWithStats {
  id: string;
  text: string;
  correct: number;
  incorrect: number;
  seen: number;
}

const StatsScreen: React.FC<StatsScreenProps> = () => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>("Everley");
  const [selectedTier, setSelectedTier] = useState<Tier>(1);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [hardestItems, setHardestItems] = useState<ItemWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltipData, setTooltipData] = useState<{
    box: number;
    items: Item[];
    position: { top: number; left: number };
    isVisible: boolean;
  } | null>(null);

  const children: Child[] = ["Everley", "Presley"];
  const tiers: Tier[] = [1, 2];

  // Manual seed function for testing/debugging
  const seedDatabase = async () => {
    try {
      console.log("🧪 Manual seed triggered - checking existing data...");
      const counts = await dbUtils.getItemCounts();
      console.log(`📊 Found ${counts.total} items in database`);

      if (counts.total > 0) {
        alert(
          `Database already has ${counts.total} items. Clear data first if needed.`
        );
        return;
      }

      console.log("🚀 Starting manual seeding...");
      let totalSeeded = 0;

      for (const [childKey, childData] of Object.entries(SEED_DATA)) {
        const child = childKey as Child;
        console.log(`👶 Processing ${child}...`);

        for (const [tierKey, tierData] of Object.entries(childData)) {
          const tier = parseInt(tierKey.replace("tier", "")) as Tier;
          console.log(`⭐ Processing ${child} Tier ${tier}...`);

          // Seed words
          for (const word of tierData.words) {
            const itemId = `${child}-${tier}-word-${word.replace(/\s+/g, "-")}`;
            const item = {
              id: itemId,
              text: word,
              type: "word" as const,
              child,
              tier,
              box: 1 as any,
              seen: 0,
              correct: 0,
              incorrect: 0,
              lastSeen: 0,
            };
            console.log(`📝 Adding word: ${item.text} -> ${itemId}`);
            await dbUtils.createItem(item);
            totalSeeded++;
          }

          // Seed sentences
          for (const sentence of tierData.sentences) {
            const itemId = `${child}-${tier}-sentence-${sentence
              .toLowerCase()
              .replace(/[^a-zA-Z0-9\s]/g, "")
              .replace(/\s+/g, "-")
              .slice(0, 50)}`;
            const item = {
              id: itemId,
              text: sentence,
              type: "sentence" as const,
              child,
              tier,
              box: 1 as any,
              seen: 0,
              correct: 0,
              incorrect: 0,
              lastSeen: 0,
            };
            console.log(`💬 Adding sentence: ${item.text.slice(0, 30)}...`);
            await dbUtils.createItem(item);
            totalSeeded++;
          }
        }
      }

      console.log(`✅ Manually seeded ${totalSeeded} items into database!`);
      alert(`🎉 Database seeded with ${totalSeeded} words and sentences!`);

      // Reload stats to show the seeded data
      await loadStats(selectedChild, selectedTier);
    } catch (error) {
      console.error("Failed to manually seed database:", error);
      alert(`❌ Failed to seed database: ${error}`);
    }
  };

  // Load stats for selected child and tier
  const loadStats = async (child: Child, tier: Tier) => {
    try {
      setLoading(true);

      // Skip auto-seeding for now - let user manually seed
      console.log("Load stats - skipping auto-seed");

      const statsData = await dbUtils.getStats(child, tier);
      setStats(statsData);

      // Load all items for this child/tier to find hardest items
      const items = await dbUtils.getItemsForSession(child, tier, "word");
      const sentenceItems = await dbUtils.getItemsForSession(
        child,
        tier,
        "sentence"
      );
      const allItems = [...items, ...sentenceItems];

      // Sort by incorrect attempts (hardest first)
      const sortedItems = allItems
        .filter((item) => item.incorrect > 0)
        .sort((a, b) => b.incorrect - a.incorrect)
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          text: item.text,
          correct: item.correct,
          incorrect: item.incorrect,
          seen: item.seen,
        }));

      setHardestItems(sortedItems);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(selectedChild, selectedTier);
  }, [selectedChild, selectedTier]);

  const handleExportData = async () => {
    try {
      const jsonData = await dbUtils.exportData();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `high-frequency-words-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        await dbUtils.importData(text);
        // Reload stats after import
        loadStats(selectedChild, selectedTier);
        alert("Data imported successfully!");
      } catch (error) {
        console.error("Failed to import data:", error);
        alert("Failed to import data. Please check the file format.");
      }
    };
    input.click();
  };

  const handleBackToStart = () => {
    navigate("/");
  };

  // Handle hover enter for progress bars
  const handleProgressBarHover = async (
    event: React.MouseEvent<HTMLDivElement>,
    box: number
  ) => {
    try {
      console.log("HOVER DETECTED for box:", box);
      const rect = event.currentTarget.getBoundingClientRect();
      const tooltipHeight = 250; // Approximate tooltip height

      // Position tooltip above if there's space, otherwise below
      const top = rect.top - tooltipHeight - 10;
      const isAbove = top > 0;
      const finalTop = isAbove ? top : rect.bottom + 10;

      const tooltipItems = await dbUtils.getItemsByBox(
        selectedChild,
        selectedTier,
        box
      );

      console.log(
        "Tooltip items loaded:",
        tooltipItems.length,
        tooltipItems
          .slice(0, 3)
          .map((item) => ({ text: item.text, type: item.type }))
      );

      setTooltipData({
        box,
        items: tooltipItems,
        position: {
          top: finalTop,
          left: Math.max(
            10,
            Math.min(
              rect.left + rect.width / 2,
              window.innerWidth - 320 // Approximate tooltip width
            )
          ),
        },
        isVisible: tooltipItems.length > 0,
      });
    } catch (error) {
      console.error("Failed to load tooltip data:", error);
    }
  };

  // Handle hover leave for progress bars
  const handleProgressBarLeave = () => {
    console.log("HOVER LEAVE - clearing tooltip");
    setTooltipData(null);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "2rem", color: "#1e293b", fontWeight: "600" }}>
          Loading stats... 📊
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 100%)",
        padding: "2rem",
      }}
    >
      <Container>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Button
            onClick={handleBackToStart}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.2rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            ← Back to Choose
          </Button>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              color: "#1e293b",
              marginBottom: "0.5rem",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            📊 Progress Statistics
          </h1>
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: "16px",
              padding: "1rem",
              display: "inline-block",
              border: "2px solid rgba(0,0,0,0.1)",
            }}
          >
            <span
              style={{
                fontSize: "1.2rem",
                color: "#374151",
                fontWeight: "600",
              }}
            >
              📈 Progress tracking for {selectedChild}
            </span>
          </div>
        </div>

        {/* Child and Tier Selection */}
        <Card style={{ marginBottom: "2rem" }}>
          <CardHeader>
            <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
              🎯 Select Student & Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              {/* Child Selection */}
              <div style={{ display: "flex", gap: "1rem" }}>
                {children.map((child) => (
                  <Button
                    key={child}
                    onClick={() => setSelectedChild(child)}
                    style={{
                      padding: "1.5rem 2rem",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      background:
                        selectedChild === child
                          ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                          : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                      border:
                        selectedChild === child
                          ? "4px solid #059669"
                          : "4px solid #6b7280",
                    }}
                  >
                    👩 {child}
                  </Button>
                ))}
              </div>

              {/* Tier Selection */}
              <div style={{ display: "flex", gap: "1rem" }}>
                {tiers.map((tier) => (
                  <Button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    style={{
                      padding: "1.5rem 2rem",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      background:
                        selectedTier === tier
                          ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                          : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                      border:
                        selectedTier === tier
                          ? "4px solid #d97706"
                          : "4px solid #6b7280",
                    }}
                  >
                    ⭐ Tier {tier}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {stats && (
          <>
            {/* Overall Statistics */}
            <Card style={{ marginBottom: "2rem" }}>
              <CardHeader>
                <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                  📈 Overall Performance - {selectedChild} Tier {selectedTier}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "2rem",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "bold",
                        color: "#10b981",
                      }}
                    >
                      {stats.totalAttempts}
                    </div>
                    <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>
                      Total Attempts
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "bold",
                        color: "#10b981",
                      }}
                    >
                      {stats.correctAttempts}
                    </div>
                    <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>
                      Correct Answers
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "bold",
                        color:
                          stats.accuracy >= 0.8
                            ? "#10b981"
                            : stats.accuracy >= 0.6
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {Math.round(stats.accuracy * 100)}%
                    </div>
                    <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>
                      Accuracy Rate
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "3rem",
                        fontWeight: "bold",
                        color: "#10b981",
                      }}
                    >
                      {stats.totalItems}
                    </div>
                    <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>
                      Total Words/Phrases
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Box Distribution */}
            <Card style={{ marginBottom: "2rem" }}>
              <CardHeader>
                <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                  🎯 Learning Progress Distribution (Leitner Boxes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    background:
                      "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    borderRadius: "8px",
                    border: "2px solid #d97706",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                      color: "#92400e",
                      textAlign: "center",
                    }}
                  >
                    📚 The Leitner system automatically moves words up boxes as
                    you master them!
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {[
                    {
                      box: 5,
                      label: "Mastered",
                      tooltip: "Expert level - rare reviews needed",
                      icon: "🎯",
                    },
                    {
                      box: 4,
                      label: "Advanced",
                      tooltip: "Near mastery - occasional review",
                      icon: "🎯",
                    },
                    {
                      box: 3,
                      label: "Progressing",
                      tooltip: "Getting better - regular review",
                      icon: "🎉",
                    },
                    {
                      box: 2,
                      label: "Developing",
                      tooltip: "Still learning - frequent review",
                      icon: "🔄",
                    },
                    {
                      box: 1,
                      label: "Beginning",
                      tooltip: "Brand new - immediate review",
                      icon: "💪",
                    },
                  ].map(({ box, label, tooltip, icon }, index) => (
                    <div
                      key={box}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                      title={tooltip}
                    >
                      <div
                        style={{
                          width: "120px",
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "#4b5563",
                        }}
                      >
                        {icon} {label}{" "}
                        <span style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
                          (Box {box})
                        </span>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          height: "40px",
                          borderRadius: "20px",
                          position: "relative",
                          overflow: "hidden",
                          cursor:
                            stats.boxDistribution[index] > 0
                              ? "pointer"
                              : "not-allowed",
                          backgroundColor: "#e5e7eb",
                        }}
                        onMouseEnter={(event) => {
                          console.log("HOVER DETECTED for box:", box);
                          if (stats.boxDistribution[index] > 0) {
                            handleProgressBarHover(event, box);
                          } else {
                            console.log(
                              "Skipping - no items in box:",
                              stats.boxDistribution[index]
                            );
                          }
                        }}
                        onMouseLeave={handleProgressBarLeave}
                        aria-label={`${label} - Showing ${
                          stats.boxDistribution[index]
                        } items in Box ${box}. ${
                          stats.boxDistribution[index] > 0
                            ? "Words/phrases available"
                            : "Empty - play sessions to add words here"
                        }`}
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${
                              (stats.boxDistribution[index] /
                                Math.max(...stats.boxDistribution)) *
                                100 || 5 // Minimum 5% width for empty boxes
                            }%`,
                            background:
                              "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                            borderRadius: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            fontWeight: "bold",
                            color: "white",
                            minWidth: "40px",
                          }}
                        >
                          {stats.boxDistribution[index]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hardest Items */}
            {hardestItems.length > 0 && (
              <Card style={{ marginBottom: "2rem" }}>
                <CardHeader>
                  <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                    🎯 Items Needing More Practice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                    }}
                  >
                    {hardestItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "1rem",
                          border: "3px solid #e5e7eb",
                          borderRadius: "12px",
                          background: `linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "bold",
                              color: "#1f2937",
                            }}
                          >
                            {item.text}
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: "1.2rem",
                                fontWeight: "600",
                                color: "#ef4444",
                              }}
                            >
                              {item.incorrect} misses
                            </div>
                            <div style={{ fontSize: "1rem", color: "#6b7280" }}>
                              {item.correct}/{item.seen} correct
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database Seeding for Testing */}
            <Card style={{ marginBottom: "2rem" }}>
              <CardHeader>
                <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                  🌱 Database Setup (For Testing Tooltips)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem",
                      background:
                        "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      borderRadius: "8px",
                      border: "2px solid #d97706",
                      fontSize: "1rem",
                      textAlign: "center",
                      color: "#92400e",
                    }}
                  >
                    📚 No words in database? Click "Seed Database" below to add
                    ~80 word and sentence samples for testing!
                  </div>
                  <Button
                    onClick={seedDatabase}
                    style={{
                      padding: "1.5rem 3rem",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    }}
                  >
                    🌱 Seed Database (Add Sample Words)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export/Import Actions */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontSize: "2rem", textAlign: "center" }}>
                  💾 Data Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    onClick={handleExportData}
                    style={{
                      padding: "1.5rem 2rem",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    }}
                  >
                    🔄 Export Data
                  </Button>
                  <Button
                    onClick={handleImportData}
                    style={{
                      padding: "1.5rem 2rem",
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      background:
                        "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                    }}
                  >
                    📥 Import Data
                  </Button>
                </div>
                <div
                  style={{
                    marginTop: "1rem",
                    fontSize: "1rem",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  📱 Export saves your progress as a JSON file for backup
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tooltip for hover state */}
        {tooltipData && (
          <BoxTooltip
            box={tooltipData.box}
            items={tooltipData.items}
            isVisible={tooltipData.isVisible}
            position={tooltipData.position}
          />
        )}
      </Container>
    </div>
  );
};

export default StatsScreen;

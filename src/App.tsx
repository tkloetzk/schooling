import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import SessionScreen from "./components/SessionScreen";
import StatsScreen from "./components/StatsScreen";
import { useAppActions, useAppStore } from "./stores";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-custom">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

function StartScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelection } = useAppActions();
  const { unlockedTiers } = useAppStore();

  // Get preserved selections from router state (if user came back from session)
  const routerState = location.state as {
    preservedSelections?: {
      child: "Everley" | "Presley";
      tier: 1 | 2;
      mode: "words" | "sentences";
    };
  } | null;
  const preservedSelections = routerState?.preservedSelections;

  const [selectedChild, setSelectedChild] = useState<
    "Everley" | "Presley" | null
  >(preservedSelections?.child || null);
  const [selectedTier, setSelectedTier] = useState<1 | 2>(
    preservedSelections?.tier || 1
  );
  const [selectedMode, setSelectedMode] = useState<"words" | "sentences">(
    preservedSelections?.mode || "words"
  );

  const handleChildSelect = (child: "Everley" | "Presley") => {
    setSelectedChild(child);
    setSelectedTier(1); // Reset to tier 1 when child changes
    setSelectedMode("words"); // Reset to words when child changes
  };

  // Check if tier is unlocked for selected child
  const isTierUnlocked = (tier: 1 | 2) => {
    if (!selectedChild) return true;
    return unlockedTiers[selectedChild]?.includes(tier) || false;
  };

  const handleTierSelect = (tier: 1 | 2) => {
    if (isTierUnlocked(tier)) {
      setSelectedTier(tier);
    }
  };

  const handleStartSession = () => {
    if (selectedChild) {
      // Log what we're setting
      console.log("Setting selection:", {
        child: selectedChild,
        tier: selectedTier,
        mode: selectedMode,
      });

      // Update store with selections
      setSelection({
        child: selectedChild,
        tier: selectedTier,
        mode: selectedMode,
        subject: "High Frequency Words",
      });

      // Navigate to session screen after a brief delay to ensure store update
      setTimeout(() => {
        navigate("/session");
      }, 100);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "800px",
        }}
      >
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: "bold",
            color: "white",
            marginBottom: "1rem",
          }}
        >
          School Comprehensive
        </h1>

        <button
          onClick={() => navigate("/stats")}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            fontWeight: "600",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            border: "2px solid white",
            borderRadius: "16px",
            cursor: "pointer",
            transition: "all 300ms ease",
            marginBottom: "1rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
        >
          📊 View Statistics
        </button>

        <div
          style={{
            background: "white",
            borderRadius: "32px",
            padding: "3rem",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "2rem",
              color: "#1f2937",
            }}
          >
            👶 Choose Your Child
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <button
              onClick={() => handleChildSelect("Everley")}
              style={{
                padding: "1rem 0.75rem",
                fontSize: "1.25rem",
                fontWeight: "600",
                background:
                  selectedChild === "Everley"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                border:
                  selectedChild === "Everley"
                    ? "3px solid #059669"
                    : "3px solid #2563eb",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                transition: "all 300ms ease",
                transform:
                  selectedChild === "Everley" ? "scale(1.01)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
                {selectedChild === "Everley" ? "👧✨" : "👧"}
              </div>
              <div>Everley</div>
              {selectedChild === "Everley" && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "#10b981",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </div>
              )}
            </button>

            <button
              onClick={() => handleChildSelect("Presley")}
              style={{
                padding: "1rem 0.75rem",
                fontSize: "1.25rem",
                fontWeight: "600",
                background:
                  selectedChild === "Presley"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "white",
                border:
                  selectedChild === "Presley"
                    ? "3px solid #059669"
                    : "3px solid #2563eb",
                borderRadius: "12px",
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                transition: "all 300ms ease",
                transform:
                  selectedChild === "Presley" ? "scale(1.01)" : "scale(1)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>
                {selectedChild === "Presley" ? "👧✨" : "👧"}
              </div>
              <div>Presley</div>
              {selectedChild === "Presley" && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "#10b981",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          </div>

          {selectedChild && (
            <>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                  borderRadius: "24px",
                  padding: "2rem",
                  marginBottom: "2rem",
                  border: "3px solid #3b82f6",
                }}
              >
                <h3
                  style={{
                    fontSize: "2rem",
                    marginBottom: "1.5rem",
                    color: "#1e40af",
                    fontWeight: "700",
                  }}
                >
                  📚 Choose Your Level
                </h3>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#1f2937",
                    }}
                  >
                    📖 Practice Type:
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <button
                      onClick={() => setSelectedMode("words")}
                      style={{
                        padding: "1.5rem 1rem",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        background:
                          selectedMode === "words"
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                        color: "white",
                        border:
                          selectedMode === "words"
                            ? "3px solid #059669"
                            : "3px solid #6b7280",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      📝 Words
                    </button>
                    <button
                      onClick={() => setSelectedMode("sentences")}
                      style={{
                        padding: "1.5rem 1rem",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        background:
                          selectedMode === "sentences"
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                        color: "white",
                        border:
                          selectedMode === "sentences"
                            ? "3px solid #059669"
                            : "3px solid #6b7280",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      💬 Sentences
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      marginBottom: "1rem",
                      color: "#1f2937",
                    }}
                  >
                    🏆 Difficulty Level:
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <button
                      onClick={() => handleTierSelect(1)}
                      style={{
                        padding: "1.5rem 1rem",
                        fontSize: "1.5rem",
                        fontWeight: "700",
                        background:
                          selectedTier === 1
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                        color: "white",
                        border:
                          selectedTier === 1
                            ? "3px solid #059669"
                            : "3px solid #6b7280",
                        borderRadius: "16px",
                        cursor: "pointer",
                        transition: "all 300ms ease",
                      }}
                    >
                      ⭐ Tier 1
                    </button>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => handleTierSelect(2)}
                        disabled={!isTierUnlocked(2)}
                        style={{
                          padding: "1.5rem 1rem",
                          fontSize: "1.5rem",
                          fontWeight: "700",
                          background: isTierUnlocked(2)
                            ? selectedTier === 2
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                            : "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)",
                          color: isTierUnlocked(2) ? "white" : "#6b7280",
                          border: isTierUnlocked(2)
                            ? selectedTier === 2
                              ? "3px solid #059669"
                              : "3px solid #6b7280"
                            : "3px solid #9ca3af",
                          borderRadius: "16px",
                          cursor: isTierUnlocked(2) ? "pointer" : "not-allowed",
                          transition: "all 300ms ease",
                        }}
                      >
                        ⭐⭐ Tier 2 {isTierUnlocked(2) ? "" : "🔒"}
                      </button>
                      {!isTierUnlocked(2) && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "100%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "rgba(0,0,0,0.8)",
                            color: "white",
                            padding: "0.5rem",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            marginBottom: "0.5rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Complete Tier 1 first!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartSession}
                style={{
                  width: "100%",
                  padding: "2rem",
                  fontSize: "2.5rem",
                  fontWeight: "800",
                  background:
                    "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  border: "6px solid #d97706",
                  borderRadius: "24px",
                  cursor: "pointer",
                  boxShadow: "0 12px 30px rgba(245,158,11,0.3)",
                  transition: "all 300ms ease",
                  marginBottom: "2rem",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.02)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                🚀 START {selectedMode.toUpperCase()} PRACTICE! 🚀
              </button>

              <div
                style={{
                  padding: "1.5rem",
                  fontSize: "1.5rem",
                  color: "#059669",
                  fontWeight: "600",
                  background:
                    "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
                  borderRadius: "16px",
                  border: "3px solid #059669",
                }}
              >
                🎉 Perfect choice, {selectedChild}!<br />
                Ready for {selectedMode} practice? Let's go! 🚀
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

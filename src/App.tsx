import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAppActions, useAppStore } from "./stores";
import SessionScreen from "./components/SessionScreen";
import MathSessionScreen from "./components/MathSessionScreen";
import StatsScreen from "./components/StatsScreen";
import AdditionExerciseScreen from "./components/AdditionExerciseScreen";
import SubtractionExerciseScreen from "./components/SubtractionExerciseScreen";
import CountingExerciseScreen from "./components/CountingExerciseScreen";
import { BackupControls } from "./components/BackupControls";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-custom">
        <Routes>
          <Route path="/" element={<StartScreen />} />
          <Route path="/session" element={<SessionScreen />} />
          <Route path="/math-session" element={<MathSessionScreen />} />
          <Route path="/stats" element={<StatsScreen />} />
          <Route path="/addition" element={<AdditionExerciseScreen />} />
          <Route path="/subtraction" element={<SubtractionExerciseScreen />} />
          <Route path="/counting" element={<CountingExerciseScreen />} />
        </Routes>
        <BackupControls />
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
  const [selectedSubject, setSelectedSubject] = useState<"english" | "math">("english");
  const [selectedTier, setSelectedTier] = useState<1 | 2>(preservedSelections?.tier || 1);
  const [selectedMode, setSelectedMode] = useState<"words" | "sentences">(preservedSelections?.mode || "words");
  const [selectedActivity, setSelectedActivity] = useState<string>("addition-0-10");

  const handleChildSelect = (child: "Everley" | "Presley") => {
    setSelectedChild(child);
  setSelectedTier(1);
  setSelectedMode("words");
  setSelectedSubject("english");
  };

  // Check if tier is unlocked for selected child and subject
  const isTierUnlocked = (tier: 1 | 2) => {
    if (!selectedChild) return true;
    return unlockedTiers[selectedChild]?.[selectedSubject]?.includes(tier) || false;
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
        subject: selectedSubject,
        activity: selectedSubject === "english" ? selectedMode : selectedActivity,
      });

      // Update store with selections
      setSelection({
        child: selectedChild,
        tier: selectedTier,
        mode: selectedMode,
        subject: selectedSubject,
        activity: selectedSubject === "english" ? selectedMode : (selectedActivity as any),
      });

      // Navigate to session screen after a brief delay to ensure store update
      setTimeout(() => {
        if (selectedSubject === "math") {
          navigate("/math-session");
        } else {
          navigate("/session");
        }
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
              color: "black",
            }}
          >
            Select Child
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "2rem",
            }}
          >
            <button
              onClick={() => handleChildSelect("Everley")}
              style={{
                padding: "1.5rem 1rem",
                fontSize: "1.5rem",
                fontWeight: "700",
                background:
                  selectedChild === "Everley"
                    ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                    : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                color: selectedChild === "Everley" ? "white" : "#6b7280",
                border:
                  selectedChild === "Everley"
                    ? "3px solid #db2777"
                    : "3px solid #6b7280",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 300ms ease",
              }}
            >
              Everley
            </button>
            <button
              onClick={() => handleChildSelect("Presley")}
              style={{
                padding: "1.5rem 1rem",
                fontSize: "1.5rem",
                fontWeight: "700",
                background:
                  selectedChild === "Presley"
                    ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
                    : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)",
                color: selectedChild === "Presley" ? "white" : "#6b7280",
                border:
                  selectedChild === "Presley"
                    ? "3px solid #db2777"
                    : "3px solid #6b7280",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 300ms ease",
              }}
            >
              Presley
            </button>
          </div>

          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "2rem",
              color: "black",
            }}
          >
            Select Subject
          </h2>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "2rem",
            }}
          >
            {(["english", "math"] as const).map((subj) => (
              <button
                key={subj}
                onClick={() => {
                  setSelectedSubject(subj);
                  // Math only has tier 1 items, so set tier to 1 when selecting math
                  if (subj === "math") {
                    setSelectedTier(1);
                  }
                }}
                style={{
                  padding: "1.5rem 1rem",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  background:
                    selectedSubject === subj
                      ? "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)"
                      : "linear-gradient(135deg,#6b7280 0%,#4b5563 100%)",
                  color: selectedSubject === subj ? "white" : "#6b7280",
                  border:
                    selectedSubject === subj
                      ? "3px solid #4f46e5"
                      : "3px solid #6b7280",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 300ms ease",
                }}
              >
                {subj === "english" ? "📚 English" : "🔢 Math"}
              </button>
            ))}
          </div>

          <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "2rem",
              color: "black",
            }}
          >
            {selectedSubject === "english" ? "Select Tier" : "Select Activity"}
          </h2>
          {selectedSubject === "english" && (
            <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                position: "relative",
              }}
            >
              <button
                onClick={() => handleTierSelect(1)}
                disabled={!isTierUnlocked(1)}
                style={{
                  padding: "1.5rem 1rem",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  background: isTierUnlocked(1)
                    ? selectedTier === 1
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                    : "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)",
                  color: isTierUnlocked(1) ? "white" : "#6b7280",
                  border: isTierUnlocked(1)
                    ? selectedTier === 1
                      ? "3px solid #059669"
                      : "3px solid #6b7280"
                    : "3px solid #9ca3af",
                  borderRadius: "16px",
                  cursor: isTierUnlocked(1) ? "pointer" : "not-allowed",
                  transition: "all 300ms ease",
                }}
              >
                ⭐ Tier 1 {isTierUnlocked(1) ? "" : "🔒"}
              </button>
              {!isTierUnlocked(1) && (
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
            <div
              style={{
                position: "relative",
              }}
            >
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
          )}

          {selectedSubject === "math" && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                justifyContent: "center",
                marginBottom: "2rem",
              }}
            >
              {[
                { key: "addition-0-10", label: "➕ Addition" },
                { key: "counting-by-2s", label: "2️⃣ Count by 2s" },
                { key: "counting-by-5s", label: "5️⃣ Count by 5s" },
                { key: "subtraction-up-to-10", label: "➖ Subtract" },
                { key: "tens-frame", label: "🔳 Tens Frame" },
              ].map((act) => (
                <button
                  key={act.key}
                  onClick={() => setSelectedActivity(act.key)}
                  style={{
                    padding: "1.25rem 1rem",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    background:
                      selectedActivity === act.key
                        ? "linear-gradient(135deg,#10b981 0%,#059669 100%)"
                        : "linear-gradient(135deg,#6b7280 0%,#4b5563 100%)",
                    color: selectedActivity === act.key ? "white" : "#6b7280",
                    border:
                      selectedActivity === act.key
                        ? "3px solid #059669"
                        : "3px solid #6b7280",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 300ms ease",
                    minWidth: 180,
                  }}
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}

          {selectedSubject === "english" && (
            <h2
            style={{
              fontSize: "2.5rem",
              marginBottom: "2rem",
              color: "black",
            }}
          >
            Select Mode
            </h2>
          )}
          {selectedSubject === "english" && (
            <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginBottom: "2rem",
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
                color: selectedMode === "words" ? "white" : "#6b7280",
                border:
                  selectedMode === "words"
                    ? "3px solid #059669"
                    : "3px solid #6b7280",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 300ms ease",
              }}
            >
              Words
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
                color: selectedMode === "sentences" ? "white" : "#6b7280",
                border:
                  selectedMode === "sentences"
                    ? "3px solid #059669"
                    : "3px solid #6b7280",
                borderRadius: "16px",
                cursor: "pointer",
                transition: "all 300ms ease",
              }}
            >
              Sentences
            </button>
            </div>
          )}

          <button
            onClick={handleStartSession}
            style={{
              width: "100%",
              padding: "2rem",
              fontSize: "2.5rem",
              fontWeight: "800",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            🚀 START {selectedMode.toUpperCase()} PRACTICE! 🚀
          </button>

          <div
            style={{
              padding: "1.5rem",
              fontSize: "1.5rem",
              color: "#059669",
              fontWeight: "600",
              background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
              borderRadius: "16px",
              border: "3px solid #059669",
            }}
          >
            🎉 Perfect choice, {selectedChild}!<br />
            Ready for {selectedMode} practice? Let's go! 🚀
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

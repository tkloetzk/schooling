import React, { useState, useEffect, useCallback, useRef } from "react";
import { Feedback } from "./ui";
import { useNavigate } from "react-router-dom";
import { useAppStore, useAppActions } from "../stores";
import { dbUtils } from "../database";

interface SessionScreenProps {}

const SessionScreen: React.FC<SessionScreenProps> = () => {
  const navigate = useNavigate();
  const { selection, session } = useAppStore();
  const { markAnswer, nextItem } = useAppActions();
  const [currentItem, setCurrentItem] = useState<any>(null);
  // Feedback state: persists correct styling and allows temporary lockout to prevent double clicks
  const [lastAnswerStatus, setLastAnswerStatus] = useState<"correct" | "incorrect" | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<string>("");
  const [interactionLocked, setInteractionLocked] = useState(false);
  const lockTimerRef = useRef<number | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Load first item when session starts
  const startSession = useCallback(async () => {
    if (!sessionStarted && selection.child) {
      try {
        console.log("SessionScreen starting with selection:", selection);
        setSessionStarted(true);
        await nextItem();
      } catch (error) {
        console.error("Failed to start session:", error);
        navigate("/");
      }
    }
  }, [
    sessionStarted,
    selection.child,
    selection,
    nextItem,
    setSessionStarted,
    navigate,
  ]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  // Handle answer submission (moved before useEffect that uses it)
  const handleAnswer = useCallback(
    async (correct: boolean) => {
      if (!currentItem || interactionLocked) return;
      try {
        setInteractionLocked(true);
        // Ensure any prior timer cleared
        if (lockTimerRef.current) {
          window.clearTimeout(lockTimerRef.current);
        }

        await markAnswer(currentItem.id, correct);

        setLastAnswerStatus(correct ? "correct" : "incorrect");
        setAnswerFeedback(correct ? "🎉 Great job!" : "💪 Keep practicing!");

        // Keep success green (do NOT auto-clear correct). For incorrect, clear after short delay.
        if (!correct) {
          lockTimerRef.current = window.setTimeout(() => {
            setLastAnswerStatus(null);
            setAnswerFeedback("");
            setInteractionLocked(false);
          }, 1000);
        } else {
          // For correct answers, brief lockout to prevent double tapping. Advance remains for reading to keep flow.
          lockTimerRef.current = window.setTimeout(async () => {
            setInteractionLocked(false);
            try {
              await nextItem();
            } catch (e) {
              console.error(e);
            }
          }, 800);
        }
      } catch (error) {
        console.error("Failed to handle answer:", error);
        setInteractionLocked(false);
      }
    },
    [currentItem, interactionLocked, markAnswer, nextItem]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Update current item when session changes
  useEffect(() => {
    const loadCurrentItem = async () => {
      if (session.currentItemId) {
        try {
          const item = await dbUtils.getItemById(session.currentItemId);
          setCurrentItem(item);
          setLastAnswerStatus(null);
          setAnswerFeedback("");
        } catch (error) {
          console.error("Failed to load current item:", error);
        }
      } else if (sessionStarted) {
        // No more items - session complete
        setCurrentItem(null);
      }
    };

    loadCurrentItem();
  }, [session.currentItemId, sessionStarted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle keyboard events when we have a current item
  if (!currentItem || interactionLocked) return;

      // Prevent default browser behavior for arrow keys
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();

        if (event.key === "ArrowRight") {
          // Right arrow = Got It (correct)
          console.log("→ Right arrow key pressed: Got it!");
          handleAnswer(true);
        } else if (event.key === "ArrowLeft") {
          // Left arrow = Try Again (incorrect)
          console.log("← Left arrow key pressed: Try again!");
          handleAnswer(false);
        }
      }
    };

    // Add event listener when component mounts
    window.addEventListener("keydown", handleKeyPress);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [currentItem, interactionLocked, handleAnswer]);

  // Handle back to start - go back but preserve current selections
  const handleBackToStart = () => {
    // Navigate back to StartScreen with current selections preserved
    navigate("/", {
      state: {
        preservedSelections: {
          child: selection.child,
          tier: selection.tier,
          mode: selection.mode,
        },
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={handleBackToStart}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.2rem",
              fontWeight: "600",
              background: "white",
              color: "#667eea",
              border: "3px solid #667eea",
              borderRadius: "16px",
              cursor: "pointer",
              transition: "all 300ms ease",
              marginBottom: "1rem",
            }}
          >
            ← Back to Choose
          </button>
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              color: "white",
              marginBottom: "0.5rem",
            }}
          >
            📚 {selection.mode === "words" ? "Word" : "Sentence"} Practice
          </h1>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1rem",
              display: "inline-block",
            }}
          >
            <span
              style={{ fontSize: "1.2rem", color: "white", fontWeight: "600" }}
            >
              🎯 {selection.child} • Tier {selection.tier} • {selection.mode}
            </span>
          </div>
        </div>

        {/* Main Practice Area */}
        <div
          style={{
            background: "white",
            borderRadius: "32px",
            padding: "3rem",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {currentItem ? (
            <>
              {/* The big word/sentence */}
              <div
                style={{
                  fontSize: selection.mode === "words" ? "8rem" : "4rem",
                  fontWeight: "900",
                  color: "#1f2937",
                  marginBottom: "2rem",
                  lineHeight: "1.1",
                  minHeight: selection.mode === "words" ? "200px" : "150px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  letterSpacing: selection.mode === "words" ? "-0.05em" : "0",
                }}
              >
                {currentItem.text}
              </div>

              {/* Answer Buttons - Now positioned to match arrow keys */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2rem",
                  maxWidth: "600px",
                  margin: "0 auto 2rem",
                }}
              >
                {/* Left button = Left arrow = TRY AGAIN (incorrect) */}
                <button
                  onClick={() => handleAnswer(false)}
                  disabled={interactionLocked}
                  style={{
                    padding: "3rem 2rem",
                    fontSize: "2.5rem",
                    fontWeight: "800",
                    background:
                      "linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)",
                    color: "white",
                    border: "6px solid #ee5a52",
                    borderRadius: "24px",
                    cursor: "pointer",
                    boxShadow: "0 12px 30px rgba(255,107,107,0.3)",
                    transition: "all 300ms ease",
                    transform: "scale(1)",
                    opacity: interactionLocked ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) =>
                    !interactionLocked &&
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseLeave={(e) =>
                    !interactionLocked &&
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  ← 💪 TRY AGAIN
                </button>

                {/* Right button = Right arrow = GOT IT (correct) */}
                <button
                  onClick={() => handleAnswer(true)}
                  disabled={interactionLocked}
                  style={{
                    padding: "3rem 2rem",
                    fontSize: "2.5rem",
                    fontWeight: "800",
                    background:
                      "linear-gradient(135deg, #51cf66 0%, #40c057 100%)",
                    color: "white",
                    border: "6px solid #40c057",
                    borderRadius: "24px",
                    cursor: interactionLocked ? "not-allowed" : "pointer",
                    transition: "all 300ms ease",
                    boxShadow: "0 12px 30px rgba(81,207,102,0.3)",
                    transform: "scale(1)",
                    opacity: interactionLocked ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) =>
                    !interactionLocked &&
                    (e.currentTarget.style.transform = "scale(1.05)")
                  }
                  onMouseLeave={(e) =>
                    !interactionLocked &&
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  ✅ GOT IT! →
                </button>
              </div>

              {/* Feedback Display */}
              {(lastAnswerStatus || answerFeedback) && (
                <Feedback
                  variant={lastAnswerStatus === "correct" ? "success" : "error"}
                  message={answerFeedback}
                  persist
                  testId="reading-feedback"
                  className="mx-auto mb-4"
                />
              )}

              {/* Progress Indicator */}
              <div style={{ fontSize: "1.2rem", color: "#6b7280" }}>
                📊 Items completed: {session.queue.length + 1} /
                {session.queue.length + 1} session
              </div>
            </>
          ) : sessionStarted ? (
            <div
              style={{
                padding: "4rem",
                fontSize: "3rem",
                fontWeight: "700",
                color: "#1f2937",
                textAlign: "center",
              }}
            >
              🎉 Great job, {selection.child}!<br />
              <span style={{ fontSize: "2rem", color: "#6b7280" }}>
                Session completed! Ready for more?
              </span>
            </div>
          ) : (
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
              <div style={{ fontSize: "1.5rem", color: "#6b7280" }}>
                Loading your practice session...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionScreen;

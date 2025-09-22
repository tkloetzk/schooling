import React, { useEffect, useState, useCallback, useRef } from "react";
import { Feedback } from "./ui";
import { useNavigate } from "react-router-dom";
import { useAppStore, useAppActions } from "../stores";
import { dbUtils } from "../database";
import { generateMathProblem } from "../utils/math";
import { Item } from "../types";

const MathSessionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { selection, session } = useAppStore();
  const { markAnswer, markAnswerNoAdvance, nextItem } = useAppActions() as any;
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [problemIndex, setProblemIndex] = useState(0);
  // showFeedback: null = none, true = correct, false = incorrect
  const [showFeedback, setShowFeedback] = useState<null | boolean>(null);
  const [pending, setPending] = useState(false);
  const [attemptLoggedIncorrect, setAttemptLoggedIncorrect] = useState(false);
  const [allowRetry, setAllowRetry] = useState(false);
  const advanceFocusRef = useRef<HTMLButtonElement | null>(null);

  // Load current scheduling placeholder item
  useEffect(() => {
    const load = async () => {
      if (session.currentItemId) {
        const item = await dbUtils.getItemById(session.currentItemId);
        if (item) {
          setCurrentItem(item);
          // derive an index from id tail
          const tail = item.id.split("-").pop() || "0";
          const asNum = parseInt(tail.replace(/[^0-9]/g, ""), 10) || 0;
          setProblemIndex(asNum);
          setShowFeedback(null);
        }
      } else {
        setCurrentItem(null);
      }
    };
    load();
  }, [session.currentItemId]);

  // Start session when mounted if needed
  useEffect(() => {
    if (!session.currentItemId) {
      nextItem();
    }
  }, []); // eslint-disable-line

  const problem = currentItem
    ? generateMathProblem(selection.activity as any, problemIndex)
    : null;

  const handleAnswer = useCallback(
    async (value: number) => {
      if (!currentItem || problem == null || pending || showFeedback === true) return; // block if already correct
      setPending(true);
      const isCorrect = value === problem.answer;
      setShowFeedback(isCorrect);
  // mark that an attempt occurred (no separate state needed)
      try {
        // Log answer once per incorrect attempt; if incorrect and not yet logged, markAnswer(false)
        if (!isCorrect) {
          if (!attemptLoggedIncorrect) {
            if (markAnswerNoAdvance) {
              await markAnswerNoAdvance(currentItem.id, false);
            } else {
              await markAnswer(currentItem.id, false);
            }
            setAttemptLoggedIncorrect(true);
          }
          // Allow retry on incorrect without advancing
          setAllowRetry(true);
          setPending(false);
        } else {
          // Correct answer: log correct (even if previously incorrect was logged) and allow manual next
            if (markAnswerNoAdvance) {
              await markAnswerNoAdvance(currentItem.id, true);
            } else {
              await markAnswer(currentItem.id, true);
            }
            setAllowRetry(false);
            setPending(false);
            // focus next button after small delay for accessibility
            setTimeout(() => {
              advanceFocusRef.current?.focus();
            }, 50);
        }
      } catch (e) {
        console.error(e);
        setPending(false);
      }
    },
    [currentItem, problem, pending, showFeedback, attemptLoggedIncorrect, markAnswer]
  );

  const handleNextProblem = useCallback(async () => {
    if (pending) return;
    setPending(true);
    try {
      await nextItem();
      // reset local states
      setShowFeedback(null);
      setAttemptLoggedIncorrect(false);
      setAllowRetry(false);
  // reset attempt-related flags handled by other state
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  }, [nextItem, pending]);

  const handleBack = () => {
    navigate("/", { state: { preservedSelections: { child: selection.child, tier: selection.tier, mode: selection.mode } } });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 1000, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <button
            onClick={handleBack}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.2rem",
              fontWeight: 600,
              background: "white",
              color: "#2563eb",
              border: "3px solid #2563eb",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            ← Back to Choose
          </button>
          <h1 style={{ fontSize: "3rem", fontWeight: "bold", color: "white", margin: "0.5rem 0" }}>
            🔢 Math Practice
          </h1>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: "0.75rem 1.25rem",
              display: "inline-block",
              color: "white",
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            {selection.child} • {selection.activity}
          </div>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 32,
            padding: "3rem 2rem",
            textAlign: "center",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            minHeight: 400,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {problem ? (
            <>
              <div
                style={{
                  fontSize: problem.type === "tens-frame" ? "2.5rem" : "5rem",
                  fontWeight: 800,
                  whiteSpace: "pre-line",
                  lineHeight: 1.1,
                  color: "#1f2937",
                  marginBottom: "2rem",
                  minHeight: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {problem.display}
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "1.5rem",
                  gridTemplateColumns: "1fr 1fr",
                  maxWidth: "400px",
                  margin: "0 auto",
                  marginBottom: "2rem",
                }}
              >
                {problem.choices.map((c, index) => {
                  const isCorrectChoice = c === problem.answer;
                  const showAnyFeedback = showFeedback !== null;
                  const showCorrectHighlight = showFeedback === true || (showFeedback === false && !allowRetry);
                  
                  let bg = "linear-gradient(135deg,#f1f5f9,#e2e8f0)";
                  if (showAnyFeedback) {
                    if (isCorrectChoice && showCorrectHighlight) {
                      bg = "linear-gradient(135deg,#34d399,#10b981)";
                    } else if (showFeedback === false && !showCorrectHighlight) {
                      bg = "linear-gradient(135deg,#fecaca,#fca5a5)";
                    }
                  }
                  
                  return (
                    <button
                      key={`choice-${index}-${c}`}
                      onClick={() => handleAnswer(c)}
                      disabled={pending || (showFeedback === true) || (showFeedback === false && !allowRetry)}
                      style={{
                        padding: "2rem 1rem",
                        fontSize: "2.5rem",
                        fontWeight: 800,
                        borderRadius: 24,
                        border: "6px solid rgba(0,0,0,0.1)",
                        cursor: pending ? "wait" : "pointer",
                        background: bg,
                        color: isCorrectChoice && showCorrectHighlight ? "white" : "#1f2937",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.1)",
                        transition: "all 250ms ease",
                        opacity: pending ? 0.7 : 1,
                        minHeight: "80px",
                        minWidth: "120px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {showFeedback != null && (
                <Feedback
                  variant={showFeedback ? "success" : allowRetry ? "warning" : "info"}
                  message={
                    showFeedback
                      ? "🎉 Correct!"
                      : allowRetry
                      ? "🤔 Try again!"
                      : `💡 The answer is ${problem.answer}`
                  }
                  action={
                    showFeedback
                      ? {
                          label: "Next Question →",
                          onClick: handleNextProblem,
                          disabled: pending,
                        }
                      : undefined
                  }
                  className="mb-5"
                  testId="math-feedback"
                />
              )}
              <div style={{ fontSize: "1.1rem", color: "#6b7280", marginTop: "1.5rem" }}>
                📊 Items completed: {session.queue.length + 1} / {session.queue.length + 1}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "2rem", fontWeight: 600, color: "#4b5563", textAlign: "center" }}>
              {session.loading ? (
                "Loading..."
              ) : !currentItem ? (
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚧</div>
                  <div style={{ fontSize: "1.5rem", color: "#6b7280", marginBottom: "1rem" }}>
                    No math problems available!
                  </div>
                  <div style={{ fontSize: "1rem", color: "#9ca3af", marginBottom: "2rem" }}>
                    The database might need to be reseeded with math items.
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: "1rem 2rem",
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      color: "white",
                      border: "3px solid #4f46e5",
                      borderRadius: 16,
                      cursor: "pointer",
                    }}
                  >
                    🔄 Reload Page
                  </button>
                </div>
              ) : (
                "🎉 Session complete!"
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MathSessionScreen;

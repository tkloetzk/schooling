import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore, useAppActions } from "../stores";
import { dbUtils } from "../database";
import { generateMathProblem } from "../utils/math";
import { Item } from "../types";

const MathSessionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { selection, session } = useAppStore();
  const { markAnswer, nextItem } = useAppActions();
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [problemIndex, setProblemIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState<null | boolean>(null);
  const [pending, setPending] = useState(false);

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
      if (!currentItem || problem == null || pending) return;
      setPending(true);
      const isCorrect = value === problem.answer;
      setShowFeedback(isCorrect);
      try {
        await markAnswer(currentItem.id, isCorrect);
        // short delay for feedback
        setTimeout(() => {
          setPending(false);
        }, 600);
      } catch (e) {
        console.error(e);
        setPending(false);
      }
    },
    [currentItem, problem, markAnswer, pending]
  );

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
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  marginBottom: "2rem",
                }}
              >
                {problem.choices.map((c) => {
                  const isChosen = showFeedback != null && c === problem.answer;
                  const bg =
                    showFeedback == null
                      ? "linear-gradient(135deg,#f1f5f9,#e2e8f0)"
                      : c === problem.answer
                      ? "linear-gradient(135deg,#34d399,#10b981)"
                      : "linear-gradient(135deg,#fecaca,#fca5a5)";
                  return (
                    <button
                      key={c}
                      onClick={() => handleAnswer(c)}
                      disabled={showFeedback != null}
                      style={{
                        padding: "2rem 1rem",
                        fontSize: "2.5rem",
                        fontWeight: 800,
                        borderRadius: 24,
                        border: "6px solid rgba(0,0,0,0.1)",
                        cursor: showFeedback == null ? "pointer" : "default",
                        background: bg,
                        color: isChosen ? "white" : "#1f2937",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.1)",
                        transition: "all 300ms ease",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {showFeedback != null && (
                <div
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 800,
                    color: showFeedback ? "#059669" : "#dc2626",
                    background: showFeedback
                      ? "linear-gradient(135deg,#d1fae5,#a7f3d0)"
                      : "linear-gradient(135deg,#ffe5e5,#fdcece)",
                    border: showFeedback ? "4px solid #059669" : "4px solid #dc2626",
                    borderRadius: 20,
                    padding: "1.25rem 2rem",
                  }}
                >
                  {showFeedback ? "🎉 Correct!" : "💪 Keep Trying!"}
                </div>
              )}
              <div style={{ fontSize: "1.1rem", color: "#6b7280", marginTop: "1.5rem" }}>
                📊 Items completed: {session.queue.length + 1} / {session.queue.length + 1}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "2rem", fontWeight: 600, color: "#4b5563" }}>
              {session.loading ? "Loading..." : "🎉 Session complete!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MathSessionScreen;

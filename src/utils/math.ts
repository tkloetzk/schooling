import { MathActivity, MathProblem } from "../types";

// Generate a deterministic pseudo-random but repeatable selection based on index
const randFromIndex = (index: number, mod: number) => index % mod;

export function generateMathProblem(activity: MathActivity, index: number): MathProblem {
  switch (activity) {
    case "addition-0-10":
      return generateAddition(index);
    case "subtraction-up-to-10":
      return generateSubtraction(index);
    case "counting-by-2s":
      return generateCounting(index, 2);
    case "counting-by-5s":
      return generateCounting(index, 5);
    case "tens-frame":
      return generateTensFrame(index);
    default:
      return generateAddition(index);
  }
}

function generateAddition(idx: number): MathProblem {
  const a = randFromIndex(idx * 7, 11); // 0-10
  const b = randFromIndex(idx * 13 + 3, 11);
  const answer = a + b;
  return {
    type: "addition",
    operand1: a,
    operand2: b,
    answer,
    display: `${a} + ${b} = ?`,
    choices: buildChoices(answer),
  };
}

function generateSubtraction(idx: number): MathProblem {
  const a = randFromIndex(idx * 5 + 2, 11); // 0-10
  const b = randFromIndex(idx * 11 + 1, a + 1); // ensure b <= a
  const answer = a - b;
  return {
    type: "subtraction",
    operand1: a,
    operand2: b,
    answer,
    display: `${a} - ${b} = ?`,
    choices: buildChoices(answer),
  };
}

function generateCounting(idx: number, step: number): MathProblem {
  const start = randFromIndex(idx * 3 + step, step * 3); // vary start a bit
  const seq = [start, start + step, start + 2 * step];
  const answer = start + 3 * step;
  return {
    type: "counting",
    answer,
    display: `${seq.join(", ")}, ?`,
    choices: buildChoices(answer),
  };
}

function generateTensFrame(idx: number): MathProblem {
  const number = (idx % 10) + 1; // 1-10
  return {
    type: "tens-frame",
    answer: number,
    display: formatTensFrame(number),
    choices: buildChoices(number),
  };
}

function formatTensFrame(n: number): string {
  const filled = "●".repeat(n);
  const empty = "○".repeat(10 - n);
  const frame = (filled + empty).match(/.{1,5}/g)?.join("\n") || "";
  return `How many dots?\n${frame}`;
}

function buildChoices(correct: number): number[] {
  const set = new Set<number>();
  set.add(correct);
  const spread = [1, 2, 3];
  let i = 0;
  while (set.size < 4) {
    const delta = spread[i % spread.length];
    const candidate = (Math.random() > 0.5 ? correct + delta : correct - delta);
    if (candidate >= 0 && candidate <= 20) set.add(candidate);
    i++;
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

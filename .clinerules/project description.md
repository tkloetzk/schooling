Here is a complete build brief for an AI coding agent to implement a child-friendly, accessible React app that teaches high-frequency words with a gated two-tier flow and a box-based, **Leitner**-style spaced repetition scheduler, using a small global store and durable browser storage so progress persists offline. The app must support two child profiles (Everley, Kindergarten; Presley, 1st Grade), with Tier 2 locked until Tier 1 words and Tier 1 sentences are completed per child, and it should include a visually friendly theme and kid-operable **accessibility** affordances (large touch targets, high contrast, and optional text-to-speech prompts).

## Purpose

- Build a single-page React app for early reading practice focused on high-frequency words and simple sentences, tailored per child with gated tiers and a word resurfacing queue to reinforce harder items.
- Maintain per-child progress persistently in the browser, enabling offline practice and quick resume without account creation or servers.

## Primary users

- Child mode: Everley (5, Kindergarten) and Presley (6, 1st Grade) with big buttons, minimal text UI, clear voice prompts, and highly visible feedback.
- Parent mode: Start and Stats screens to pick Subject (start with “High Frequency Words”), Child, Tier, Mode (Words vs Sentences), and to view/export progress and unlock gates as they are earned.

## Tech stack

- React + Hooks for UI and component state, with simple patterns for preserving and resetting state between screens.
- Zustand for tiny, ergonomic global state (selection, queue, current item, actions) without heavy boilerplate or rerender overhead.
- IndexedDB via Dexie for structured, durable local storage of items and attempts; Dexie simplifies schema, queries, and version upgrades.

## Accessibility and child-friendly UX

- Touch targets: minimum 48×48 dp (~9 mm) with spacing to prevent accidental taps; enlarge hit areas beyond visual bounds where useful.
- Color contrast: ensure at least 4.5:1 text-to-background contrast for normal text and 3:1 for large text to meet WCAG AA; larger targets for UI components should also respect contrast guidance.
- Read-aloud: provide a Speak button to read the current word/sentence using the Web Speech API SpeechSynthesis, with adjustable rate/pitch for clarity.
- Clear feedback: big, distinct “Got it” and “Try again” controls with color and icon differences; keep animations gentle and optional, avoiding sensory overload.
- Navigation and ARIA: label actionable controls, keep focus visible, and announce state changes (e.g., “correct”, “try again”, “tier unlocked”) via polite ARIA/live updates.

## Data model (IndexedDB via Dexie)

- Item: id, text, type (“word” or “sentence”), child, tier, box (1–5), seen, correct, incorrect, lastSeen (ms) to track spaced repetition and mastery.
- Attempt: ts (ms), child, tier, itemId, isSentence, correct for analytics, accuracy, and troubleshooting.
- Meta: per-child unlocked tiers, last selections (child, mode), and app schema version for export/import compatibility.

## Scheduling and gating

- Use a box-based queue: start items in box 1; on correct, promote up to max 5; on incorrect, demote to box 1 and resurface soon; within a session, prioritize lower box or earliest due items first.
- Tier 2 unlocks only when Tier 1 words reach mastery (e.g., box ≥ 3 for all Tier 1 words) and all Tier 1 sentences are answered correctly at least once for that child, after which Tier 2 words and then Tier 2 sentences are available.

## Screens and flow

- Start screen: Subject (default “High Frequency Words”), Child (Everley/Presley), Tier (lock Tier 2 until earned), Mode (Words/Sentences); Begin button starts session with the resulting queue.
- Session screen: center the item text in a very large, high-contrast type; provide “Got it” and “Try again” buttons and a “Speak” button; show a minimal progress bar and a soft success/fail state indicator.
- Stats screen: per-child, per-tier summaries (accuracy, hardest items by incorrect count, boxes distribution, attempts over time), and export/import JSON for backups and migration.

## State management (Zustand)

- Global store holds selection (subject, child, tier, mode), current queue of item IDs, currentId, loading flags, and actions to set selection, mark answers, and fetch next due.
- Keep component-local state for transient UI (e.g., toggle audio, highlight animations), and rely on the store for persistent logic and transitions.

## Persistence (Dexie)

- Schema with two tables: items keyed by id with indexes on child, tier, type, box, lastSeen; attempts keyed by ts with indexes on child, tier, itemId, correct.
- On first load, seed the Items table from static data; write Attempts on every answer; update Item stats and box atomically with each attempt.

## Audio prompts (Web Speech API)

- Use SpeechSynthesis to read the word/sentence aloud on demand or automatically when the next item appears, with a visible and accessible toggle for audio on/off per child.
- Offer slower rate voice for beginning readers by default, with a setting to adjust rate and pitch in Parent mode.

## Theming guidelines

- Large typography and simple shapes; clear primary and secondary colors that meet contrast standards; avoid relying solely on color to convey correctness.
- Distinct button styles for the two main actions, with embossed or shadowed affordances to emphasize tap-ability at glance.

## Routing (optional)

- Keep a simple route structure: “/” (Start), “/session” (Session), “/stats” (Stats), with state preserved when navigating back to Start to switch Child/Mode quickly.
- Use client-side routing only; all data resides locally in IndexedDB, enabling offline use in typical browsers.

## Acceptance criteria

- Child can launch Session for selected Child/Tier/Mode and operate with two giant buttons on a tablet/phone without accidental taps due to adequate touch target size.
- Tier 2 remains disabled per child until Tier 1 words and Tier 1 sentences are completed per the mastery rules; unlocking is saved and persists across reloads.
- Incorrect items resurface sooner; correct items appear less frequently over time within the session and across sessions through stored box levels.
- Parents can view Stats per child/tier and export/import all progress as JSON files.
- “Speak” reliably reads the current item on modern browsers supporting SpeechSynthesis, with a visible fallback if unsupported.

## Seed content (words and sentences)

- Seed the database once on first run with these lists, generating stable item IDs like “Everley-1-word-idx-the” and defaulting box=1, seen=0, correct=0, incorrect=0.

```ts
export const data = {
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
```

## Key implementation notes

- When a session starts, build the queue from eligible items filtered by child/tier/type, and sort by lowest box and/or oldest lastSeen to prioritize review.
- “Got it” updates item stats, promotes the box (max 5), logs an Attempt, and pushes the item to the back of the queue; “Try again” demotes to box 1, logs Attempt, and reinserts 2 positions later to resurface soon.
- The Speak button invokes SpeechSynthesis to read the current item with a kid-friendly rate and selected voice; cache voice selection per child in storage.

## Minimal store and DB scaffolding

- Create a Dexie DB with items and attempts tables and a seedIfEmpty() utility invoked once at app boot; add indices for child/tier/type/box/lastSeen to accelerate “what’s due” queries.
- Build a Zustand store for selection, queue, and actions setSelection/markAnswer/next, using async actions to interact with Dexie and maintain a smooth UX.

## Testing checklist

- Accessibility: verify touch targets ≥ 48×48 dp and spacing; verify contrast ≥ 4.5:1 for normal text; ensure keyboard focus and ARIA announcements work for core actions.
- Functional: confirm Tier 2 locks/unlocks per child correctly; confirm queue behavior promotes/demotes and resurfaces items as intended; confirm progress persists after reload/offline.

## Nice-to-haves (later)

- Parent Settings: toggle auto-speak on next item; choose voice; set mastery threshold per tier; enable/disable animations.
- Multi-subject: add Subject field to Item for future math modules while reusing the same spaced repetition core and persistence.

This specification is ready for implementation with React, Zustand, Dexie, Material-inspired accessible touch sizing, WCAG AA contrast targets, and Web Speech API read-aloud to create a friendly, resilient reading app for Everley and Presley.

/**
 * upNextPicker — the ONE pick of "what should you work on now" (David
 * 2026-10-01: "a rotating highlighted top tab that changes based on need",
 * "unified algo", "what it suggests should not take more than a couple of
 * minutes. Short easy fun rewarding").
 *
 * PURE. It EXTENDS today's reps (`buildTodaysReps`, the selector the
 * Training Plan and Home already share) rather than ranking beside them — one
 * ranker, not two. Each pick is a BITE with a finish line, never a session:
 *
 *   first visit, no record    → 3 Deep Run puzzles
 *   your latest game's slip   → that one mistake puzzle
 *   an open weakness          → 2 puzzles on it
 *   a mistake puzzle grew     → that one puzzle at its new length
 *   an opening due / new      → one line of it
 *   free opening unclaimed    → pick it (paywall builds, free users only)
 *   a tier-1 thinking habit   → the "learn how to think" lesson (red: after
 *     red or grey               the slip; grey: before the warm-ups)
 *
 * Every reason is built from the record (G0) — the coach only voices it.
 * The first RING_SIZE picks of the day are today's ring; they are frozen for
 * the day by the caller so finishing one never reshuffles the others.
 */
import type { RepCandidate } from './trainingPlanSelector';
import { resolveRepRoute } from './repRouting';

/** Every kind of bite, ONE list. The type is derived from it, and the tables
 *  below are `Record`s over it, so a new kind fails to compile until someone
 *  answers where it finishes and how important it is (homeSuggestion). */
export const PICK_KINDS = [
  'deep-run', 'game-slip', 'weakness', 'grown', 'opening', 'free-opening',
  'warm-up', 'long', 'start', 'upload', 'learn', 'thinking',
] as const;
export type PickKind = typeof PICK_KINDS[number];

/** WHERE EACH KIND OF BITE ENDS — the surface whose natural finish line calls
 *  `activeBite.finishBite` (by kind) or `finishBiteByKey` (by key). `null` =
 *  no bite: a Home-only suggestion that never enters the ring (`upload`,
 *  `learn`), or a kind whose finish line is not wired yet. A pick with a null
 *  finish line in the ring would never close — `THINKING_LESSON_LIVE` may only
 *  turn on once `thinking` has a surface here (gated in the test, which also
 *  proves every named surface really calls `finishBite` with its kind). */
export const PICK_FINISH_LINE: Record<PickKind, { file: string; by: 'kind' | 'key' } | null> = {
  'deep-run': { file: 'src/components/Puzzles/DeepRunPage.tsx', by: 'kind' },
  'game-slip': { file: 'src/components/Puzzles/MyMistakesPage.tsx', by: 'kind' },
  grown: { file: 'src/components/Puzzles/MyMistakesPage.tsx', by: 'kind' },
  weakness: { file: 'src/components/Puzzles/AdaptivePuzzlePage.tsx', by: 'kind' },
  'warm-up': { file: 'src/components/Puzzles/AdaptivePuzzlePage.tsx', by: 'kind' },
  long: { file: 'src/components/Puzzles/AdaptivePuzzlePage.tsx', by: 'kind' },
  opening: { file: 'src/services/openingService.ts', by: 'kind' },
  'free-opening': { file: 'src/components/Openings/OpeningDetailPage.tsx', by: 'kind' },
  start: { file: 'src/services/activeBite.ts', by: 'key' },
  upload: null,
  learn: null,
  // OWED (learn-how-to-think P1): CoachTeachPage reads `?lesson=think` and calls
  // `finishBite('thinking')` at the lesson's end. Until then the loader never
  // supplies the signal (`THINKING_LESSON_LIVE`), so no unfinishable bite ships.
  thinking: null,
};

/** The "learn how to think" lesson goes live in Up next only once its surface
 *  reads `?lesson=think` and finishes the bite (P1). The ranking below is built
 *  and tested now; the loader passes the signal only when this is true. */
export const THINKING_LESSON_LIVE = false;

/** Where the student stands on the tier-1 thinking habits (see the board:
 *  what their move threatens, am I safe, their targets), read off the heat map
 *  by the loader. RED = a tier-1 skill is an open hole; GREY = never proven
 *  (grey means TEACH IT — a fresh install is all grey); GREEN = all proven. */
export interface ThinkingSignal {
  state: 'red' | 'grey' | 'green';
  /** The leading tier-1 skill's label (the red one with the most open slips). */
  skill: string;
}

export const THINKING_LESSON_PATH = '/coach/teach?lesson=think';

function thinkingPick(t: ThinkingSignal): UpNextPick {
  return {
    kind: 'thinking', key: 'up:thinking', hub: 'coach', path: THINKING_LESSON_PATH, bite: 'one lesson',
    label: 'Learn how to think',
    reason: t.state === 'red'
      ? `${t.skill} keeps costing you. Learn the habit that catches it: what their move changed, whether you are safe, where their targets are.`
      : 'Learn the habit strong players run every move: what their move changed, whether you are safe, where their targets are.',
    state: { repKey: 'up:thinking' },
  };
}

/** Which hub row a pick lives under — the row that pulses in place. */
export type PickHub = 'tactics:deep-run' | 'tactics:my mistakes' | 'tactics:daily' | 'tactics:long' | 'openings' | 'coach' | 'weaknesses' | 'home';

export interface UpNextPick {
  kind: PickKind;
  /** Stable for the day; also the rep-completion key. */
  key: string;
  /** Short title ("Fix your slip vs Rainbow_Warrior"). */
  label: string;
  /** One computed sentence: WHY this, now. Spoken once by the coach. */
  reason: string;
  /** The finish line, in the student's words ("2 puzzles"). */
  bite: string;
  path: string;
  state?: Record<string, unknown>;
  hub: PickHub;
}

export interface UpNextInput {
  reps: readonly RepCandidate[];
  /** The newest unsolved mistake puzzle from the student's latest own game. */
  latestGameSlip: { puzzleId: string; opponent: string | null; cpLoss: number } | null;
  /** A mistake puzzle that grew a move and is due. */
  grownPuzzle: { puzzleId: string; length: number } | null;
  /** Paywall live, not Pro, and a free-opening slot is open. */
  freeOpeningOpen: boolean;
  /** No games, no record — a first visit. */
  coldStart: boolean;
  /** Beginner mode's Start-here steps not yet done, in order (empty when the
   *  student is not in beginner mode or has finished them). */
  startSteps: readonly StartStep[];
  /** The tier-1 thinking habits' standing, or null when the lesson is not
   *  offered (not live yet, or no read). */
  thinking: ThinkingSignal | null;
}

/** THE START-HERE PATH (David 2026-10-02: "cater to new players. Explain
 *  fundamentals, teach an easy opening that follows the fundamentals").
 *  Fundamentals first, then the opening that does exactly what they say
 *  (the Italian: center, develop, castle), then a game the coach talks them
 *  through, then the same ideas as Black (…e5 and the Two Knights). */
export type StartStep = 'fundamentals' | 'italian' | 'first-game' | 'black-e5';
export const START_STEPS: readonly StartStep[] = ['fundamentals', 'italian', 'first-game', 'black-e5'];

const START_PICK: Record<StartStep, Omit<UpNextPick, 'kind' | 'key'>> = {
  fundamentals: {
    label: 'Start here: the fundamentals',
    reason: 'Every strong player starts here: control the center, bring out your pieces, keep your king safe.',
    bite: 'one section', path: '/coach/fundamentals', hub: 'home',
  },
  italian: {
    label: 'Your first opening: the Italian',
    reason: 'It does exactly what the fundamentals say. Take the center, develop your knight and bishop, castle.',
    bite: 'watch one line', path: '/openings/italian-game', hub: 'openings',
  },
  'first-game': {
    label: 'Play your first coached game',
    reason: 'Play a game and your coach talks you through it, move by move.',
    bite: 'one game', path: '/coach/teach', hub: 'home',
  },
  'black-e5': {
    label: 'As Black: meet e4 with e5',
    reason: 'The same ideas from the other side. Answer e4 with e5, develop your knights, castle.',
    bite: 'watch one line', path: '/openings/two-knights-defence', hub: 'openings',
  },
};

function startPick(step: StartStep): UpNextPick {
  return { kind: 'start', key: `up:start:${step}`, ...START_PICK[step] };
}

/** Puzzles a weakness bite asks for — two, a couple of minutes. */
export const WEAKNESS_BITE = 2;
/** Deep Run puzzles a first-visit bite asks for. */
export const DEEP_RUN_BITE = 3;

function deepRun(): UpNextPick {
  return {
    kind: 'deep-run', key: 'up:deep-run', label: 'Try a Deep Run',
    reason: 'Each puzzle is one move longer than the last. See how deep you can go.',
    bite: `${DEEP_RUN_BITE} puzzles`, path: '/tactics/deep-run',
    state: { repKey: 'up:deep-run', repCap: DEEP_RUN_BITE }, hub: 'tactics:deep-run',
  };
}

function weaknessPick(rep: RepCandidate): UpNextPick {
  const route = resolveRepRoute(rep);
  const key = `up:${rep.key}`;
  return {
    kind: 'weakness', key, label: rep.label,
    reason: `${rep.label} keeps coming up in your games. Two quick puzzles on it.`,
    bite: `${WEAKNESS_BITE} puzzles`,
    path: route.path,
    state: { ...(route.state ?? {}), autoStart: true, repKey: key, repCap: WEAKNESS_BITE },
    hub: 'tactics:my mistakes',
  };
}

function openingPick(rep: RepCandidate): UpNextPick {
  const key = `up:${rep.key}`;
  const due = rep.kind === 'srs';
  return {
    kind: 'opening', key, label: rep.label,
    reason: due ? `${rep.label} is due for review. Play one line of it.` : `You marked ${rep.label} but have not learned it yet. One line to start.`,
    bite: 'one line', path: `/openings/${rep.openingId ?? ''}`, state: { repKey: key }, hub: 'openings',
  };
}

/** Every candidate, best first. The caller takes the first RING_SIZE as the
 *  day's ring and the first not-done one as Up next. */
export function rankUpNext(i: UpNextInput): UpNextPick[] {
  const out: UpNextPick[] = [];
  // A beginner's next step leads, ahead of everything: a puzzle about a pin
  // means little before they know what the center is for.
  if (i.startSteps.length > 0) out.push(startPick(i.startSteps[0]));
  if (i.coldStart) out.push(deepRun());
  if (i.latestGameSlip) {
    const vs = i.latestGameSlip.opponent ? ` vs ${i.latestGameSlip.opponent}` : '';
    out.push({
      kind: 'game-slip', key: `up:slip:${i.latestGameSlip.puzzleId}`,
      label: `Fix your slip${vs}`,
      reason: `Your last game${vs} turned on one move. Find the one you missed.`,
      bite: '1 puzzle', path: '/tactics/mistakes',
      state: { openPuzzleId: i.latestGameSlip.puzzleId, repKey: `up:slip:${i.latestGameSlip.puzzleId}` },
      hub: 'tactics:my mistakes',
    });
  }
  // A RED tier-1 habit is the hole behind most lost games: the lesson that
  // teaches the habit comes right after the slip it would have caught.
  if (i.thinking?.state === 'red') out.push(thinkingPick(i.thinking));
  // Only weaknesses with a PUZZLE drill make a bite: that is the surface that
  // can say "done" after two. A board-vision or time-trouble rep stays on the
  // Training Plan, where its own surface finishes it.
  const drillable = (r: RepCandidate): boolean => r.kind === 'weakness' && resolveRepRoute(r).path === '/tactics/adaptive';
  const weakness = i.reps.find(drillable);
  if (weakness) out.push(weaknessPick(weakness));
  if (i.grownPuzzle) {
    out.push({
      kind: 'grown', key: `up:grown:${i.grownPuzzle.puzzleId}`,
      label: `A puzzle grew to ${i.grownPuzzle.length} moves`,
      reason: `One of your mistake puzzles grew a move. Can you find all ${i.grownPuzzle.length}?`,
      bite: '1 puzzle', path: '/tactics/mistakes',
      state: { openPuzzleId: i.grownPuzzle.puzzleId, repKey: `up:grown:${i.grownPuzzle.puzzleId}` },
      hub: 'tactics:my mistakes',
    });
  }
  const due = i.reps.find((r) => r.kind === 'srs');
  if (due) out.push(openingPick(due));
  if (i.freeOpeningOpen) {
    out.push({
      kind: 'free-opening', key: 'up:free-opening', label: 'Claim your free opening',
      reason: 'You have a free opening waiting. Pick the one you play.',
      bite: 'one tap', path: '/openings', state: { repKey: 'up:free-opening' }, hub: 'openings',
    });
  }
  for (const r of i.reps) {
    if (drillable(r) && r !== weakness) out.push(weaknessPick(r));
    if (r.kind === 'new') out.push(openingPick(r));
  }
  if (!i.coldStart) out.push(deepRun());
  // GREY = never proven = teach it (an unrated player gets the full lesson),
  // ahead of the always-available warm-ups. GREEN is proven: not offered.
  if (i.thinking?.state === 'grey') out.push(thinkingPick(i.thinking));
  // Always-available bites, so a first visit still gets a full ring of three.
  out.push(
    {
      kind: 'warm-up', key: 'up:warm-up', label: 'Two puzzles at your level',
      reason: 'Warm up with two puzzles picked for your level.',
      bite: '2 puzzles', path: '/tactics/adaptive',
      state: { autoStart: true, repKey: 'up:warm-up', repCap: 2 }, hub: 'tactics:daily',
    },
    {
      kind: 'long', key: 'up:long', label: 'One long puzzle',
      reason: 'One puzzle, three or four moves deep. Calculate the whole line.',
      bite: '1 puzzle', path: '/tactics/long',
      state: { autoStart: true, repKey: 'up:long', repCap: 1 }, hub: 'tactics:long',
    },
  );
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.key) ? false : (seen.add(p.key), true)));
}

/** Up next = the first pick not done today. */
export function currentPick(ranked: readonly UpNextPick[], done: ReadonlySet<string>): UpNextPick | null {
  return ranked.find((p) => !done.has(p.key)) ?? null;
}

/** A hub's own pick: the first not-done one that lives in that section (the
 *  hub's bar blinks its section's next step, whatever Home is showing). */
export function sectionPick(ranked: readonly UpNextPick[], done: ReadonlySet<string>, inSection: (hub: PickHub) => boolean): UpNextPick | null {
  return ranked.find((p) => inSection(p.hub) && !done.has(p.key)) ?? null;
}

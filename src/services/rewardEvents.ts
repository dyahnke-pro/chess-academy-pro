/**
 * rewardEvents — the LEAF the reward layer publishes through (zero imports).
 *
 * David 2026-10-01: "bright colors and sound with vibrations … we want to
 * trigger the dopamine response", arcade NOT casino. ONE vocabulary of reward
 * moments for every surface (puzzles, deep-run, Learn) so the sound, light and
 * haptic grammar cannot drift between tabs (capability parity).
 *
 * The pure service (`rewardService`) decides the sound + haptic; the overlay
 * (`RewardLayer`) subscribes here to draw the light. A leaf, so a fact-computer
 * can name a reward without importing React, Dexie or the store.
 */

/** Every moment that may earn a reward. Puzzle moments first, then Learn's. */
export type RewardKind =
  | 'pip'        // a correct move inside a puzzle line
  | 'solved'     // the puzzle's final move
  | 'levelUp'    // deep-run: the next puzzle is longer
  | 'rankUp'     // deep-run: a new rank tier
  | 'newBest'    // deep-run: beat the remembered best
  | 'miss'       // a wrong move — soft, never punishing
  | 'decision'   // Learn: best move found at a REAL decision
  | 'saved'      // Learn: a standing threat parried
  | 'punished'   // Learn: their mistake taken
  | 'gem'        // Learn: the hinted opportunity found
  | 'onlyMove'   // Learn: the one move that holds
  | 'proven';    // Learn: a capability turned GREEN

export interface RewardEvent {
  kind: RewardKind;
  /** Square the light bursts from ("e4"); absent → screen centre. */
  square?: string;
  /** Position in a line (pip index, 0-based) — drives the rising pitch. */
  step?: number;
  /** Stable variety key (ply, puzzle id hash) — palette + burst shape rotate
   *  on it, never Math.random, so a replay looks the same (determinism law). */
  seed?: number;
  /** Banner text for the overlay ("LEVEL UP · 4 MOVES", "PINS: PROVEN"). */
  label?: string;
}

type Listener = (e: RewardEvent) => void;
const listeners = new Set<Listener>();

export function onReward(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitRewardEvent(e: RewardEvent): void {
  for (const fn of listeners) {
    try { fn(e); } catch { /* a broken subscriber must not stop the others */ }
  }
}

/** Deterministic small hash for seeds (puzzle ids, FENs). */
export function rewardSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * THE TACTICS RUNG (WO-FOCUS-TACTICS-01, David 2026-10-22: "the user stats
 * determine how difficult it is to find" → "I don't want just my elo to
 * dictate that. Should be how well I spot the tactics and focuses of the
 * game"). PURE.
 *
 * The rung is how hard the chances on YOUR side are to find, and it is the
 * tier — how much the coach scaffolds a miss. It never makes the coach play
 * stronger (the rating's one job stays the opponent's strength).
 *
 *   rung 0 — beginner: a free piece (the piece that just moved there);
 *   rung 1 — intermediate: a loose piece won by a two-move shot, or one a
 *            guard walked away from;
 *   rung 2 — strong intermediate: a shot one key move deeper, or a piece that
 *            looks guarded and loses on the count;
 *   rung 3 — advanced: a 3–4 move calculation, or an Intermediate/Advanced motif.
 *
 * WHAT MOVES IT: only what you spot. The games played at the current rung are
 * read the way the Campaign reads a card at its setting (`dialState`): the
 * last `SETTING_WINDOW` games at this rung. Up a rung once they hold
 * `RUNG_UP_FINDS` unprompted finds at the rung (either seat) found at least
 * `STEP_BACK_BELOW` of the time; back a rung once `MIN_GAMES_BEFORE_BACK`
 * games at it hold below that. The bar and the window are the Campaign's own
 * numbers — one ladder rule in the app, read here.
 */
import type { HeatState } from '../../services/holdRate';
import { MIN_GAMES_BEFORE_BACK, SETTING_WINDOW, STEP_BACK_BELOW } from '../../missions/dialState';

/** How hard a chance is to find: 0 the plainest, 3 the subtlest. The SAME
 *  scale grades a chance on the board (`focusChances`), the coach's plant
 *  (`focusPlant`) and the student's rung, so the three can never disagree. */
export type TacticsRung = 0 | 1 | 2 | 3;

export interface RungTier {
  /** "Beginner" — said on a rung-up, shown on the game-over card. */
  title: string;
  /** A miss stops the board: a clue, then Try again / Play on. Off from rung 2
   *  — the coach punishes and the recap shows it (David 2026-10-22: "advanced
   *  players and strong intermediate players the take back should turn off"). */
  pauses: boolean;
  /** A second miss at one decision offers Show me — the student's tap, never
   *  automatic (David: "Never show the answer! Provide a 'show me' button
   *  after the second miss for beginners"). */
  showMe: boolean;
  /** The game's first chance is asked out loud. */
  asksFirst: boolean;
  /** Chances on your side the coach makes sure of a game, natural ones
   *  included (David: "Beginners maybe more than once"). */
  chances: number;
}

export const RUNG_TIERS: Record<TacticsRung, RungTier> = {
  0: { title: 'Beginner', pauses: true, showMe: true, asksFirst: true, chances: 3 },
  1: { title: 'Intermediate', pauses: true, showMe: false, asksFirst: false, chances: 2 },
  2: { title: 'Strong intermediate', pauses: false, showMe: false, asksFirst: false, chances: 1 },
  3: { title: 'Advanced', pauses: false, showMe: false, asksFirst: false, chances: 1 },
};

export const TOP_RUNG: TacticsRung = 3;

/** Unprompted finds at the rung, in the window, that step it up (David: "3
 *  unprompted finds (either seat) in the last 5 games"). */
export const RUNG_UP_FINDS = 3;

/** One finished focus game, read at the rung it was played at: its UNPROMPTED
 *  answers to chances at least that hard. A prompted chance counts neither
 *  way (the symmetric scoring rule). */
export interface RungGame {
  rung: TacticsRung;
  found: number;
  missed: number;
  at: number;
}

/** A first focus game, with nothing at a rung yet: the rung the record's own
 *  hold on your side reads (the same mapping the plant used before rungs
 *  existed). Never the rating. */
export const SEED_RUNG: Record<HeatState, TacticsRung> = { red: 0, grey: 0, short: 1, green: 2 };

export interface RungState {
  rung: TacticsRung;
  /** The games played at this rung that the window reads (oldest first). */
  window: RungGame[];
  finds: number;
  chances: number;
}

/** The games at the CURRENT rung: the trailing run of games played at the
 *  last game's rung — the games before a step were played at another one. */
function atCurrent(games: readonly RungGame[]): RungGame[] {
  const sorted = [...games].sort((a, b) => a.at - b.at);
  const last = sorted[sorted.length - 1];
  if (!last) return [];
  let i = sorted.length - 1;
  while (i > 0 && sorted[i - 1].rung === last.rung) i -= 1;
  return sorted.slice(i);
}

function tally(window: readonly RungGame[]): { finds: number; chances: number } {
  let finds = 0;
  let chances = 0;
  for (const g of window) { finds += g.found; chances += g.found + g.missed; }
  return { finds, chances };
}

/** Where the student stands: the last game's rung, stepped by its window. */
export function rungFrom(games: readonly RungGame[], seed: TacticsRung): RungState & { step: 'up' | 'back' | null } {
  const run = atCurrent(games);
  if (run.length === 0) return { rung: seed, window: [], finds: 0, chances: 0, step: null };
  const rung = run[run.length - 1].rung;
  const window = run.slice(-SETTING_WINDOW);
  const { finds, chances } = tally(window);
  const rate = chances > 0 ? finds / chances : 0;
  if (rung < TOP_RUNG && finds >= RUNG_UP_FINDS && rate >= STEP_BACK_BELOW) {
    return { rung: (rung + 1) as TacticsRung, window: [], finds: 0, chances: 0, step: 'up' };
  }
  if (rung > 0 && run.length >= MIN_GAMES_BEFORE_BACK && chances > 0 && rate < STEP_BACK_BELOW) {
    return { rung: (rung - 1) as TacticsRung, window: [], finds: 0, chances: 0, step: 'back' };
  }
  return { rung, window, finds, chances, step: null };
}

/** "2 of 3 finds to Intermediate" — progress to the next rung, counting this
 *  game; null at the top rung. */
export function rungProgressLine(state: Pick<RungState, 'rung' | 'finds' | 'chances'>): string | null {
  if (state.rung >= TOP_RUNG) return null;
  const next = RUNG_TIERS[(state.rung + 1) as TacticsRung].title;
  // BOTH HALVES OF THE GATE (prod record 2026-10-23: "3 of 3 finds to
  // Intermediate" on a game that found none of its chances). A rung-up needs
  // the finds AND the rate (`rungFrom`); once the finds are in, the line says
  // the rate that is still missing, never a count that reads as done.
  if (state.finds >= RUNG_UP_FINDS && state.chances > 0 && state.finds / state.chances < STEP_BACK_BELOW) {
    return `${state.finds} of ${state.chances} found lately — find ${RATE_WORDS} to reach ${next}`;
  }
  const n = Math.min(state.finds, RUNG_UP_FINDS);
  return `${n} of ${RUNG_UP_FINDS} finds to ${next}`;
}
/** The rung-up rate in words ("3 of every 4" for 75%). */
const RATE_WORDS = STEP_BACK_BELOW === 0.75 ? '3 of every 4' : `${Math.round(STEP_BACK_BELOW * 100)}% of them`;

/** Said on a rung-up: "Tactics: Intermediate!" */
export function rungUpLine(rung: TacticsRung): string {
  return `Tactics: ${RUNG_TIERS[rung].title}!`;
}

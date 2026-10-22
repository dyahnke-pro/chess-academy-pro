/**
 * THE FOCUS GAME'S SETUP (WO-FOCUS-TACTICS-01, `docs/LEARN-FOCUS.md` §6) —
 * pure. There is no picker any more: every Learn free-play game is the tactics
 * focus (David 2026-10-22: "Tactics and loose pieces should always be a
 * focus"). What the record decides is HOW HARD:
 *   - the RUNG (`focusRung`) — read off the finished focus games at it, and
 *     on a record with none yet, seeded from the record's own hold on your
 *     side (never the rating);
 *   - the open MOTIF LEVELS (WO-MOTIFS-01) — a level opens when the one before
 *     it holds ≥ 75% in games and no motif in it is red;
 *   - the TARGET PLY — where the first chance on your side lands this game,
 *     drawn at random between move 6 and move 12 (the opponent's behaviour is
 *     random on purpose — CLAUDE.md "Why determinism").
 */
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { holdState, type HeatState, type HoldRecord } from '../../services/holdRate';
import { MOTIF_LEVELS, levelTags, motifsAt, openLevels, tagsOfMotif, type MotifLevel } from '../../data/tacticMotifs';
import { PREGAME_LINE, openSeatTags, type FocusId, type FocusSeat } from './focusCard';
import { rungFrom, SEED_RUNG, type RungGame, type TacticsRung } from './focusRung';

export interface FocusSetupInput {
  /** The USE profile's hold record per tag (`summariseEvidence(...).get(tag).hold`). */
  holds: ReadonlyMap<MisconceptionTagId, HoldRecord>;
  /** The finished focus games, each at the rung it was played at. */
  games: readonly RungGame[];
  /** A number in [0, 1) — `Math.random` on the page, fixed in a test. */
  rand: () => number;
}

export interface FocusSetup {
  focus: FocusId;
  /** How hard your side's chances are this game, and how a miss is handled. */
  rung: TacticsRung;
  /** Where the rung came from: the games at it, or the record's hold (a
   *  first focus game). */
  reason: 'games' | 'seed';
  /** The games at this rung the window already holds, and their unprompted
   *  answers — this game adds to them (the progress line, the rung-up). */
  window: RungGame[];
  /** The hold state of each seat (the seed reads your side). */
  seatStates: Record<FocusSeat, HeatState>;
  /** The motif levels open to this student: only their motifs are asked or
   *  steered toward; the rest are still recorded. */
  levels: MotifLevel[];
  /** The board ply (1-based, the runner's count) from which the coach makes
   *  sure your first chance lands. */
  targetPly: number;
  /** The one line said before move 1. */
  line: string;
}

/** The hold over a set of tags, pooled: one number for the whole set. */
export function pooledHold(tags: Iterable<MisconceptionTagId>, holds: ReadonlyMap<MisconceptionTagId, HoldRecord>): HoldRecord {
  let posed = 0; let held = 0; let heldWeight = 0; let missed = 0;
  for (const t of new Set(tags)) {
    const h = holds.get(t);
    if (!h) continue;
    posed += h.posed; held += h.held; heldWeight += h.heldWeight; missed += h.missed;
  }
  return { posed, held, heldWeight, missed, rate: heldWeight + missed > 0 ? heldWeight / (heldWeight + missed) : null };
}

const HOLDS: ReadonlySet<HeatState> = new Set<HeatState>(['short', 'green']);

/** THE MOTIF LEVELS OPEN TO THIS STUDENT (WO-MOTIFS-01 decision 2): a level
 *  opens when the one before it HOLDS in games — its tags pooled over both
 *  seats at ≥ 75%, AND no motif in it red. A pool alone hides a failing motif:
 *  loose pieces held at 95% would carry forks at 40% past the bar. A motif
 *  never posed (grey) does not block — the record cannot test it, and its
 *  level stays open, so it is still taught when it comes up. */
export function openMotifLevels(holds: FocusSetupInput['holds']): Set<MotifLevel> {
  return openLevels((l) => HOLDS.has(holdState(pooledHold(levelTags(l), holds)))
    && motifsAt(l).every((m) => holdState(pooledHold(tagsOfMotif(m.id), holds)) !== 'red'));
}

/** The first chance lands between move 6 and move 12 — board plies 11–24 for
 *  White, 12–24 for Black (the runner's 1-based ply). */
export const TARGET_FIRST_PLY = 11;
export const TARGET_LAST_PLY = 24;

export function setUpFocusGame(input: FocusSetupInput): FocusSetup {
  const levels = openMotifLevels(input.holds);
  const seatStates: Record<FocusSeat, HeatState> = {
    defend: holdState(pooledHold(openSeatTags('tactics', 'defend', levels), input.holds)),
    exploit: holdState(pooledHold(openSeatTags('tactics', 'exploit', levels), input.holds)),
  };
  const r = rungFrom(input.games, SEED_RUNG[seatStates.exploit]);
  const span = TARGET_LAST_PLY - TARGET_FIRST_PLY + 1;
  const targetPly = TARGET_FIRST_PLY + Math.min(span - 1, Math.floor(Math.max(0, input.rand()) * span));
  return {
    focus: 'tactics',
    rung: r.rung,
    reason: input.games.length > 0 ? 'games' : 'seed',
    window: r.window,
    seatStates,
    levels: MOTIF_LEVELS.filter((l) => levels.has(l)),
    targetPly,
    line: PREGAME_LINE,
  };
}

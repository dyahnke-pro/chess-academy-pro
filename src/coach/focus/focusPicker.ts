/**
 * THE FOCUS PICKER (WO-LEARN-FOCUS-01, `docs/LEARN-FOCUS.md` §6) — pure. The
 * user's record decides, never the rating.
 *
 * A seat's state is the ONE hold rate (`holdRate`) pooled over its tags; a
 * focus is as proven as its weaker seat (grey counts below short). The ladder
 * gates come first: tactics and the kings wait until loose pieces holds
 * at least 75% — on a record where loose pieces is red, it is the focus every
 * game. Among the eligible, never-green focuses: last game's focus while it is
 * still red or short → the red focus with the most misses in the last five
 * games → the first grey on the ladder → the short focus with the most misses →
 * with every focus green, the least recently taught, as a silent watch.
 */
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { holdState, type HeatState, type HoldRecord } from '../../services/holdRate';
import { foundOf } from './focusLines';
import { FOCUS_CARDS, FOCUS_LADDER, UNANNOUNCED_LINE, openSeatTags, type FocusGate, type FocusId, type FocusMode, type FocusSeat } from './focusCard';
import { MOTIF_LEVELS, levelTags, motifsAt, openLevels, tagsOfMotif, type MotifLevel } from '../../data/tacticMotifs';

export interface FocusPickInput {
  /** The USE profile's hold record per tag (`summariseEvidence(...).get(tag).hold`). */
  holds: ReadonlyMap<MisconceptionTagId, HoldRecord>;
  /** Weighted misses per tag across the user's last five games. */
  recentMisses: ReadonlyMap<MisconceptionTagId, number>;
  /** Last focus game's result, when there was one. */
  last: { focus: FocusId; found: number; chances: number } | null;
  /** When each focus was last taught (ms). */
  lastTaught: Partial<Record<FocusId, number>>;
}

export type FocusReason = 'continue' | 'red' | 'grey' | 'short' | 'all-green';

export interface FocusPick {
  focus: FocusId;
  state: HeatState;
  mode: FocusMode;
  reason: FocusReason;
  seatStates: Record<FocusSeat, HeatState>;
  /** The seat the game's lines lean on: the weaker one. */
  weakerSeat: FocusSeat;
  /** The motif levels open to this student (WO-MOTIFS-01): only their motifs
   *  are asked or decide the lesson; the rest are still recorded. */
  levels: MotifLevel[];
  /** The user is told the focus before the game (red and grey). */
  announced: boolean;
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
 *  seats at ≥ 75% (the same hold rate the lesson gates read), AND no motif in
 *  it red. A pool alone hides a failing motif: loose pieces held at 95% would
 *  carry forks at 40% past the bar. A motif never posed (grey) does not block
 *  — the record cannot test it, and its level stays open, so it is still
 *  taught when it comes up. */
export function openMotifLevels(holds: FocusPickInput['holds']): Set<MotifLevel> {
  return openLevels((l) => HOLDS.has(holdState(pooledHold(levelTags(l), holds)))
    && motifsAt(l).every((m) => holdState(pooledHold(tagsOfMotif(m.id), holds)) !== 'red'));
}

type Levels = ReadonlySet<MotifLevel>;

function seatState(id: FocusId, seat: FocusSeat, holds: FocusPickInput['holds'], levels: Levels): HeatState {
  return holdState(pooledHold(openSeatTags(id, seat, levels), holds));
}

/** A focus is as proven as its WEAKER seat, and a seat never posed (grey) is
 *  not proven: one seat's evidence must not make a focus whose other seat was
 *  never asked read green. */
function focusState(id: FocusId, holds: FocusPickInput['holds'], levels: Levels): HeatState {
  const d = seatState(id, 'defend', holds, levels);
  const x = seatState(id, 'exploit', holds, levels);
  return STATE_RANK[d] <= STATE_RANK[x] ? d : x;
}

function gateMet(g: FocusGate, holds: FocusPickInput['holds'], levels: Levels): boolean {
  return HOLDS.has(g.seat ? seatState(g.focus, g.seat, holds, levels) : focusState(g.focus, holds, levels));
}

function misses(tags: Iterable<MisconceptionTagId>, recent: FocusPickInput['recentMisses']): number {
  let n = 0;
  for (const t of new Set(tags)) n += recent.get(t) ?? 0;
  return n;
}

/** How much teaching a state needs, most first. GREY ranks with the weak
 *  states, above short: a skill never posed is taught in full (CLAUDE.md
 *  "GREY MEANS TEACH IT"). Ranked below short, prod tactics game 1 — defend
 *  seat grey, exploit short — read as a quiet unannounced test. */
const STATE_RANK: Record<HeatState, number> = { red: 0, grey: 1, short: 2, green: 3 };

const MODE_OF: Record<HeatState, FocusMode> = { red: 'teach', grey: 'teach', short: 'test', green: 'watch' };

export function pickFocus(input: FocusPickInput): FocusPick {
  const { holds } = input;
  const levels = openMotifLevels(holds);
  const eligible = FOCUS_LADDER.filter((id) => FOCUS_CARDS[id].gates.every((g) => gateMet(g, holds, levels)));
  const stateOf = new Map(FOCUS_LADDER.map((id) => [id, focusState(id, holds, levels)] as const));
  const missesOf = (id: FocusId): number => misses([...openSeatTags(id, 'defend', levels), ...openSeatTags(id, 'exploit', levels)], input.recentMisses);
  const open = eligible.filter((id) => stateOf.get(id) !== 'green');

  let focus: FocusId;
  let reason: FocusReason;
  const lastOpen = input.last && open.includes(input.last.focus) && ['red', 'short'].includes(stateOf.get(input.last.focus) as HeatState);
  const reds = open.filter((id) => stateOf.get(id) === 'red');
  const greys = open.filter((id) => stateOf.get(id) === 'grey');
  const shorts = open.filter((id) => stateOf.get(id) === 'short');
  const mostMisses = (ids: FocusId[]): FocusId => [...ids].sort((a, b) => missesOf(b) - missesOf(a) || FOCUS_LADDER.indexOf(a) - FOCUS_LADDER.indexOf(b))[0];
  if (lastOpen && input.last) { focus = input.last.focus; reason = 'continue'; }
  else if (reds.length > 0) { focus = mostMisses(reds); reason = 'red'; }
  else if (greys.length > 0) { focus = greys[0]; reason = 'grey'; }
  else if (shorts.length > 0) { focus = mostMisses(shorts); reason = 'short'; }
  else {
    // Every eligible focus green: the least recently taught, as a silent watch.
    focus = [...eligible].sort((a, b) => (input.lastTaught[a] ?? 0) - (input.lastTaught[b] ?? 0))[0] ?? FOCUS_LADDER[0];
    reason = 'all-green';
  }

  const state = stateOf.get(focus) as HeatState;
  const seatStates: Record<FocusSeat, HeatState> = { defend: seatState(focus, 'defend', holds, levels), exploit: seatState(focus, 'exploit', holds, levels) };
  const weakerSeat: FocusSeat = STATE_RANK[seatStates.exploit] < STATE_RANK[seatStates.defend] ? 'exploit' : 'defend';
  const mode = MODE_OF[state];
  const announced = mode === 'teach';
  const levelList = MOTIF_LEVELS.filter((l) => levels.has(l));
  return { focus, state, mode, reason, seatStates, weakerSeat, levels: levelList, announced, line: announced ? announceLine(focus, state, weakerSeat, input, levels) : UNANNOUNCED_LINE };
}

/** The pre-game line for a named focus: the focus, then ONE real fact from the
 *  record (G0 — a count the record holds, never a guess). */
function announceLine(focus: FocusId, state: HeatState, seat: FocusSeat, input: FocusPickInput, levels: Levels): string {
  const card = FOCUS_CARDS[focus];
  if (state === 'grey') return `${card.announce} ${card.greyWhy}`;
  if (input.last?.focus === focus && input.last.chances > 0) {
    return `${card.announce} Last game ${foundOf(input.last.found, input.last.chances)}.`;
  }
  const n = Math.round(misses(openSeatTags(focus, seat, levels), input.recentMisses));
  if (n > 0) {
    const words = card.seats[seat].missesWords(n);
    return `${card.announce} In your last few games, ${words}.`;
  }
  return `${card.announce} ${card.greyWhy}`;
}

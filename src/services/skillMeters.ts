/**
 * skillMeters — the student's level per SKILL, read off the same rows the heat
 * map reads (David 2026-10-18: "Track identical to the heat map" … "the
 * stronger the player the less the easy ones count").
 *
 * PURE. Every heat-map skill belongs to exactly one of nine meters
 * (`METER_OF_TAG` is a Record over the tag union, so a new skill fails to
 * compile until someone decides its meter). Each meter is a rating, updated
 * like a puzzle rating (Glicko-1): every scored event is a "game" against the
 * question's DIFFICULTY.
 *   - answer a question far below your level → almost nothing;
 *   - answer one above it → a big gain;
 *   - miss an easy one → a big drop; miss a hard one → a small drop.
 * Two more dials, both computed:
 *   - FAMILIARITY: a gain at a position you have already answered right pays
 *     less each time (a line played right a dozen times pays nothing); a slip
 *     there still costs in full — forgetting something you knew is signal.
 *   - SLIP WEIGHT: an inaccuracy counts half (`slipWeight`, the record's own).
 * ONE POSITION, ONE SCORE: the right-answer record and the mistake record can
 * hold the same position (measured: 158 of 438 misses in David's record), so
 * events are keyed by position + move and the mistake row wins.
 * A level moves both ways — "If it drains and we don't step back a level then
 * it's not accurate" (David).
 */
import type { MisconceptionTagId } from '../data/misconceptionTags';

export type SkillMeterId =
  | 'openings' | 'development' | 'centre' | 'king-safety' | 'tactics'
  | 'threats' | 'planning' | 'endgames' | 'calculation';

export const SKILL_METERS: readonly { id: SkillMeterId; label: string }[] = [
  { id: 'openings', label: 'Openings' },
  { id: 'development', label: 'Development' },
  { id: 'centre', label: 'Centre & space' },
  { id: 'king-safety', label: 'King safety' },
  { id: 'tactics', label: 'Tactics' },
  { id: 'threats', label: 'Threats & material' },
  { id: 'calculation', label: 'Calculation' },
  { id: 'planning', label: 'Planning & structure' },
  { id: 'endgames', label: 'Endgames' },
];

/** Every heat-map skill → its meter. `other` is the review queue, not a skill. */
export const METER_OF_TAG: Record<Exclude<MisconceptionTagId, 'other'>, SkillMeterId> = {
  'left-book-early': 'openings',
  'neglected-development': 'development',
  'tempo-handed': 'development',
  'misplaced-piece': 'development',
  'space-conceded': 'centre',
  'capture-toward-centre': 'centre',
  'king-stuck-center': 'king-safety',
  'weakened-king-safety': 'king-safety',
  'missed-tactic': 'tactics',
  'hung-material': 'threats',
  'missed-opponents-threat': 'threats',
  'poisoned-pawn': 'threats',
  'greedy-pawn-grab': 'threats',
  'bad-trade': 'threats',
  'bad-trade-material': 'threats',
  'calculation-depth': 'calculation',
  'overvalued-attack': 'calculation',
  'no-plan': 'planning',
  'created-pawn-weakness': 'planning',
  'overextended-pawn': 'planning',
  'mistimed-pawn-break': 'planning',
  'passive-king-endgame': 'endgames',
  'botched-conversion': 'endgames',
  'passed-pawn-neglected': 'endgames',
  'passive-rook': 'endgames',
};

export function meterOfTag(tag: string): SkillMeterId | null {
  return (METER_OF_TAG as Record<string, SkillMeterId>)[tag] ?? null;
}

/** One scored moment: the board asked, the student answered (or slipped). */
export interface SkillEvent {
  meter: SkillMeterId;
  /** Position + move — the one-position-one-score key. */
  key: string;
  /** 1 = answered right, 0 = slipped. */
  score: 0 | 1;
  /** The question's difficulty, on the rating scale. */
  difficulty: number;
  /** 0..1 — slip weight for a miss (inaccuracy ½), familiarity for a gain. */
  weight: number;
  at: number;
}

export interface MeterState {
  rating: number;
  /** Rating deviation: how unsure we still are. */
  rd: number;
  events: number;
}

export interface SkillMeter extends MeterState {
  id: SkillMeterId;
  label: string;
  level: number;
  /** 0..1 toward the next level. */
  toNext: number;
  /** Enough evidence to show a level; below this it reads "not rated yet". */
  rated: boolean;
}

const Q = Math.LN10 / 400;
/** Every new skill starts here; the student's overall rating centres it. */
export const START_RD = 350;
/** How unsure a question's difficulty is. */
const DIFFICULTY_RD = 120;
/** Never fully settle: a level must stay able to move (it drops, too). */
const RD_FLOOR = 60;
/** A meter shows a level once it is this sure. */
export const RATED_RD = 150;
/** Each repeat of a position answered right pays this fraction of the last. */
export const FAMILIARITY_DECAY = 0.8;
export const LEVEL_WIDTH = 100;
const LEVEL_BASE = 400;

const g = (rd: number): number => 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));

/** One Glicko-1 step against the question, scaled by the event's weight.
 *  Returns the new state; the caller reads `rating - before.rating` as the
 *  coin. */
export function scoreEvent(s: MeterState, e: Pick<SkillEvent, 'score' | 'difficulty' | 'weight'>): MeterState {
  if (e.weight <= 0) return { ...s, events: s.events + 1 };
  const gj = g(DIFFICULTY_RD);
  const expected = 1 / (1 + Math.pow(10, (-gj * (s.rating - e.difficulty)) / 400));
  const dInv = Q * Q * gj * gj * expected * (1 - expected) * e.weight;
  const denom = 1 / (s.rd * s.rd) + dInv;
  const rating = s.rating + ((Q / denom) * gj * (e.score - expected) * e.weight);
  const rd = Math.max(RD_FLOOR, Math.sqrt(1 / denom));
  return { rating, rd, events: s.events + 1 };
}

export function levelOf(rating: number): { level: number; toNext: number } {
  const x = (rating - LEVEL_BASE) / LEVEL_WIDTH;
  const level = Math.max(1, Math.floor(x) + 1);
  return { level, toNext: rating < LEVEL_BASE ? 0 : x - Math.floor(x) };
}

/** Fold every event into nine meters, oldest first. */
export function computeSkillMeters(events: readonly SkillEvent[], startRating: number): SkillMeter[] {
  const state = new Map<SkillMeterId, MeterState>();
  for (const e of [...events].sort((a, b) => a.at - b.at)) {
    const s = state.get(e.meter) ?? { rating: startRating, rd: START_RD, events: 0 };
    state.set(e.meter, scoreEvent(s, e));
  }
  return SKILL_METERS.map(({ id, label }) => {
    const s = state.get(id) ?? { rating: startRating, rd: START_RD, events: 0 };
    const { level, toNext } = levelOf(s.rating);
    return { id, label, ...s, level, toNext, rated: s.rd <= RATED_RD };
  });
}

/** The raw rows, as the heat map reads them. */
export interface HeldRow { tag: string; outcome: 'held' | 'broken'; fen: string; playedSan: string; recordedAt: number; prompted: boolean; origin: string }
export interface SlipRow { tag: string; fen: string; playedSan: string; createdAt: number; grade?: string; source: string }

/** Origins that are not the student answering on their own: a lesson tap or
 *  a reading card is KNOW evidence, never a scored game move. */
const NOT_SCORED_ORIGINS = new Set(['lesson', 'reading']);
const NOT_A_GAME_SLIP = new Set(['lesson', 'puzzle']);

/**
 * Turn the two records into events — one per position — with difficulty from
 * the caller (the computed source lives outside this leaf). A gain at a
 * position already answered right pays FAMILIARITY_DECAY^n.
 */
export function eventsFromRecord(
  held: readonly HeldRow[],
  slips: readonly SlipRow[],
  difficultyOf: (row: { tag: string; fen: string; san: string; score: 0 | 1 }) => number,
): SkillEvent[] {
  const byKey = new Map<string, SkillEvent>();
  for (const r of slips) {
    if (NOT_A_GAME_SLIP.has(r.source)) continue;
    const meter = meterOfTag(r.tag);
    if (!meter) continue;
    const key = `${r.fen}|${r.playedSan}`;
    byKey.set(key, { meter, key, score: 0, difficulty: difficultyOf({ tag: r.tag, fen: r.fen, san: r.playedSan, score: 0 }), weight: r.grade === 'inaccuracy' ? 0.5 : 1, at: r.createdAt });
  }
  const timesRight = new Map<string, number>();
  for (const r of [...held].sort((a, b) => a.recordedAt - b.recordedAt)) {
    if (NOT_SCORED_ORIGINS.has(r.origin)) continue;
    const meter = meterOfTag(r.tag);
    if (!meter) continue;
    const key = `${r.fen}|${r.playedSan}`;
    if (byKey.has(key)) continue;
    if (r.outcome === 'broken') {
      byKey.set(key, { meter, key, score: 0, difficulty: difficultyOf({ tag: r.tag, fen: r.fen, san: r.playedSan, score: 0 }), weight: 1, at: r.recordedAt });
      continue;
    }
    // A hint or an announcement is not proof: no gain from a prompted answer.
    if (r.prompted) continue;
    const pos = r.fen.split(' ').slice(0, 4).join(' ');
    const n = timesRight.get(pos) ?? 0;
    timesRight.set(pos, n + 1);
    byKey.set(`${key}#${n}`, { meter, key, score: 1, difficulty: difficultyOf({ tag: r.tag, fen: r.fen, san: r.playedSan, score: 1 }), weight: Math.pow(FAMILIARITY_DECAY, n), at: r.recordedAt });
  }
  return [...byKey.values()];
}

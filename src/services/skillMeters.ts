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
 *   - an inaccuracy is a clean answer here, exactly as the record and the
 *     calibration score it (`movePlayedCleanly`): one rule, both sides.
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
  /** How sharply the question separates players (the fitted logistic scale;
   *  400 = a standard rating game). A flatter skill moves the meter less. */
  scale?: number;
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

/** Points per tenfold change in odds — the standard rating scale. */
const ELO_SCALE = 400;
const Q = Math.LN10 / ELO_SCALE;
/** Every new skill starts here; the student's overall rating centres it. */
export const START_RD = 350;
/** How unsure a question's difficulty is. */
const DIFFICULTY_RD = 120;
/** Never fully settle: a level must stay able to move (it drops, too). */
const RD_FLOOR = 60;
/** Each repeat of a position answered right pays this fraction of the last. */
export const FAMILIARITY_DECAY = 0.8;
export const LEVEL_WIDTH = 100;
const LEVEL_BASE = 400;

const g = (rd: number): number => 1 / Math.sqrt(1 + (3 * Q * Q * rd * rd) / (Math.PI * Math.PI));

/** One Glicko-1 step against the question, scaled by the event's weight.
 *  Returns the new state; the caller reads `rating - before.rating` as the
 *  coin. */
export function scoreEvent(s: MeterState, e: Pick<SkillEvent, 'score' | 'difficulty' | 'weight' | 'scale'>): MeterState {
  if (e.weight <= 0) return { ...s, events: s.events + 1 };
  const scale = e.scale ?? ELO_SCALE;
  const q = Math.LN10 / scale;
  const gj = g(DIFFICULTY_RD);
  const expected = 1 / (1 + Math.pow(10, (-gj * (s.rating - e.difficulty)) / scale));
  const dInv = q * q * gj * gj * expected * (1 - expected) * e.weight;
  const denom = 1 / (s.rd * s.rd) + dInv;
  const rating = s.rating + ((q / denom) * gj * (e.score - expected) * e.weight);
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
  // ANCHORED TO THE STUDENT'S OWN RATING, ON THE STANDARD SCALE (2026-10-18).
  // Holding a question is nearly as common at 600 as at 2200 (88% vs 96%), so
  // read through the population's flat curves a 2-point gap in hold rate is
  // 1,000 rating points, and any bias that touches every skill alike — the
  // time control they play, the engine that judged their moves — moves every
  // meter by hundreds (a 1414 player read Level 22–24, then King safety 600).
  // So the level is not read off those curves. For each meter: how the student
  // holds against what the population holds on the SAME questions at their
  // rating (log-odds), re-centred on their other skills so a shared bias
  // cancels, and converted at the standard 400-points-per-tenfold-odds scale.
  // A thin meter is shrunk toward their rating by pseudo-answers at the
  // population's rate. The Glicko state above still supplies `rd` (how sure)
  // and the coins.
  const lnOdds = (p: number): number => Math.log(p / (1 - p));
  const clampP = (p: number): number => Math.min(0.999, Math.max(0.001, p));
  const tally = new Map<SkillMeterId, { held: number; n: number; expected: number }>();
  for (const e of events) {
    if (e.weight <= 0) continue;
    const t = tally.get(e.meter) ?? { held: 0, n: 0, expected: 0 };
    t.held += e.weight * e.score;
    t.n += e.weight;
    t.expected += e.weight / (1 + Math.pow(10, (e.difficulty - startRating) / (e.scale ?? ELO_SCALE)));
    tally.set(e.meter, t);
  }
  const residual = new Map<SkillMeterId, { r: number; n: number }>();
  for (const [id, t] of tally) {
    const pPop = clampP(t.expected / t.n);
    const pStudent = clampP((t.held + SHRINK_ANSWERS * pPop) / (t.n + SHRINK_ANSWERS));
    residual.set(id, { r: lnOdds(pStudent) - lnOdds(pPop), n: t.n });
  }
  const totalN = [...residual.values()].reduce((a, x) => a + x.n, 0);
  const centre = totalN > 0 ? [...residual.values()].reduce((a, x) => a + x.n * x.r, 0) / totalN : 0;
  return SKILL_METERS.map(({ id, label }) => {
    const raw = state.get(id) ?? { rating: startRating, rd: START_RD, events: 0 };
    const res = residual.get(id);
    const s = { ...raw, rating: res ? startRating + ((res.r - centre) * ELO_SCALE) / Math.LN10 : startRating };
    const { level, toNext } = levelOf(s.rating);
    // Rated once the student's own answers outweigh the pull toward their
    // rating — a count of answered moments, not the flat curve's confidence.
    return { id, label, ...s, level, toNext, rated: (res?.n ?? 0) >= RATED_ANSWERS };
  });
}

/** Answered moments a meter needs before it shows a level. */
export const RATED_ANSWERS = 100;

/** Pseudo-answers at the population's rate that pull a thin meter toward the
 *  student's rating until their own answers outweigh them. */
const SHRINK_ANSWERS = 20;

/** The raw rows, as the heat map reads them. */
export interface HeldRow { tag: string; outcome: 'held' | 'broken'; fen: string; playedSan: string; recordedAt: number; prompted: boolean; origin: string }
export interface SlipRow { tag: string; fen: string; playedSan: string; createdAt: number; grade?: string; source: string; /** What the move cost, when the capture measured it. */ cpLoss?: number | null }

/** Origins that are not the student answering on their own: a lesson tap or
 *  a reading card is KNOW evidence, never a scored game move. */
const NOT_SCORED_ORIGINS = new Set(['lesson', 'reading']);
/** Slips that are not the student's own live game move: a lesson or puzzle
 *  tap, and the analysed game's slips — the analysis already scored that move
 *  through the record (`capabilityOutcomes`), so counting its slip row again
 *  would score one move twice and by a different rule. */
const NOT_A_LIVE_SLIP = new Set(['lesson', 'puzzle', 'auto-analysis', 'game-review']);

/**
 * Turn the record into events — one per position — with difficulty from the
 * caller (the computed source lives outside this leaf). A gain at a position
 * already answered right pays FAMILIARITY_DECAY^n.
 *
 * THE SCORING IS THE CALIBRATION'S (2026-10-18). A meter compares the student
 * against a population scored by `capabilityOutcomes`, so the student's moves
 * are scored by it too: the capability record IS that function's output. A
 * live slip (this game, not yet analysed) counts only where the same function
 * breaks that skill — `liveSlipBreaks`, injected because it lives off this leaf.
 */
export function eventsFromRecord(
  held: readonly HeldRow[],
  slips: readonly SlipRow[],
  difficultyOf: (tag: string) => { difficulty: number; scale: number } | null,
  liveSlipBreaks: (slip: SlipRow) => boolean,
): SkillEvent[] {
  // A skill the population never calibrated scores nothing (weight 0): an
  // honest "we cannot say how hard that was" beats a guessed number.
  const d = (tag: string): { difficulty: number; scale: number; known: boolean } => {
    const c = difficultyOf(tag);
    return c ? { ...c, known: true } : { difficulty: 0, scale: ELO_SCALE, known: false };
  };
  const byKey = new Map<string, SkillEvent>();
  for (const r of slips) {
    if (NOT_A_LIVE_SLIP.has(r.source)) continue;
    const meter = meterOfTag(r.tag);
    if (!meter || !liveSlipBreaks(r)) continue;
    const key = `${r.fen}|${r.playedSan}`;
    const c = d(r.tag);
    byKey.set(key, { meter, key, score: 0, difficulty: c.difficulty, scale: c.scale, weight: c.known ? 1 : 0, at: r.createdAt });
  }
  const timesRight = new Map<string, number>();
  for (const r of [...held].sort((a, b) => a.recordedAt - b.recordedAt)) {
    if (NOT_SCORED_ORIGINS.has(r.origin)) continue;
    const meter = meterOfTag(r.tag);
    if (!meter) continue;
    const key = `${r.fen}|${r.playedSan}`;
    if (byKey.has(key)) continue;
    if (r.outcome === 'broken') {
      const c = d(r.tag);
      byKey.set(key, { meter, key, score: 0, difficulty: c.difficulty, scale: c.scale, weight: c.known ? 1 : 0, at: r.recordedAt });
      continue;
    }
    // A hint or an announcement is not proof: no gain from a prompted answer.
    if (r.prompted) continue;
    const pos = r.fen.split(' ').slice(0, 4).join(' ');
    const n = timesRight.get(pos) ?? 0;
    timesRight.set(pos, n + 1);
    const c = d(r.tag);
    byKey.set(`${key}#${n}`, { meter, key, score: 1, difficulty: c.difficulty, scale: c.scale, weight: c.known ? Math.pow(FAMILIARITY_DECAY, n) : 0, at: r.recordedAt });
  }
  return [...byKey.values()];
}

/** The meter a question names, if any ("my tactics level", "endgames"). */
export function meterNamedIn(text: string): SkillMeterId | null {
  const t = text.toLowerCase();
  const words: Array<[RegExp, SkillMeterId]> = [
    [/\bopening/, 'openings'], [/\bdevelop/, 'development'], [/\bcent(re|er)|\bspace\b/, 'centre'],
    [/\bking\s*safety|\bking\b/, 'king-safety'], [/\bcalculat/, 'calculation'], [/\btactic/, 'tactics'],
    [/\bthreat|\bmaterial|\bhang/, 'threats'], [/\bplan|\bstructure|\bpawn/, 'planning'], [/\bendgame|\bending/, 'endgames'],
  ];
  for (const [re, id] of words) if (re.test(t)) return id;
  return null;
}

/**
 * The chat answer about the student's levels, computed from the meters (G0:
 * the model only phrases this). A named skill gets its own line; otherwise the
 * rated meters weakest-first. Null when no meter is rated yet.
 */
export function skillMetersAnswer(meters: readonly SkillMeter[], asked: SkillMeterId | null): string | null {
  const one = asked ? meters.find((m) => m.id === asked) : undefined;
  if (one) {
    return one.rated
      ? `${one.label}: Level ${one.level}, about ${Math.round(one.rating / 10) * 10}, from ${one.events} answered moments in your games. It is ${Math.round(one.toNext * 100)}% of the way to Level ${one.level + 1}.`
      : `${one.label} is not rated yet — the board has not tested it often enough in your games to say.`;
  }
  const rated = meters.filter((m) => m.rated).sort((a, b) => a.rating - b.rating);
  if (rated.length === 0) return null;
  const list = rated.map((m) => `${m.label} Level ${m.level} (~${Math.round(m.rating / 10) * 10})`).join(', ');
  const unrated = meters.filter((m) => !m.rated).map((m) => m.label);
  return `Your skill levels, weakest first: ${list}.${rated.length > 1 ? ` Your weakest is ${rated[0].label}; your strongest is ${rated[rated.length - 1].label}.` : ''}${unrated.length ? ` Not rated yet: ${unrated.join(', ')}.` : ''}`;
}

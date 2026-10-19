/**
 * learnRecordTerms — THE STUDENT'S RECORD DECIDES HOW MUCH LEARN SAYS (OS-4).
 *
 * The defect (David's record, 2026-10-19): `missed-opponents-threat` held 713
 * of 765 times — GREEN on the heat map — and Learn still told him every
 * one-move threat. `fadeWhenGreen` only SHORTENS a line; nothing let green go
 * quiet, and the red raise (`studentMomentBoost`) reached Review and the live
 * interrupt surfaces but never Learn's door.
 *
 * Three pure computers, each returning the TERM that decided it so the door's
 * turn row can show which term moved each fact:
 *
 *   recordTermFor   — the skill's heat state and its raise, read off the ONE
 *                     heat map (`heatMap`, green = `capabilityProven`) and the
 *                     ONE ranker term (`studentMomentBoost`). No second
 *                     estimator.
 *   threatVisibility — is this threat SIMPLE (the piece that just moved hits a
 *                     loose or under-guarded piece, one move, in plain sight)
 *                     or HIDDEN (everything else). Computed from the board and
 *                     the existing tactic detectors.
 *   threatVoice     — David's locked table (2026-10-19): a threat the student
 *                     would miss (red or grey) ALWAYS speaks in full; only
 *                     GREEN + SIMPLE goes quiet; green + hidden speaks short.
 *
 * Raise-only (the ALGO-BASED rule): data may RAISE freely and may LOWER only on
 * proven green. Grey teaches — an empty record is 100% grey and gets the full
 * capabilities of the detectors.
 */
import { Chess, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { MisconceptionTagRecord } from '../types';
import type { TacticPatternType } from '../types/tacticTypes';
import type { CapabilityProfile } from './capabilityEvidence';
import { heatMap, type HeatState, type HeatTile } from './heatMap';
import { studentMomentBoost } from './studentMomentBoost';
import { matchTag, type WeaknessSignal } from './weaknessSignal';
import { detectTactics } from './tacticsDetector';
import { detectLatentDanger } from './latentDanger';

// ─── 1. The record term ─────────────────────────────────────────────────────

/** The student's record, read once per game and handed to every lookup. */
export interface StudentRecord {
  /** One tile per skill, from `heatMap` — the only red/green/grey verdict. */
  heat: ReadonlyMap<MisconceptionTagId, HeatTile>;
  /** The positive half (`getCapabilityProfile`) — the ranker term reads it. */
  capabilities: CapabilityProfile;
  /** The weakness spine's signals (`loadWeaknessSignals`) — a RED skill's hole
   *  raises by its real lifecycle weight. Empty = no spine read (the raise
   *  falls back to the unproven boost, never to zero). */
  signals: readonly WeaknessSignal[];
}

/** Build the record from the same reads the heat map tab uses. */
export function buildStudentRecord(
  capabilities: CapabilityProfile,
  slips: readonly MisconceptionTagRecord[],
  signals: readonly WeaknessSignal[] = [],
  now: number = Date.now(),
): StudentRecord {
  const heat = new Map<MisconceptionTagId, HeatTile>();
  for (const t of heatMap(capabilities, slips, now)) heat.set(t.tag, t);
  return { heat, capabilities, signals };
}

/** A fresh install: nothing recorded, every skill grey. */
export const EMPTY_RECORD: StudentRecord = { heat: new Map(), capabilities: new Map(), signals: [] };

export interface RecordTerm {
  state: HeatState;
  /** What the student's record adds to this fact's rank. ≥ 0 always; 0 only
   *  when the skill is proven green. */
  raise: number;
  /** Which reading decided the state — for the door's turn row. */
  reason: string;
}

/** The skill's heat state and raise. A skill absent from the record is GREY —
 *  absent ≠ mastered — and grey raises (teach it). */
export function recordTermFor(skillTag: MisconceptionTagId, record: StudentRecord): RecordTerm {
  const tile = record.heat.get(skillTag);
  const state: HeatState = tile?.state ?? 'grey';
  // ONE ranker term: the red hole's lifecycle weight, or the unproven (grey)
  // boost, max'd inside `studentMomentBoost`. Green reads 0 there because
  // `capabilityProven` is the same definition the heat map used.
  const boost = studentMomentBoost({
    hole: matchTag(skillTag, record.signals),
    posedTags: [skillTag],
    capabilities: record.capabilities,
  });
  const raise = state === 'green' ? 0 : boost.rank;
  const reason = !tile
    ? 'grey: never asked'
    : state === 'green'
      ? `green: proven (held streak ${tile.heldStreak} over ${tile.streakGames} games)`
      : state === 'red'
        ? `red: ${tile.openCount} open slips, ${tile.broken} broken`
        : `grey: not yet proven (held ${tile.held}, broken ${tile.broken})`;
  return { state, raise, reason };
}

// ─── 2. Threat visibility ───────────────────────────────────────────────────

export type ThreatVisibility = 'simple' | 'hidden';

/** Every rule that can decide visibility, in the order they are checked. */
export type VisibilityRule =
  /** The board cannot read the position or the move — never trusted plain. */
  | 'unreadable'
  /** The threat is a mate — a pattern, never "plain sight". */
  | 'mate-pattern'
  /** No piece attacks the target yet: a quiet move that threatens later. */
  | 'not-on-board-yet'
  /** The attacker is not the piece that just moved: its line was opened. */
  | 'discovered'
  /** The target sits in a pin, skewer, x-ray, battery, overload or removal of
   *  a guard the opponent owns — geometry, not a plain hit. */
  | 'line-geometry'
  /** A long-range piece hitting from far away (≥ LONG_LINE_SQUARES). */
  | 'long-line'
  /** The target is guarded well enough that the plain hit wins nothing — the
   *  threat must come from something deeper. */
  | 'guarded-enough'
  /** The piece that just moved hits a loose or under-guarded piece: simple. */
  | 'direct-hit';

/** How far a bishop, rook or queen must reach (in king steps) before its
 *  attack is no longer in plain sight. */
export const LONG_LINE_SQUARES = 4;

/** Tactic patterns that make a threat line geometry rather than a plain hit. */
const GEOMETRY_PATTERNS: ReadonlySet<TacticPatternType> = new Set<TacticPatternType>([
  'pin', 'skewer', 'discovery', 'double_check', 'removal_of_guard', 'overload', 'battery',
]);

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** A threat as the producer saw it — board terms only. */
export interface ThreatSighting {
  /** The position BEFORE the opponent's move. */
  fenBefore: string;
  /** The opponent's move, in SAN, from `fenBefore`. */
  opponentSan: string;
  /** The opponent piece making the threat, or null when no piece makes it
   *  yet (a line that lands two moves out). */
  attacker: string | null;
  /** The student's pieces it threatens. */
  targets: readonly string[];
  /** The threat is a mate. */
  mate?: boolean;
}

export interface VisibilityTerm {
  visibility: ThreatVisibility;
  rule: VisibilityRule;
}

function hidden(rule: VisibilityRule): VisibilityTerm { return { visibility: 'hidden', rule }; }

function kingSteps(a: string, b: string): number {
  return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
}

/** Simple or hidden — computed from the board, never guessed. A position the
 *  board cannot read (bad FEN, illegal move) is HIDDEN: an unreadable threat
 *  is never one the student can be trusted to see. */
export function threatVisibility(t: ThreatSighting): VisibilityTerm {
  if (t.mate) return hidden('mate-pattern');
  let after: Chess;
  let movedTo: string;
  try {
    after = new Chess(t.fenBefore);
    const m = after.move(t.opponentSan);
    movedTo = m.to;
  } catch {
    return hidden('unreadable');
  }
  const foe = after.turn() === 'w' ? 'b' : 'w';      // the side that just moved
  const student = after.turn();
  const fenAfter = after.fen();
  const tactics = detectTactics(fenAfter).tactics.filter((p) => p.beneficiary === foe);
  if (tactics.some((p) => p.type === 'mate_threat' || p.type === 'back_rank')) return hidden('mate-pattern');

  const targets = t.targets.filter((sq) => after.get(sq as Square)?.color === student);
  if (!t.attacker || targets.length === 0) return hidden('not-on-board-yet');
  const hit = targets.filter((sq) => after.attackers(sq as Square, foe).includes(t.attacker as Square));
  if (hit.length === 0) return hidden('not-on-board-yet');
  if (t.attacker !== movedTo) return hidden('discovered');

  const touches = (p: { involvedSquares: string[] }): boolean => p.involvedSquares.some((sq) => targets.includes(sq));
  if (tactics.some((p) => GEOMETRY_PATTERNS.has(p.type) && touches(p))) return hidden('line-geometry');
  const xray = detectLatentDanger(fenAfter, student);
  if (xray && targets.includes(xray.frontSquare)) return hidden('line-geometry');

  const piece = after.get(t.attacker as Square);
  if (piece && (piece.type === 'b' || piece.type === 'r' || piece.type === 'q')
    && hit.every((sq) => kingSteps(t.attacker as string, sq) >= LONG_LINE_SQUARES)) return hidden('long-line');

  const attackerValue = VALUE[piece?.type ?? 'k'];
  const exposed = hit.some((sq) => {
    const target = after.get(sq as Square);
    if (!target) return false;
    const guards = after.attackers(sq as Square, student).length;
    const attackers = after.attackers(sq as Square, foe).length;
    return guards === 0 || attackers > guards || attackerValue < VALUE[target.type];
  });
  return exposed ? { visibility: 'simple', rule: 'direct-hit' } : hidden('guarded-enough');
}

// ─── 3. The voice ───────────────────────────────────────────────────────────

export type ThreatVoice = 'full' | 'short' | 'quiet';

/** David's table (2026-10-19, locked). A new state or visibility fails to
 *  compile until someone answers for it. */
export const THREAT_VOICE: Record<HeatState, Record<ThreatVisibility, ThreatVoice>> = {
  red: { simple: 'full', hidden: 'full' },
  grey: { simple: 'full', hidden: 'full' },
  green: { simple: 'quiet', hidden: 'short' },
};

export interface VoiceTerm {
  voice: ThreatVoice;
  /** `record` when the heat state alone decided (red/grey always speak);
   *  `visibility` when green handed the call to how plain the threat is. */
  decidedBy: 'record' | 'visibility';
}

export function threatVoice(state: HeatState, visibility: ThreatVisibility): VoiceTerm {
  return { voice: THREAT_VOICE[state][visibility], decidedBy: state === 'green' ? 'visibility' : 'record' };
}

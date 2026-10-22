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
import type { TacticPatternType } from '../types/tacticTypes';
import type { TacticType } from '../types';
import { PATTERN_TO_TACTIC, weaknessClusterForTactic } from './tacticVocabulary';
import { MOTIFS, MOTIF_OF_TACTIC } from '../data/tacticMotifs';
import type { HeatState } from './heatMap';
import type { StudentRecord } from './studentRecord';
import { studentMomentBoost } from './studentMomentBoost';
import { boostFor, matchTag } from './weaknessSignal';
import { detectTactics } from './tacticsDetector';
import { detectLatentDanger } from './latentDanger';
import { mateThreatsAgainst } from './threatOut';
import { CAPTURE_VALUE } from './pieceValues';

const VALUE = (t: string): number => CAPTURE_VALUE[t] ?? 0;

// ─── 1. The record term ─────────────────────────────────────────────────────

// The record is the ONE `StudentRecord` (`studentRecord.loadStudentRecord`,
// built by `studentRecordFrom`): weaknesses, capabilities and the heat tiles.

export interface RecordTerm {
  state: HeatState;
  /** What the student's record adds to this fact's rank. ≥ 0 always; 0 only
   *  when the skill is proven green. */
  raise: number;
  /** Which reading decided the state — for the door's turn row. */
  reason: string;
  /** The heat tag whose record decided (a motif's own tag, or the general
   *  skill) — what a spoken fact names as its `skill` so the fade reads it. */
  skill: MisconceptionTagId;
}

/** The skill's heat state and raise. A skill absent from the record is GREY —
 *  absent ≠ mastered — and grey raises (teach it). */
export function recordTermFor(skillTag: MisconceptionTagId, record: StudentRecord): RecordTerm {
  const tile = record.heat.get(skillTag);
  const state: HeatState = tile?.state ?? 'grey';
  // ONE ranker term: the red hole's lifecycle weight, or the unproven (grey)
  // boost, max'd inside `studentMomentBoost`. The HOLD RATE decides what is
  // proven, so the boost is not handed the streak profile — a skill held under
  // 90% is unproven, whatever its streak says.
  const boost = studentMomentBoost({ hole: matchTag(skillTag, record.weaknesses), posedTags: [skillTag] });
  const raise = state === 'green' ? 0 : boost.rank;
  const held = tile && tile.hold.posed > 0 ? `held ${tile.hold.held} of the last ${tile.hold.posed}` : 'never asked';
  const reason = `${state}: ${held}`;
  return { state, raise, reason, skill: skillTag };
}

// ─── 2. Threat visibility ───────────────────────────────────────────────────

export type ThreatVisibility = 'simple' | 'hidden';

/** Every rule that can decide visibility, in the order they are checked. */
export type VisibilityRule =
  /** The board cannot read the position or the move — never trusted plain. */
  | 'unreadable'
  /** The student is in check — the check is the question, and it always speaks. */
  | 'check'
  /** The threat is a mate — a pattern, never "plain sight". */
  | 'mate-pattern'
  /** A trapped piece: every exit has to be counted, not one hit seen. */
  | 'trapped'
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
const LONG_LINE_SQUARES = 4;

/** Tactic patterns that make a threat line geometry rather than a plain hit. */
const GEOMETRY_PATTERNS: ReadonlySet<TacticPatternType> = new Set<TacticPatternType>([
  'pin', 'skewer', 'discovery', 'double_check', 'removal_of_guard', 'overload', 'battery',
]);


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
  /** What the producer computed it as (`threatInputFor` fills it). A hint the
   *  board can only make MORE hidden, never simple. */
  pattern?: ThreatPattern;
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
  if (t.mate || t.pattern === 'mate_threat' || t.pattern === 'back_rank') return hidden('mate-pattern');
  if (t.pattern === 'trapped_piece') return hidden('trapped');
  if (t.pattern && t.pattern !== 'fork' && GEOMETRY_PATTERNS.has(t.pattern as TacticPatternType)) return hidden('line-geometry');
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
  if (after.inCheck()) return hidden('check');
  // Any mate in one for them — exact (the null-move probe), not a pattern list.
  if (mateThreatsAgainst(fenAfter, student).moves.length > 0) return hidden('mate-pattern');
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

  const attackerValue = VALUE(piece?.type ?? 'k');
  const exposed = hit.some((sq) => {
    const target = after.get(sq as Square);
    if (!target) return false;
    const guards = after.attackers(sq as Square, student).length;
    const attackers = after.attackers(sq as Square, foe).length;
    return guards === 0 || attackers > guards || attackerValue < VALUE(target.type);
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
  // Held 75–89% of the last 20: one short line, whatever the threat's shape.
  short: { simple: 'short', hidden: 'short' },
  green: { simple: 'quiet', hidden: 'short' },
};

interface VoiceTerm {
  voice: ThreatVoice;
  /** `record` when the heat state alone decided (red/grey always speak);
   *  `visibility` when green handed the call to how plain the threat is. */
  decidedBy: 'record' | 'visibility';
}

export function threatVoice(state: HeatState, visibility: ThreatVisibility): VoiceTerm {
  return { voice: THREAT_VOICE[state][visibility], decidedBy: state === 'green' ? 'visibility' : 'record' };
}

// ─── 4. Each threat reads its OWN skill ─────────────────────────────────────

/** Every kind of threat a Learn producer can raise: the tactic detector's
 *  patterns plus the three plain-board producers. */
export type ThreatPattern = TacticPatternType | 'hanging' | 'cheaper-hit' | 'king-pawn';

interface ThreatSkill {
  /** The heat-map skill that says whether the student SEES incoming threats.
   *  It is the only heat tag about the opponent's threats today. */
  tag: MisconceptionTagId;
  /** The motif's own record (`analysis:tactic:<motif>` in the weakness
   *  spine), or null when the threat has no motif. Raise-only: an open hole
   *  on the motif keeps the threat loud even when the general skill is green. */
  motif: TacticType | null;
  /** The motif's OWN heat tag — the incoming half recorded by
   *  `threatAnswerEvidence.recordThreatAnswer` (held = parried, broken = it landed),
   *  so a motif can turn green on its own. Null when no recorder covers it. */
  motifTag: MisconceptionTagId | null;
}

/** THEIR side of a motif — read off the master motif list
 *  (`tacticMotifs`, WO-MOTIFS-01), never a second hand-kept table. Null when
 *  the tactic has no row, or its row has no reader for their side yet. */
function theirsTagFor(t: TacticType | null): MisconceptionTagId | null {
  const m = t ? MOTIF_OF_TACTIC[t] : null;
  return m ? MOTIFS[m].theirs : null;
}

/** One detector pattern's skill: the general threat skill, its analysis
 *  motif, and that motif's own their-side tag. */
function detected(p: TacticPatternType): ThreatSkill {
  const motif = PATTERN_TO_TACTIC[p];
  return { tag: 'missed-opponents-threat', motif, motifTag: theirsTagFor(motif) };
}

/** A `Record` over the whole union: a new tactic type fails to compile until
 *  someone says which skill it reads. Motifs come from `PATTERN_TO_TACTIC`,
 *  the one bridge between the two tactic vocabularies; their tags from the
 *  master motif list. (Until 2026-10-22 a double check was filed as a
 *  discovery, and removing the guard and overload had no tag of their own.) */
export const THREAT_SKILL: Record<ThreatPattern, ThreatSkill> = {
  fork: detected('fork'),
  pin: detected('pin'),
  skewer: detected('skewer'),
  discovery: detected('discovery'),
  double_check: detected('double_check'),
  back_rank: detected('back_rank'),
  removal_of_guard: detected('removal_of_guard'),
  trapped_piece: detected('trapped_piece'),
  mate_threat: detected('mate_threat'),
  overload: detected('overload'),
  battery: detected('battery'),
  none: detected('none'),
  // A loose piece has its own writers (the fundamentals, the abandoned-duty
  // read); a threat-answer row on `hung-material` would count one move twice.
  hanging: { tag: 'missed-opponents-threat', motif: 'hanging_piece', motifTag: null },
  'cheaper-hit': { tag: 'missed-opponents-threat', motif: null, motifTag: null },
  'king-pawn': { tag: 'missed-opponents-threat', motif: null, motifTag: null },
};

/** Every motif's own tag — the rows `threatAnswerEvidence` writes. */
export const THREAT_MOTIF_TAGS: ReadonlySet<MisconceptionTagId> = new Set(
  Object.values(THREAT_SKILL).map((s) => s.motifTag).filter((t): t is MisconceptionTagId => t !== null),
);

export function skillForThreat(pattern: ThreatPattern): ThreatSkill {
  return THREAT_SKILL[pattern];
}

/** The record term for THIS threat, the motif's own record first:
 *   1. an open hole on the motif (its own red tile, or the weakness spine's
 *      `analysis:tactic:<motif>` cluster) → RED, whatever else is green;
 *   2. the motif's own tile when it has a verdict (red or green);
 *   3. otherwise (never asked, or asked and not yet proven) → the
 *      threat-seeing skill, which every one of these questions also answers.
 *      A grey motif never reads LOUDER than a never-asked one: answering a
 *      fork right once must not make forks noisier than before.
 *  Raise-only: the motif can make a threat louder, never quieter than its
 *  own proof allows. */
export function recordTermForThreat(pattern: ThreatPattern, record: StudentRecord): RecordTerm {
  const skill = THREAT_SKILL[pattern];
  const base = recordTermFor(skill.tag, record);
  const hole = skill.motif ? matchTag(weaknessClusterForTactic(skill.motif), record.weaknesses) : null;
  const holeBoost = hole ? boostFor(hole) : 0;
  const motifTile = skill.motifTag ? record.heat.get(skill.motifTag) : undefined;
  const motif = skill.motifTag && motifTile && motifTile.state !== 'grey'
    ? recordTermFor(skill.motifTag, record)
    : null;
  if (holeBoost > 0) {
    return {
      state: 'red',
      raise: Math.max(base.raise, motif?.raise ?? 0, holeBoost),
      reason: `red: open ${skill.motif} hole (${hole?.openCount ?? 0} open)`,
      skill: skill.motifTag ?? skill.tag,
    };
  }
  if (motif) return { ...motif, reason: `${skill.motifTag} ${motif.reason}` };
  return base;
}

// ─── 5. One adapter per producer ────────────────────────────────────────────

/** What each Learn threat producer already holds (CoachTeachPage's threat
 *  block, `buildTacticsLiveContext`, `trappedOnBoard`). */
export type ThreatProducer =
  /** `cheaperHit()`: a piece attacked by a cheaper one. */
  | { kind: 'cheaper-hit'; hit: { sq: string; bySq: string } }
  /** `tctx.hanging[0]`: a piece left en prise. */
  | { kind: 'hanging'; square: string }
  /** `tctx.immediate` entry with side 'opponent' (squares[0] = the attacker). */
  | { kind: 'tactic'; tactic: { type: string; squares: readonly string[] } }
  /** `tctx.threats` entry: a tactic that lands later in the line. */
  | { kind: 'soon'; threat: { type: string; description: string } }
  /** `trappedOnBoard`: a piece with no safe square. */
  | { kind: 'trapped'; trapped: { square: string; attackerSquare: string } }
  /** `kingPawnThreat()`: a pawn beside the king the opponent can win. */
  | { kind: 'king-pawn'; pawnSquare: string };

interface ThreatInput {
  sighting: ThreatSighting;
  pattern: ThreatPattern;
}

function asPattern(type: string): ThreatPattern {
  return (type in THREAT_SKILL ? type : 'none') as ThreatPattern;
}

/** The opponent piece hitting `square` after their move: the piece that just
 *  moved when it is one of them (that is the plain-sight reading), else the
 *  cheapest. Null when nothing hits it. */
function attackerOf(fenBefore: string, opponentSan: string, square: string): string | null {
  try {
    const c = new Chess(fenBefore);
    const m = c.move(opponentSan);
    const hitters = c.attackers(square as Square, m.color);
    if (hitters.includes(m.to)) return m.to;
    return [...hitters].sort((a, b) => VALUE(c.get(a)?.type ?? 'k') - VALUE(c.get(b)?.type ?? 'k'))[0] ?? null;
  } catch {
    return null;
  }
}

/** One call per producer: turn what it already computed into the sighting
 *  `threatVisibility` reads and the pattern `recordTermForThreat` reads. */
export function threatInputFor(p: ThreatProducer, move: { fenBefore: string; opponentSan: string }): ThreatInput {
  const base = { fenBefore: move.fenBefore, opponentSan: move.opponentSan };
  switch (p.kind) {
    case 'cheaper-hit':
      return { pattern: 'cheaper-hit', sighting: { ...base, attacker: p.hit.bySq, targets: [p.hit.sq], pattern: 'cheaper-hit' } };
    case 'hanging':
      return { pattern: 'hanging', sighting: { ...base, attacker: attackerOf(move.fenBefore, move.opponentSan, p.square), targets: [p.square], pattern: 'hanging' } };
    case 'tactic': {
      const pattern = asPattern(p.tactic.type);
      const [attacker = null, ...targets] = p.tactic.squares;
      return { pattern, sighting: { ...base, attacker, targets, pattern } };
    }
    case 'soon': {
      const pattern = asPattern(p.threat.type);
      return { pattern, sighting: { ...base, attacker: null, targets: [], pattern } };
    }
    case 'trapped':
      return { pattern: 'trapped_piece', sighting: { ...base, attacker: p.trapped.attackerSquare, targets: [p.trapped.square], pattern: 'trapped_piece' } };
    case 'king-pawn':
      return { pattern: 'king-pawn', sighting: { ...base, attacker: attackerOf(move.fenBefore, move.opponentSan, p.pawnSquare), targets: [p.pawnSquare], pattern: 'king-pawn' } };
  }
}

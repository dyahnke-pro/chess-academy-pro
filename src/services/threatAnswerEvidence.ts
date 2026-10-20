/**
 * threatAnswerEvidence — THE INCOMING HALF OF EVERY MOTIF (OS-4, capability parity).
 *
 * The computer that SEES the opponent's fork must also RECORD whether the
 * student met it, or forks can be taught and never proven (CLAUDE.md "a
 * computer only serves the loop if it is wired BOTH WAYS"). When an opponent
 * motif stands on the board at the student's turn, the student's reply is the
 * answer: HELD when the motif no longer wins anything, BROKEN when it still
 * lands. Both halves are computed on the board — never inferred from what the
 * coach said. `prompted` records whether the coach said it (a told answer
 * proves nothing, `CapabilityEvidenceRecord.prompted`).
 *
 * Rows go through `recordLaneEvidence` (one store, one row shape, one
 * per-game duplicate guard) under the motif's own tag (`THREAT_SKILL.motifTag`),
 * which the heat map lists, so each motif can turn green on its own.
 */
import { Chess, type Color, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { recordLaneEvidence, type CapabilityEvidenceRecord, type CapabilityOutcome } from './capabilityEvidence';
import { THREAT_SKILL, type ThreatPattern } from './learnRecordTerms';
import { signedLegalSeeFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { flipSideToMove, mateThreatsAgainst } from './threatOut';
import { detectTactics } from './tacticsDetector';

/** A threat worth a piece or more is a sharp question (clears the green bar,
 *  `PROVEN_MIN_IMPORTANCE`); less than a piece is routine (half credit). */
export const THREAT_PIECE_IMPORTANCE = 90;
const THREAT_PAWN_IMPORTANCE = 60;
/** A mate threat is the sharpest question the board asks. */
const THREAT_MATE_IMPORTANCE = 100;
/** The least a motif must win (pawns) for the board to have posed it. */
const THREAT_MIN_GAIN = 1;
/** With an engine grade: a game already this far gone either way (cp, the
 *  mover's seat) poses no motif question — nothing is at stake. */
const THREAT_DECIDED_CP = 500;
/** With an engine grade: a "landed" motif must cost the reply at least this
 *  (cp). Measured on David's 83 broken pin rows at depth 16: 26 real, 28
 *  where the engine line holds, 29 in decided games — the board's static
 *  count alone over-files misses three to one. */
const THREAT_REAL_LOSS_CP = 100;

const MATE_PATTERNS: ReadonlySet<ThreatPattern> = new Set<ThreatPattern>(['mate_threat', 'back_rank']);

interface ThreatAnswer {
  tag: MisconceptionTagId;
  outcome: CapabilityOutcome;
  posedImportance: number;
  /** What the motif won before the reply and after it (pawns; mate = 100). */
  gainBefore: number;
  gainAfter: number;
}

export interface ThreatAnswerArgs {
  /** The position with the STUDENT to move and the opponent's motif standing. */
  fen: string;
  /** The student's reply. */
  playedSan: string;
  pattern: ThreatPattern;
  /** The student's pieces the motif hits. */
  targets: readonly string[];
  /** The engine's grade of the reply, mover's seat, when one exists (an
   *  analysed game's annotation, Learn's live grade). Null fields = unknown. */
  engine?: { evalBeforeCp: number | null; cpLoss: number | null };
}

function bestGain(fen: string, squares: readonly string[], foe: Color): number {
  let best = 0;
  for (const sq of squares) best = Math.max(best, signedLegalSeeFor(fen, sq as Square, foe));
  return best;
}

/** Held or broken — or null when the board did not pose the motif (it wins
 *  nothing, no motif tag covers it, the student is in check, or the move is
 *  illegal). Pure: board in, verdict out. */
export function threatAnswerOutcome(a: ThreatAnswerArgs): ThreatAnswer | null {
  const tag = THREAT_SKILL[a.pattern].motifTag;
  if (!tag) return null;
  let board: Chess;
  try { board = new Chess(a.fen); } catch { return null; }
  if (board.inCheck()) return null;            // the check is the question, not the motif
  const ev = a.engine;
  if (ev?.evalBeforeCp != null && Math.abs(ev.evalBeforeCp) >= THREAT_DECIDED_CP) return null;
  const student = board.turn();
  const foe: Color = student === 'w' ? 'b' : 'w';
  let played: ReturnType<Chess['move']>;
  try { played = board.move(a.playedSan); } catch { return null; }
  const after = board.fen();

  if (MATE_PATTERNS.has(a.pattern)) {
    if (mateThreatsAgainst(a.fen, student).moves.length === 0) return null;
    const lands = !board.isGameOver() && mateThreatsAgainst(after, student).moves.length > 0;
    // A mate nothing stops was not a question at this turn (see below).
    const stoppable = !lands || new Chess(a.fen).moves().some((san) => {
      const b = new Chess(a.fen);
      b.move(san);
      return b.isGameOver() || mateThreatsAgainst(b.fen(), student).moves.length === 0;
    });
    if (!stoppable) return null;
    return { tag, outcome: lands ? 'broken' : 'held', posedImportance: THREAT_MATE_IMPORTANCE, gainBefore: 100, gainAfter: lands ? 100 : 0 };
  }

  const start = new Chess(a.fen);
  const targets = a.targets.filter((sq) => start.get(sq as Square)?.color === student);
  const gainBefore = bestGain(a.fen, targets, foe);
  if (gainBefore < THREAT_MIN_GAIN) return null;
  // A motif NO reply parries is not a question at this turn — the slip came
  // earlier (a trapped piece is already lost). Recording it would file a
  // broken row on a board with no right answer.
  const gainAfterMove = (san: string): number | null => {
    const b = new Chess(a.fen);
    let m: ReturnType<Chess['move']>;
    try { m = b.move(san); } catch { return null; }
    if (b.isGameOver()) return 0;
    const tracked = targets.map((sq) => (sq === m.from ? m.to : sq));
    // What the reply took itself pays for what the motif still wins: trading
    // the queen the fork hit for their queen is not walking into the fork.
    const tookBack = m.captured ? MATERIAL_VALUE[m.captured] ?? 0 : 0;
    return Math.max(0, bestGain(b.fen(), tracked, foe) - tookBack);
  };
  const gainAfter = gainAfterMove(played.san) ?? 0;
  const parried = gainAfter < THREAT_MIN_GAIN
    || start.moves().some((san) => san !== played.san && (gainAfterMove(san) ?? THREAT_MIN_GAIN) < THREAT_MIN_GAIN);
  if (!parried) return null;
  // The engine overrules the static count: a motif that "lands" while the
  // reply costs under a pawn did not really win — no question was posed.
  if (gainAfter >= THREAT_MIN_GAIN && ev?.cpLoss != null && ev.cpLoss < THREAT_REAL_LOSS_CP) return null;
  return {
    tag,
    outcome: gainAfter >= THREAT_MIN_GAIN ? 'broken' : 'held',
    posedImportance: gainBefore >= 3 ? THREAT_PIECE_IMPORTANCE : THREAT_PAWN_IMPORTANCE,
    gainBefore,
    gainAfter,
  };
}

/** One student move of a game, with what the reader needs. */
export interface ThreatPly {
  fen: string;
  /** The student's previous turn, so a standing motif is asked once. */
  prevFen: string | null;
  playedSan: string;
  engine?: ThreatAnswerArgs['engine'];
  prompted: boolean;
}

interface GameThreatAnswer extends ThreatAnswer {
  fen: string;
  playedSan: string;
  prompted: boolean;
  /** Index of the ply in the input, for ordering rows inside the game. */
  ply: number;
}

/** Every motif question a game posed and how the student answered — the
 *  pure half of the backfill (`autoAnalyzeGame.recordThreatHalf`). */
export function threatAnswersForGame(plies: readonly ThreatPly[]): GameThreatAnswer[] {
  const out: GameThreatAnswer[] = [];
  plies.forEach((p, ply) => {
    for (const t of newThreatsAtTurn(p.fen, p.prevFen)) {
      const v = threatAnswerOutcome({ fen: p.fen, playedSan: p.playedSan, pattern: t.pattern, targets: t.targets, ...(p.engine ? { engine: p.engine } : {}) });
      if (v) out.push({ ...v, fen: p.fen, playedSan: p.playedSan, prompted: p.prompted, ply });
    }
  });
  return out;
}

/** A motif the opponent has standing at the student's turn. */
interface StandingThreat {
  pattern: ThreatPattern;
  attacker: string;
  targets: string[];
}

/** The opponent's motifs on the board at the student's turn — the same
 *  detector Learn speaks from (`detectTactics`), read with the opponent to
 *  move (the null-move probe), keeping only motifs that have a recorder.
 *  With `prevFen` (the student's previous turn) a motif already standing then
 *  is dropped: one motif is one question, not one per move it stays. */
export function newThreatsAtTurn(fen: string, prevFen: string | null = null): StandingThreat[] {
  const read = (f: string): StandingThreat[] => {
    let board: Chess;
    try { board = new Chess(f); } catch { return []; }
    if (board.inCheck()) return [];
    const student = board.turn();
    const foe: Color = student === 'w' ? 'b' : 'w';
    const probe = flipSideToMove(f);
    if (!probe) return [];
    return detectTactics(probe).tactics
      .filter((t) => t.beneficiary === foe && THREAT_SKILL[t.type].motifTag !== null)
      .map((t) => ({
        pattern: t.type,
        attacker: t.involvedSquares[0],
        targets: t.involvedSquares.filter((sq) => board.get(sq as Square)?.color === student),
      }))
      .filter((t) => t.targets.length > 0);
  };
  const now = read(fen);
  if (!prevFen) return now;
  const key = (t: StandingThreat): string => `${t.pattern}:${t.attacker}:${[...t.targets].sort().join(',')}`;
  const before = new Set(read(prevFen).map(key));
  return now.filter((t) => !before.has(key(t)));
}

/**
 * THE LEARN CALL — record the student's answer to an opponent motif. Writes
 * one capability row under the motif's own tag when the board posed it, and
 * returns the verdict (null when nothing was posed). Never throws.
 */
export async function recordThreatAnswer(args: ThreatAnswerArgs & {
  /** Did the coach SAY this threat before the move? Required, never inferred. */
  prompted: boolean;
  origin: CapabilityEvidenceRecord['origin'];
  sourceGameId?: string;
}): Promise<ThreatAnswer | null> {
  const verdict = threatAnswerOutcome(args);
  if (!verdict) return null;
  await recordLaneEvidence({
    tag: verdict.tag,
    outcome: verdict.outcome,
    fen: args.fen,
    playedSan: args.playedSan,
    posedImportance: verdict.posedImportance,
    origin: args.origin,
    prompted: args.prompted,
    ...(args.sourceGameId ? { sourceGameId: args.sourceGameId } : {}),
  });
  return verdict;
}

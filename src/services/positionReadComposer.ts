import { Chess } from 'chess.js';
// positionReadComposer — THE READ OF A POSITION, composed in ONE place
// (WO-STANDARD-01, 2026-09-22). `usePositionNarration` used to compose this
// itself from six computers — the note, the phase, the position facts, the
// positional read, the tactics context and the deepest look-ahead — which made
// the hook a third coach (surfaceComposition.scan). The hook now owns the
// engine read, the phrasing and the voice; WHAT is said comes from here.
//
// G0: every sentence returned is computed; the caller's model only phrases
// them, most-important-first, in the order returned.
import { readHabit } from './methodBeat';
import { buildFedTacticsContext } from './liveTacticsContext';
import { boardReadFacts } from './boardReadFacts';
import { decideRead } from './readDecider';
import { stockfishEngine } from './stockfishEngine';
import type { EvalBoardFn } from './perturbation';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from './danyaTeachingService';
import { lastMoveIfStudent, lastMoveIfOpponent, sansOfPgn } from './lastMoveOfLine';
import type { StudentNeedContext } from './needScore';
import type { StockfishAnalysis } from '../types';
import type { WeaknessSignal } from './weaknessSignal';
import type { ImportanceTier } from './narrationImportance';

/** The seat every sentence of the read is computed in. The facts computers
 *  write "you / they", so the read speaks that seat end to end and the phraser
 *  is never asked to re-seat anything (G0: pronouns are a board fact — whose
 *  piece — not a phrasing choice). `usePositionNarration` phrases in it too. */
export const READ_SEAT = 'student' as const;

/** The engine read for each other board the read needs (a tempting move, the
 *  board after the best move) — the tempting reads' own depth and budget. */
const READ_DEPTH = 12;
const READ_BUDGET_MS = 300;

/** Moments where the position has one thing to say — positional observations
 *  stay quiet so they cannot point away from it. The one deciding door's own
 *  tiers, never a second criticality. */
const DECIDING_TIERS: ReadonlySet<ImportanceTier> = new Set<ImportanceTier>(['mate', 'only-move', 'blunder', 'must-defend']);

interface PositionReadInput {
  fen: string;
  pgn: string;
  playerColor: 'white' | 'black';
  openingName: string | null;
  rating: number;
  /** The engine's read of this board, already taken by the caller (cached or fresh); null when the engine gave nothing. */
  analysis: StockfishAnalysis | null;
  /** The student's tactics skill-radar reading, when the profile carries one. */
  tacticsSkill: number | undefined;
  studentWeaknesses: readonly WeaknessSignal[];
  studentNeedContext: StudentNeedContext | null;
  /** The engine's board evaluator for the facts computer — the caller owns the engine. */
  evalBoard: EvalBoardFn;
  /** True once the caller has moved on (a newer tap, an unmount): stop composing. */
  isCancelled: () => boolean;
  /** May a corpus note lead the read? REQUIRED (2026-09-23): Learn free play
   *  carries no corpus notes; the surface that mounts the read decides. */
  corpusNotes: boolean;
  /** A move the read must NOT give away — a puzzle's solution before the
   *  student has answered (Tactics "Teach me this position", 2026-10-01).
   *  REQUIRED: `null` on a live board. When set, the weighing lane (it names
   *  the move) stays quiet, and any line naming the move or its squares is
   *  dropped — the read teaches the POSITION, never the answer. */
  withhold: string | null;
  /** REQUIRED — read the moves a player is drawn to here
   *  (`movePurposeEngine.temptingReads`, at `rating`, from the engine's best
   *  line in `analysis`) so the tempting move that fails is said
   *  (WO-DANYA-READS-01 group 4). The composer reads them itself, so a
   *  surface never imports the computer. Never on a withheld board. */
  readTempting: boolean;
}

/** The SAN and the two squares a withheld move would reveal. */
function withheldMarks(fen: string, san: string | null): { san: string; squares: string[] } | null {
  if (!san) return null;
  try {
    const m = new Chess(fen).move(san);
    return m ? { san: m.san.replace(/[+#]$/, ''), squares: [m.from, m.to] } : null;
  } catch {
    return null;
  }
}

function reveals(text: string, marks: { san: string; squares: string[] } | null): boolean {
  if (!marks) return false;
  if (text.includes(marks.san)) return true;
  return marks.squares.some((sq) => new RegExp(`\\b${sq}\\b`).test(text));
}

/**
 * Every computed sentence of the read, most-important-first, joined for the
 * phraser. Empty when the board says nothing worth a word — the caller then
 * stays silent rather than inventing.
 */
export async function composePositionRead(i: PositionReadInput): Promise<string> {
  const studentCC: 'w' | 'b' = i.playerColor === 'white' ? 'w' : 'b';
  const sans = sansOfPgn(i.pgn);
  const marks = withheldMarks(i.fen, i.withhold);

  // The bounded tactics context — the habit that closes the read reads it.
  // Reuses the analysis the caller already took (no extra engine
  // read); falls back to a FEN-only scan if that analysis is thin.
  const tactics = (await buildFedTacticsContext(
    i.fen,
    studentCC,
    i.rating,
    i.analysis,
    () => Promise.resolve(null), // latency-safe: reuse the cached analysis, no extra engine read
    i.tacticsSkill,
  ).catch(() => undefined)) ?? null;
  if (i.isCancelled()) return '';

  // 1. THE CORPUS LEADS (David 2026-08-13: "narrations follow the corpus,
  //    hand written, computed note format"). A read of the board starts from a
  //    farmed teaching note about THIS position when one exists — board-gated
  //    at retrieval, framed honestly by origin. No note = the computed facts
  //    carry the read alone.
  let noteLine = '';
  if (i.corpusNotes) try {
    const src = teachingSourceForBoard(sans, i.fen, i.openingName, i.playerColor);
    if (src) noteLine = generalizedTeaching(src.origin, spokenBeatText(src.note)).trim();
  } catch { /* corpus unavailable — the computed read stands alone */ }

  // 2. THE READ — every fact the computers make about this board, and the
  //    ones HIS reads of positions say, in his order (`readDecider`, fitted on
  //    his written reads and his videos). Nothing is joined in a fixed order:
  //    the decider is the only thing that picks.
  let decidingMoment = false;
  let readLines: string[] = [];
  const before = [...(i.analysis?.topLines ?? [])].sort((x, y) => x.rank - y.rank);
  if (before.length) try {
    const read = await boardReadFacts({
      fen: i.fen, studentColor: studentCC, rating: i.rating, before, history: sans, theory: true, tense: 'now',
      withhold: !!marks, readTempting: i.readTempting && !marks,
      read: async (fen) => (await stockfishEngine.analyzeWithBudget(fen, READ_DEPTH, READ_BUDGET_MS)).topLines ?? null,
      // THE HEAT MAP + THE NEED TERM (B3): the student's record and the
      // last move on each side when the PGN produces this board.
      studentNeedContext: i.studentNeedContext,
      extra: {
        evalBoard: i.evalBoard, studentWeaknesses: i.studentWeaknesses,
        lastMove: lastMoveIfStudent(sans, i.playerColor, i.fen) ?? undefined,
        opponentLastMove: lastMoveIfOpponent(sans, i.playerColor, i.fen) ?? undefined,
      },
    });
    decidingMoment = read.tier !== null && DECIDING_TIERS.has(read.tier);
    readLines = decideRead(read.facts).map((f) => f.text);
  } catch { readLines = []; }
  if (i.isCancelled()) return '';

  // 3. THE HABIT THAT CLOSES THE READ (WO-DANYA-READS-01 group 9): what
  //    decides this board, as the routine that finds it next time. Never on a
  //    puzzle still being solved: "run CCT" would say there is a shot.
  const habitLine = marks ? null : readHabit({
    studentShot: (tactics?.immediate ?? []).some((t) => t.side === 'student'),
    theirThreat: (tactics?.threats ?? []).length > 0,
    decidingMoment,
  })?.text ?? null;

  return [noteLine, ...readLines, habitLine ?? '']
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !reveals(t, marks))
    .join(' ');
}

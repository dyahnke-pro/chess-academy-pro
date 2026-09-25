// positionReadComposer — THE READ OF A POSITION, composed in ONE place
// (WO-STANDARD-01, 2026-09-22). `usePositionNarration` used to compose this
// itself from six computers — the note, the phase, the position facts, the
// positional read, the tactics context and the deepest look-ahead — which made
// the hook a third coach (surfaceComposition.scan). The hook now owns the
// engine read, the phrasing and the voice; WHAT is said comes from here.
//
// G0: every sentence returned is computed; the caller's model only phrases
// them, most-important-first, in the order returned.
import { buildFedTacticsContext, speakDeepestLookahead } from './liveTacticsContext';
import { readPosition } from './positionalRead';
import { detectPhase } from './narratedContinuation';
import { computePositionFacts, clauseText, type LastMoveInput } from './positionFacts';
import type { EvalBoardFn } from './perturbation';
import { teachingSourceForBoard, generalizedTeaching, spokenBeatText } from './danyaTeachingService';
import { lastMoveIfStudent, sansOfPgn } from './lastMoveOfLine';
import type { StudentNeedContext } from './needScore';
import type { StockfishAnalysis } from '../types';
import type { WeaknessSignal } from './weaknessSignal';
import { isBookLine } from './openingDetectionService';

/** The seat every sentence of the read is computed in. The facts computers
 *  write "you / they", so the read speaks that seat end to end and the phraser
 *  is never asked to re-seat anything (G0: pronouns are a board fact — whose
 *  piece — not a phrasing choice). `usePositionNarration` phrases in it too. */
export const READ_SEAT = 'student' as const;

/** The phase, as the coach names it opening a read — computed, one line each.
 *  A Record over the union so a fourth phase cannot ship without a sentence. */
const PHASE_LINE: Record<ReturnType<typeof detectPhase>, string> = {
  opening: 'Still in the opening.',
  middlegame: 'This is the middlegame now.',
  endgame: 'This is the endgame now.',
};

export interface PositionReadInput {
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
}

/**
 * Every computed sentence of the read, most-important-first, joined for the
 * phraser. Empty when the board says nothing worth a word — the caller then
 * stays silent rather than inventing.
 */
export async function composePositionRead(i: PositionReadInput): Promise<string> {
  const studentCC: 'w' | 'b' = i.playerColor === 'white' ? 'w' : 'b';
  const sans = sansOfPgn(i.pgn);

  // The bounded tactics context — the engine's deepest look-ahead is read off
  // it below. Reuses the analysis the caller already took (no extra engine
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

  // 2. THE PHASE — a two-line computation.
  const phaseLine = PHASE_LINE[detectPhase(i.fen, sans.length)];

  // 3. POSITION FACTS — the computed board-truth supply (importance-gated,
  //    DNA): the decision/intent read, the must-defend, the why-probe.
  let positionFactsBlock = '';
  try {
    if (i.analysis?.topLines?.length) {
      const lm = lastMoveIfStudent(sans, i.playerColor, i.fen, isBookLine(sans));
      const pf = await computePositionFacts({
        // The student TAPPED "read this position". Silence would be a dead
        // button — the same reasoning that exempts this surface from the
        // verbosity gate (CLAUDE.md §G5, third sanctioned exemption).
        posture: 'walk',
        fen: i.fen,
        moverColor: i.fen.split(' ')[1] === 'b' ? 'b' : 'w',
        studentColor: studentCC,
        rating: i.rating,
        analysis: i.analysis,
        evalBoard: i.evalBoard,
        studentWeaknesses: i.studentWeaknesses,
        // THE HEAT MAP + THE NEED TERM (B3): the student's last move when the
        // PGN produces this board and the last mover is them; absent
        // otherwise. Never graded here → `cpLoss: null`.
        ...((): { lastMove?: LastMoveInput } => (lm ? { lastMove: lm } : {}))(),
        studentNeedContext: i.studentNeedContext,
      });
      positionFactsBlock = clauseText(pf.clauses).join(' ');
    }
  } catch { positionFactsBlock = ''; }
  if (i.isCancelled()) return '';

  // 4. THE POSITIONAL READ — every ranked observation on both sides of the
  //    board, most useful first. NO cap (G4.5): the ranker orders, the student
  //    hears what it ranked. An observation whose square the facts above
  //    already named is skipped — say a thing once.
  const readLines: string[] = [];
  try {
    const already = `${noteLine} ${positionFactsBlock}`.toLowerCase();
    for (const o of readPosition(i.fen, i.playerColor)) {
      const naming = o.text.toLowerCase().match(/[a-h][1-8]/)?.[0];
      if (naming && already.includes(naming)) continue;
      readLines.push(o.text);
    }
  } catch { /* the read is a bonus, never a blocker */ }

  // 5. THE DEEPEST LOOK-AHEAD — the PV scan, pre-composed as the exact spoken
  //    line in code (G0: the engine decided, the voice only phrases). Null on
  //    a quiet board.
  //    ONE SEAT for the whole bundle (walk 6, P1): the facts computers speak
  //    "you / they", so the look-ahead does too. A bundle mixing "they" and "I"
  //    for the same side left the phraser to re-seat it, and it inverted it —
  //    "you're threatening to win my bishop" to the student whose bishop it was.
  const lookaheadLine = tactics ? speakDeepestLookahead(tactics, READ_SEAT, studentCC, i.studentWeaknesses) : null;

  return [noteLine, phaseLine, positionFactsBlock, ...readLines, lookaheadLine ?? '']
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' ');
}

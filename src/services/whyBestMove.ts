// whyBestMove — the COMPUTED answer for the "Why?" button (Phase 8, David
// 2026-08-26: "route the new computed voice — the 4-layer package — into it so
// 'why?' answers in Danya's voice, not a generic prompt"). G0: the board and
// the engine decide WHAT is true; this only phrases it. No LLM round-trip, no
// generic English question handed to the model to answer from scratch.
//
// Two computed sources, composed:
//   1. explainBestMoveGrounded — the concrete POINT of the strongest move
//      (fork / pin / mate / check / material), read off the board.
//   2. computePositionFacts — the position briefing (who's winning, the plan,
//      what must be defended, the real fork in the road) in the house register.
// The result is spoken directly (preferRaw) — the purest G0, and instant.
import { lastMoveFromPgn, positionAsk } from './moveInsight';
import { walkableLine } from './proof';
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import { explainBestMoveGrounded } from './groundedAnswer';
import { bestMoveReason } from './deliberation';
import { computePositionFacts, clauseText } from './positionFacts';
import { positionTeachingWhy, groundedMoveWhy } from './groundedMoveWhy';
import type { WeaknessSignal } from './weaknessSignal';
import type { StudentNeedContext } from './needScore';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import type { BoardArrow, WalkableLine } from '../types';
import { admitArrows, lineClaims } from './arrowDoor';

export interface WhyBestMoveInput {
  fen: string;
  /** The side to move — the student who tapped "Why?". */
  studentColor: 'white' | 'black';
  /** The warm eval-bar read for this FEN (bestMove + topLines + eval). */
  analysis: Pick<StockfishAnalysis, 'topLines' | 'evaluation' | 'isMate' | 'mateIn' | 'seldepth' | 'depth' | 'wdl' | 'bestMove'>;
  rating?: number;
  /** The game's PGN, so "Why?" can say what their last move changed first. */
  pgn?: string;
  /** Prior ply's eval (White POV) for the STATUS band-change line, if known. */
  prevEvalCpWhitePov?: number;
  /** The student model — re-ranks the briefing toward the holes THIS student
   *  keeps falling in (Phase 1). Optional/inert when absent. */
  studentWeaknesses?: readonly WeaknessSignal[];
  /** The OTHER half of the student model (N2): does this student need teaching
   *  here. REQUIRED, `null` allowed (B3): a caller must say whether it loaded
   *  the context, so a new "Why?" surface cannot silently ship without the
   *  need term the way the first three live surfaces did. No `lastMove` here
   *  — the student is to move, so the last move is the opponent's and nothing
   *  was posed to the student by it. */
  studentNeedContext: StudentNeedContext | null;
}

function bestSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const c = new Chess(fen);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion });
    return mv ? mv.san : null;
  } catch { return null; }
}

/**
 * A board-true, spoken-ready answer to "why is the best move best, and why are
 * the alternatives worse?" — composed entirely from computed facts. Returns ''
 * when nothing concrete is computable (silence beats a generic guess).
 */
export async function computeWhyBestMove(input: WhyBestMoveInput): Promise<string> {
  return (await computeWhyBestMoveDetail(input)).text;
}

/** The same answer plus the line it speaks, so the surface can arrow every ply
 *  (David 2026-10-05: "When we speak lines we also draw arrows!"). */
export async function computeWhyBestMoveDetail(input: WhyBestMoveInput): Promise<{ text: string; lines: WalkableLine[]; arrows: BoardArrow[] }> {
  const { fen, studentColor, analysis } = input;
  const spokenLines: WalkableLine[] = [];
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const uci: string | null = analysis.bestMove && analysis.bestMove.length >= 4 ? analysis.bestMove : null;
  const san = bestSan(fen, uci);
  const parts: string[] = [];

  // 0. THE NOTE LEADS (David 2026-09-10: "tie the why chain into the why
  //    button"). The corpus teaching about the position in front of the student
  //    is the 90%-of-the-voice layer; a "Why?" tap is an explicit request, so
  //    Play may speak it. Exact-position, board-verified, or nothing.
  const teaching = positionTeachingWhy(fen);
  if (teaching) parts.push(teaching);

  // 0b. WHAT THE POSITION ASKS (David 2026-10-05: "keep pressing? defend
  //     something? more pieces in the attack?") — said for the side to move
  //     when that is the student; the one insight computer.
  if (san && fen.split(' ')[1] === sc) {
    const last = input.pgn ? lastMoveFromPgn(input.pgn) : null;
    const leadsHere = (() => {
      if (!last) return false;
      try { const c = new Chess(last.fenBefore); c.move(last.san); return c.fen().split(' ')[0] === fen.split(' ')[0]; } catch { return false; }
    })();
    const ask = positionAsk(fen, { bestSan: san, lastMove: leadsHere && last ? last : undefined }).text;
    if (ask) parts.push(ask);
  }

  // 1. The concrete point of the strongest move (the engine-reasoning form).
  //    Never a bare "The strongest move is X." — the why-chain floor guarantees
  //    a grounded reason so a "Why?" tap is never a dead answer.
  const history = (() => {
    if (!input.pgn) return [] as string[];
    try { const c = new Chess(); c.loadPgn(input.pgn); return c.history(); } catch { return [] as string[]; }
  })();
  const point = explainBestMoveGrounded(fen, null, uci, studentColor, null, null); // "it forks the king and rook" | null
  // A MOVE THAT STARTS A FORCED MATE IS BEST FOR THAT REASON (hard walk
  // 2026-10-10); `mateIn` is White's view, so it is turned to the mover's.
  const moverMate = analysis.isMate && typeof analysis.mateIn === 'number' ? analysis.mateIn * (sc === 'w' ? 1 : -1) : 0;
  if (san) {
    // The ONE why-best computer (deliberation.bestMoveReason) — the same
    // reason the chat and Learn's weighing give — then the geometry and the
    // note floor, so a Why tap is never dead.
    const own = fen.split(' ')[1] === sc
      ? bestMoveReason(fen, san, sc, { mateIn: moverMate > 0 ? moverMate : null, opponentLastSan: history.length ? history[history.length - 1] : null })
      : null;
    const reason = own ? `it ${own}` : point?.trim() || groundedMoveWhy([], fen, san, studentColor);
    // Strip a trailing period on the reason before adding our own — the grounded
    // computers sometimes return a full sentence ("It wins the rook on e7."),
    // which produced "…on e7.." (coach audit 2026-09-11).
    const cleaned = (reason ?? '').replace(/\s*\.\s*$/, '');
    parts.push(`The strongest move is ${san} — ${cleaned}.`);
  }

  // 2. The position briefing — the plan + what's at stake + the real fork in the
  //    road (why the natural alternatives fall short). Exclude the interface-y /
  //    convert clauses; keep the teaching ones.
  try {
    const pf = await computePositionFacts({
      // A "Why?" TAP is an explicit request, like "read this position" — the
      // student asked, so the moment is ranked, never muted. A dead Why button
      // is the failure this posture prevents.
      posture: 'walk',
      fen,
      moverColor: sc,
      studentColor: sc,
      analysis,
      rating: input.rating ?? DEFAULT_STUDENT_RATING,
      ...(input.prevEvalCpWhitePov != null ? { prevEvalCpWhitePov: input.prevEvalCpWhitePov } : {}),
      ...(input.studentWeaknesses ? { studentWeaknesses: input.studentWeaknesses } : {}),
      studentNeedContext: input.studentNeedContext,
      // The speed-run depth comes from the one producer through the door:
      // "Why?" names the best move anyway, so its line may speak.
      history,
      namesBestMove: true,
    });
    for (const c of pf.clauses) for (const l of c.lines ?? []) {
      const w = walkableLine(l.fen, l.sans, l.sans[0] ?? '');
      if (w) spokenLines.push(w);
    }
    const briefing = clauseText(pf.clauses, ['key-moment', 'convert']);
    for (const line of briefing) if (line && !parts.some((p) => p.includes(line))) parts.push(line);
  } catch { /* engine/board facts unavailable — the best-move point still stands */ }

  // Every ply of every spoken line, through the one arrow door.
  const arrows = spokenLines.flatMap((l) => admitArrows(lineClaims(l.startFen, l.plies, 'why.line'), { fen: l.startFen, studentColor }).arrows);
  return { text: parts.join(' ').trim(), lines: spokenLines, arrows };
}

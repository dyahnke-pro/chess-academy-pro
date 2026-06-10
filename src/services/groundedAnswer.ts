/**
 * groundedAnswer — Phase 1 of the coach-chat grounding inversion
 * (docs/plans/2026-06-10-coach-chat-grounding-inversion.md).
 *
 * The contract: the LLM voices computed facts; it never reasons about the
 * board. This assembles the FACTS for a move / eval question entirely in
 * code — the engine's best move, the line, the eval, and the GROUNDED reason
 * it's strong (`explainBestMoveGrounded`, the no-LLM "why" the review path
 * already uses). The chat path hands the resulting `facts` string to the LLM
 * with a voice-only instruction; the model adds nothing.
 *
 * Pure + side-effect-free so it's trivially testable and can't regress the
 * live chat. Wiring it into `getCoachChatResponse` is the next step.
 */
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';
import type { TacticsLiveContext } from '../coach/types';

// Pure board-fact constants — universal chess values, leaf-local so this module
// imports nothing that could loop back. coachFeatureService imports these FROM
// here (one direction), instead of the reverse that created the cycle.
export const REVIEW_PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const REVIEW_PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

export interface GroundedAnswer {
  /** The plain-language facts the LLM must voice — and ONLY these. */
  facts: string;
  /** SAN of the computed best move (for the arrow + the prompt), or null. */
  bestMoveSan: string | null;
  /** The from/to of the best move, for a `[BOARD: arrow:from-to:green]`. */
  bestMoveFromTo: { from: string; to: string } | null;
  /** Where every fact came from (engine / chess.js) — recorded, never the LLM. */
  sources: string[];
}

/** Convert a centipawn eval (side-to-move POV) into a grounded phrase. Never
 *  invents a number — rounds the real one. */
function evalPhrase(evalCp: number | null | undefined, mateIn: number | null | undefined, mover: 'white' | 'black'): string | null {
  if (typeof mateIn === 'number' && mateIn !== 0) {
    const who = mateIn > 0 ? mover : (mover === 'white' ? 'black' : 'white');
    return `there is a forced mate in ${Math.abs(mateIn)} for ${who}`;
  }
  if (typeof evalCp !== 'number') return null;
  const pawns = evalCp / 100;
  const who = pawns >= 0 ? mover : (mover === 'white' ? 'black' : 'white');
  const mag = Math.abs(pawns);
  if (mag < 0.3) return 'the position is roughly balanced';
  if (mag < 1.0) return `${who} is slightly better (about ${mag.toFixed(1)} pawns)`;
  if (mag < 2.5) return `${who} is clearly better (about ${mag.toFixed(1)} pawns)`;
  return `${who} is winning (about ${mag.toFixed(1)} pawns)`;
}

/**
 * Assemble the grounded facts for a move / best-move / eval question.
 * Returns null when there's no engine move to ground on (caller falls back
 * to the existing path — this never fabricates).
 */
export function assembleMoveEvalAnswer(opts: {
  fen: string;
  /** Engine best move in UCI (e.g. `g1f3`) — from Stockfish PV[0]. */
  bestMoveUci: string | null;
  evalCp?: number | null;
  mateIn?: number | null;
}): GroundedAnswer | null {
  const { fen, bestMoveUci } = opts;
  if (!bestMoveUci || bestMoveUci.length < 4) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  // SAN + from/to from the UCI — chess.js is the truth, not the LLM.
  let bestMoveSan: string | null = null;
  let fromTo: { from: string; to: string } | null = null;
  try {
    const probe = new Chess(fen);
    const from = bestMoveUci.slice(0, 2);
    const to = bestMoveUci.slice(2, 4);
    const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
    const mv = probe.move({ from, to, promotion });
    if (mv) {
      bestMoveSan = mv.san;
      fromTo = { from, to };
    }
  } catch {
    return null; // illegal best move → don't ground (never fabricate)
  }
  if (!bestMoveSan) return null;

  // The GROUNDED reason it's strong — no LLM. (playedSan null: we're not
  // contrasting a played move here, just stating what the best move achieves.)
  const why = explainBestMoveGrounded(fen, null, bestMoveUci, mover);
  const evalText = evalPhrase(opts.evalCp, opts.mateIn, mover);

  const parts: string[] = [`The best move is ${bestMoveSan}.`];
  if (why) parts.push(why);
  if (evalText) parts.push(`${evalText.charAt(0).toUpperCase()}${evalText.slice(1)}.`);

  const sources = ['engine:stockfish', 'board:chess.js'];

  return {
    facts: parts.join(' '),
    bestMoveSan,
    bestMoveFromTo: fromTo,
    sources,
  };
}

/**
 * explainBestMoveGrounded — the GROUNDED, LLM-FREE "why" (moved here from
 * coachFeatureService 2026-06-10 to break the import cycle: pure board-fact
 * computers belong in the leaf, not in a service tangled with coachApi). It
 * reports ONLY what chess.js can prove about the board — what the best move
 * concretely wins, whether it gives check, what the played move left hanging —
 * never the engine's deep reasoning it can't see.
 */
export function explainBestMoveGrounded(
  fenBefore: string,
  playedSan: string | null,
  bestMoveUci: string | null,
  moverColor: 'white' | 'black',
): string | null {
  if (!bestMoveUci || bestMoveUci.length < 4) return null;
  const mc: 'w' | 'b' = moverColor === 'white' ? 'w' : 'b';

  let bestClause: string | null = null;
  try {
    const c = new Chess(fenBefore);
    const to = bestMoveUci.slice(2, 4);
    const captured = c.get(to as never);
    const mv = c.move({ from: bestMoveUci.slice(0, 2), to, promotion: bestMoveUci.length > 4 ? bestMoveUci[4] : undefined });
    if (mv) {
      if (captured && captured.color !== mc) {
        const recapturable = c.attackers(to as never, captured.color).length > 0;
        const movedVal = REVIEW_PIECE_VALUE[mv.piece] ?? 0;
        const capVal = REVIEW_PIECE_VALUE[captured.type] ?? 0;
        if (!recapturable || capVal > movedVal) {
          bestClause = `it wins the ${REVIEW_PIECE_NAME[captured.type]} on ${to}`;
        }
      }
      if (!bestClause && c.inCheck()) bestClause = 'it comes with check';
    }
  } catch { /* board fact unavailable — stay silent */ }

  let costClause: string | null = null;
  if (playedSan) {
    try {
      const c = new Chess(fenBefore);
      if (c.move(playedSan)) {
        const hung = findHangingPieces(c).filter((h) => h.color === mc);
        if (hung.length > 0) {
          hung.sort((a, b) => (REVIEW_PIECE_VALUE[b.piece] ?? 0) - (REVIEW_PIECE_VALUE[a.piece] ?? 0));
          const h = hung[0];
          const captures = c.moves({ verbose: true }).filter((mm) => mm.to === h.square && mm.captured);
          if (captures.length > 0) {
            captures.sort((a, b) => (REVIEW_PIECE_VALUE[a.piece] ?? 0) - (REVIEW_PIECE_VALUE[b.piece] ?? 0));
            const punish = captures[0];
            const punisher = mc === 'w' ? 'Black' : 'White';
            let givesCheck = false;
            try { const after = new Chess(c.fen()); after.move(punish.san); givesCheck = after.inCheck(); } catch { /* keep false */ }
            costClause = `your move let ${punisher} play ${punish.san}, winning the ${REVIEW_PIECE_NAME[h.piece]}${givesCheck ? ' with check' : ''}`;
          } else {
            costClause = `your move left the ${REVIEW_PIECE_NAME[h.piece]} on ${h.square} hanging`;
          }
        }
      }
    } catch { /* board fact unavailable — stay silent */ }
  }

  if (bestClause && costClause) return `${cap(bestClause)}, while ${costClause}.`;
  if (bestClause) return `${cap(bestClause)}.`;
  if (costClause) return `${cap(costClause)}.`;
  return null;
}

/**
 * assembleTacticsAnswer — Phase 2 of the grounding inversion: tactics / danger
 * questions ("is anything hanging?", "what's the threat?", "is there a fork?").
 * The `liveTacticsContext` engine has ALREADY computed everything — the fork
 * descriptions, the hanging pieces, the mate-in-one — deterministically from
 * the FEN. So this just SELECTS the relevant facts and packages them for the
 * voiceFacts chokepoint. The LLM decides nothing; it voices these descriptions.
 * Returns null when there's no concrete tactic (caller takes the one fallback).
 */
export function assembleTacticsAnswer(
  tactics: TacticsLiveContext,
  studentColor: 'white' | 'black',
): GroundedAnswer | null {
  const sc: 'w' | 'b' = studentColor === 'white' ? 'w' : 'b';
  const parts: string[] = [];

  // Most urgent: a forced mate-in-one for the side to move.
  if (tactics.boardFacts?.mateInOne) {
    parts.push(`There is checkmate in one: ${tactics.boardFacts.mateInOne}.`);
  }
  // Immediate tactics on the board now — voice the engine's own descriptions.
  for (const t of tactics.immediate.slice(0, 2)) {
    if (t.description) parts.push(`${t.description}.`);
  }
  // The STUDENT's pieces left hanging — warn concretely.
  for (const h of tactics.hanging.filter((p) => p.color === sc).slice(0, 2)) {
    parts.push(`Your ${REVIEW_PIECE_NAME[h.piece] ?? h.piece} on ${h.square} is hanging.`);
  }
  // Nothing concrete yet → surface the top threat, then the top opportunity.
  if (parts.length === 0 && tactics.threats[0]?.description) {
    parts.push(`Watch out — ${tactics.threats[0].description}.`);
  }
  if (parts.length === 0 && tactics.opportunities[0]?.description) {
    parts.push(`You have a shot: ${tactics.opportunities[0].description}.`);
  }

  if (parts.length === 0) return null;
  return {
    facts: parts.join(' '),
    bestMoveSan: null,
    bestMoveFromTo: null,
    sources: ['engine:stockfish', 'board:chess.js'],
  };
}

// onlyMoveSequence — walk a FORCED line out to its terminus (David 2026-07-23:
// "a series of only moves that leads to a draw by repetition"). From a position,
// follow the line while EVERY move is an only-move (the criticality scan's
// cliff), stopping when the forcing ends or the board reaches a terminus that
// chess.js can PROVE: checkmate, stalemate, threefold repetition (→ perpetual
// when the whole line was checks), or insufficient material.
//
// This is the passive walk: the coach plays it out on the board and says "every
// one of these is the only move — and it dead-ends in a draw, neither side can
// escape." Every claim is a Stockfish number (only-move) or a chess.js fact
// (the terminus). 100% engine + board; zero LLM.

import { Chess } from 'chess.js';
import { scanCriticality } from './criticalityScan';
import type { EvaluateMulti, CriticalityOpts } from './criticalityScan';

export type SequenceTerminus =
  | 'checkmate'
  | 'stalemate'
  | 'repetition'
  | 'perpetual'
  | 'insufficient'
  | 'not-forced'   // the line reached a real choice — forcing is over
  | 'depth-limit'; // hit maxPlies while still forced

export interface ForcedStep {
  san: string;
  uci: string;
  fenAfter: string;
  /** The only-move gap (cp) that made this step forced (Infinity if the only
   *  legal move). */
  gapCp: number;
  /** This move gave check. */
  check: boolean;
}

export interface ForcedSequence {
  fen: string;
  steps: ForcedStep[];
  terminus: SequenceTerminus;
  /** The proven result of the line, from the terminus. */
  outcome: 'draw' | 'white-mates' | 'black-mates' | 'unclear';
}

export interface ForcedSequenceOpts extends CriticalityOpts {
  /** Max plies to walk before giving up (a true perpetual stops earlier via
   *  threefold repetition). Default 16. */
  maxPlies?: number;
}

/**
 * Walk the forced line from `fen`. Returns the sequence of only-moves and the
 * proven terminus. A step is only added while the position is an ONLY-MOVE
 * (isOnlyMove from the criticality scan) — the moment there's a real choice, the
 * walk stops with `not-forced`. Terminus is read off chess.js after each move.
 */
export async function walkForcedSequence(
  fen: string,
  evaluate: EvaluateMulti,
  opts: ForcedSequenceOpts = {},
): Promise<ForcedSequence> {
  const maxPlies = opts.maxPlies ?? 16;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return { fen, steps: [], terminus: 'not-forced', outcome: 'unclear' }; }

  const steps: ForcedStep[] = [];
  let terminus: SequenceTerminus = 'depth-limit';

  for (let ply = 0; ply < maxPlies; ply++) {
    if (chess.isGameOver()) { terminus = terminusFromBoard(chess, steps); break; }

    const cm = await scanCriticality(chess.fen(), evaluate, opts);
    if (!cm || !cm.isOnlyMove) { terminus = 'not-forced'; break; }

    let m: ReturnType<Chess['move']> | null;
    try {
      m = chess.move({ from: cm.best.uci.slice(0, 2), to: cm.best.uci.slice(2, 4), promotion: cm.best.uci.length > 4 ? cm.best.uci[4] : undefined });
    } catch { m = null; }
    if (!m) { terminus = 'not-forced'; break; }

    steps.push({ san: m.san, uci: cm.best.uci, fenAfter: chess.fen(), gapCp: cm.gapCp, check: chess.inCheck() });

    if (chess.isCheckmate() || chess.isStalemate() || chess.isInsufficientMaterial() || chess.isThreefoldRepetition()) {
      terminus = terminusFromBoard(chess, steps);
      break;
    }
  }

  return { fen, steps, terminus, outcome: outcomeFromTerminus(terminus, chess) };
}

function terminusFromBoard(chess: Chess, steps: ForcedStep[]): SequenceTerminus {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient';
  if (chess.isThreefoldRepetition()) {
    // A repetition reached entirely by checks is a PERPETUAL — the sharper,
    // more teachable framing.
    return steps.length > 0 && steps.every((s) => s.check) ? 'perpetual' : 'repetition';
  }
  return 'not-forced';
}

function outcomeFromTerminus(terminus: SequenceTerminus, chess: Chess): ForcedSequence['outcome'] {
  if (terminus === 'checkmate') return chess.turn() === 'w' ? 'black-mates' : 'white-mates';
  if (terminus === 'stalemate' || terminus === 'repetition' || terminus === 'perpetual' || terminus === 'insufficient') return 'draw';
  return 'unclear';
}

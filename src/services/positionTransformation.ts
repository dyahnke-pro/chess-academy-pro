// positionTransformation — detect the "position transformation" weakness class
// (David 2026-08-26, emphatic: "positional weakness is huge! … position
// transformation!!"). His worked example: "I set up a trade that would create a
// passed pawn but failed to realize it was lining up my bishop and king and I
// got pinned."
//
// This is the POSITIONAL under-feeding fix (arc Phase 4): the tactical capture
// gate in mistakePuzzleService drops non-tactical misses, so a bad TRADE — an
// exchange that transforms the position against you with material roughly level
// — never becomes a drillable mistake. This detector flags two board-true,
// G3-safe cases (pure geometry + material; it invents no chess):
//
//   • 'unfavorable-trade'      — the played move is a capture the opponent can
//                                recapture (a genuine exchange, not a free
//                                grab) at roughly even material. The eval drop
//                                (cpLoss, supplied by the caller) is therefore
//                                POSITIONAL, not material: you traded into a
//                                worse position.
//   • 'missed-favorable-trade' — the engine's best move is a capture/exchange
//                                the player DECLINED (played a non-capture
//                                instead). A transformation the player missed.
//
// It decides nothing about whether the move was a mistake — the caller already
// knows that from cpLoss. It only classifies the STRUCTURAL SHAPE of the miss so
// the weakness can be named and drilled. Conservative by design (high precision,
// low recall): when the shape isn't clearly a trade, it returns null and the
// position is left to the tactical gate.
import { Chess } from 'chess.js';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** Two pieces are "an even trade" when their values are within this margin
 *  (a bishop for a knight counts; a rook for a bishop does not). */
const EVEN_TRADE_MARGIN = 1;

export type TransformationKind = 'unfavorable-trade' | 'missed-favorable-trade';

export interface TransformationResult {
  kind: TransformationKind;
  /** The exchanged piece letters (lowercase), for the drill label/narration. */
  captured: string;
  recapturedBy?: string;
}

/** True when, after `moveUci` is played from `fen`, the opponent has a legal
 *  capture landing on the move's destination square (i.e. the moved piece can
 *  be recaptured — the exchange is real, not a free win of material). */
function destinationIsRecapturable(fen: string, moveUci: string): { yes: boolean; recapturer?: string } {
  try {
    const c = new Chess(fen);
    const played = c.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] });
    if (!played) return { yes: false };
    const to = played.to;
    for (const m of c.moves({ verbose: true }) as Array<{ to: string; captured?: string; piece: string }>) {
      if (m.to === to && m.captured) return { yes: true, recapturer: m.piece };
    }
    return { yes: false };
  } catch {
    return { yes: false };
  }
}

function isCapture(fen: string, uci: string): { yes: boolean; captured?: string; movedPiece?: string } {
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m?.captured ? { yes: true, captured: m.captured, movedPiece: m.piece } : { yes: false };
  } catch {
    return { yes: false };
  }
}

/** An even-ish exchange: the mover gives a piece of roughly equal value for the
 *  one it takes, so the eval swing is POSITIONAL, not a material win/loss. */
function isEvenTrade(captured: string, moved: string): boolean {
  return Math.abs((VALUE[captured] ?? 0) - (VALUE[moved] ?? 0)) <= EVEN_TRADE_MARGIN;
}

/**
 * Classify the structural shape of a positional miss, or null when it isn't a
 * clear trade/transformation. The caller supplies `fenBefore` (the position the
 * player moved from), the player's UCI move, and the engine's best UCI move.
 */
export function detectPositionTransformation(
  fenBefore: string,
  playerUci: string,
  bestUci: string,
): TransformationResult | null {
  if (!playerUci || playerUci.length < 4) return null;

  // Case 1 — the player made an EVEN trade that hurt (unfavorable-trade). The
  // player gives their moved piece for one of roughly equal value AND the moved
  // piece can be recaptured — a genuine exchange whose eval drop is positional,
  // not a material win (that would be a tactic for the tactical gate).
  const played = isCapture(fenBefore, playerUci);
  if (played.yes && played.captured && played.movedPiece && isEvenTrade(played.captured, played.movedPiece)) {
    const recap = destinationIsRecapturable(fenBefore, playerUci);
    if (recap.yes) {
      return { kind: 'unfavorable-trade', captured: played.captured, recapturedBy: recap.recapturer };
    }
  }

  // Case 2 — the engine wanted a trade the player DECLINED (missed-favorable):
  // the best move is a genuine even exchange (recapturable, ~equal value) that
  // the player skipped for a non-capture. Not a hanging piece they failed to
  // grab (that's a tactic).
  if (!played.yes && bestUci && bestUci.length >= 4) {
    const best = isCapture(fenBefore, bestUci);
    if (best.yes && best.captured && best.movedPiece && isEvenTrade(best.captured, best.movedPiece)) {
      const bestRecap = destinationIsRecapturable(fenBefore, bestUci);
      if (bestRecap.yes) {
        return { kind: 'missed-favorable-trade', captured: best.captured, recapturedBy: bestRecap.recapturer };
      }
    }
  }

  return null;
}

const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A short, board-true label for the weakness a transformation miss represents. */
export function transformationLabel(r: TransformationResult): string {
  if (r.kind === 'unfavorable-trade') return 'Unfavorable trades';
  return 'Missed favorable trades';
}

/** A one-line prompt naming the structural error (code-authored, G0). */
export function transformationPrompt(r: TransformationResult): string {
  const captured = PIECE_NAME[r.captured] ?? 'piece';
  if (r.kind === 'unfavorable-trade') {
    return `That trade of the ${captured} transformed the position against you — find the move that keeps the tension instead.`;
  }
  return `A favorable exchange was on the table here — find the trade that improves your position.`;
}

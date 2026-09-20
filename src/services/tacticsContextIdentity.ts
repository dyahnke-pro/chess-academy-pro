/**
 * tacticsContextIdentity — the two checks a `TacticsLiveContext` earns by
 * carrying its own `fen` (David 2026-09-19).
 *
 * A LEAF on purpose: chess.js and the type, nothing else. Both
 * `groundedAnswer.ts` (a pure fact-computer that must never import the engine)
 * and `liveTacticsContext.ts` (which does) need these, and putting them in
 * either would either drag the engine into the leaf or create a second copy —
 * the duplicated-constant rot this repo keeps finding.
 *
 * TWO DIFFERENT FAILURES, TWO DIFFERENT CHECKS. Do not conflate them:
 *
 *   `tacticsAreFreshFor` — STALENESS. Is this package about the board the
 *   consumer is looking at? A stale package is INTERNALLY CONSISTENT — every
 *   claim in it was true of the board it was built from — so no amount of
 *   checking its claims against its OWN fen can ever flag it. The 22-ply Learn
 *   game that spoke "Your knight on b5 is hanging" fifteen plies after the
 *   knight was captured: the knight really WAS on b5 in the position that
 *   package came from. Only comparing the package's fen to the live board sees
 *   the disagreement.
 *
 *   `pieceIsOn` — INTERNAL INCONSISTENCY. Is a claim true of even the board
 *   the package says it is about? A detector (or a fixture) can name a square
 *   that its own fen does not bear out. Verified against `tactics.fen`, which
 *   is why the field is REQUIRED: the check needs no caller to remember a
 *   parameter.
 */
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { TacticsLiveContext } from '../coach/types';

/** The identity of a board: PLACEMENT + SIDE TO MOVE — the first two FEN
 *  fields. The clocks and the castling / en-passant bookkeeping can differ
 *  between a surface's FEN and the analysis FEN for the same board (a
 *  transposition, a FEN rebuilt from a move list), and refusing on those would
 *  silence a package that is genuinely about the board in front of the
 *  student. Empty > invented — but not empty > true. */
function boardKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 2).join(' ');
}

/** Is this package about the board the consumer is rendering for?
 *
 *  A null/absent board fen means the caller does not know where it is, and
 *  that is NOT a licence to speak: it returns false. The whole defect was a
 *  consumer speaking about a board it could not identify. */
export function tacticsAreFreshFor(
  tactics: Pick<TacticsLiveContext, 'fen'> | null | undefined,
  boardFen: string | null | undefined,
): boolean {
  if (!tactics?.fen || !boardFen) return false;
  return boardKey(tactics.fen) === boardKey(boardFen);
}

/** Does `fen` actually hold a `piece` of `color` on `square`?
 *
 *  Colour is part of the claim: "YOUR knight on d5" is false when d5 holds
 *  THEIR knight. `color` is the FEN colour code the package already uses.
 *  A malformed fen or square is false, never a throw — a consumer must not
 *  crash a coach turn over a claim it could not verify; it just does not make
 *  the claim. */
export function pieceIsOn(
  fen: string,
  square: string,
  piece: string,
  color: 'w' | 'b',
): boolean {
  try {
    const on = new Chess(fen).get(square as Square);
    return !!on && on.type === piece && on.color === color;
  } catch {
    return false;
  }
}

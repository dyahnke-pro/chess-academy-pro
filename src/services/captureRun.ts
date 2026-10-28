// captureRun — THE ONE THREAD of captures on a square (2026-10-28). A leaf:
// piece values only, so the chat's fact computers (`groundedAnswer`, a leaf
// itself) and the engine-path replays read the same run. Every copy that read
// one move back called …Nxb4 "taking back the pawn" after cxb4 axb4 — the
// move that wins it.
import { MATERIAL_VALUE } from './pieceValues';

export interface PrevCaptureContext {
  /** The square the previous ply captured on (its destination), or null. */
  square: string | null;
  /** The value of the piece the previous ply captured (0 if it wasn't a capture). */
  capturedValue: number;
  /** What the side that made the previous capture has NETTED over the run of
   *  captures on `square` ending with it — its takes minus the other side's.
   *  REQUIRED, and built only by `afterCapture` (2026-10-28): every copy that
   *  read one ply back called …Nxb4 "taking back the pawn" after cxb4 axb4,
   *  when it is the move that wins it. */
  net: number;
}

export const NO_PREV_CAPTURE: PrevCaptureContext = { square: null, capturedValue: 0, net: 0 };

/** THE ONE THREAD of captures on a square: the context after `mv`, given the
 *  context before it. A capture on the square the last capture took on
 *  continues the run; anything else starts one (or ends it). */
export function afterCapture(prev: PrevCaptureContext, mv: { to: string; captured?: string | null }): PrevCaptureContext {
  if (!mv.captured) return NO_PREV_CAPTURE;
  const value = MATERIAL_VALUE[mv.captured] ?? 0;
  const continues = prev.square === mv.to && prev.capturedValue > 0;
  return { square: mv.to, capturedValue: value, net: continues ? value - prev.net : value };
}


// blunderRewind — "return to the last moment you had a choice" (David
// 2026-07-11, approved for post-game review). After a blunder in the review
// walk, find the last STUDENT-to-move position where the game was still
// holdable — computed by walking the eval trace backward — so the coach can
// rewind the board there and turn it into a hold-the-game challenge.
//
// Pure over the walk's segments: nothing here touches the LLM (G0).

export interface RewindSegmentLike {
  ply: number;
  playerColor: 'white' | 'black';
  fenBefore: string;
  /** White-POV centipawns BEFORE this move (the eval the mover faced). */
  evalBefore: number | null;
  bestMoveUci: string | null;
}

export interface RewindTarget {
  /** The student-to-move ply to rewind to (1-indexed, matches the walk). */
  ply: number;
  /** The position the student faced there — the challenge anchor. */
  fenBefore: string;
  /** The engine's move at that position — the holding answer. */
  bestUci: string;
}

/** "Still in the student's hands" — mover-POV centipawns. */
export const HOLDABLE_CP = -50;
/** A rewind only teaches when it jumps a real distance — otherwise the
 *  find-the-shot / why-picker on the blunder ply already covers it. */
export const REWIND_MIN_PLY_GAP = 3;

/**
 * The last student-to-move ply before `blunderPly` where the position was
 * still holdable AND the engine's move there is known. Null when the game
 * was already gone (no holdable moment), when the holdable moment is too
 * close to the blunder to be a real rewind, or when data is missing.
 */
export function findRewindTarget(
  segments: ReadonlyArray<RewindSegmentLike>,
  blunderPly: number,
  studentColor: 'white' | 'black',
): RewindTarget | null {
  const sign = studentColor === 'white' ? 1 : -1;
  let best: RewindTarget | null = null;
  for (const s of segments) {
    if (s.ply >= blunderPly) continue;
    if (s.playerColor !== studentColor) continue;
    if (typeof s.evalBefore !== 'number') continue;
    if (s.evalBefore * sign < HOLDABLE_CP) continue;
    if (!s.bestMoveUci || s.bestMoveUci.length < 4) continue;
    if (best === null || s.ply > best.ply) {
      best = { ply: s.ply, fenBefore: s.fenBefore, bestUci: s.bestMoveUci };
    }
  }
  if (!best) return null;
  if (blunderPly - best.ply < REWIND_MIN_PLY_GAP) return null;
  return best;
}

// punishPlayout — play a refutation OUT until the advantage is actually ON THE
// BOARD, at runtime.
//
// David 2026-08-01: "extend the trap lines until the full advantage has played
// out. Some of the gems stopped short and didn't really explain or show the
// advantage" — and then, for this surface specifically, "it needs to play out.
// you have permission to touch the punish stage gen."
//
// The GEMS were fixed offline (`scripts/extend-punish-gems.mjs`), because a gem
// is static committed data. The walkthrough's PUNISH STAGE is not: it is built
// per session from the Lichess puzzle DB, and its `followup` is whatever the
// model emitted, truncated at the first illegal move. So the student picks the
// crushing move and the line simply ends — told they won a piece they never saw
// arrive. Same defect, different lifetime, so it needs the same terminus rule
// computed live.
//
// THE TERMINUS (checked on the board, never counted in plies — David: "i don't
// like the cap. what if it takes longer for the advantage to play out?"):
//   QUIET   — neither side in check and the best move is not a capture/check,
//             for two plies running, so the dust has settled.
//   SHOWN   — the punisher is up at least a pawn IN MATERIAL. An evaluation
//             edge is not "shown"; material on the board is what a student can
//             see.
//   or mate / game over / the engine has nothing.
//
// HONESTY: best play does not have to cooperate. If playing on dissolves the
// advantage, that is the truth about the position, and the play-out returns
// what it had rather than marching to a worse place. Nothing is invented — every
// move is the engine's, applied through chess.js (G3), and every line of prose
// is composed from the board by `narrateContinuationMove` (G0).
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { narrateContinuationMove } from './continuationMoveNarration';
import type { NarrationArrow } from '../types';

export interface PlayoutStep {
  san: string;
  /** Board-composed narration for this ply (full register). */
  idea: string;
  /** Board-composed short cue (Learn register). */
  shortIdea: string;
  /** Lead-the-eye arrows for the move just played. */
  arrows: NarrationArrow[];
  /** Position after this ply. */
  fen: string;
}

export interface PlayoutResult {
  steps: PlayoutStep[];
  /** Why the walk stopped — for audits, not for the student. */
  terminus: 'shown' | 'mate' | 'gameover' | 'nobest' | 'illegal' | 'ceiling' | 'dissolved';
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material from `side`'s point of view, in pawns. */
function materialDelta(chess: Chess, side: 'w' | 'b'): number {
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const v = PIECE_VALUE[sq.type] ?? 0;
      score += sq.color === side ? v : -v;
    }
  }
  return score;
}

/** A UCI move applied through chess.js, so the SAN comes back validated. */
function applyUci(chess: Chess, uci: string): { san: string; from: string; to: string } | null {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;
  try {
    const mv = chess.move({ from, to, ...(promotion ? { promotion } : {}) });
    return mv ? { san: mv.san, from: mv.from, to: mv.to } : null;
  } catch {
    return null;
  }
}

/** A hard ceiling that exists ONLY so a runtime loop cannot spin forever — it
 *  is not the "cap" David rejected. The terminus above is what actually stops
 *  a healthy walk; hitting this means something is wrong (an engine returning
 *  junk, a fortress that never settles), and stopping is better than hanging a
 *  walkthrough mid-lesson. Deliberately far above any real refutation: the
 *  deepest extended gem needed 26 plies. */
const SAFETY_CEILING = 60;

/**
 * Play `fen` out with best play from both sides until the advantage is shown.
 *
 * @param fen        position AFTER the punishing move
 * @param punisher   the side that played the punish — whose advantage this is
 * @param moveTimeMs per-move engine budget. The default is small on purpose:
 *                   each ply is computed while the PREVIOUS one is being
 *                   spoken, so the walk hides behind the narration instead of
 *                   making the student wait. On the slowest asm.js fallback a
 *                   short budget yields a weaker but still sound move; a
 *                   stalled lesson would be worse than a slightly soft ply.
 */
export async function playOutPunish(
  fen: string,
  punisher: 'w' | 'b',
  moveTimeMs = 350,
): Promise<PlayoutResult> {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { steps: [], terminus: 'illegal' };
  }

  const startMaterial = materialDelta(chess, punisher);
  const steps: PlayoutStep[] = [];
  let quietRun = 0;
  let terminus: PlayoutResult['terminus'] = 'ceiling';

  for (let i = 0; i < SAFETY_CEILING; i += 1) {
    if (chess.isGameOver()) { terminus = 'gameover'; break; }

    let best: string;
    try {
      best = await stockfishEngine.getBestMove(chess.fen(), moveTimeMs);
    } catch {
      terminus = 'nobest';
      break;
    }
    if (!best || best.length < 4) { terminus = 'nobest'; break; }

    // Is THIS position already the terminus? Quiet + settled + shown.
    const inCheck = chess.inCheck();
    let forcing = false;
    try {
      const probe = new Chess(chess.fen());
      const mv = probe.move({ from: best.slice(0, 2), to: best.slice(2, 4), ...(best.length > 4 ? { promotion: best[4] } : {}) });
      forcing = !!mv?.captured || probe.inCheck();
    } catch {
      forcing = false;
    }
    // ABSOLUTE material, not a gain measured from the start of the walk: the
    // punish itself usually IS what wins the piece, so a delta would read zero
    // at exactly the moment the advantage is most clearly on the board and
    // march the line on to the ceiling looking for a second one.
    quietRun = !inCheck && !forcing ? quietRun + 1 : 0;
    if (quietRun >= 2 && materialDelta(chess, punisher) >= 1) {
      terminus = 'shown';
      break;
    }

    const fenBefore = chess.fen();
    const applied = applyUci(chess, best);
    if (!applied) { terminus = 'illegal'; break; }
    const narration = narrateContinuationMove(fenBefore, chess.fen(), applied.san, applied.from, applied.to);
    steps.push({
      san: applied.san,
      idea: narration.say,
      shortIdea: narration.short,
      arrows: narration.arrows,
      fen: chess.fen(),
    });
    if (chess.isCheckmate()) { terminus = 'mate'; break; }
  }

  // Playing on made it WORSE — return nothing rather than walk the student
  // into a line that gives the advantage back. The caller keeps what it had.
  if (steps.length > 0 && materialDelta(chess, punisher) < startMaterial) {
    return { steps: [], terminus: 'dissolved' };
  }
  return { steps, terminus };
}

/** Is the punisher already up material AND is the position quiet at `fen`?
 *  When both hold there is nothing to play out and the caller should not spend
 *  engine time at all — which is the common case for a clean fork or a mate. */
export function advantageAlreadyShown(fen: string, punisher: 'w' | 'b'): boolean {
  try {
    const chess = new Chess(fen);
    if (chess.isGameOver()) return true;
    if (chess.inCheck()) return false;
    // Anything hanging to a capture means the dust has not settled, so the
    // material on the board is not yet the material the student keeps.
    const loose = chess.moves({ verbose: true }).some((m) => !!m.captured);
    return !loose && materialDelta(chess, punisher) >= 1;
  } catch {
    return false;
  }
}

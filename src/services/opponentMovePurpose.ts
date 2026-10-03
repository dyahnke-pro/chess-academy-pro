// opponentMovePurpose — "why did they play that?" (WO-TEACH-02 S3, David
// 2026-09-24: "Add those in!! All of them!").
//
// No surface explained an opponent move that threatens nothing. The commonest
// purpose of such a move is DEFENCE: it takes the sting out of the threat the
// student's previous move created. This is the static half, shared by Learn
// (live, no engine budget) — review proves the same claim with the engine's
// line and eval (coachFeatureService, the S3 pass), so both surfaces speak ONE
// fact: the reply stopped your threat.
//
// Board-proven, never guessed: the student's threat is `detectNewThreat` (a
// mate-in-one, a safe fork, or a SEE-verified capture — the same detector the
// "you're now threatening" line uses), and "stopped" means the SAME threat no
// longer works after the reply: the move is illegal, the mate no longer mates,
// the capture no longer nets material, or the fork's victims have left.
import { Chess, type Square } from 'chess.js';
import { detectNewThreat, type DetectedThreat } from './groundedAnswer';
import { legalSeeGainOn } from './positionReadingService';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

export interface StoppedThreat {
  threat: DetectedThreat;
  reply: string;
  text: string;
}

function stillWorks(t: DetectedThreat, afterReply: Chess): boolean {
  const sim = new Chess(afterReply.fen());
  let mv: ReturnType<Chess['move']>;
  try { mv = sim.move(t.san); } catch { return false; }
  if (!mv) return false;
  if (t.kind === 'mate') return sim.isCheckmate();
  if (t.kind === 'capture') return legalSeeGainOn(new Chess(afterReply.fen()), t.landing as Square) >= 3;
  // A FORK THAT CAPTURES is stopped only when the capture stops paying too
  // (review walk 2026-10-03, 15.d6 O-O: the king left e8, so "the victims
  // left" — but Qxe7 Qxe7 dxe7 still won the bishop, and "it stops your Qxe7
  // fork" told the student a live threat was gone). Same bar as a capture.
  if (mv.captured && legalSeeGainOn(new Chess(afterReply.fen()), t.landing as Square) >= 3) return true;
  // fork: every victim is still where the fork found it.
  return t.targetSquares.every((sq) => {
    const was = new Chess(afterReply.fen()).get(sq as Square);
    return !!was && was.color !== mv.color;
  });
}

/**
 * The threat the student's move created that the opponent's reply stopped,
 * or null. `studentFenBefore` → `studentFenAfter` is the student's move;
 * `replySan` is the opponent's answer from `studentFenAfter`.
 */
export function threatStoppedBy(
  studentFenBefore: string,
  studentFenAfter: string,
  replySan: string,
  studentWB: 'w' | 'b',
): StoppedThreat | null {
  const threat = detectNewThreat(studentFenBefore, studentFenAfter, studentWB);
  if (!threat) return null;
  let after: Chess;
  try {
    after = new Chess(studentFenAfter);
    if (!after.move(replySan)) return null;
  } catch { return null; }
  if (after.isGameOver()) return null;
  // A TAKE-BACK'S POINT IS THE TAKE-BACK (Learn walk 2026-10-01, game 2 ply
  // 45: Qxc7 Rxc7 heard "The point of their …Rxc7: it stops your Qxd8 fork").
  // When the student's move captured and the reply takes back on that square,
  // the reply restores the material — any threat it ends goes with the piece.
  const replyMv = after.history({ verbose: true }).slice(-1)[0];
  if (replyMv?.captured) {
    const before = new Chess(studentFenBefore);
    const studentMv = before.moves({ verbose: true }).find((m) => {
      const c = new Chess(studentFenBefore); c.move(m.san); return c.fen() === studentFenAfter;
    });
    if (studentMv?.captured && studentMv.to === replyMv.to) return null;
  }
  if (stillWorks(threat, after)) return null;
  // Named by its KIND, never by `threat.detail`: the detail names the squares
  // the threat hit on the board BEFORE the reply, and the reply often moved
  // the very piece that was hit — "stops your Qf3, which forks their queen on
  // f2" was spoken about a queen that had just left f2 (the corpus sweep,
  // board-truth). The kind is true on either board.
  const san = threat.san.replace(/[+#]+$/, '');
  const what = threat.kind === 'mate' ? `the mate with ${san}`
    : threat.kind === 'fork' ? `your ${san} fork`
      : `your ${san}, which was winning material`;
  // Rotated on the board the student's threat stood on — only the wrapper
  // varies; which threat, and that it stopped, never do.
  // THEIR move, said as theirs (walk 2026-09-30: "The point of Kxg1: it stops
  // the mate" — no seat, no dots, and it read as the student's move).
  let theirs = replySan;
  try { if (new Chess(studentFenAfter).turn() === 'b' && !theirs.startsWith('…')) theirs = `…${theirs}`; } catch { /* keep bare */ }
  const text = rotateStem([
    `Their ${theirs} has a point: it stops ${what}.`,
    `Their ${theirs} isn't idle — it stops ${what}.`,
    `The point of their ${theirs}: it stops ${what}.`,
  ], stemKeyOf(studentFenAfter));
  return { threat, reply: replySan, text };
}

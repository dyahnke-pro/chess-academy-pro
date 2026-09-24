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
  if (stillWorks(threat, after)) return null;
  return { threat, reply: replySan, text: `${replySan} has a point: it stops your ${threat.san}, which ${threat.detail}.` };
}

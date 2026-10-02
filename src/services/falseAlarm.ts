// DON'T PANIC (census #7, 360 of his lines): "…Bxf2+ with check — but you move
// the king to f1", "if White takes the bishop on g1, you play a capture on h3",
// "it looks scary, like you're opening your king, but you simply respond…".
//
// Their move made a real threat (`detectNewThreat`, the same computer behind
// "Careful — their move threatens…"), yet the engine's best reply for the
// student IGNORES it — the same threat is still standing after it — and the
// student is not worse. Then the lesson is the opposite of the alarm: you do
// not have to react; this comes first, and (when the engine's own line has
// them carry the threat out) this is what answers it.
//
// It REPLACES the "Careful —" line for that threat, never sits beside it: the
// two are one claim, and saying both contradicts itself.
//
// Measured on 80 of his speedrun games: 4 lines, two of them his own points.
import { Chess, type Square } from 'chess.js';
import type { AnalysisLine } from '../types';
import { detectNewThreat, type DetectedThreat } from './groundedAnswer';
import { legalSeeGainFor } from './positionReadingService';

export interface FalseAlarm {
  text: string;
  threat: DetectedThreat;
  squares: string[];
}

/** The student must not be worse than this (centipawns, student POV). */
export const FALSE_ALARM_FLOOR_CP = -50;

const moveOf = (u: string): { from: string; to: string; promotion?: string } =>
  ({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4, 5) || undefined });

/**
 * `fenBefore` → their move → `fenAfter` (student to move). `best` is the
 * engine's best line at `fenAfter` (White POV, as every `AnalysisLine`).
 */
export function falseAlarm(
  fenBefore: string,
  fenAfter: string,
  best: AnalysisLine | undefined,
  /** Their ACTUAL answer to the student's move, when it is already on the
   *  board — then the line says what answers it, not "if". SAN, no dots. */
  theirReply: string | null = null,
): FalseAlarm | null {
  if (!best?.moves?.length || (best.mate !== null && best.mate !== undefined)) return null;
  let pos: Chess;
  try { pos = new Chess(fenAfter); } catch { return null; }
  const me = pos.turn();
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  const studentCp = me === 'w' ? best.evaluation : -best.evaluation;
  if (typeof studentCp !== 'number' || studentCp < FALSE_ALARM_FLOOR_CP) return null;
  const threat = detectNewThreat(fenBefore, fenAfter, them);
  if (!threat || threat.kind === 'mate') return null;

  const c = new Chess(fenAfter);
  let mine;
  try { mine = c.move(moveOf(best.moves[0])); } catch { return null; }
  if (!mine) return null;
  // The best move must leave the SAME threat standing — otherwise it met it.
  const again = detectNewThreat(fenBefore, c.fen(), them);
  if (!again || again.san !== threat.san || again.kind !== threat.kind) return null;
  if (threat.kind === 'capture' && legalSeeGainFor(c.fen(), threat.landing as Square, them) <= 0) return null;

  const dot = (side: 'w' | 'b'): string => (side === 'b' ? '…' : '');
  const theirs = `${dot(them)}${threat.san}`;
  let tail = '';
  if (best.moves[1] && best.moves[2]) {
    try {
      const d = new Chess(c.fen());
      const r = d.move(moveOf(best.moves[1]));
      if (r?.san === threat.san) {
        const ans = d.move(moveOf(best.moves[2]));
        if (ans) {
          tail = theirReply === threat.san
            ? `, and after ${theirs}, ${dot(me)}${ans.san} answers it`
            : `, and if they go ahead with ${theirs}, ${dot(me)}${ans.san} answers it`;
        }
      }
    } catch { tail = ''; }
  }
  return {
    threat,
    // QUESTION FIRST, ANSWER SECOND (David 2026-09-30): the question the
    // student should ask on every threat, then the board's answer.
    text: `Their move threatens ${theirs} — it ${threat.detail}. Do you have to react? No — ${dot(me)}${mine.san} comes first${tail}.`,
    squares: [...new Set([mine.from, mine.to, threat.from, threat.landing])],
  };
}

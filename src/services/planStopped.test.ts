// They shut your plan down, and the coach says HOW (David 2026-10-07: "The
// prove it is the part that needs to be spoken. That's thinking out loud").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts, type PlanFact } from './nextPlans';
import { planStoppedProof, planStoppedLine } from './planStopped';

/** The student's (White's) plan on the board before Black's move, then the proof after it. */
function stop(fenBlackToMove: string, san: string, kind: string): { plan: PlanFact; proof: string | null } {
  const plan = deriveNextPlanFacts(fenBlackToMove.replace(' b ', ' w '), 'w').find((p) => p.kind === kind);
  if (!plan) throw new Error(`fixture offers no ${kind} plan`);
  const c = new Chess(fenBlackToMove);
  c.move(san);
  return { plan, proof: planStoppedProof(plan, fenBlackToMove, c.fen(), 'w') };
}

const CENTRE_KING = 'r3k2r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQkq - 0 12';
/** The same board with Black's king already walked to f8 — no castling left. */
const KING_F8 = 'r4k1r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQ - 0 12';
const OPEN_C = 'r5k1/pp3ppp/8/3p4/8/8/PP3PPP/3R2K1 b - - 0 25';
const PASSER = '6k1/5ppp/8/3P1n2/8/8/5PPP/6K1 b - - 0 30';

describe('planStopped — the proof, read off their move', () => {
  it('their king steps off the central files', () => {
    expect(stop(KING_F8, 'Kg8', 'king-attack').proof).toBe('Their king stepped to g8, out of the open centre — the attack on it is off.');
  });
  it('a king step that leaves it stuck in the centre stops nothing (Learn audit 2026-10-14: Kf1 "out of the open centre")', () => {
    const KING_E8_NO_CASTLE = 'r3k2r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQ - 0 12';
    expect(stop(KING_E8_NO_CASTLE, 'Kf8', 'king-attack').proof).toBeNull();
  });
  it('NEGATIVE CONTROL: a king that can castle on its own move carries no king-attack plan to stop', () => {
    expect(deriveNextPlanFacts(CENTRE_KING, 'w').some((p) => p.kind === 'king-attack')).toBe(false);
    expect(deriveNextPlanFacts(CENTRE_KING.replace(' b ', ' w '), 'w').some((p) => p.kind === 'king-attack')).toBe(true);
  });
  it('their rook on the file first', () => {
    expect(stop(OPEN_C, 'Rc8', 'open-file').proof).toBe("They put their rook on the c-file first — it's contested now.");
  });
  it('a knight planted in front of the passer', () => {
    expect(stop(PASSER, 'Nd6', 'passer').proof).toBe("They planted their knight on d6, right in front of your passed pawn — it can't run now.");
  });
  it('a move that leaves the plan standing proves nothing — silence, never a guessed reason', () => {
    expect(stop(CENTRE_KING, 'Rd8', 'king-attack').proof).toBeNull();
    expect(stop(PASSER, 'h6', 'passer').proof).toBeNull();
  });
});

describe('the second block in a row is said like a coach', () => {
  const proof = "They planted their knight on d6, right in front of your passed pawn — it can't run now.";
  it('once: the proof and that the plan is off', () => {
    expect(planStoppedLine(proof, 1, PASSER, 'w')).toBe(`${proof} That plan is off.`);
  });
  it('twice: good defending, and the fallback — improve your worst piece, wait for a target', () => {
    const line = planStoppedLine(proof, 2, PASSER, 'w');
    expect(line).toContain("That's two of your plans they've shut down in a row — good defending.");
    expect(line).toMatch(/wait for them to give you a mistake or a weak piece to target\.$/);
    expect(line).not.toMatch(/\b(we|our|us)\b/i);
  });
  it('three: the honest verdict', () => {
    expect(planStoppedLine(proof, 3, PASSER, 'w')).toContain('the position is holding level');
  });
});

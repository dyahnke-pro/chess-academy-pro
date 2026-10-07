// The student's structural plan across a game — the one thread Learn and Review
// both keep (David 2026-10-07: "Learn needs to state the structural plans!!").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNextPlanFacts } from './nextPlans';
import { newPlanThread, planThreadTurn } from './planThread';

const CENTRE_KING = 'r3k2r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQkq - 0 12';
const OPEN_C = 'r5k1/pp3ppp/8/3p4/8/8/PP3PPP/3R2K1 b - - 0 25';
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const asWhite = (fen: string): string => fen.replace(' b ', ' w ');

describe('planThread — stated once, stopped with its proof', () => {
  it('states the board\'s plan, then says HOW their move stopped it, then the new plan', () => {
    const t = newPlanThread();
    const first = planThreadTurn(t, { ply: 22, fenBefore: CENTRE_KING, fenAfter: asWhite(CENTRE_KING), student: 'w' });
    expect(first.map((l) => l.text)[0]).toMatch(/^The plan from here is to attack their king stuck on e8/);
    const second = planThreadTurn(t, { ply: 24, fenBefore: CENTRE_KING, fenAfter: after(CENTRE_KING, 'O-O'), student: 'w' });
    expect(second[0].text).toBe('They castled, so their king is out of the centre — the attack on it is off. That plan is off.');
    if (second[1]) expect(second[1].text).toMatch(/^The new plan is to /);
  });

  it('the second stop in a row is said like a coach', () => {
    const t = newPlanThread();
    t.stoppedInRow = 1;
    t.stated = { fact: deriveNextPlanFacts(asWhite(OPEN_C), 'w').find((p) => p.kind === 'open-file')!, ply: 40 };
    const lines = planThreadTurn(t, { ply: 42, fenBefore: OPEN_C, fenAfter: after(OPEN_C, 'Rc8'), student: 'w' });
    expect(lines[0].text).toContain("They put their rook on the c-file first — it's contested now.");
    expect(lines[0].text).toContain("That's two of your plans they've shut down in a row — good defending.");
  });

  it('a plan that stands is not said again; a quiet move proves nothing', () => {
    const t = newPlanThread();
    planThreadTurn(t, { ply: 22, fenBefore: CENTRE_KING, fenAfter: asWhite(CENTRE_KING), student: 'w' });
    expect(planThreadTurn(t, { ply: 24, fenBefore: CENTRE_KING, fenAfter: after(CENTRE_KING, 'a6'), student: 'w' })).toEqual([]);
  });
});

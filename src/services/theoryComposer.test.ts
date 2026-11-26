import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { castleOnce, composeTheoryTurn, keyDecisionLine, keyMovesOf, pieceHomeLine, planGoalLine, replyByJob, type KeyMove } from './theoryComposer';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const mv = (san: string, piece: string, color: 'w' | 'b' = 'w'): KeyMove => ({ san, piece, color });

describe('theoryComposer — a plan is its goal plus at most two key moves', () => {
  it('pawn moves first, castling never a key step, at most two, ending on the goal', () => {
    const lead = [mv('O-O', 'k'), mv('Nbd2', 'n'), mv('b4', 'p'), mv('a4', 'p'), mv('h3', 'p')];
    expect(keyMovesOf(lead).map((m) => m.san)).toEqual(['b4', 'a4']);
    expect(planGoalLine({ whose: 'your', goal: mv('c5', 'p'), lead })).toBe('Your plan: b4 and a4, to break with c5.');
  });
  it('a plan with no key move builds to the goal; Black\'s moves are dotted', () => {
    expect(planGoalLine({ whose: 'their', goal: mv('c5', 'p', 'b'), lead: [mv('O-O', 'k', 'b')] })).toBe('Their plan builds to …c5.');
    expect(planGoalLine({ whose: 'your', goal: mv('d5', 'p', 'b'), lead: [mv('c6', 'p', 'b')] })).toBe('Your plan: …c6, to break with …d5.');
  });
});

describe('theoryComposer — castling is said once', () => {
  it('the second time says nothing', () => {
    const first = castleOnce({ whose: 'your', side: 'short', said: new Set() });
    expect(first?.text).toBe('You castle short.');
    expect(castleOnce({ whose: 'your', side: 'short', said: new Set([first!.claim]) })).toBeNull();
    expect(castleOnce({ whose: 'their', side: 'long', said: new Set([first!.claim]) })?.text).toBe('They castle long.');
  });
});

describe('theoryComposer — said by what the move does, never by popularity', () => {
  const fen = fenOf(['e4', 'e5', 'Nf3', 'Nc6']);
  it('a reply is its job', () => {
    const t = replyByJob({ fen, san: 'Bc4', mover: 'w', whose: 'your' });
    expect(t).toMatch(/^Bc4: it /);
    expect(t).not.toMatch(/masters|usually|%/);
  });
  it('the key decision is said on the move that made it, each road by its job', () => {
    const d = keyDecisionLine({ fen, san: 'Bc4', mover: 'w', whose: 'your', roads: [{ san: 'Bc4', pct: 60 }, { san: 'd4', pct: 30 }, { san: 'Nc3', pct: 10 }] });
    expect(d?.text).toMatch(/^The key decision: Bc4 — it brings your bishop out/);
    expect(d?.text).toMatch(/d4 is the other road — it joins your knight/);
    expect(d?.text).not.toMatch(/masters|usually|\d%/);
  });
  it('no decision where one move is plainly the move, or the move played is not one of the roads', () => {
    expect(keyDecisionLine({ fen, san: 'Bc4', mover: 'w', whose: 'your', roads: [{ san: 'Bc4', pct: 92 }, { san: 'd4', pct: 8 }] })).toBeNull();
    expect(keyDecisionLine({ fen, san: 'a3', mover: 'w', whose: 'your', roads: [{ san: 'Bc4', pct: 60 }, { san: 'd4', pct: 40 }] })).toBeNull();
  });
  it('a piece the plan brings gets its own sentence with its job', () => {
    const t = pieceHomeLine({ whose: 'your', piece: { piece: 'b', to: 'c4', san: 'Bc4', color: 'w', fen } });
    expect(t).toMatch(/^Your bishop belongs on c4: it /);
  });
});

describe('theoryComposer — the turn in order', () => {
  it('decision, plan, piece, castling, trap — each once', () => {
    const fen = fenOf(['e4', 'e5', 'Nf3', 'Nc6']);
    const said = new Set<string>();
    const turn = composeTheoryTurn({
      fen, san: 'Bc4', mover: 'w', whose: 'your',
      roads: [{ san: 'Bc4', pct: 60 }, { san: 'd4', pct: 40 }],
      plan: { goal: mv('d4', 'p'), goalSquare: 'd4', lead: [mv('c3', 'p'), mv('O-O', 'k')] },
      castle: { side: 'short' },
      said,
    });
    expect(turn.map((t) => t.kind)).toEqual(['decision', 'plan', 'castle']);
    expect(turn[1].text).toBe('Your plan: c3, to break with d4.');
  });
});

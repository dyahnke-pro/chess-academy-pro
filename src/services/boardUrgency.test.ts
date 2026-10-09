import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { readBoardUrgency, urgencyLead, threatsAgainst } from './boardUrgency';

// Live replay 2026-10-08, the student White.
const play = (s: string): string => { const c = new Chess(); for (const m of s.split(' ')) c.move(m); return c.fen(); };
const BASE = 'e4 e6 Nf3 h6 Bc4 Bb4 O-O Ba5 d3 d6 c3 c5 Nbd2 Nf6 Re1 Nbd7 h3 Bc7 Bb3 O-O Bc4 Nh7 Bb3 Rb8 Bc4 b6 Bb3 Bb7 Bc4 d5 Bb3 Qf6 Bc4 dxc4 Nf1 cxd3 Ng3';
const AFTER_D2 = play(`${BASE} d2`);          // #37: …d2 hits e1 and c1, one step from promoting
const AFTER_PROMO = play(`${BASE} d2 Nf1 dxe1=Q`); // #39: White can take the new queen

describe('board urgency — what cannot wait', () => {
  it('#37: the pawn on d2 attacks the rook and bishop and threatens to promote', () => {
    const u = readBoardUrgency(AFTER_D2, 'white');
    expect(u?.promotion?.from).toBe('d2');
    expect(threatsAgainst(u, 'd2', AFTER_D2)).toBe('it attacks your rook on e1 and bishop on c1 and threatens to promote');
  });
  it('#39: winning their new queen comes before any plan', () => {
    const lead = urgencyLead(readBoardUrgency(AFTER_PROMO, 'white'));
    expect(lead).toMatch(/^First, you can take their queen on e1/);
  });
  it('nothing urgent on a quiet board says nothing', () => {
    expect(urgencyLead(readBoardUrgency(new Chess().fen(), 'white'))).toBeNull();
  });
});

describe('the answers lead with it', () => {
  it('#37 "what is my opponent threatening?" — …d2 is never "a quiet move"', async () => {
    const { assembleOpponentMoveAnswer } = await import('./groundedAnswer');
    const a = assembleOpponentMoveAnswer({ fen: AFTER_D2, moveHistory: `${BASE} d2`.split(' '), studentColor: 'white' });
    expect(a?.facts).toMatch(/attacks your rook on e1 and bishop on c1 and threatens to promote/);
    expect(a?.facts).not.toMatch(/quiet move/);
  }, 60_000);
  it('#39 "what is my plan?" — take the queen first', async () => {
    const { assembleBoardPlanAnswer } = await import('./groundedAnswer');
    const a = assembleBoardPlanAnswer(AFTER_PROMO, 'white', 'me');
    expect(a?.facts).toMatch(/^First, you can take their queen on e1/);
  }, 60_000);
});

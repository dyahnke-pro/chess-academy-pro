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
    const u = readBoardUrgency(AFTER_D2, 'white', null);
    expect(u?.promotion?.from).toBe('d2');
    expect(threatsAgainst(u, 'd2', AFTER_D2)).toBe('it attacks your rook on e1 and bishop on c1 and threatens to promote');
  });
  it('#39: winning their new queen comes before any plan', () => {
    const lead = urgencyLead(readBoardUrgency(AFTER_PROMO, 'white', null));
    expect(lead).toMatch(/^First, you can take their queen on e1/);
  });
  it('nothing urgent on a quiet board says nothing', () => {
    expect(urgencyLead(readBoardUrgency(new Chess().fen(), 'white', null))).toBeNull();
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
    const a = assembleBoardPlanAnswer(AFTER_PROMO, 'white', 'me', null);
    expect(a?.facts).toMatch(/^First, you can take their queen on e1/);
  }, 60_000);
});

describe('take the attacker — one answer per square', () => {
  it('#37: the urgent step takes the pawn on d2', () => {
    const lead = urgencyLead(readBoardUrgency(AFTER_D2, 'white', null));
    expect(lead).toMatch(/^First, take their pawn on d2 — it attacks your rook on e1/);
  });
  it('#37 "what is my plan?" never also says to blockade the pawn it just took', async () => {
    const { assembleBoardPlanAnswer } = await import('./groundedAnswer');
    const a = assembleBoardPlanAnswer(AFTER_D2, 'white', 'me', null);
    expect(a?.facts).toMatch(/^First, take their pawn on d2/);
    expect(a?.facts).not.toMatch(/blockade/i);
  }, 60_000);
});

// THE ENGINE ORDERS THE PRIORITIES (WO-DANYA-READS-01 step 1, David
// 2026-11-18). On Danya's article boards the board-only read said "First, your
// X can be taken — that comes before any plan" on 42 of 209 boards, many where
// the engine's best move did something else entirely. Board positions are his
// (the article diagrams), the best moves the bench's own engine reads.
describe('a "first" step stands only when the engine\'s best move does it', () => {
  it('the pawn race: the engine walks the king, so the c3 pawn is not the first thing', () => {
    const fen = '8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2';
    // Board-only, the old read: "your pawn on c3 can be taken" leads.
    expect(urgencyLead(readBoardUrgency(fen, 'black', null))).toMatch(/pawn on c3 can be taken/);
    // With the engine's best (Kg6), no priority claim is made about c3.
    expect(urgencyLead(readBoardUrgency(fen, 'black', 'h7g6')) ?? '').not.toMatch(/c3/);
  });
  it('the engine moves the attacked rook: "save it first" still stands', () => {
    const fen = '3r1r1k/p5pp/2pbq3/2p1p3/2P1Q3/BPNP1pP1/P2R1PnP/4R1K1 w - - 0 24';
    expect(urgencyLead(readBoardUrgency(fen, 'white', 'e1c1'))).toMatch(/rook on e1 can be taken/);
  });
  it('a check elsewhere is not saving the piece', () => {
    // miracle-on-the-chess-board#0: the engine plays Bxf2+; the knight on e4
    // is not "the first thing" — the forcing move is.
    const fen = '3r2k1/pp1q2pp/5p2/2bN4/P3n3/1P1Q3P/1BP2PP1/3R2K1 b - - 0 26';
    expect(urgencyLead(readBoardUrgency(fen, 'black', null))).toMatch(/knight on e4 can be taken/);
    expect(urgencyLead(readBoardUrgency(fen, 'black', 'c5f2')) ?? '').not.toMatch(/knight on e4/);
  });
  it('a capture is "first" only when the engine takes it', () => {
    // White can take the new queen on e1 (Qxe1 or Nxe1).
    expect(readBoardUrgency(AFTER_PROMO, 'white', 'd1e1')?.win?.square).toBe('e1');
    expect(readBoardUrgency(AFTER_PROMO, 'white', 'f3e1')?.win?.square).toBe('e1');
    // A best move elsewhere: the grab is not the first thing.
    expect(readBoardUrgency(AFTER_PROMO, 'white', 'a2a3')?.win ?? null).toBeNull();
  });
});

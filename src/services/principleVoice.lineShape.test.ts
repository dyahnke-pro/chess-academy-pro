// A LINE IS SAID AS ITS SHAPE AND WHAT IT WINS, NEVER A BARE LIST OF MOVES
// (the proof rule: the voice says the shape, the board walks the detail).
// David's Smith-Morra replay, 14.Rd5 (2026-10-20): the coach said "This move
// hands them the line Bxc3, Rxa5, Bxe1, Bg3, Nxa5, and the rook on a5 goes" —
// five moves read out, and a rook named on a5 when it stood on d5 — and the
// narration gate refused the sentence twice. A gate that fires means its
// producer could still write it; the producer is fixed here.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';
import { gradeNarrationText } from './coachAnswerGates';

const HISTORY = ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'd6', 'Bc4', 'Nc6', 'Nf3', 'g6', 'O-O', 'Bg7', 'Bxf7+', 'Kxf7', 'Ng5+', 'Ke8', 'Bf4', 'Nf6', 'Re1', 'Qa5', 'Qb3', 'Rf8', 'Rad1', 'Ng4', 'Rd5'];
const BEFORE = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
// The engine's lines, as the replay's own reason-source row recorded them.
const REPLY_PV = ['g7c3', 'd5a5', 'c3e1', 'f4g3', 'c6a5', 'b3c2', 'a5c6', 'c2c4', 'g4f6'];
const BEST_PV = ['e4e5', 'g7e5', 'f4e5', 'g4e5', 'g5h7', 'f8h8', 'c3b5', 'a5b6', 'h7g5', 'e8f8', 'e1e3', 'c8d7'];
const AFTER_REPLY = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';

const sans = (fen: string, ucis: readonly string[]): string[] => {
  const c = new Chess(fen);
  return ucis.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
};
const afterRd5 = (): string => { const c = new Chess(BEFORE); c.move('Rd5'); return c.fen(); };
/** Three or more moves in a row with nothing between them but commas. */
const BARE_LIST = /(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?,\s*){2,}[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8]/;

describe('walked into a tactic — said as a shape (14.Rd5)', () => {
  const [a] = attributePrinciples({
    classification: 'mistake', bestSan: 'e5', historySans: HISTORY, replySan: 'Qb4',
    pvAfterPlayed: sans(afterRd5(), REPLY_PV),
    pvAfterBest: sans(BEFORE, BEST_PV),
  });

  it('is the tactic Rd5 walked into, its victim named where it stands', () => {
    expect(a?.id).toBe('walked-into-tactic');
    expect(a?.facts.square).toBe('d5');
  });

  it('every wording says the shape and what it wins — no move list, nothing the gate refuses', () => {
    for (const ply of [0, 1]) {
      const said = renderFundamentalVerdict([a], { ply, seen: new Set(), replySan: null });
      expect(said, said).not.toMatch(BARE_LIST);
      expect(said, said).toMatch(/they play Bxc3/);
      expect(said, said).toMatch(/two rooks and a knight for a queen/);
      for (const fen of [afterRd5(), AFTER_REPLY]) expect(gradeNarrationText(said, fen, 'test'), said).toBe(said);
    }
  });

  it('NEGATIVE CONTROL: the old sentence is the one the gate refuses', () => {
    const old = 'This move hands them the line Bxc3, Rxa5, Bxe1, Bg3, Nxa5, and the rook on a5 goes.';
    expect(old).toMatch(BARE_LIST);
    expect(gradeNarrationText(old, AFTER_REPLY, 'test')).not.toBe(old);
  });
});

describe('the other two lines the fundamentals speak', () => {
  const shape = 'they play Nxe3, you answer fxe3 and they play Rxf1';
  it('an ignored threat is said as its shape', () => {
    const facts = { piece: 'rook', square: 'f1', threat: 'Nxe3', line: shape, better: 'Rf2' };
    for (const ply of [0, 1]) {
      const said = renderFundamentalVerdict([{ id: 'ignored-threat', tag: 'missed-opponents-threat', weight: 3, coOccurrence: [], evidence: { squares: ['f1'], moves: ['Nxe3 fxe3 Rxf1'], pvMoves: true, counterfactualClean: true }, facts } as never], { ply, seen: new Set(), replySan: null });
      expect(said, said).not.toMatch(BARE_LIST);
      expect(said, said).toContain(shape);
      expect(said, said).not.toMatch(/was already on|was waiting, it wins/);
    }
  });
  it('a combination they missed is said as its shape', () => {
    const facts = { piece: 'bishop', square: 'g4', threat: 'Qh3', line: shape };
    const said = renderFundamentalVerdict([{ id: 'ignored-threat', tag: 'missed-opponents-threat', weight: 3, coOccurrence: [], evidence: { squares: ['g4'], moves: ['Qh3 e5 Bxh6 Bxh6 Qxh6 Qxg4'], pvMoves: true, counterfactualClean: true }, facts } as never], { ply: 0, seen: new Set(), replySan: 'Kh1' });
    expect(said, said).not.toMatch(BARE_LIST);
    expect(said, said).toMatch(/open — they play Qh3 and, three moves later, you play Qxg4 — and they missed it/);
  });
});

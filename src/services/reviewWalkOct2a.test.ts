// Review walk 2026-10-02 (same three games): the false lines, pinned on their
// own positions. Each fails on the code that spoke it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { proofCut, settledExchange } from './exchangeLedger';
import { principleLine } from './moveFundamentals';
import { computeMoveFundamentals } from './moveFundamentals';

const play = (sans: string): Chess => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c; };
const G1 = 'd4 d5 c4 e6 Nc3 Nf6 Nf3 c5 dxc5 Bxc5 Bg5 d4 Ne4 Be7 Nxf6+';

describe('review walk oct2a', () => {
  it('a trade is summed over the whole exchange: Qxd4 Qxd4 Nxd4 costs Black the pawn and both queens go', () => {
    const c = play(`${G1} Bxf6 Bxf6 Qxf6`);
    const l = settledExchange(c.fen(), ['Qxd4', 'Qxd4', 'Nxd4'], 'w', null);
    expect(l?.studentWon).toEqual(['p', 'q']);
    expect(l?.opponentWon).toEqual(['q']);
  });

  it('a recapture is not "you win a knight": gxf6 answers Nxf6+', () => {
    const before = play(G1.split(' ').slice(0, -1).join(' '));
    const prior = { fenBefore: before.fen(), san: 'Nxf6+' };
    const at = play(G1);
    expect(proofCut(at.fen(), ['gxf6'], 'b', prior)).toBeNull();
    // …and a capture that really wins is still proven without a prior.
    expect(proofCut(at.fen(), ['gxf6'], 'b')?.ledger?.netPawns).toBe(3);
  });

  it('a kicked piece is "moved to a square that still works", never "stepped back"', () => {
    const c = play('e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nxd4 Qxd4 Nf6 Bg5 Be7 Nc3 O-O Nd5 Re8 Nxf6+ Bxf6 Bxf6 Qxf6 Qxf6 Rxe4+ Be2 gxf6 f3');
    const f = computeMoveFundamentals(c.fen(), 'Re3', 'black').find((x) => x.id === 'keep-working');
    expect(f?.imperative ?? '').not.toMatch(/step it back/);
  });

  it('the rule line names whose move it is', () => {
    const c = play('d4 d5 Nf3 Nc6 e3 Bg4 Bd3 Nf6 Nbd2 Ne4 Be2 Nxd2 Bxd2 Bxf3 Bxf3 e6 O-O Bb4 c3 Bd6 Qc2 Qf6 e4 dxe4 Qxe4 O-O Rfe1 Rab8 Bd1 Ne7 Bc2 Qf5 Qxf5 Nxf5 Bxf5 exf5 b3 h6 c4 c5 dxc5 Bxc5 b4 Bd4 Rad1 Rbe8 Rxe8 Rxe8 g3 Re2 Be1 Bf6 a3 Ra2 Rd3 Ra1 Kf1 g5 c5 Kg7 Rd7 Bc3 Re7 Kf6 Re3 Bxe1 Rxe1 Rxa3 Rd1 Rb3 Rd6+ Kg7 Rd4 a6 f4 g4 Rc4 Kf6 Ke2 Ke7 Kd1 Kd7 Kc2 Ra3 Kb2 Re3 Rc2 Kc6 Kc1 Kb5 Rb2 Rc3+ Kd2 Rf3 Ke2 Rc3 Kd2 Rc4 Kd3 Rxb4 Re2 Kxc5 Re5+ Kc6 Rxf5 Rb3+ Ke2 Rb2+ Kf1 Rxh2 Kg1');   // game 2, before 56…Rc2
    const line = principleLine(c.fen(), 'Rc2', 'black', new Set(), 0);
    expect(line?.text).toMatch(/^Your Rc2 takes the open c-file/);
  });
});

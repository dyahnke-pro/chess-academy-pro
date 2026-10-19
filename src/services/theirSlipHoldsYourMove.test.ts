import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { callInaccuracy } from './inaccuracyCall';

// David's Smith-Morra Learn game (2026-10-19 replay), move 25: after 25.Rf1+
// Kg8 the coach said "Nhf6+ comes with check … After Nhf6+, exf6, Nxf6+, your
// knight on f6 forks their king and their bishop" — his next three moves.
const SANS = 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7 Bxf7+ Kxf7 Ng5+ Ke8 Bf4 Nf6 Re1 Qa5 Qb3 Rf8 Rad1 Ng4 Rd5 Qb4 Bg3 Be5 Nxh7 Bxg3 hxg3 Rxf2 Rg5 Qxb3 axb3 Rxb2 Rxg6 Kf7 Rg5 Rf2 Nd5 Bd7 Rxg4 Rxg2+ Kxg2 Bxg4 Rf1+'.split(' ');

describe("their slip names what it lets you do, never your move (Learn names no move unasked)", () => {
  it('25…Kg8: the grade and a pointer, no Nhf6+ line', () => {
    const c = new Chess(); for (const s of SANS) c.move(s);
    const fenBefore = c.fen();
    const said = callInaccuracy({
      namesBetterMove: true, priorMove: null, fenBefore, playedSan: 'Kg8', bestSan: 'Kg7',
      bestLineUci: ['f7g7'], cpLoss: 160, side: 'coach', moverColor: 'black',
      replyLineUci: ['h7f6', 'e7f6', 'd5f6', 'g8g7', 'f6g4'], replySan: null, moverEvalAfterCp: -160,
    })?.said ?? '';
    expect(said).toMatch(/^Their Kg8 is/);
    expect(said).not.toMatch(/Nhf6|Nxf6|knight to f6|exf6/);
  });
});

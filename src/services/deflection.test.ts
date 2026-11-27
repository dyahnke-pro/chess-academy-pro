import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { deflectionOn } from './deflection';
import { readBoardAll } from './boardComputers';
import { positionPosed, registryPosedFacts } from './moveInsight';
import { isProof } from './proof';
import { MOTIFS } from '../data/tacticMotifs';

// Real game boards from the Danya article set (`__fixtures__/danyaBoards209`).
// White to move: Ne7+ — the queen on d7 must take, and it no longer guards d8.
const MINE = '3r2k1/pp1q2pp/5p2/2bN4/P7/1P1Q3P/1BP2nP1/3R2K1 w - - 0 1';
// Black to move; White, handed the move, has Rxd8+ Qxd8 Bxc6: the queen
// pulled off the rook on c6.
const THEIRS = '3r2k1/pp2bpp1/1qr1b2p/3R4/8/P1B1PB2/1P2QPPP/5RK1 b - - 0 1';

describe('deflectionOn — the guard pulled off its job', () => {
  it('Ne7+ drags the queen off d8, and every answer loses material', () => {
    const d = deflectionOn(MINE);
    expect(d?.line).toEqual(['Ne7+', 'Qxe7', 'Qxd8+']);
    expect(d?.defender).toEqual({ piece: 'q', from: 'd7' });
    expect(d?.target.square).toBe('d8');
    expect(d?.gain).toBeGreaterThanOrEqual(2);
  });
  it('the proof holds against every reply, not only the recapture', () => {
    const d = deflectionOn(MINE);
    const b1 = new Chess(MINE);
    b1.move(d?.move ?? '');
    expect(b1.moves().length).toBeGreaterThan(1);
  });
  it('negative control: the start position, and a board where the square was already falling', () => {
    expect(deflectionOn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBeNull();
    expect(deflectionOn('4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1')).toBeNull();
  });
});

describe('the deflection, wired both ways', () => {
  it('their deflection is said to the defender with the line as proof, and filed', () => {
    const fs = readBoardAll('deflection', { fen: THEIRS, student: 'b', namesMoves: false });
    const f = fs.find((x) => x.seat === 'opponent');
    expect(f?.text).toMatch(/Rxd8\+/);
    expect(f?.text).toMatch(/Your queen|your queen/);
    // Handed the move: it is their threat, the defender moves first — never
    // "every answer loses" (decision baseline, Colle 800 move 17).
    expect(f?.text).not.toMatch(/Every answer/);
    expect(f?.skill).toBe('missed-their-deflection');
    expect(isProof(f?.proof)).toBe(true);
    expect(registryPosedFacts(THEIRS, 'b', []).some((x) => x.computer === 'deflectionOn' && x.skill === 'missed-their-deflection')).toBe(true);
  });
  it('the student\'s own is held where the surface may not name it, and filed', () => {
    const f = readBoardAll('deflection', { fen: MINE, student: 'w', namesMoves: false }).find((x) => x.seat === 'student');
    expect(f?.text).not.toMatch(/Ne7|Qxd8/);
    expect(f?.skill).toBe('missed-your-deflection');
    expect(f?.claims).toContain('geo:deflection:d7d8');
  });
  it('on the board with the move, the proof against every answer is said', () => {
    const f = readBoardAll('deflection', { fen: MINE, student: 'w', namesMoves: true }).find((x) => x.seat === 'student');
    expect(f?.text).toMatch(/Ne7\+/);
    expect(f?.text).toMatch(/Every answer loses material/);
  });
  it('the motif row has its their-side tag at last', () => {
    expect(MOTIFS.deflection.theirs).toBe('missed-their-deflection');
  });
});

// Danya board: the knight on e6 is lost anyway (Bxe6 is coming), and the
// engine's best is Nxd4, selling it for the bishop on d4.
const DESPERADO = '8/7p/1p2Nq1k/rb6/3b1p2/2R3P1/6BP/2Q4K w - - 0 1';

describe('the desperado, filed both ways', () => {
  const line = ['e6d4', 'f6d4', 'g3f4', 'b5e8'];
  it('letting the piece go for nothing is broken', () => {
    const posed = positionPosed(DESPERADO, { bestLine: line, played: { san: 'Nc7', cpLoss: 300 } });
    expect(posed.find((p) => p.tag === 'missed-your-desperado')?.outcome).toBe('broken');
  });
  it('the sale is held', () => {
    const posed = positionPosed(DESPERADO, { bestLine: line, played: { san: 'Nxd4', cpLoss: 0 } });
    const p = posed.find((x) => x.tag === 'missed-your-desperado');
    expect(p).toBeDefined();
    expect(p?.outcome).toBeUndefined();
  });
});

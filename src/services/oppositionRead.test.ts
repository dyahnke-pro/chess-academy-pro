import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { kingsInOpposition, readOpposition, oppositionLine, oppositionTaken } from './oppositionRead';
import { readBoard } from './boardComputers';
import { assemblePositionAssessment } from './groundedAnswer';

const play = (fen: string, sans: string): string => { const c = new Chess(fen); for (const s of sans.split(' ').filter(Boolean)) c.move(s); return c.fen(); };

// Danya, "In Pursuit of Zugzwang" (Fahrni–Alapin, Munich 1909): "1.Kd6 meets
// with 1...Kd8, when it is Black who has the opposition … if this position
// were reached with Black to move, he would lose on the spot." His main line
// 1.Kd4 Kb8 2.Kc4 Kc8 3.Kd5 Kd8 4.Kd6 hands Black the move with the kings
// face to face.
const FAHRNI = '2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1';
const AFTER_KD6 = play(FAHRNI, 'Kd4 Kb8 Kc4 Kc8 Kd5 Kd8 Kd6');

describe('oppositionRead — the geometry', () => {
  it('direct, distant and diagonal, odd gaps only', () => {
    expect(kingsInOpposition('e4', 'e6')?.kind).toBe('direct');
    expect(kingsInOpposition('e2', 'e8')?.kind).toBe('distant');
    expect(kingsInOpposition('d4', 'f6')).toMatchObject({ kind: 'diagonal', between: ['e5'] });
    expect(kingsInOpposition('e2', 'e5')).toBeNull(); // even gap
    expect(kingsInOpposition('d4', 'e6')).toBeNull(); // not aligned
  });
});

describe('oppositionRead — what it decides, on his board', () => {
  it('after 4.Kd6 Black is to move: White holds it, and either step lets the king in to c7 or e7', () => {
    const o = readOpposition(AFTER_KD6);
    expect(o).toMatchObject({ kind: 'direct', holder: 'w', entry: ['c7', 'e7'], spare: [] });
    const line = oppositionLine(o!, 'w', 'now', 500);
    expect(line).toMatch(/opposition/);
    expect(line).toMatch(/c7 or e7/);
    expect(line).toMatch(/wins it/);
    // From Black's seat, the same fact is theirs.
    expect(oppositionLine(o!, 'b', 'now', 500)).toMatch(/^(They have|Their king holds) the opposition/);
  });

  it('his 1.Kd6? Kd8: the king move that takes the opposition is Black\'s', () => {
    const before = play(FAHRNI, 'Kd6');
    const t = oppositionTaken(before, 'Kd8');
    expect(t?.read.holder).toBe('b');
    const f = readBoard('oppositionRead', { fenBefore: before, san: 'Kd8', student: 'w', afterCp: 0 });
    expect(f?.seat).toBe('opponent');
    expect(f?.text).toMatch(/Their king (takes|move takes) the opposition|Their king move takes/);
  });

  it('a spare pawn move hands the move back: it forces nothing yet', () => {
    const o = readOpposition('8/4k3/8/4K3/4P2p/8/7P/8 b - - 0 1');
    expect(o?.spare).toEqual(['h3']);
    expect(oppositionLine(o!, 'w', 'now', null)).toMatch(/pawn move to spare/);
    // and the move that took it while they could still pass is not credited
    expect(oppositionTaken('8/4k3/8/3K4/4P2p/8/7P/8 w - - 0 1', 'Ke5')).toBeNull();
  });

  it('silent off a pawn ending, and off the geometry', () => {
    expect(readOpposition('8/4k3/8/4K3/4P3/8/8/6r1 b - - 0 40')).toBeNull(); // a rook on the board
    expect(readOpposition('8/1k6/8/4K3/4P3/8/8/8 b - - 0 40')).toBeNull();   // kings not aligned
    expect(readOpposition('8/2k5/8/4K3/4P3/8/8/8 b - - 0 40')?.kind).toBe('diagonal'); // c7 and e5, d6 between
    expect(readOpposition('8/4k3/8/4K3/8/8/8/8 b - - 0 40')).toBeNull();      // no pawn
  });

  it('the position read says it from the student\'s seat', () => {
    const a = assemblePositionAssessment({ line: null, tempting: null, evalCp: 500, mateIn: null, tactics: null, studentColor: 'white', fen: AFTER_KD6, bestUci: null });
    expect(a?.facts).toMatch(/opposition/);
  });
});

import { describe, expect, it, vi } from 'vitest';
vi.mock('./appAuditor', () => ({ logAppAudit: () => Promise.resolve() }));
import { Chess } from 'chess.js';
import { repairAppliesForTests as applies, REPAIRS } from './mistakeLesson';

// THE SIX RECOVERY STATES (Coach Build Board, Mistakes round 1): each said
// only where its own board check holds, on real opening boards.
const fenOf = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };

describe('the six recovery checks', () => {
  it('develop the last pieces: two minors still at home', () => {
    expect(applies('develop-pieces', fenOf('e4 e5 Qh5 Nc6 Qf3'), 'w')).toEqual({});
    expect(applies('develop-pieces', fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6 d3 d6 Bg5'), 'w')).toBeNull();
  });
  it('castle now: the king still on e1 with its rights, queens on', () => {
    expect(applies('castle-now', fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5'), 'w')).toEqual({});
    expect(applies('castle-now', fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O'), 'w')).toBeNull();
  });
  it('contest the open file: their rook on it, none of yours', () => {
    const fen = '3r2k1/pp3ppp/8/8/8/8/PP3PPP/4R1K1 w - - 0 1';
    expect(applies('contest-file', fen, 'w')).toEqual({ file: 'd' });
    expect(applies('contest-file', '3r2k1/pp3ppp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1', 'w')).toBeNull();
  });
  it('bring the stray piece back: a knight on the rim', () => {
    expect(applies('misplaced-back', fenOf('e4 e5 Nh3 Nc6 d3 Nf6'), 'w')).toEqual({ piece: 'knight' });
  });
  it('cramped: their space, and pieces left to trade', () => {
    expect(applies('cramped', fenOf('e4 e5 Nf3 Nc6'), 'b')).toBeNull();
  });
  it('connect the rooks: castled, a piece still between them', () => {
    expect(applies('connect-rooks', fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6'), 'w')).toEqual({});
    expect(applies('connect-rooks', fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6'), 'w')).toBeNull();
  });
  it('every state has five phrasings and two sources', () => {
    for (const s of ['develop-pieces', 'castle-now', 'contest-file', 'misplaced-back', 'cramped', 'connect-rooks'] as const) {
      expect(REPAIRS[s].stems.length).toBe(5);
      expect(REPAIRS[s].sources.length).toBeGreaterThanOrEqual(2);
    }
  });
});

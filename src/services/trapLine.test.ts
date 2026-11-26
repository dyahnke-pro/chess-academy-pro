import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { trapLine } from './trapLine';

const play = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const FORK_FEN = play(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5']);
const SCHOLAR_FEN = play(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);

describe('trapLine — one anchor, the blow, one pattern', () => {
  it('a fork: the anchor, what it forks, what it takes, the pattern', () => {
    const l = trapLine({ fen: FORK_FEN, slip: 'h6', punish: ['Nxf7'], slipBy: 'opponent', before: 'd5' });
    expect(l?.text).toBe(
      'Before …d5, if they play …h6, Nxf7 wins. Your knight forks their queen on d8 and the rook on h8, takes the pawn. '
      + 'The pattern: f7 is guarded only by their king. When your knight sits on g5, every slow move they make lets you look at f7.',
    );
  });
  it('a mate is said as one', () => {
    const l = trapLine({ fen: SCHOLAR_FEN, slip: 'Nf6', punish: ['Qxf7#'], slipBy: 'opponent' });
    expect(l?.text.startsWith('If they play …Nf6, Qxf7 is mate. Your queen mates on f7.')).toBe(true);
  });
  it('the student\'s own slip is a "Watch out", never a trap, said from their side', () => {
    const l = trapLine({ fen: FORK_FEN, slip: 'h6', punish: ['Nxf7'], slipBy: 'student' });
    expect(l?.text.startsWith('Watch out: …h6 allows Nxf7, and it wins. Their knight forks your queen on d8 and the rook on h8')).toBe(true);
    expect(l?.text).toContain('every slow move you make lets them look at f7');
    expect(l?.text).not.toMatch(/trap/i);
  });
  it('a winning move that hits, checks, mates and takes nothing is not said', () => {
    const quiet = play(['e4', 'e5']);
    expect(trapLine({ fen: quiet, slip: 'Nf3', punish: ['a6'], slipBy: 'opponent' })).toBeNull();
  });
});

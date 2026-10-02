import { describe, it, expect } from 'vitest';
import { tempoCount } from './tempoCount';

describe('tempoCount — the count half of tempo (P2 #7)', () => {
  it('the Scandinavian queen chased a third time while White develops', () => {
    const h = 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bd2 Qb6'.split(' ');
    const t = tempoCount(h, 'w');
    expect(t?.text).toMatch(/^That's their queen's third move already, and you have three minor pieces out to their two/);
    expect(t?.squares).toEqual(['b6']);
    expect(t?.pieceId).toBe('d8');
  });
  it('silent on a second move, on the student\'s own piece, and when they are not behind', () => {
    expect(tempoCount('e4 d5 exd5 Qxd5 Nc3 Qa5'.split(' '), 'w')).toBeNull();
    expect(tempoCount('e4 e5 Nf3 Nc6 Ng5 Nf6 Nxf7'.split(' '), 'b')).toBeNull();
    expect(tempoCount('e4 e5 Nf3 Nc6 Ng5 Nf6 Nxf7'.split(' '), 'w')).toBeNull();
  });
  it('silent past the opening', () => {
    const h = 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bd2 Qb6'.split(' ');
    expect(tempoCount([...h, ...'a3 a6 h3 h6 b4 b5 g3 g6 a4 e6 a5 Qc6 c3'.split(' ')], 'w')).toBeNull();
  });
});

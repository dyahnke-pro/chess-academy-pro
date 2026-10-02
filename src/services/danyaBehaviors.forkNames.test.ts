// Carlsen–Aronian after 20…Nxc3 (walk 2026-09-27): "The opponent wants Ne4+,
// forking on e4" named the landing square as the target.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectBehaviors } from './danyaBehaviors';

const c = new Chess();
for (const s of 'd4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bg5 h6 Bh4 Nbd7 e3 g5 Bg3 Ne4 Nd2 Nxg3 fxg3 Nb6 Bd3 Qe7 Qf3 Be6 a3 Bxc3 bxc3 O-O-O a4 Bd7 a5 Na4 a6 Rhe8 Kf2 Kb8 Rhe1 Nxc3'.split(' ')) c.move(s);

describe('a threatened fork names what it forks', () => {
  it('names the pieces, never "forking on e4"', () => {
    const facts = detectBehaviors({ fen: c.fen(), studentColor: 'white' }).map((h) => h.fact).join(' ');
    expect(facts).not.toMatch(/forking on e4/);
    expect(facts).toMatch(/Ne4\+, forking your knight on d2 and your king on f2/);
  });
});

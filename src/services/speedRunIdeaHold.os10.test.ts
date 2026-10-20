// OS-10 (#5's leak): the held IDEA of a speedrun read names the student's
// piece and what its move does — "your knight has a forcing move…", "your
// bishop has a check that drives…" — so it points at one move. It carries that
// move (namesStudentMove), and the door holds it while the move is theirs.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { depthClauses } from './thinkAloud';
import { namesPlayableStudentMove } from './studentMoveNaming';

const fenAt = (s: string): string => { const c = new Chess(); s.split(' ').forEach((m) => c.move(m)); return c.fen(); };
const line = (moves: string[], evaluation: number) => ({ moves, evaluation, mate: null });
const ideaOf = (fen: string, lines: ReturnType<typeof line>[], re: RegExp) =>
  depthClauses({ fen, history: [], topLines: lines, studentColor: 'w', nameMove: false }).find((c) => c.kind === 'speedrun-read' && re.test(c.text));

describe('a speedrun idea that names the student\'s piece holds its move (OS-10)', () => {
  const cases: Array<[string, string, ReturnType<typeof line>[], RegExp, string]> = [
    ['play it anyway (…Nf6, Bc4 allows …Nxe4)', fenAt('e4 e5 Nf3 Nf6'), [line(['f1c4', 'f6e4'], 40), line(['b1c3', 'b8c6'], -200)], /^Your strongest bishop move/, 'f1c4'],
    ['force a concession (Bb5+ Ke7)', 'rnbqkbnr/pp3ppp/8/2ppp3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', [line(['f1b5', 'e8e7'], 50), line(['g1f3', 'b8c6'], -200)], /forcing move that costs their king/, 'f1b5'],
    ['the awkward block (Bb5+ Bd7)', 'rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1', [line(['f1b5', 'c8d7'], 30), line(['g1f3', 'g8f6'], -250)], /has a check that drives/, 'f1b5'],
  ];
  for (const [name, fen, lines, re, uci] of cases) {
    it(name, () => {
      const c = ideaOf(fen, lines, re);
      expect(c, 'the held idea speaks on this board').toBeDefined();
      const n = c!.namesStudentMove;
      expect(n && n !== 'none' ? n.moves.map((m) => m.from + m.to) : []).toEqual([uci]);
      expect(namesPlayableStudentMove(n ?? 'none')).toBe(true);
    });
  }
});

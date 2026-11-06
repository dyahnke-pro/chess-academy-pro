// THE KING WALKED BY HAND REACHES REVIEW AND THE LESSON — on Naroditsky's own
// Scotch Gambit game (src/test/fixtures/danya-scotch-gambit.json). Before
// kingWalk none of these lines existed; before Review kept a plan line that is
// not the plan thread's, the castling-by-hand lines were built and dropped
// with no trace; before the verdict carried its squares, "you're still worse —
// here's why" was held every move as unsupported.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reviewSegments, type ReplayGame } from '../test/replayGame';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';

const GAME = JSON.parse(readFileSync('src/test/fixtures/danya-scotch-gambit.json', 'utf8')) as ReplayGame;

describe('Review says the king walk on his game', () => {
  const said = new Map<number, string>();
  for (const s of reviewSegments(GAME, 1500)) said.set(s.ply, (s as unknown as { narration?: string }).narration ?? '');
  it('7…Kf8: where the king goes', () => {
    expect(said.get(14)).toContain("Where does your king go? On g6 it's mated at once: Qf5#. On f6 it's mated in three: Bg5+ Kg6 Qf5+ Kh5 g4#.");
  });
  it('9…Nf6 to 13…Kg8: castling by hand, plan to done', () => {
    expect(said.get(18)).toContain("Your king can't castle any more, so the plan is to castle by hand: the king to f7, a rook to e8 or f8, then the king to g8.");
    expect(said.get(20)).toContain('h6 takes g5 away from their knight');
    expect(said.get(22)).toContain('Kf7 starts castling by hand');
    expect(said.get(22)).toContain('Your bishop on c8 stays home for now, and it has a job there: if their queen checks on c4, it blocks on e6.');
    expect(said.get(24)).toContain('Re8 brings the rook out from behind the king');
    expect(said.get(26)).toContain('Kg8 finishes castling by hand');
    expect(said.get(26)).toContain('Rule of thumb: the further the king is from the centre, the safer it is');
  });
  it('14.Bb2: still worse, and why', () => {
    expect(said.get(27)).toContain("You're slightly worse: their queen and bishop on the long diagonal hold your knight on f6 in place: if it moves anywhere but h5, Qxg7 is mate — and e5 would hit it.");
  });
}, 180_000);

describe('the lesson composer is handed the same facts', () => {
  it('…Kf7 carries the castling step and the bishop kept home', () => {
    const c = new Chess();
    for (const s of GAME.sans.slice(0, 21)) c.move(s);
    const facts = moveThoughtFacts({ theory: true, fenBefore: c.fen(), san: 'Kf7', moverIsStudent: true, prev: NO_PREV_CAPTURE, line: null, theirLast: null, history: GAME.sans.slice(0, 21), phrases: null, reads: null, costCp: null });
    const texts = facts.filter((f) => f.source === 'kingWalk').map((f) => f.text);
    expect(texts).toContain('Kf7 starts castling by hand — next, a rook to e8 or f8, then the king to g8.');
    expect(texts).toContain('Your bishop on c8 stays home for now, and it has a job there: if their queen checks on c4, it blocks on e6.');
  });
});

// The king that cannot castle, read on Naroditsky's own Scotch Gambit game
// (vc-NqtT3roFaBs, 2026-11-04 side-by-side): every line here is what he said
// on that move, and none of it was built by any computer before kingWalk.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { castleByHand, castleByHandMove, kingFromCentre, keptHome, kingSquares, mateByChecks } from './kingWalk';

const GAME = 'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Bc5 c3 dxc3 Bxf7+ Kxf7 Qd5+ Kf8 Qxc5+ d6 Qxc3 Nf6 Nbd2 h6 O-O Kf7 b3 Re8 Re1 Kg8 Bb2 Bg4'.split(' ');

/** The board before move `ply` (1-based) of his game, and its SAN. */
function before(ply: number): { fen: string; san: string } {
  const c = new Chess();
  for (const s of GAME.slice(0, ply - 1)) c.move(s);
  return { fen: c.fen(), san: GAME[ply - 1] };
}

describe('castling by hand, step by step (his …Nf6, …h6, …Kf7, …Re8, …Kg8)', () => {
  it('states the plan on the first quiet move once the king has lost castling', () => {
    const { fen, san } = before(18);
    const s = castleByHandMove(fen, san, 'your');
    expect(s?.kind).toBe('plan');
    expect(s?.text).toBe("Your king can't castle any more, so the plan is to castle by hand: the king to f7, a rook to e8 or f8, then the king to g8.");
  });
  it('…h6 takes g5 from their knight so the king can come to f7', () => {
    const { fen, san } = before(20);
    const s = castleByHandMove(fen, san, 'your');
    expect(s?.kind).toBe('prep');
    expect(s?.text).toMatch(/^h6 takes g5 away from their knight, so your king can step to f7 without a check from g5/);
  });
  it('…Kf7 starts it, …Re8 brings the rook out, …Kg8 finishes it', () => {
    expect(castleByHandMove(before(22).fen, 'Kf7', 'your')?.text).toBe('Kf7 starts castling by hand — next, a rook to e8 or f8, then the king to g8.');
    expect(castleByHandMove(before(24).fen, 'Re8', 'your')?.text).toBe('Re8 brings the rook out from behind the king — the king to g8 next, and castling by hand is done.');
    const done = castleByHandMove(before(26).fen, 'Kg8', 'your');
    expect(done?.kind).toBe('done');
    expect(done?.text).toMatch(/^Kg8 finishes castling by hand/);
  });
  it('says nothing on a move out of check or a capture — the fire comes first', () => {
    expect(castleByHandMove(before(12).fen, 'Kxf7', 'your')).toBeNull();
    expect(castleByHandMove(before(14).fen, 'Kf8', 'your')).toBeNull();
    expect(castleByHandMove(before(16).fen, 'd6', 'your')).toBeNull();
  });
  it('a king that can still castle has no such plan', () => {
    expect(castleByHand(new Chess().fen(), 'w')).toBeNull();
    const c = new Chess();
    for (const s of GAME.slice(0, 10)) c.move(s);
    expect(castleByHand(c.fen(), 'b')).toBeNull();
  });
  it('the opponent\'s king walked by hand is said from their seat', () => {
    // The mirror: White's king lost castling on f1 and walks the same route.
    const fen = 'rnb1k2r/pppq1ppp/5n2/8/8/5N2/PPP2PPP/RNBQ1K1R w kq - 0 8';
    expect(castleByHandMove(fen, 'h3', 'their')?.text ?? '').toMatch(/^h3 takes g4 away from their knight|^Their king can't castle any more/);
  });
});

describe('the king far from the centre (his …Kg8)', () => {
  it('says the rule on a king walked out of the centre, queens on', () => {
    expect(kingFromCentre(before(26).fen, 'Kg8')?.text).toMatch(/^Rule of thumb: the further the king is from the centre, the safer it is/);
  });
  it('not on castling, not on a king staying central, not with the queens off', () => {
    expect(kingFromCentre(before(21).fen, 'O-O')).toBeNull();
    expect(kingFromCentre(before(22).fen, 'Kf7')).toBeNull();
    expect(kingFromCentre('6k1/5ppp/8/8/8/8/5PPP/5K2 w - - 0 1', 'Kg2')).toBeNull();
  });
});

describe('the piece kept at home on purpose (his …Kf7: "you can cover it with the bishop")', () => {
  it('the c8 bishop blocks the queen check on c4', () => {
    expect(keptHome(before(22).fen, 'Kf7', 'your')?.text).toBe('Your bishop on c8 stays home for now, and it has a job there: if their queen checks on c4, it blocks on e6.');
  });
  it('never in the ordinary opening, while castling is still there', () => {
    expect(keptHome(before(5).fen, 'd4', 'their')).toBeNull();
    expect(keptHome(before(7).fen, 'Bc4', 'their')).toBeNull();
  });
});

describe('where to put the king (his 7…Kf8: "not g6 or f6 — you\'d get mated")', () => {
  it('names the mated squares with their lines, and the square chosen', () => {
    const { fen, san } = before(14);
    expect(kingSquares(fen, san, 'your', null, 'f7f8')?.text).toBe("Where does your king go? On g6 it's mated at once: Qf5#. On f6 it's mated in three: Bg5+, Kg6, Qf5+, Kh5, g4#. You chose f8, the best of them.");
  });
  it('a king driven back to the chosen square by the engine line is said', () => {
    const { fen, san } = before(14);
    const lines = [{ moves: ['f7e8', 'd5h5', 'e8f8', 'h5c5'] }];
    expect(kingSquares(fen, san, 'your', lines, null)?.text).toContain('On e8, Qh5+ drives it to f8 anyway.');
  });
  it('silent when the king is not forced to walk', () => {
    const { fen, san } = before(12);
    expect(kingSquares(fen, san, 'your', null, null)).toBeNull();
  });
  it('the mate search claims nothing it did not prove', () => {
    expect(mateByChecks(new Chess().fen(), 3)).toBeNull();
  });
});

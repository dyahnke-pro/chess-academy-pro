import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';

/** Play a SAN list; return the FEN before the LAST move + that move. */
function beforeLast(sans: string[]): { fen: string; san: string } {
  const c = new Chess();
  for (let i = 0; i < sans.length - 1; i++) c.move(sans[i]);
  return { fen: c.fen(), san: sans[sans.length - 1] };
}

describe('buildOpponentMoveTeaching (read the opponent — targets in your position)', () => {
  it('flags a student piece left LOOSE by the opponent move, with an amber arrow', () => {
    // Student = White. Black plays a move whose piece attacks an undefended White piece.
    // Setup: White bishop on c4 undefended; Black plays ...b5 hitting it? No — build a
    // clean loose-piece case: White knight on e5 undefended, Black plays ...d6 attacking it.
    // Constructed position — a White knight en prise on e5.
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4N3/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 1';
    // Black to move; ...d6 attacks the e5-knight (undefended).
    const beat = buildOpponentMoveTeaching(fen, 'd6', 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/loose|watch out/i);
    expect(beat!.text).toMatch(/e5/);
    expect(beat!.arrows[0]?.endSquare).toBe('e5');
    expect(beat!.arrows[0]?.color).toBe('#f59e0b');
  });

  it('names a weak student pawn the opponent trains on', () => {
    // Student = White with an isolated d-pawn on d4. Black rook/queen/piece attacks it.
    // White pawns: only d4 on the d-file, none on c/e → isolated. Black rook on d8 → d-file.
    const fen = '3rk3/8/8/8/3P4/8/8/4K3 b - - 0 1';
    // Black ...Rd5 trains the rook on the isolated d4-pawn? Rd8-d5 attacks d4 down the file.
    const beat = buildOpponentMoveTeaching(fen, 'Rd5', 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/weak pawn|target/i);
    expect(beat!.text).toMatch(/d4/);
  });

  it('gives a development read when a minor piece contests the centre', () => {
    // 3...Nf6 eyes e4 — no loose piece / weak pawn, but it contests the centre,
    // so the broadened read fires (Danya reads the opponent, not just targets).
    const { fen, san } = beforeLast(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    const beat = buildOpponentMoveTeaching(fen, san, 'w');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/contest|centre|center|eyeing/i);
    expect(beat!.text).toMatch(/e4/);
  });

  it('stays silent on a move that touches nothing central and no target', () => {
    // A rook lift to a back-rank square — no central squares eyed, no target.
    const fen = '4k3/8/8/8/8/8/8/R3K3 b - - 0 1';
    // Black to move; a king shuffle contests nothing.
    expect(buildOpponentMoveTeaching(fen, 'Kd8', 'w')).toBeNull();
  });

  it('returns null when handed the STUDENT\'s own move (only comments the opponent)', () => {
    // fenBefore has White to move; asking with studentColor White → the move is the
    // student's, not the opponent's → null.
    const fen = new Chess().fen();
    expect(buildOpponentMoveTeaching(fen, 'e4', 'w')).toBeNull();
  });
});

/** Play a game; return the FINAL fen + the list of BLACK's SANs (the opponent
 *  when the student is White). */
function blackSans(sans: string[]): { fen: string; opp: string[] } {
  const c = new Chess();
  const opp: string[] = [];
  sans.forEach((s, i) => { c.move(s); if (i % 2 === 1) opp.push(s); });
  return { fen: c.fen(), opp };
}

describe('buildOpponentDevelopmentRead (structure + development lag — David 2026-07-19)', () => {
  it('fires when the opponent is pawn-heavy with minors still home', () => {
    // Student = White develops; Black shoves six pawns, never a piece.
    const { fen, opp } = blackSans(['e4', 'a6', 'd4', 'b6', 'Nf3', 'c6', 'Bc4', 'd6', 'Nc3', 'e6', 'O-O', 'g6']);
    const beat = buildOpponentDevelopmentRead(opp, fen, 'w');
    expect(beat).not.toBeNull();
    // grounded pawn-move count + the development-lag point.
    expect(beat!.text).toMatch(/6 pawn moves/);
    expect(beat!.text).toMatch(/minor pieces|back rank|development/i);
    // no fabricated arrow (the observation is about the whole setup).
    expect(beat!.arrows).toHaveLength(0);
  });

  it('stays silent when the opponent develops normally', () => {
    // Black develops pieces (e5, Nc6, Nf6, Bc5, O-O) — no lag, no read.
    const { fen, opp } = blackSans(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Nc3', 'Bc5', 'd3', 'O-O']);
    expect(buildOpponentDevelopmentRead(opp, fen, 'w')).toBeNull();
  });

  it('stays silent too early to judge (fewer than 5 opponent moves)', () => {
    const { fen, opp } = blackSans(['e4', 'a6', 'd4', 'b6']);
    expect(buildOpponentDevelopmentRead(opp, fen, 'w')).toBeNull();
  });

  it('works for a Black student — reads a pawn-heavy WHITE opponent', () => {
    // Student = Black; opponent = White pushes pawns, leaves minors home.
    const c = new Chess();
    const white: string[] = [];
    ['a3', 'd6', 'b3', 'Nf6', 'c3', 'g6', 'd3', 'Bg7', 'e3', 'O-O', 'g3', 'c5'].forEach((s, i) => {
      c.move(s); if (i % 2 === 0) white.push(s);
    });
    const beat = buildOpponentDevelopmentRead(white, c.fen(), 'b');
    expect(beat).not.toBeNull();
    expect(beat!.text).toMatch(/pawn moves/);
  });
});

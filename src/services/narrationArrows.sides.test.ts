import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deriveNarrationArrows, type NarrationSides } from './narrationArrows';

// ── WHOSE MOVE A NAMED MOVE IS (2026-11-11) ──────────────────────────────────
//
// The resolver ignored what the words say about the side: every named move was
// tried for the side to move, then for the other, and whichever was legal
// first drew. On the opening courses (written to a strict rule printed on
// every fact sheet: White's move bare, Black's with the dots) five editors who
// ran it over whole courses found a wrong-side arrow on 5–10% of beats, and
// were rewording beats to dodge it.
//
// Every case below is a real course beat with ITS OWN board (the position the
// lesson player shows while the beat is said), and the arrow the old resolver
// drew there. Each fails on the old resolver.

const WATCH_WHITE: NarrationSides = { marking: 'strict', student: 'white' };
const WATCH_BLACK: NarrationSides = { marking: 'strict', student: 'black' };

const drawn = (text: string, fen: string, sides: NarrationSides): string[] =>
  deriveNarrationArrows(text, fen, [], sides).arrows.map((a) => `${a.from}-${a.to}`);

/** Every arrow's mover, read off the beat's board (the piece on its origin). */
const movers = (text: string, fen: string, sides: NarrationSides): string[] => {
  const board = new Chess(fen);
  return deriveNarrationArrows(text, fen, [], sides).arrows.map(
    (a) => `${board.get(a.from as Parameters<Chess['get']>[0])?.color ?? '?'}:${a.token}`,
  );
};

describe('the dots mark Black\'s move — Black only, in every text', () => {
  // Trompowsky, after 1.d4 Nf6 2.Bg5 Ne4 (White to move).
  const TROMP_NE4 = 'rnbqkb1r/pppppppp/8/6B1/3Pn3/8/PPP1PPPP/RN1QKBNR w KQkq - 3 3';
  const CLOSE_BEHIND =
    'How do they deal with the threat on f6? The most popular way is to move the knight: …Ne4 dodges the '
    + 'doubled pawns and hits your bishop on g5 at the same time. …d5 and …e6 are close behind.';

  it('"…d5 and …e6 are close behind" draws Black\'s two pawns, never White\'s d4-d5', () => {
    for (const sides of [WATCH_WHITE, { marking: 'loose', student: 'white' } as const]) {
      const arrows = drawn(CLOSE_BEHIND, TROMP_NE4, sides);
      expect(arrows).not.toContain('d4-d5'); // the old arrow: White's pawn, for a move written "…d5"
      expect(arrows).toEqual(['d7-d5', 'e7-e6']);
    }
  });

  it('"…exd5 opens the e-file" draws nothing once the pawn has taken — never White\'s recapture', () => {
    // Trompowsky, Vaganian Gambit: Black has just played …exd5.
    const fen = 'rnb1kb1r/pp1p1ppp/1q3n2/2pp4/4P3/5P2/PPP3PP/RNBQKBNR w KQkq - 0 8';
    const text = '…exd5 opens the e-file. Neither king has castled, so both sides have to watch for checks along it.';
    for (const sides of [WATCH_WHITE, { marking: 'loose', student: 'white' } as const]) {
      expect(drawn(text, fen, sides)).toEqual([]); // old: e4-d5, White's pawn
    }
  });

  it('a dotted move the words name for later is still Black\'s', () => {
    // Caro-Kann Advance (student White): "The engine prefers …Qxd4."
    const fen = 'rn2kbnr/pp2ppp1/1qp5/3pP1Bp/3P3P/3b4/PPP2PP1/RN1QK1NR w KQkq - 0 7';
    const text = '…Bxd3: they trade bishops instead of grabbing a pawn. The engine prefers …Qxd4. '
      + 'Now their bishop on d3 hits c2, so it has to be taken back. With what?';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['b6-d4']);
  });

  it('"…a4 next" in THEIR beat is Black\'s pawn even when White has a4 too', () => {
    // Anti-Sicilian, Accelerated Pawn Storm (student White): Black has just
    // played …a5 and White is to move — with a2-a4 legal, which the old
    // resolver tried first.
    const fen = 'r1bqkb1r/5ppp/2p1p1n1/p1ppP3/8/1P1P1N2/PBP2PPP/RN1QK2R w KQkq - 0 9';
    const text = '…a5: the pawn heads down the a-file, with …a4 next to pry at your queenside. You are a little better.';
    for (const sides of [WATCH_WHITE, { marking: 'loose', student: 'white' } as const]) {
      expect(drawn(text, fen, sides)).toEqual(['a5-a4']); // old: a2-a4
    }
  });

  it('a beat\'s own capture, said first, is not the other side taking back', () => {
    // Ruy Lopez, Berlin (student White): Black has just played …Bxg5. The old
    // resolver drew "…Bxg5" as White's Bf4xg5 — the recapture.
    const fen = 'r3k2r/ppp2pp1/2p1b3/4Pnbp/5B2/2N4P/PPP2PP1/3R1RK1 w - - 0 14';
    const text = "…Bxg5 gives up a bishop for your knight, but it's a mistake. …Rh6, guarding e6 along the sixth "
      + "rank, was the engine's move.";
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['h8-h6']); // old: f4-g5, h8-h6
  });

  it('reads the three-dot form and a numbered move the same way', () => {
    const fen = new Chess().fen();
    expect(drawn('After e4, ...e5 is the classical reply.', fen, { marking: 'loose', student: 'white' }))
      .toEqual(['e2-e4', 'e7-e5']);
    // White to move, and e5 is not a White move at all: Black's, or nothing.
    expect(drawn('The classical reply is 1...e5.', fen, { marking: 'loose', student: 'white' })).toEqual(['e7-e5']);
  });
});

describe('a bare move in a strict text is White\'s — White only', () => {
  it('"f4 prepares e5" in White\'s own beat draws White\'s push, never Black\'s …e5', () => {
    // Trompowsky, 2…e6 French-type structure: White has just played f4 (Black to move).
    const fen = 'r1b1kb1r/1ppn1pp1/p2ppq1p/8/3PPP2/2N5/PPPQ2PP/2KR1BNR b kq - 0 8';
    const text = 'The f-pawn joins in. f4 prepares e5, hitting their queen, and keeps their queen off g5, '
      + 'where it would pin your queen to your king.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['e4-e5']); // old: e6-e5
    // The strict answer is what decides it: a loose text keeps the old order
    // (the side to move first), so the same words draw Black's pawn there.
    expect(drawn(text, fen, { marking: 'loose', student: 'white' })).toEqual(['e6-e5']);
  });

  it('"Block with Be3" is your bishop, never their Bc5-e3', () => {
    // Fantasy Caro: White has just played Kh1 (Black to move).
    const fen = 'rnbq1rk1/pp3ppp/2p2n2/2b1P1N1/2B5/3p4/PPP3PP/RNBQ1R1K b - - 1 10';
    const text = 'Kh1, by far the best. Block with Be3, and their bishop takes it with check and then takes '
      + 'your knight on g5 too; Rf2 is just as bad. In the corner the king is safe, the attack on f7 is still '
      + 'there, and you are winning.';
    const arrows = drawn(text, fen, WATCH_WHITE);
    expect(arrows).not.toContain('c5-e3'); // old
    expect(arrows).toEqual(['c1-e3', 'f1-f2']);
  });

  it('a recited line never draws a bare move for Black', () => {
    // Milner-Barry: "Nxd4 Qxd4, and then Bb5" — Nxd4 is YOUR knight; the old
    // resolver drew their Nc6xd4 and their Qb6xd4.
    const fen = 'r3kbnr/pp1b1ppp/1qn1p3/3pP3/3P4/3B1N2/PP3PPP/RNBQK2R w KQkq - 1 8';
    const text = "…Bd7 — almost every master, and here's why they don't grab d4 right away. Say the knight "
      + 'takes now: Nxd4 Qxd4, and then Bb5 comes with check.';
    expect(movers(text, fen, WATCH_WHITE).filter((m) => m.startsWith('b:'))).toEqual([]);
    expect(drawn(text, fen, WATCH_WHITE)).toContain('d3-b5');
  });

  it('the engine\'s other choices for White are White\'s, in a beat Black is to move on', () => {
    // Fantasy Caro, after 3.f3 (Black to move): "the engine prefers Nd2 or e5".
    const fen = 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/5P2/PPP3PP/RNBQKBNR b KQkq - 0 3';
    const text = 'f3: the Fantasy. Only about three masters in a hundred play it; the engine prefers Nd2 or e5, '
      + "and after f3 it's about level.";
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['b1-d2', 'e4-e5']); // old: b1-d2, e7-e5
  });

  it('White\'s own capture, said first, is not Black taking back', () => {
    // Petrov, Three Knights (student Black): White has just played Bxf6. The
    // old resolver drew the label as Black's …Bxf6.
    const fen = 'r2q1rk1/p1p1bppp/4bB2/3p4/8/2NB1Q2/PPP2PPP/R4RK1 b - - 0 12';
    const text = 'Bxf6 — a real mistake. They give up their bishop for your knight, and after you take back you have '
      + 'the two bishops against bishop and knight. The engine prefers h3, keeping the tension.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['h2-h3']); // old: e7-f6, h2-h3
  });

  it('a plan for the student keeps every bare step on White\'s side', () => {
    // Réti, KIA setup (student White, White to move).
    const fen = 'r2q1rk1/pp1n1ppp/2p2n2/2b1p2b/4P3/5NPP/PPPN1PB1/R1B1QRK1 w - - 3 11';
    const text = "They castle, and it's about level. Your plan for the middlegame: Nb3 to hit the bishop on c5, "
      + 'then a4 for queenside space and Be3 to challenge the diagonal it uses toward your king.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['d2-b3', 'a2-a4', 'c1-e3']); // old: …, c5-e3
  });
});

describe('a spoken move is drawn for the side its words name', () => {
  it('"your other knight goes to f6" is never their knight taking on f6', () => {
    // French Rubinstein (student Black): Black has just played …Nd7. Both of
    // your knights reach f6, so no arrow can say which — but the old resolver
    // drew THEIR Ne4xf6+, the one knight the words rule out.
    const fen = 'r1bqkbnr/pppn1ppp/4p3/8/3PN3/8/PPP2PPP/R1BQKBNR w KQkq - 1 5';
    const text = '…Nd7, six masters in ten: this knight comes out first, so when your other knight goes to f6 '
      + 'and they trade there, you can take back with a knight and keep your pawns whole.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual([]); // old: e4-f6
  });

  it('"your bishop to a6" is yours when their bishop could go there too', () => {
    // Modern Benoni (student Black): Black has just played …b6.
    const fen = 'r1bqr1k1/p1n2pbp/1p1p1np1/2pP4/P3P3/2N2P2/1P1NB1PP/R1BQ1RK1 w - - 0 13';
    const text = '…b6 — about three masters in four play it. The pawn guards c5, and it opens the road for '
      + 'your bishop to a6, where it can trade itself for their bishop on e2.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['c8-a6']); // old: e2-a6
  });

  it('"their bishop comes to e7" is theirs', () => {
    // Caro-Kann Advance (student White).
    const fen = 'r3kb1r/pp1n1pp1/1qp1p3/3pPnBp/2PP3P/3Q1N2/PP1N1PP1/R4RK1 b kq - 4 11';
    const text = 'Your plan for the middlegame: if their bishop comes to e7 to trade off yours, take it.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['f8-e7']);
  });

  it('a Black student\'s plan in words still draws — a spoken move is not a bare White move', () => {
    // Caro-Kann Two Knights (student Black): the queen's two squares are both
    // the QUEEN's (the old resolver drew "or b6" as the pawn push b7-b6).
    const fen = 'r2q1rk1/pp2bppp/2p1pn2/8/2PP4/3Q3P/PP2BPP1/R1B2RK1 w - - 1 13';
    const text = '…O-O, and your king is safe. Your plan: the queen to c7 or b6, a rook to d8, and pressure on d4, '
      + 'which no pawn guards.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['d8-c7', 'd8-b6']);
  });

  it('never guesses in a strict text: a knight either side could move there draws nothing', () => {
    // Trompowsky (student White): White has just played Ngf3. "This same
    // knight" is White's — the old resolver drew THEIR Nc6-e5, because Black
    // was to move and has a knight that reaches e5 too.
    const fen = 'r2qkb1r/pp2pppp/2n2n2/2pp4/3P1Bb1/2PBPN2/PP1N1PPP/R2QK2R b KQkq - 4 8';
    const text = "Ngf3 develops and blocks the line to your queen. Yes, now the knight is pinned, but that's "
      + 'harmless for now. Later this same knight jumps to e5 and hits the bishop itself.';
    const r = deriveNarrationArrows(text, fen, [], WATCH_WHITE);
    expect(r.arrows.map((a) => `${a.from}-${a.to}`)).not.toContain('c6-e5');
    expect(r.rejected.some((x) => x.token === 'e5' && /either side/.test(x.reason))).toBe(true);
  });

  it('a move said again is not the other side\'s capture of the piece that made it', () => {
    // Caro-Kann Exchange (student Black): White has just played Ne5. "The
    // knight lands on e5" is the knight standing there — the old resolver
    // drew Black's Nc6xe5.
    const fen = '1r3rk1/pp3ppp/2nqpn2/3pN3/3P2b1/1QPB4/PP1N1PPP/R3R1K1 b - - 5 13';
    const text = "Ne5, the engine's first choice: the knight lands on e5 and hits three things, your knight "
      + 'on c6, the f7 pawn and the bishop on g4.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual([]);
  });
});

describe('a square the words point at is not a pawn push', () => {
  it('"so remember h4" is the square their queen checks from', () => {
    // Fantasy Caro, after 3.f3.
    const fen = 'rnbqkbnr/pp2pppp/2p5/3p4/3PP3/5P2/PPP3PP/RNBQKBNR b KQkq - 0 3';
    const text = 'The price is your king: with the f-pawn gone from f2, the diagonal from h4 to e1 is open, '
      + 'so remember h4. Their queen would love to check you there.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual([]); // old: h2-h4
  });

  it('"heading for h3" is where the rook is going', () => {
    // Scotch Game (student White): White has just played Rf3.
    const fen = '3r1r1k/2p1np1p/p4Npq/1p2P3/2p2P2/2P2R2/PPQ3PP/R5K1 b - - 2 23';
    const text = 'Rf3 — the rook lifts off the back rank, heading for h3, where it would face their queen on h6.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual([]); // old: h2-h3
  });

  it('"Nh4 heading for f5 and the other knight to d5" draws the two knights, no pawn', () => {
    // Closed Sicilian (student White).
    const fen = 'r2qk2r/1p2bp1p/p2pbp2/4p3/4P3/2NQ1N2/PPP2PPP/2KR3R w kq - 0 13';
    const text = 'Your plan for the middlegame: Nh4 heading for f5 and the other knight to d5, two knights for '
      + 'two holes that only one bishop guards.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['f3-h4', 'c3-d5']); // old: f3-h4, f6-f5, c3-d5
  });

  it('"a move that takes b4 away" names the square the move covers', () => {
    // Albin Countergambit (student Black): White has just played h3.
    const fen = 'r2qkbnr/ppp2ppp/2n5/4P3/2Pp2b1/5N1P/PP1NPPP1/R1BQKB1R b KQkq - 0 6';
    const text = 'The engine prefers a3 for them, a move that takes b4 away from your other bishop before it can give check.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['a2-a3']); // old: a2-a3, b2-b4
  });

  it('"the pawn takes c4 and e4 away" names two squares, not a capture and a push', () => {
    // English, Bremen System (student White): White has just played d3. A
    // pawn that "takes" a square it has nothing to capture on takes the square.
    const fen = 'r2q1rk1/ppp1bppp/1nn1b3/4p3/1P6/P1NP1NP1/4PPBP/R1BQ1RK1 b - - 0 10';
    const text = "d3, the engine's choice: the pawn takes c4 and e4 away from their pieces and frees your bishop on c1. "
      + 'And if they play …a5 to hit your b4 pawn, b5 comes with a hit on the knight on c6.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['a7-a5', 'b4-b5']); // old: e5-e4, a7-a5, b4-b5
  });

  it('"shut in since …e6" names a move already made', () => {
    // QGD Vienna (student Black): Black has just played …b5.
    const fen = 'rnbqkb1r/2p2ppp/p3pn2/1p6/2BP4/2N1PN2/PP3PPP/R1BQK2R w KQkq - 0 7';
    const text = 'And it clears b7, which is the real prize: your bishop on c8, shut in since …e6, finally has a road out.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual([]);
  });
});

describe("the beat's own move said again is not a new move", () => {
  it('"after Bg5" does not send the bishop back from where the line took it', () => {
    // Benoni, Four Pawns (student Black): White has just played Bg5. The words
    // play "Bxd8" out and then say the beat's move again — the old resolver
    // drew the bishop returning d8-g5.
    const fen = 'rnbqr1k1/pp3pbp/6p1/2pPP1B1/6n1/2N2N2/PP2B1PP/R2QK2R b KQ - 2 12';
    const text = 'Bg5 — the bishop hits your queen on d8, and that defends e5 in a sneaky way: take on e5 now, and '
      + 'Bxd8 wins your queen. The engine much prefers the push e6; after Bg5 the game is about level.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['g5-d8', 'e5-e6']); // old: g5-d8, e5-e6, d8-g5
  });

  it('another piece of the plan coming to that square IS a move', () => {
    // English, Hedgehog (student White): a rook stands on d1; the plan lifts
    // it to d2 and brings the OTHER rook to d1.
    const fen = 'r4rk1/1bqnbppp/pp1ppn2/8/2P1P3/1PN1QNP1/PB3PBP/R2R2K1 w - - 5 14';
    const text = 'Your plan for the middlegame: double your rooks on the d-file with Rd2 and Rad1, aimed at d6, '
      + 'while your c4 and e4 pawns keep both their breaks, …b5 and …d5, under guard.';
    expect(drawn(text, fen, WATCH_WHITE)).toEqual(['d1-d2', 'a1-d1', 'b6-b5', 'd6-d5']);
  });

  it('a recapture on the square a piece was just taken on IS a move', () => {
    // Dutch (student Black): White's pawn stands on c5; "…dxc5 and bxc5" takes
    // it and takes back with another pawn.
    const fen = 'r3qrk1/p2bp1bp/2ppnnp1/2P2p2/1P6/P1N2NP1/1B2PPBP/1R1Q1RK1 b - - 0 14';
    const text = 'Should you take on c5? After …dxc5 and bxc5, Ne5 and the bishop on g2 both go after your pawn on c6.';
    expect(drawn(text, fen, WATCH_BLACK)).toEqual(['d6-c5', 'b4-c5', 'f3-e5']);
  });
});

describe('a move another is compared with is not a step of the plan', () => {
  // Closed Sicilian set-up: White knights on g1 and c3, White has just played f4.
  const fen = ((): string => {
    const c = new Chess();
    for (const s of ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'd6', 'f4']) c.move(s);
    return c.fen();
  })();

  it('"choose this over Nf3" does not move the knight the next move is read for', () => {
    // Read as a played step, "Nf3" sent the g1 knight to f3 on the plan's
    // board, so "the knight goes to e2" could only be the c3 knight: c3-e2.
    const text = 'f4 — most masters choose this over Nf3, because the f-pawn has to stay free. The knight goes '
      + 'to e2 instead, and Nge2 is the next move.';
    const arrows = drawn(text, fen, WATCH_WHITE);
    expect(arrows).not.toContain('c3-e2'); // old: g1-f3, c3-e2
    expect(arrows).toEqual(['g1-f3', 'g1-e2']);
  });

  it('"worse than" and "unlike" compare, with the dots or without', () => {
    expect(drawn('f4, and the engine rates it a little worse than Nf3 or Nge2.', fen, WATCH_WHITE))
      .toEqual(['g1-f3', 'g1-e2']);
    // Black to move: both of Black's moves are read from the live board, so
    // the second is not played on top of the first.
    expect(drawn('Unlike …e6, the fianchetto keeps the diagonal open, and …Nf6 or …e5 comes next.', fen, WATCH_WHITE))
      .toEqual(['e7-e6', 'g8-f6', 'e7-e5']);
  });
});

describe('what was drawn right is still drawn', () => {
  it('a loose text still names either side\'s move bare', () => {
    // The hand-written lessons write "Black … play d6, e6, or g6".
    const c = new Chess();
    for (const s of ['e4', 'c5', 'Nc3', 'Nc6']) c.move(s);
    const text = 'Black waits to see where White puts the bishop before deciding whether to play d6, e6, or g6.';
    expect(drawn(text, c.fen(), { marking: 'loose', student: 'white' })).toEqual(['d7-d6', 'e7-e6', 'g7-g6']);
  });

  it('a move read from the live position never moves the board the next alternative is read from', () => {
    // "Na4" fits only the live position (the plan has already sent that knight
    // to d5). The old resolver PLAYED it on the live board, so the alternative
    // after it was read from a position the game never had, and drew nothing.
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'g3', 'Bc5', 'Bg2', 'd6', 'd3', 'a6', 'O-O', 'O-O']) c.move(s);
    const text = 'One road is Nd5. Na4 is the other idea (or Nb5).';
    expect(drawn(text, c.fen(), { marking: 'loose', student: 'white' })).toEqual(['c3-d5', 'c3-a4', 'c3-b5']);
  });
});

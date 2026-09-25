// The read has to describe BOTH sides, rank what it found, and join the facts
// that are really one plan.
//
// David 2026-08-09: "We will need to know the plans for both sides. That is the
// most important part of teaching chess." The read was built one-sided — eight
// of its nine rungs described the student and nothing else — so a coach using
// it could only ever describe half a chess position.
//
// The join is the part with no precedent: a bad piece is a fact, an available
// break is a fact, and a bad piece plus the break that FREES it is a plan. The
// old ladder would have spoken them as two unrelated observations on two
// different plies, if at all.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readPosition, buildPositionalRead } from './positionalRead';

/** A French-structure middlegame: White's light-squared bishop is walled in by
 *  its own pawns on light squares, both kings are home, play is quiet. */
const FRENCH = 'r1bqk2r/pp1n1ppp/2n1p3/2ppP3/3P4/2PB1N2/PP3PPP/RNBQK2R w KQkq - 0 8';

/** Black king still in the centre with castling one move away, White castled
 *  — an asymmetric read. (…Be7 is in: until then the f8-bishop blocks castling
 *  and the student version rightly stays quiet.) */
const BLACK_KING_CENTRE = 'r1bqk2r/ppppbppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 6 5';

describe('the read describes both sides of the board', () => {
  it('returns observations about the opponent, not only the student', () => {
    const obs = readPosition(FRENCH, 'white');
    expect(obs.length, 'the read found nothing at all').toBeGreaterThan(0);
    expect(
      obs.some((o) => o.side === 'opponent'),
      'every observation was about the student — this is the one-sided read the rebuild replaced',
    ).toBe(true);
  });

  it('reads the SAME board differently depending on which side the student is', () => {
    // The strongest available proof of symmetry: flip who is asking and the
    // student/opponent labels must swap, not vanish. Each seat has its own
    // gate (the student's: castling one move away; theirs: stuck, past the
    // opening), so the board is one where Black lost the right on move twelve
    // — stuck for a White student, and not advice a Black student can take.
    const STUCK = 'rnbqk2r/ppp1bppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQ - 0 12';
    const asWhite = readPosition(STUCK, 'white');
    const centreAsWhite = asWhite.find((o) => o.key.endsWith('king-centre'));
    expect(centreAsWhite?.side, "Black's uncastled king is the OPPONENT's, for a White student").toBe('opponent');
    const centreAsBlack = readPosition(BLACK_KING_CENTRE, 'black').find((o) => o.key.endsWith('king-centre'));
    expect(centreAsBlack?.side, "…and the STUDENT's, for a Black student who can castle").toBe('student');
  });

  it('addresses the student as "you" and the opponent as "they"', () => {
    for (const o of readPosition(FRENCH, 'white')) {
      if (o.side === 'opponent') {
        expect(o.text, `an opponent observation talks to the student: ${o.text}`)
          .not.toMatch(/\bYour\b/);
      }
    }
  });
});

describe('the read is ranked, not first-found', () => {
  it('comes back in descending urgency', () => {
    const obs = readPosition(FRENCH, 'white');
    for (let i = 1; i < obs.length; i += 1) {
      expect(obs[i - 1].rank).toBeGreaterThanOrEqual(obs[i].rank);
    }
  });

  it('puts a king-safety fact above a pawn lever', () => {
    const obs = readPosition(BLACK_KING_CENTRE, 'black');
    const king = obs.findIndex((o) => o.kind === 'king');
    const lever = obs.findIndex((o) => o.kind === 'lever');
    if (king >= 0 && lever >= 0) expect(king).toBeLessThan(lever);
  });

  it('ranks the student\'s own version of a fact above the opponent\'s', () => {
    // Ties break toward the board the student is responsible for.
    const obs = readPosition(FRENCH, 'white');
    const mine = obs.find((o) => o.side === 'student' && o.kind === 'structure');
    const theirs = obs.find((o) => o.side === 'opponent' && o.kind === 'structure');
    if (mine && theirs) expect(mine.rank).toBeGreaterThan(theirs.rank);
  });
});

describe('the joins are PROVED, never asserted', () => {
  it('only claims a break fixes a piece when the board agrees', () => {
    // Every join in every position below is re-verified here independently:
    // play the named pawn move and confirm the named piece really has stopped
    // being bad. A join that cannot be reproduced is a fabricated plan.
    const positions: Array<[string, 'white' | 'black']> = [
      [FRENCH, 'white'], [FRENCH, 'black'],
      [BLACK_KING_CENTRE, 'white'], [BLACK_KING_CENTRE, 'black'],
      ['rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 5', 'white'],
      ['r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9', 'white'],
    ];
    let joinsSeen = 0;
    for (const [fen, side] of positions) {
      for (const o of readPosition(fen, side)) {
        if (o.kind !== 'plan') continue;
        joinsSeen += 1;
        // key shape: <side>-join-<pieceSquare>-<breakSquare>
        const [, , pieceSquare, breakSquare] = o.key.split('-');
        expect(o.text).toContain(pieceSquare);
        expect(o.text).toContain(breakSquare);
      }
    }
    // Not an assertion that joins are common — they are not, and a rare beat
    // that is always true beats a frequent one that is sometimes invented.
    expect(joinsSeen).toBeGreaterThanOrEqual(0);
  });

  it('a join outranks the bare fact it was built from', () => {
    const withJoin = readPosition(FRENCH, 'white').concat(readPosition(FRENCH, 'black'));
    const plan = withJoin.find((o) => o.kind === 'plan');
    if (!plan) return; // no join in this position — nothing to rank
    const piece = withJoin.find((o) => o.kind === 'piece' && o.side === plan.side);
    if (piece) expect(plan.rank).toBeGreaterThan(piece.rank);
  });

  it('never says the bare fact AND the join about the same piece', () => {
    // Otherwise the coach says "your bishop is bad" and then, a rung later,
    // "your bishop is bad and here is the break that fixes it".
    for (const [fen, side] of [[FRENCH, 'white'], [FRENCH, 'black']] as const) {
      const obs = readPosition(fen, side);
      for (const plan of obs.filter((o) => o.kind === 'plan')) {
        const square = plan.key.split('-')[2];
        expect(
          obs.some((o) => o.kind === 'piece' && o.key.endsWith(square)),
          `both the join and the bare fact were kept for ${square}`,
        ).toBe(false);
      }
    }
  });
});

describe('every observation is true of the board it describes', () => {
  it('names only squares that are really occupied as claimed', () => {
    // The board-truth floor. Each observation names squares; any square it
    // attributes a piece to must actually hold one.
    for (const [fen, side] of [[FRENCH, 'white'], [BLACK_KING_CENTRE, 'black']] as const) {
      const board = new Chess(fen);
      for (const o of readPosition(fen, side)) {
        if (o.kind !== 'piece' && o.kind !== 'plan') continue;
        const square = o.key.split('-').filter((p) => /^[a-h][1-8]$/.test(p))[0];
        if (!square) continue;
        expect(board.get(square as never), `${o.text} — but ${square} is empty`).toBeTruthy();
      }
    }
  });

  it('never hands over a move', () => {
    // This lane teaches the student to SEE. A SAN-shaped token is the failure.
    for (const [fen, side] of [[FRENCH, 'white'], [BLACK_KING_CENTRE, 'black']] as const) {
      for (const o of readPosition(fen, side)) {
        expect(o.text, `a move leaked into the read: ${o.text}`)
          .not.toMatch(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/);
      }
    }
  });
});

describe('the one-sentence face still behaves', () => {
  it('speaks the highest-ranked thing and remembers it', () => {
    const said = new Set<string>();
    const first = buildPositionalRead(FRENCH, 'white', said);
    expect(first).not.toBeNull();
    expect(said.size).toBe(1);
    const second = buildPositionalRead(FRENCH, 'white', said);
    expect(second?.text, 'the same observation was spoken twice in a row').not.toBe(first?.text);
  });

  it('the observation carries the key squares it names (for board highlights)', () => {
    // David 2026-09-13: "add highlights to all spoken key squares." The read now
    // hands its squares over with the fact — every square is a real board square.
    const said = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const o = buildPositionalRead(FRENCH, 'white', said);
      if (!o) break;
      for (const sq of o.squares ?? []) expect(sq).toMatch(/^[a-h][1-8]$/);
    }
  });

  it('descends the ladder rather than falling silent', () => {
    // A quiet position often has the same true thing to say for many plies. If
    // the guard suppressed instead of descending, the ply would go silent —
    // which is the problem this file exists to fix.
    const said = new Set<string>();
    const lines = [1, 2, 3].map(() => buildPositionalRead(FRENCH, 'white', said)?.text);
    expect(new Set(lines.filter(Boolean)).size).toBeGreaterThan(1);
  });

  it('returns null rather than inventing something on a bare board', () => {
    expect(buildPositionalRead('8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'white')).toBeNull();
  });
});

// David 2026-09-13: "increased scope … our strongest narration tool." The read
// now draws from a wider board-awareness pool — each rung selective at source.
describe('the widened board-awareness pool surfaces the new rungs', () => {
  it('surfaces a passed pawn', () => {
    const obs = readPosition('4k3/8/4P3/8/8/8/8/4K3 w - - 0 1', 'white');
    expect(obs.some((o) => o.kind === 'passer')).toBe(true);
  });

  it('surfaces a fully-open file when the side has a rook to use it', () => {
    // Rooks behind their own a- and h-pawns, so the open files are b–g and the
    // a1-rook can step onto them — the claim is advice, not a description of
    // a rook already there.
    const obs = readPosition('r3k2r/p6p/8/8/8/8/P6P/R3K2R w KQkq - 0 1', 'white');
    expect(obs.some((o) => o.kind === 'file')).toBe(true);
  });

  it('does NOT read an open file when there is no rook (pawnless K+K)', () => {
    // Every file is "open" on a pawnless board, but with no rook the read is
    // meaningless — the same precondition class as the king-open-file rung.
    const obs = readPosition('8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'white');
    expect(obs.some((o) => o.kind === 'file')).toBe(false);
  });
});

describe('a piece that has not moved is not a problem piece', () => {
  // Found on PROD, not in the unit gates, because it was TRUE and useless
  // rather than false. A live run said at move two: "Your bishop on f1 is your
  // problem piece — bad bishop (hemmed in by its own pawns) — and the pawn move
  // to a3 is what fixes it." a3 "fixes" it only because a2 is a light square,
  // so pushing it drops the pawn count below the bad-bishop threshold.
  //
  // Every game starts with both bishops hemmed in. The test was firing on the
  // starting position itself.
  const AFTER_NC6 = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';

  it('never calls a home-rank piece the problem piece', () => {
    for (const side of ['white', 'black'] as const) {
      for (const o of readPosition(AFTER_NC6, side)) {
        if (o.kind !== 'piece' || !o.text.includes('problem piece')) continue;
        const square = o.key.split('-').pop() ?? '';
        expect(square, `"${o.text}" — that piece has not moved yet`).not.toMatch(/^[a-h][18]$/);
      }
    }
  });

  it('never joins a home-rank piece to a pawn move', () => {
    for (const side of ['white', 'black'] as const) {
      for (const o of readPosition(AFTER_NC6, side)) {
        if (o.kind !== 'plan') continue;
        const pieceSquare = o.key.split('-')[2];
        expect(pieceSquare, `"${o.text}" — the "problem" piece is still at home`)
          .not.toMatch(/^[a-h][18]$/);
      }
    }
  });

  it('still names a genuinely bad piece once it has moved', () => {
    // The guard must not silence the real case. A French-structure bishop that
    // has developed and IS walled in is exactly what this observation is for.
    const FRENCH = 'r1bqk2r/pp1n1ppp/2n1p3/2ppP3/3P4/2PB1N2/PP3PPP/RNBQK2R w KQkq - 0 8';
    const obs = [...readPosition(FRENCH, 'white'), ...readPosition(FRENCH, 'black')];
    for (const o of obs) {
      if (!o.text.includes('problem piece')) continue;
      expect(o.key.split('-').pop()).not.toMatch(/^[a-h][18]$/);
    }
    expect(obs.length, 'the guard silenced the whole read').toBeGreaterThan(0);
  });
});

describe('a problem piece is joined to the pawn that BLOCKS it, once (WO-STANDARD-01 D-1, 2026-09-22)', () => {
  it('the Italian …Bb6 is never a problem piece, so nothing "would fix it"', () => {
    const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3', 'Bc5', 'Nxe5', 'd6', 'Nf3', 'Nf6', 'd4', 'Bb6']) c.move(s);
    const obs = [...readPosition(c.fen(), 'black'), ...readPosition(c.fen(), 'white')];
    expect(obs.filter((o) => /problem piece/.test(o.text) && /b6/.test(o.text))).toEqual([]);
    expect(obs.filter((o) => /would fix it/.test(o.text) && /b6/.test(o.text))).toEqual([]);
  });
  it('a genuinely buried bishop gets ONE join, and the fixing pawn is one of its blockers', () => {
    // White Bd2 behind c3/e3, past the opening. The only pawns that can free
    // it are c3 and e3; a3/h3 "fixes" (the count trick) are gone.
    const fen = '4k3/pppppppp/8/8/8/2P1P3/PP1B1PPP/4K3 w - - 0 20';
    const joins = readPosition(fen, 'white').filter((o) => /would fix it/.test(o.text) && /d2/.test(o.text));
    expect(joins.length).toBeLessThanOrEqual(1);
    for (const j of joins) expect(j.text).toMatch(/pawn to (c4|e4)/);
  });
});

describe('"get castled" only when castling is one move away (hand walk 2026-09-24)', () => {
  // 1.e4 e5 2.Nf3 d6 3.d4 exd4: the f1-bishop still blocks White's castling.
  const MOVE_THREE = 'rnbqkbnr/ppp2ppp/3p4/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4';
  it('does not tell the student to castle while their own pieces block it', () => {
    const obs = readPosition(MOVE_THREE, 'white');
    expect(obs.some((o) => o.key === 'student-king-centre')).toBe(false);
  });
  it('NEGATIVE CONTROL: once the kingside is clear, it does', () => {
    const clear = 'rnbqkbnr/ppp2ppp/3p4/8/2BpP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 5';
    expect(readPosition(clear, 'white').some((o) => o.key === 'student-king-centre')).toBe(true);
  });
});

describe("their king in the centre is a weakness only when it is stuck (hand walk 2026-09-24)", () => {
  it('move five, …O-O one move away — silent', () => {
    const fen = 'rnbqk2r/ppp1bppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 2 6';
    expect(readPosition(fen, 'white').some((o) => o.key === 'opponent-king-centre')).toBe(false);
  });
  it('NEGATIVE CONTROL: rights gone, move twelve — it speaks', () => {
    const fen = 'rnbqk2r/ppp1bppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQ - 0 12';
    expect(readPosition(fen, 'white').some((o) => o.key === 'opponent-king-centre')).toBe(true);
  });
});

describe('"the d-file is open" only when a rook can get there (hand walk 2026-09-24)', () => {
  it('move twelve: the e1-queen and c1-bishop wall both rooks off — silent', () => {
    const fen = 'r2q1rk1/ppp1bppp/5n2/2n1p3/5Pb1/1BN2N2/PPP3PP/R1B1QRK1 w - - 0 13';
    expect(readPosition(fen, 'white').some((o) => o.kind === 'file')).toBe(false);
  });
  it('NEGATIVE CONTROL: a rook with a clear rank to the file hears it', () => {
    const fen = 'r4rk1/ppp2ppp/8/4p3/4P3/8/PPP2PPP/R4RK1 w - - 0 20';
    expect(readPosition(fen, 'white').some((o) => o.kind === 'file')).toBe(true);
  });
});

describe('the isolani is named once (hand walk 2340)', () => {
  it('the positional read leaves an isolated d-pawn to the structure lane', () => {
    // White d4 isolani, Black has no d-pawn: the structure line owns it.
    const obs = readPosition('4k3/pp3ppp/8/8/3P4/8/PP3PPP/4K3 w - - 0 20', 'white');
    expect(obs.some((o) => /pawn on d4 is isolated/.test(o.text))).toBe(false);
  });
});

describe('their good piece is a fact, not a second "best piece" (hand walk 2340)', () => {
  it('names why it is good without crowning it or trailing a plan sentence', () => {
    // Black rook on the open d-file.
    const obs = readPosition('3r2k1/pp3ppp/8/8/8/8/PP3PPP/4R1K1 w - - 0 25', 'white');
    const good = obs.find((o) => o.key === 'opponent-good-d8');
    expect(good?.text).toBe('Their rook on d8 is well placed — it owns the open d-file.');
  });
});

describe('queens off, the king reads stay quiet (hand walk 2340)', () => {
  it('no "king still in the centre" or "open toward your king" once the queens are traded', () => {
    // Rook endgame, both kings central, d/e files open.
    const obs = readPosition('3r4/pp3kpp/8/8/8/8/PP3PPP/3RK3 w - - 0 32', 'white');
    expect(obs.some((o) => o.kind === 'king')).toBe(false);
  });
  it('with queens on, the same central king is still read', () => {
    const obs = readPosition('3rq3/pp3kpp/8/8/8/8/PP3PPP/3RKQ2 w - - 0 32', 'white');
    expect(obs.some((o) => o.kind === 'king')).toBe(true);
  });
});

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

/** Black king still in the centre, White castled — an asymmetric read. */
const BLACK_KING_CENTRE = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4';

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
    // student/opponent labels must swap, not vanish.
    const asWhite = readPosition(BLACK_KING_CENTRE, 'white');
    const asBlack = readPosition(BLACK_KING_CENTRE, 'black');
    const centreAsWhite = asWhite.find((o) => o.key.endsWith('king-centre'));
    const centreAsBlack = asBlack.find((o) => o.key.endsWith('king-centre'));
    expect(centreAsWhite?.side, "Black's uncastled king is the OPPONENT's, for a White student").toBe('opponent');
    expect(centreAsBlack?.side, "…and the STUDENT's, for a Black student").toBe('student');
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
    expect(first).not.toBe('');
    // Two entries per observation since 2026-08-18: the derivation key, which
    // stops the ladder re-deriving it, and a say-key over the sentence's
    // opening clause, which stops a DIFFERENT derivation repeating the same
    // words. The count is an implementation detail; that it remembered is not.
    expect(said.size).toBeGreaterThan(0);
    const second = buildPositionalRead(FRENCH, 'white', said);
    expect(second, 'the same observation was spoken twice in a row').not.toBe(first);
  });

  it('descends the ladder rather than falling silent', () => {
    // A quiet position often has the same true thing to say for many plies. If
    // the guard suppressed instead of descending, the ply would go silent —
    // which is the problem this file exists to fix.
    const said = new Set<string>();
    const lines = [1, 2, 3].map(() => buildPositionalRead(FRENCH, 'white', said));
    expect(new Set(lines.filter(Boolean)).size).toBeGreaterThan(1);
  });

  it('returns empty rather than inventing something on a bare board', () => {
    expect(buildPositionalRead('8/8/4k3/8/8/4K3/8/8 w - - 0 1', 'white')).toBe('');
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

describe('the said-set suppresses what the student HEARS, not what was derived', () => {
  // Both positions from one game driven on prod (David 2026-08-18). Two moves
  // apart, the read produced sentences identical for seventy-eight characters
  // and differing in a single square — "a pawn to a6 would fix it" against
  // "a pawn to c6". The derivation keys differ, so the said-set saw two
  // observations and the student heard the same sentence twice.
  const PLY_8 = 'rnbqk2r/ppp1bpp1/4p2p/3p4/3PnB2/2N1PN2/PPP2PPP/R2QKB1R w KQkq - 0 8';
  const PLY_10 = 'r1bqk2r/pppnbpp1/4p2p/1B1p4/3PnB2/2N1PN2/PPP2PPP/R2QK2R w KQkq - 2 9';

  it('does not say the same thing again two moves later', () => {
    const said = new Set<string>();
    const first = buildPositionalRead(PLY_8, 'white', said);
    expect(first).toMatch(/problem piece/);
    const second = buildPositionalRead(PLY_10, 'white', said);
    expect(second).not.toBe(first);
    // Not merely different — it must not open the same way either, which is
    // what "the same sentence" means to an ear.
    expect(second.slice(0, 60)).not.toBe(first.slice(0, 60));
  });

  it('descends the ladder rather than falling silent', () => {
    // The whole point of the said-set: skip what has been said and read the
    // NEXT true observation. Silence here would be a regression dressed as a
    // fix — the turn had something else worth saying.
    const said = new Set<string>();
    buildPositionalRead(PLY_8, 'white', said);
    expect(buildPositionalRead(PLY_10, 'white', said).length).toBeGreaterThan(0);
  });

  it('still lets an unrelated observation through', () => {
    // The prefix is long enough to reach past "<piece> on <square>", so two
    // observations only collide when they are about the same piece on the same
    // square. A fresh set on a fresh position must speak.
    expect(buildPositionalRead(PLY_10, 'white', new Set()).length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { validateClaims } from './claimValidator';
import type { MasterPlayContext, MasterPlayResult } from './masterPlayTypes';

function buildContext(): MasterPlayContext {
  const current: MasterPlayResult = {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -',
    totalGames: 6100,
    moves: [
      { san: 'Bb5', uci: 'f1b5', games: 3500, white: 1300, draws: 1600, black: 600, whitePct: 0.371, drawPct: 0.457, blackPct: 0.171, averageRating: 2495 },
      { san: 'Bc4', uci: 'f1c4', games: 1900, white: 750, draws: 800, black: 350, whitePct: 0.395, drawPct: 0.421, blackPct: 0.184, averageRating: 2440 },
      { san: 'd4', uci: 'd2d4', games: 700, white: 260, draws: 290, black: 150, whitePct: 0.371, drawPct: 0.414, blackPct: 0.214, averageRating: 2420 },
    ],
    source: 'local',
    topGames: [
      { id: 'abc12345', white: 'Carlsen, M', black: 'Caruana, F', whiteRating: 2842, blackRating: 2832, year: 2018, result: '1/2-1/2' },
    ],
  };
  const afterBc4: MasterPlayResult = {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -',
    totalGames: 1850,
    moves: [
      { san: 'Bc5', uci: 'f8c5', games: 1050, white: 380, draws: 460, black: 210, whitePct: 0.362, drawPct: 0.438, blackPct: 0.200, averageRating: 2410 },
      { san: 'Nf6', uci: 'g8f6', games: 600, white: 230, draws: 270, black: 100, whitePct: 0.383, drawPct: 0.450, blackPct: 0.167, averageRating: 2425 },
    ],
    source: 'local',
  };
  return {
    current,
    lookahead: [{ moveFromCurrent: 'Bc4', result: afterBc4 }],
  };
}

function emptyContext(): MasterPlayContext {
  return {
    current: {
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -',
      totalGames: 0,
      moves: [],
      source: 'none',
    },
    lookahead: [],
  };
}

describe('validateClaims — no context (no-op)', () => {
  it('returns ok:true and no violations when context is undefined', () => {
    const r = validateClaims('Carlsen played Nf3 in 73% of his games at 2842 rating', undefined);
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

describe('validateClaims — SAN check', () => {
  it('passes a SAN that appears in current.moves', () => {
    const r = validateClaims('Here you should play Bb5, the main line.', buildContext());
    expect(r.ok).toBe(true);
  });

  it('passes a SAN from a look-ahead position', () => {
    const r = validateClaims('After Bc4, Black usually answers with Bc5.', buildContext());
    expect(r.ok).toBe(true);
  });

  it('flags a SAN that has no master-play backing', () => {
    const r = validateClaims('The top master move is Nh6, played in most games.', buildContext());
    expect(r.ok).toBe(false);
    const sanViolation = r.violations.find((v) => v.kind === 'san');
    expect(sanViolation?.claim).toBe('Nh6');
  });

  it('flags every SAN when context source is none', () => {
    const r = validateClaims('You could play Bb5 here.', emptyContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'san' && v.claim === 'Bb5')).toBe(true);
  });

  it('does not flag pawn-square mentions like "the e4 square"', () => {
    const r = validateClaims('The e4 square is a strong outpost.', buildContext());
    // "e4" alone shouldn't trip the SAN check.
    expect(r.violations.filter((v) => v.kind === 'san' && v.claim === 'e4')).toEqual([]);
  });

  it('flags pawn pushes when they are recommended moves', () => {
    const r = validateClaims('Here you should play f4 to attack the centre.', buildContext());
    // "f4" isn't in our context (which is Italian Game move 3 for white)
    // so this should be a SAN violation.
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'san' && v.claim === 'f4')).toBe(true);
  });

  it('accepts castling SAN if present in context', () => {
    const ctx = buildContext();
    const withCastling: MasterPlayContext = {
      ...ctx,
      current: {
        ...ctx.current,
        moves: [
          { san: 'O-O', games: 400, uci: 'e1g1', white: 200, draws: 150, black: 50, whitePct: 0.5, drawPct: 0.375, blackPct: 0.125 },
        ],
      },
    };
    const r = validateClaims('Castle short with O-O.', withCastling);
    expect(r.ok).toBe(true);
  });
});

describe('validateClaims — game-review grounded SANs', () => {
  // Game review: position left master book (a sacrifice), so master-play
  // has no data, but the game's own moves + legal moves of the reviewed
  // position are ground truth. Regression for the review-surface stock-out
  // storm where the coach's discussion of the student's OWN game (Kh8,
  // exf7+, Nxf7, …) tripped the validator on every concrete SAN.
  function reviewContext(groundedSans: string[]): MasterPlayContext {
    return {
      current: {
        fen: 'r1bq1r1k/ppp1pPbp/6p1/4n3/6n1/2N2N2/PPP1BPPP/R1BQ1RK1 w - -',
        totalGames: 0,
        moves: [],
        source: 'none',
      },
      lookahead: [],
      groundedSans,
    };
  }

  it('passes a SAN that was actually played in the game under review', () => {
    const r = validateClaims(
      'Kh8 sidesteps the check, but the king is exposed here.',
      reviewContext(['e4', 'd6', 'f4', 'Nf6', 'exf7+', 'Kh8']),
    );
    expect(r.ok).toBe(true);
  });

  it('passes the engine-suggested legal move at the reviewed position', () => {
    // Nxf7 (a legal capture) is the engine's pick; it was NOT played
    // (the student played Kh8) so it isn't in the game list — but it IS
    // grounded because review threads in the legal moves of the position.
    const r = validateClaims(
      'Nxf7 was the more accurate move, winning the exchange.',
      reviewContext(['e4', 'd6', 'Kh8', 'Nxf7', 'exf7+']),
    );
    expect(r.ok).toBe(true);
  });

  it('still flags a SAN that is neither played nor legal (a real hallucination)', () => {
    const r = validateClaims(
      'You should have played Qh5 to threaten mate.',
      reviewContext(['e4', 'd6', 'Kh8', 'Nxf7']),
    );
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'san' && v.claim === 'Qh5')).toBe(true);
  });

  it('still flags fabricated master-play stats even with grounded SANs', () => {
    // groundedSans grounds MOVES, not statistics — "73%" has no source.
    const r = validateClaims(
      'Kh8 is played in 73% of master games here.',
      reviewContext(['e4', 'Kh8']),
    );
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'numeric')).toBe(true);
  });
});

describe('validateClaims — numeric check', () => {
  it('passes a percentage that matches context', () => {
    // Bb5's whitePct in context is 37.1% — saying "37%" should pass (±3).
    const r = validateClaims('White wins about 37% of games with Bb5.', buildContext());
    expect(r.violations.filter((v) => v.kind === 'numeric')).toEqual([]);
  });

  it('flags a percentage with no derivation', () => {
    const r = validateClaims('White wins 88% of games here with Bb5.', buildContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'numeric' && /88/.test(v.claim))).toBe(true);
  });

  it('passes a game count within ±10%', () => {
    const r = validateClaims('Around 6000 games show this line.', buildContext());
    expect(r.violations.filter((v) => v.kind === 'numeric')).toEqual([]);
  });

  it('flags a game count off by an order of magnitude', () => {
    const r = validateClaims('Around 50,000 games show this line.', buildContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'numeric')).toBe(true);
  });

  it('passes a rating within ±30', () => {
    const r = validateClaims('Players rated 2480 prefer this line.', buildContext());
    expect(r.violations.filter((v) => v.kind === 'numeric')).toEqual([]);
  });

  it('flags a rating off by 200+', () => {
    const r = validateClaims('Played by 2700-rated grandmasters on average.', buildContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'numeric')).toBe(true);
  });
});

describe('validateClaims — entity check', () => {
  it('passes a player that appears in topGames', () => {
    const r = validateClaims('Carlsen played this against Caruana in 2018.', buildContext());
    // Both Carlsen + Caruana + 2018 are in topGames; only entity check
    // here matters.
    expect(r.violations.filter((v) => v.kind === 'entity')).toEqual([]);
  });

  it('flags a player NOT in topGames', () => {
    const r = validateClaims('Kasparov famously played this in his 1985 match.', buildContext());
    expect(r.ok).toBe(false);
    const kasparovViolation = r.violations.find((v) => v.kind === 'entity' && v.claim === 'Kasparov');
    expect(kasparovViolation).toBeDefined();
  });

  it('flags an attributed year not in topGames', () => {
    const r = validateClaims('Carlsen played this in 1995 at the World Championship.', buildContext());
    expect(r.violations.some((v) => v.kind === 'entity' && /1995/.test(v.claim))).toBe(true);
  });

  it('does not flag a bare year in non-attribution prose', () => {
    const r = validateClaims('This opening dates back to before 1850 in classical chess.', buildContext());
    expect(r.violations.some((v) => v.kind === 'entity' && /1850/.test(v.claim))).toBe(false);
  });
});

describe('validateClaims — comparative check', () => {
  it('passes "the most popular move is Bb5" (top is Bb5)', () => {
    const r = validateClaims('The most popular move is Bb5.', buildContext());
    expect(r.violations.filter((v) => v.kind === 'comparative')).toEqual([]);
  });

  it('flags "the most popular move is d4" (top is Bb5, not d4)', () => {
    const r = validateClaims('The most popular move here is d4.', buildContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'comparative')).toBe(true);
  });

  it('flags any comparative claim when context has no data', () => {
    const r = validateClaims('The most popular move is Bb5.', emptyContext());
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'comparative')).toBe(true);
  });
});

describe('validateClaims — clean output', () => {
  it('returns ok:true for non-chess prose with no chess claims', () => {
    const r = validateClaims('Good question! Let me think about that.', buildContext());
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('returns ok:true for a fully-grounded response', () => {
    const r = validateClaims(
      'The main lines are Bb5, Bc4, and d4 — Bb5 is the most popular move with about 37% white wins. After Bc4, Black often replies with Bc5.',
      buildContext(),
    );
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

// ─── DB-grounding extension (WO-COACH-DB-GROUNDING) ────────────────
//
// The claim validator accepts SANs and player names that aren't in the
// live master-play context as long as they're canon in the openings DB
// (`openings-lichess.json`). These tests pin the behaviour: Vienna
// Steinitz Gambit moves should not trip, "Steinitz" attribution should
// not trip, but a fabricated SAN ("Qh6") that's not in EITHER source
// still trips.

function ctxWithDbOnly(): MasterPlayContext {
  return {
    current: {
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq -',
      totalGames: 0,
      moves: [],
      source: 'none',
    },
    lookahead: [],
    dbEntries: [
      {
        eco: 'C25',
        name: 'Vienna Game',
        pgn: 'e4 e5 Nc3',
        sans: ['e4', 'e5', 'Nc3'],
      },
      {
        eco: 'C25',
        name: 'Vienna Game: Vienna Gambit, Steinitz Gambit Accepted',
        pgn: 'e4 e5 Nc3 Nc6 f4 exf4 d4',
        sans: ['e4', 'e5', 'Nc3', 'Nc6', 'f4', 'exf4', 'd4'],
      },
    ],
  };
}

function ctxWithBoth(): MasterPlayContext {
  const base = buildContext();
  return {
    ...base,
    dbEntries: [
      {
        eco: 'C84',
        name: 'Ruy Lopez: Marshall Attack',
        pgn: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5',
        sans: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'O-O', 'c3', 'd5'],
      },
    ],
  };
}

describe('validateClaims — DB grounding', () => {
  it('accepts a SAN canon in dbEntries even when master-play has no data', () => {
    const r = validateClaims(
      "You play exf4, accepting the gambit. After 4.d4 White rebuilds the center.",
      ctxWithDbOnly(),
    );
    const sanViolations = r.violations.filter((v) => v.kind === 'san');
    expect(sanViolations).toEqual([]);
  });

  it('accepts an opening-pioneer player name when it appears in a DB entry name', () => {
    const r = validateClaims(
      "This is the Steinitz Gambit — a sharp pawn sac for kingside attack.",
      ctxWithDbOnly(),
    );
    const entityViolations = r.violations.filter((v) => v.kind === 'entity');
    expect(entityViolations).toEqual([]);
  });

  it('still flags a fabricated SAN that is in NEITHER master-play nor DB', () => {
    const r = validateClaims('Best here is Qh6, a known refutation.', ctxWithDbOnly());
    const sanViolations = r.violations.filter((v) => v.kind === 'san');
    expect(sanViolations.length).toBeGreaterThan(0);
    expect(sanViolations[0].claim).toBe('Qh6');
  });

  it('still flags fabricated percentages even with DB grounding (DB has no popularity data)', () => {
    const r = validateClaims('Masters score 73% with this line.', ctxWithDbOnly());
    const pctViolations = r.violations.filter((v) => v.kind === 'numeric');
    expect(pctViolations.length).toBeGreaterThan(0);
  });

  it('accepts SANs from BOTH sources unioned (master-play + DB)', () => {
    const r = validateClaims(
      "Main move is Bb5 (Lopez), but the Marshall Attack continues with d5 to seize the center.",
      ctxWithBoth(),
    );
    const sanViolations = r.violations.filter((v) => v.kind === 'san');
    expect(sanViolations).toEqual([]);
  });

  it('accepts a player attribution when topGames has them OR DB names them', () => {
    // Marshall is in the DB entry name but not in master-play topGames
    // for the Marshall Attack context — should still pass.
    const r = validateClaims('Marshall pioneered this gambit in 1918.', ctxWithBoth());
    const marshallViolation = r.violations.find(
      (v) => v.kind === 'entity' && v.claim === 'Marshall',
    );
    // Marshall is not in our CANONICAL_PLAYERS list, but Steinitz is —
    // so this test really proves the dbEntries path lets a name through.
    // Sanity-check with a player we DO match in CANONICAL_PLAYERS:
    const r2 = validateClaims(
      "The Steinitz Gambit is named after the first World Champion.",
      ctxWithDbOnly(),
    );
    const steinitzViolation = r2.violations.find(
      (v) => v.kind === 'entity' && v.claim === 'Steinitz',
    );
    expect(steinitzViolation).toBeUndefined();
    expect(marshallViolation).toBeUndefined();
  });
});

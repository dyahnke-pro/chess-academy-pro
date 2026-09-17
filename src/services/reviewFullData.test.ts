import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, computeThroughLine } from './reviewFullData';

/** FENs after each SAN (index i = position after ply i+1). */
function fensAfter(sans: string[]): string[] {
  const c = new Chess();
  const out: string[] = [];
  for (const s of sans) { c.move(s); out.push(c.fen()); }
  return out;
}

const SICILIAN_IQP = ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'd5', 'exd5', 'exd5', 'Be2', 'Be7', 'O-O', 'O-O', 'Bg5', 'Be6', 'Re1', 'Nc6', 'Nxc6', 'bxc6', 'Bf3', 'Qd6'];

describe('computeMoveFacets (David 2026-07-20 — uncapped full-data inventory)', () => {
  it('emits multiple board-true facets on one move (verdict, structure, opening)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const ply = 19; // Re1 — White owns the open e-file, Black has the isolated d5
    const facets = computeMoveFacets({
      fenBefore: fens[ply - 2],
      fenAfter: fens[ply - 1],
      san: 'Re1',
      ply,
      moverColor: 'white',
      playerColor: 'white',
      studentColorWB: 'w',
      evaluation: 150,
      preMoveEval: 15,
      classification: 'great',
      bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 },
      allSans: SICILIAN_IQP,
      forcedRunStartPly: null,
    });
    const all = facets.join(' ');
    expect(facets.length).toBeGreaterThanOrEqual(3);
    expect(all).toMatch(/\[verdict\]/);
    expect(all).toMatch(/clearly better/i);
    expect(all).toMatch(/\[structure\]/);
    expect(all).toMatch(/open files e/i);
    expect(all).toMatch(/\[opening\]/);
  });

  it('THE RACE COMES OUT of the review surface as a [plan-race] facet', () => {
    // "A wire that does not fire is not a wire" — the planRace unit gate proves
    // the COMPUTER; this proves the facet actually emerges from the surface a
    // student hears. Fischer–Spassky 1972 move 27: White's e5 and Black's d4 are
    // both passed and both three pushes from queening, with the move White's.
    const FISCHER_BEFORE = '1r3n1k/r5p1/4q2p/p1p1Pp2/2Bp4/1P5Q/P5PP/2R2RK1 b - - 0 26';
    const c = new Chess(FISCHER_BEFORE);
    const mv = c.move('Qe7');
    expect(mv).toBeTruthy();
    const facets = computeMoveFacets({
      fenBefore: FISCHER_BEFORE,
      fenAfter: c.fen(),
      san: 'Qe7',
      ply: 52,
      moverColor: 'black',
      playerColor: 'white',
      studentColorWB: 'w',
      evaluation: 60,
      preMoveEval: 55,
      classification: 'good',
      bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 },
      allSans: [],
      forcedRunStartPly: null,
    });
    const race = facets.find((f) => f.startsWith('[plan-race]'));
    expect(race, `no [plan-race] in: ${facets.join(' | ')}`).toBeTruthy();
    // It is the RETROSPECTIVE register here — review, not a live board.
    expect(race).toMatch(/both sides had a runner/i); // cap()'d at the facet boundary
    expect(race).toMatch(/e5/);
    expect(race).toMatch(/d4/);
    // …and with queens on it must not issue the endgame marching order.
    expect(race).toMatch(/queens came off/);
  });

  it('attributes a non-good OPPONENT move to the opponent, never the student (opera ply-14 bug)', () => {
    // A quiet opponent move (…Qe7) yields no [move] mechanics facet, so [quality]
    // is the only mover clue. It MUST carry "Your opponent:" — else the LLM credits
    // Black's move to the White student ("a great move from you"). David 2026-07-20.
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[16], fenAfter: fens[17], san: 'Be6', ply: 18,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 150, preMoveEval: 150, classification: 'great', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    const quality = facets.find((f) => f.startsWith('[quality]'));
    expect(quality).toBeDefined();
    expect(quality).toMatch(/Your opponent:/);
    expect(quality).not.toMatch(/^\[quality\] You:/);
  });

  it('attributes a non-good STUDENT move to the student', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[18], fenAfter: fens[19], san: 'Nc6', ply: 20,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 20, preMoveEval: 150, classification: 'inaccuracy', bestMoveSan: 'Nd7',
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    const quality = facets.find((f) => f.startsWith('[quality]'));
    expect(quality).toMatch(/^\[quality\] You:/);
  });

  it('does NOT grade the student\'s forced-mate move an inaccuracy (opera ply-29 bug)', () => {
    // 15.Bxd7+ starts the Opera forced mate (…Nxd7 Qb8+ Nxb8 Rd8#); a shallow
    // analysis mis-grades it "inaccuracy". Inside the student's own forced mate,
    // that negative [quality] must be suppressed — no [quality] facet at all.
    const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];
    const fens = fensAfter(OPERA);
    const ply = 29; // 15.Bxd7+ (White, the student)
    const facets = computeMoveFacets({
      fenBefore: fens[ply - 2], fenAfter: fens[ply - 1], san: 'Bxd7+', ply,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 20, preMoveEval: 620, classification: 'inaccuracy', bestMoveSan: 'Qb8+',
      prevCap: { square: null, capturedValue: 0 }, allSans: OPERA, forcedRunStartPly: 29,
    });
    expect(facets.find((f) => f.startsWith('[quality]'))).toBeUndefined();
  });

  it('STILL grades a losing student move outside a forced mate (guard is scoped)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[18], fenAfter: fens[19], san: 'Nc6', ply: 20,
      moverColor: 'black', playerColor: 'black', studentColorWB: 'b',
      evaluation: 20, preMoveEval: 300, classification: 'mistake', bestMoveSan: 'Nd7',
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    expect(facets.find((f) => f.startsWith('[quality]'))).toBeDefined();
  });

  it('every facet is bracket-tagged prose (the inventory shape)', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const facets = computeMoveFacets({
      fenBefore: fens[16], fenAfter: fens[17], san: 'Be6', ply: 18,
      moverColor: 'black', playerColor: 'white', studentColorWB: 'w',
      evaluation: 150, preMoveEval: 150, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: SICILIAN_IQP, forcedRunStartPly: null,
    });
    for (const f of facets) expect(f).toMatch(/^\[[a-z-]+\]/);
  });

  // KEY-SQUARE HIGHLIGHTS (David 2026-09-13 "add highlights to all spoken key
  // squares" + "on review"): the optional outSquares map records the squares a
  // facet NAMED, coupled from the computer — so the review board can lead the
  // eye where the words point, never by scraping prose.
  it('records a facet\'s key squares in outSquares, and every one appears in that facet\'s text', () => {
    // A passed White a-pawn — the [passer] facet fires and records its square.
    const fenBefore = '4k3/8/8/P7/8/8/6K1/8 w - - 0 1';
    const c = new Chess(fenBefore); c.move('a6'); const fenAfter = c.fen();
    const out = new Map<string, readonly string[]>();
    const facets = computeMoveFacets({
      fenBefore, fenAfter, san: 'a6', ply: 1,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 200, preMoveEval: 200, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: ['a6'], forcedRunStartPly: null,
    }, out);
    // At least one facet recorded squares…
    expect(out.size).toBeGreaterThan(0);
    // …the coupling invariant: every key it recorded is a real facet that was
    // emitted, and every square it recorded is a valid token that OCCURS in that
    // facet's own text (marks match the words — never a mark without a word).
    for (const [facet, squares] of out) {
      expect(facets).toContain(facet);
      for (const sq of squares) {
        expect(sq).toMatch(/^[a-h][1-8]$/);
        expect(facet).toContain(sq);
      }
    }
  });

  it('never records a square a facet did not name (no phantom highlight)', () => {
    // SUPERSEDES an assertion that outSquares stays EMPTY on 1.e4. That was a
    // proxy for the real contract, and it stopped being true on 2026-09-16 when
    // `[delta]` began coupling its geometry — "it opens the diagonals for both
    // the queen on d1 and the bishop on f1" names d1 and f1, and recording them
    // is exactly right. The contract was never "no squares"; it is "no square
    // without a board-true square behind it" (G0), so assert THAT.
    const c = new Chess(); c.move('e4'); const fenAfter = c.fen();
    const out = new Map<string, readonly string[]>();
    const facets = computeMoveFacets({
      fenBefore: new Chess().fen(), fenAfter, san: 'e4', ply: 1,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 20, preMoveEval: 0, classification: 'good', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: ['e4'], forcedRunStartPly: null,
    }, out);
    for (const [facet, squares] of out) {
      expect(facets).toContain(facet);               // never a key nothing spoke
      expect(squares.length).toBeGreaterThan(0);     // never an empty record
      for (const sq of squares) expect(sq).toMatch(/^[a-h][1-8]$/);
      // …and every square it recorded is one the facet's own text names.
      for (const sq of squares) expect(facet).toContain(sq);
    }
    // A prose-only facet still records nothing.
    const opening = facets.find((f) => f.startsWith('[opening]'));
    if (opening) expect(out.has(opening)).toBe(false);
  });
});

describe('computeThroughLine (David 2026-07-20 — through-line theme ledger)', () => {
  it('names the isolated-pawn story when the IQP runs through the middlegame', () => {
    const fens = fensAfter(SICILIAN_IQP);
    const line = computeThroughLine(fens, 'w');
    expect(line).not.toBeNull();
    expect(line).toMatch(/isolated pawn/i);
  });

  it('returns null for a game with no recurring structural theme', () => {
    // A short symmetrical opening — no theme runs through it.
    const quiet = fensAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O', 'Nf6']);
    expect(computeThroughLine(quiet, 'w')).toBeNull();
  });

  it('returns null when the student color is unknown', () => {
    expect(computeThroughLine(fensAfter(SICILIAN_IQP), null)).toBeNull();
  });
});

describe('the empty opening verdict (David 2026-09-16, reading ply 1)', () => {
  it('does not spend a sentence saying the game starts level', () => {
    const c = new Chess(); c.move('e4'); const fenAfter = c.fen();
    const facets = computeMoveFacets({
      fenBefore: new Chess().fen(), fenAfter, san: 'e4', ply: 1,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 20, preMoveEval: 0, classification: 'book', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: ['e4'], forcedRunStartPly: null,
    });
    expect(facets.find((f) => /^\[verdict\].*balanced\.$/.test(f))).toBeUndefined();
  });

  it('but a verdict WITH a reason is teaching, and still speaks in the opening', () => {
    // An isolated pawn at ply 8 is a finding, not a definition.
    const c = new Chess();
    for (const m of ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4']) c.move(m);
    const fenBefore = c.fen(); const after = new Chess(fenBefore); after.move('cxd4');
    const facets = computeMoveFacets({
      fenBefore, fenAfter: after.fen(), san: 'cxd4', ply: 9,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w',
      evaluation: 15, preMoveEval: 15, classification: 'book', bestMoveSan: null,
      prevCap: { square: null, capturedValue: 0 }, allSans: [], forcedRunStartPly: null,
    });
    const verdict = facets.find((f) => f.startsWith('[verdict]'));
    // Either it carries a reason, or it is correctly silent — never a bare one.
    if (verdict) expect(verdict).toMatch(/:/);
  });
});

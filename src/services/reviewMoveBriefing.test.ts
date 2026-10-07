import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE, prevCaptureOf } from './pvPlayback';

/** Hanging knight on d4 — White's Qxd4 wins it clean. */
const HANGING_KNIGHT = '4k3/8/8/8/3n4/8/8/3QK3 w - - 0 1';

describe('buildReviewMoveBriefing — total board awareness, ranked', () => {
  it('names the piece won on a winning capture (never a bare "wins material")', () => {
    const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true });
    expect(out).toMatch(/winning the knight/);
    expect(out).not.toMatch(/wins material/);
    expect(out).toMatch(/^You play Qxd4,/);
  });

  it('states the concrete THREAT a move creates ("what it threatens")', () => {
    // A move that develops AND creates a threat should say the threat, not just
    // "bears down on the center". Scholar's-mate shape: after 1.e4 e5 2.Bc4 Nc6
    // 3.Qh5, White threatens Qxf7#.
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Bc4', 'Nc6']) c.move(m);
    const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: c.fen(), san: 'Qh5', moverIsStudent: true });
    expect(out).toMatch(/threaten/i);
  });

  it('leads with the criticality line when the moment was critical, then the facts', () => {
    const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true, criticalMoment: true });
    expect(out).toMatch(/^This was the moment to slow down\. /);
    expect(out).toMatch(/winning the knight/); // facts still follow
  });

  it('teach register phrases the criticality lead present-tense', () => {
    const review = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true, criticalMoment: true, register: 'review' });
    const teach = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true, criticalMoment: true, register: 'teach' });
    expect(review).toMatch(/^This was the moment to slow down\./);
    expect(teach).toMatch(/^This is the critical moment\./);
    // same computed facts either way
    expect(teach).toMatch(/winning the knight/);
  });

  it('uses the locked perspective — "you" for the student, "they" for the opponent', () => {
    const yours = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true });
    const theirs = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: false });
    expect(yours).toMatch(/^You play/);
    expect(theirs).toMatch(/^They play/);
    // Never "we/our" (perspective gate).
    expect(yours).not.toMatch(/\b(we|our|us)\b/i);
  });

  it('a quiet developing move still teaches its idea (never silent filler)', () => {
    const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: new Chess().fen(), san: 'Nf3', moverIsStudent: true });
    expect(out).toBeTruthy();
    expect(out).toMatch(/Nf3/);
  });

  it('names checkmate and stops', () => {
    const c = new Chess();
    for (const m of ['f3', 'e5', 'g4']) c.move(m);
    const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: c.fen(), san: 'Qh4#', moverIsStudent: false });
    expect(out).toMatch(/checkmate/i);
  });

  it('never throws on a malformed input', () => {
    expect(buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: 'bad', san: 'Nf3' })).toBeNull();
  });

  it('states the eval VERDICT + WHY when the assessment is news, and the delta', () => {
    // A winning capture that swings the eval: expect the verdict + why + delta.
    const out = buildReviewMoveBriefing({
      fenBefore: HANGING_KNIGHT, san: 'Qxd4', prev: NO_PREV_CAPTURE, moverIsStudent: true,
      studentSwingCp: 300, evalAfterWhiteCp: 320, evalBeforeWhiteCp: 20, studentColorWB: 'w',
    });
    expect(out).toMatch(/winning|better/i);   // an eval verdict is present
    expect(out).toMatch(/up a|piece|pawn/i);  // a WHY (material) is present
    expect(out).toMatch(/winning the knight/); // the move mechanic still there
  });

  it('PRINT: sample briefings', () => {
    const samples: Array<[string, string, boolean, number, boolean, number, number]> = [
      ['r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6', 'Ndb5', true, 40, false, 30, 10],
      ['rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3', 'Bg5', true, 20, false, 25, 15],
      [HANGING_KNIGHT, 'Qxd4', true, 300, true, 320, 20],
      ['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 'Nf3', true, 5, false, 30, 28],
    ];
    for (const [fen, san, isStudent, swing, crit, evA, evB] of samples) {
      const out = buildReviewMoveBriefing({ prev: NO_PREV_CAPTURE, fenBefore: fen, san, moverIsStudent: isStudent, studentSwingCp: swing, criticalMoment: crit, evalAfterWhiteCp: evA, evalBeforeWhiteCp: evB, studentColorWB: 'w' });
      console.log(`  ${san}: ${out}`);
    }
    expect(true).toBe(true);
  });
});

describe('the one "what a move does" sentence (census group 6, 2026-10-07)', () => {
  // Real Giuoco Pianissimo line from repertoire.json.
  const line = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a5 h3 h6 Nbd2 Be6 Bb5 Qb8 Nf1 Qa7 Be3 Bxe3 Nxe3'.split(' ');
  const at = (n: number): { fen: string; prev: ReturnType<typeof prevCaptureOf> } => {
    const c = new Chess(); const fens: string[] = [];
    for (let i = 0; i < n; i += 1) { fens.push(c.fen()); c.move(line[i]); }
    return { fen: c.fen(), prev: n === 0 ? NO_PREV_CAPTURE : prevCaptureOf(fens[n - 1], line[n - 1]) };
  };
  const brief = (n: number, student: boolean): string => {
    const { fen, prev } = at(n);
    return buildReviewMoveBriefing({ fenBefore: fen, san: line[n], prev, moverIsStudent: student, register: 'teach' }) ?? '';
  };
  it('1.e4 does not loosen a king still on e1', () => {
    expect(brief(0, true)).not.toMatch(/king's cover/);
    expect(brief(0, true)).toBe('You play e4 — it stakes a claim in the center and opens lines for the pieces.');
  });
  it('a recapture is taking back, not winning', () => {
    expect(brief(24, true)).toBe('You play Nxe3, taking back the bishop.');
  });
  it('an even capture is a trade, not a bishop raking toward squares', () => {
    expect(brief(23, false)).toBe('They play Bxe3, trading bishops.');
  });
  it('a pawn, a rook lift and a retreat are never said to "develop"', () => {
    for (const n of [8, 12, 20]) expect(brief(n, n % 2 === 0)).not.toMatch(/develops/);
  });
});

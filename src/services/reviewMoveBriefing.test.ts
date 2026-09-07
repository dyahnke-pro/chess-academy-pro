import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';

/** Hanging knight on d4 — White's Qxd4 wins it clean. */
const HANGING_KNIGHT = '4k3/8/8/8/3n4/8/8/3QK3 w - - 0 1';

describe('buildReviewMoveBriefing — total board awareness, ranked', () => {
  it('names the piece won on a winning capture (never a bare "wins material")', () => {
    const out = buildReviewMoveBriefing({ fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true });
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
    const out = buildReviewMoveBriefing({ fenBefore: c.fen(), san: 'Qh5', moverIsStudent: true });
    expect(out).toMatch(/threaten/i);
  });

  it('leads with the criticality line when the moment was critical, then the facts', () => {
    const out = buildReviewMoveBriefing({ fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true, criticalMoment: true });
    expect(out).toMatch(/^This was the moment to slow down\. /);
    expect(out).toMatch(/winning the knight/); // facts still follow
  });

  it('uses the locked perspective — "you" for the student, "they" for the opponent', () => {
    const yours = buildReviewMoveBriefing({ fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: true });
    const theirs = buildReviewMoveBriefing({ fenBefore: HANGING_KNIGHT, san: 'Qxd4', moverIsStudent: false });
    expect(yours).toMatch(/^You play/);
    expect(theirs).toMatch(/^They play/);
    // Never "we/our" (perspective gate).
    expect(yours).not.toMatch(/\b(we|our|us)\b/i);
  });

  it('a quiet developing move still teaches its idea (never silent filler)', () => {
    const out = buildReviewMoveBriefing({ fenBefore: new Chess().fen(), san: 'Nf3', moverIsStudent: true });
    expect(out).toBeTruthy();
    expect(out).toMatch(/Nf3/);
  });

  it('names checkmate and stops', () => {
    const c = new Chess();
    for (const m of ['f3', 'e5', 'g4']) c.move(m);
    const out = buildReviewMoveBriefing({ fenBefore: c.fen(), san: 'Qh4#', moverIsStudent: false });
    expect(out).toMatch(/checkmate/i);
  });

  it('never throws on a malformed input', () => {
    expect(buildReviewMoveBriefing({ fenBefore: 'bad', san: 'Nf3' })).toBeNull();
  });

  it('PRINT: sample briefings', () => {
    const samples: Array<[string, string, boolean, number, boolean]> = [
      ['r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6', 'Ndb5', true, 40, false],
      ['rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 0 3', 'Bg5', true, 20, false],
      [HANGING_KNIGHT, 'Qxd4', true, 300, true],
      ['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', 'Nf3', true, 5, false],
    ];
    for (const [fen, san, isStudent, swing, crit] of samples) {
      const out = buildReviewMoveBriefing({ fenBefore: fen, san, moverIsStudent: isStudent, studentSwingCp: swing, criticalMoment: crit });
      // eslint-disable-next-line no-console
      console.log(`  ${san}: ${out}`);
    }
    expect(true).toBe(true);
  });
});

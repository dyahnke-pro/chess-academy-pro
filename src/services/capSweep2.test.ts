// CAP SWEEP 2 (CLAUDE.md G4.5): computers that picked one candidate fact and
// silently dropped the rest the student could have heard. Each test holds a
// board with TWO (or more) candidates and fails on the old single-winner code.
import { describe, it, expect } from 'vitest';
import { readPosition } from './positionalRead';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { attackerDefenderCount } from './reviewTeachingPoints';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './pvPlayback';
import { readBoard } from './boardComputers';

describe('cap sweep 2 — every candidate is returned', () => {
  it('names every open file toward the king, not the first two', () => {
    const fen = '2r3k1/pp6/8/8/8/8/PP3q2/R2Q2K1 w - - 0 25';
    const king = readPosition(fen, 'white').find((o) => o.key === 'student-king-open-file' || (o.kind === 'king' && /your king/.test(o.text) && /files/.test(o.text)));
    expect(king?.text).toMatch(/The f, g and h files are open toward your king/);
  });

  it('a move that guards two pieces under fire says both', () => {
    const fact = buildReviewMoveTeachingFact('4r1k1/8/8/8/1b6/2N1B3/8/3QK3 w - - 0 1', 'Qd2', true);
    expect(fact?.text).toMatch(/knight on c3/);
    expect(fact?.text).toMatch(/bishop on e3/);
    expect(fact?.squares).toEqual(expect.arrayContaining(['c3', 'b4', 'e3', 'e8']));
  });

  it('every outnumbered piece is counted, not only the biggest', () => {
    const reads = attackerDefenderCount('4k3/8/8/n6b/8/8/8/R3K2R w - - 0 1', 'w');
    expect(reads.map((r) => r.square).sort()).toEqual(['a5', 'h5']);
  });

  it('the count fact speaks every outnumbered piece', () => {
    const out = readBoard('count', { fen: '4k3/8/8/n6b/8/8/8/R3K2R w - - 0 1', student: 'w' });
    expect(out?.text).toMatch(/knight on a5/);
    expect(out?.text).toMatch(/bishop on h5/);
  });

  it('the count says the habit once, not once a piece (the human voice)', () => {
    const out = readBoard('count', { fen: '4k3/8/8/n6b/8/8/8/R3K2R w - - 0 1', student: 'w' });
    expect(out?.text.match(/count the attackers and defenders/gi)).toHaveLength(1);
    expect(out?.text.match(/so it falls/g)).toHaveLength(1);
    expect(out?.text).toMatch(/it falls too/);
  });

  it('the review briefing keeps every ranked aspect of the move (no top three)', () => {
    const out = buildReviewMoveBriefing({
      plainThreatsSeen: false, line: null, theirLast: null, phrases: null, prev: NO_PREV_CAPTURE,
      fenBefore: '4rrk1/5ppp/3b4/pp1B4/PP4P1/2P2Q2/2KB2P1/RN4q1 w - - 0 30', san: 'axb5', moverIsStudent: true, criticalMoment: true,
    }) ?? '';
    for (const aspect of ['winning a pawn', 'passed pawn on b5', 'isolated pawn on the a-file', 'doubled pawns on the b-file']) expect(out).toContain(aspect);
  });
});

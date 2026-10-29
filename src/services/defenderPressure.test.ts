// The lesson voice says what a move goes after, not the empty square it covers
// (P4: the Ruy's Bb5 was "it bears down on c4" where the written note teaches
// the attack on e5's guard). Real boards from the masterclass lessons.
import { describe, it, expect } from 'vitest';
import { defenderPressure } from './defenderPressure';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './pvPlayback';
import { newPhraseMemory } from '../utils/phraseMemory';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { boardTeacherPoint, spokenIdeaCounts } from './learnBoardTeaching';

const RUY = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const RUY_BA4 = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
const FOUR_KNIGHTS = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';

describe('defenderPressure — the move goes after the guard', () => {
  it('the Ruy\'s Bb5 goes after the knight on c6, the guard of e5', () => {
    expect(defenderPressure(RUY, 'Bb5', true)?.clauses[0]).toBe('going after the knight on c6, the guard of their pawn on e5, which your knight on f3 hits');
  });

  it('said from the other seat the other way round', () => {
    expect(defenderPressure(RUY, 'Bb5', false)?.clauses[0]).toBe('going after the knight on c6, the guard of your pawn on e5, which their knight on f3 hits');
  });

  it('the Four Knights\' Bb5 goes after the same guard', () => {
    expect(defenderPressure(FOUR_KNIGHTS, 'Bb5', true)?.squares).toEqual(['c6', 'e5', 'f3']);
  });

  it('nothing when the move does not touch the guard (the Italian\'s Bc4)', () => {
    expect(defenderPressure(RUY, 'Bc4', true)).toBeNull();
  });

  it('nothing on a capture — the trade is its own point', () => {
    expect(defenderPressure(RUY_BA4, 'Bxc6', true)).toBeNull();
  });
});

describe('the lesson briefing says it, in place of the empty square', () => {
  it('Bb5 in the Ruy no longer "covers c4"', () => {
    const text = buildReviewMoveBriefing({ fenBefore: RUY, san: 'Bb5', prev: NO_PREV_CAPTURE, phrases: null, moverIsStudent: true, register: 'teach', line: ['a6', 'Ba4'], theirLast: null }) ?? '';
    expect(text).toMatch(/going after the knight on c6, the guard of their pawn on e5/);
    expect(text).not.toMatch(/c4/);
  });

  it('a lesson says the pressure in full once, then refers back (Bb5, then Ba4)', () => {
    const phrases = newPhraseMemory();
    const first = buildReviewMoveBriefing({ fenBefore: RUY, san: 'Bb5', prev: NO_PREV_CAPTURE, phrases, moverIsStudent: true, register: 'teach', line: ['a6', 'Ba4'], theirLast: null }) ?? '';
    const again = buildReviewMoveBriefing({ fenBefore: RUY_BA4, san: 'Ba4', prev: NO_PREV_CAPTURE, phrases, moverIsStudent: true, register: 'teach', line: ['Nf6', 'O-O'], theirLast: null }) ?? '';
    expect(first).toMatch(/going after the knight on c6, the guard of their pawn on e5, which your knight on f3 hits/);
    expect(again).toMatch(/still going after the knight on c6, the guard of e5/);
  });
});

describe('the board teacher Learn reads says the same idea', () => {
  const AFTER_BB5_A6 = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
  const AFTER_BA4_NF6 = 'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 5';

  it('Bb5 goes after the guard, not "bears down on c4"', () => {
    expect(buildReviewMoveTeaching(RUY, 'Bb5', true)).toBe('The bishop goes after the knight on c6, the guard of their pawn on e5, which your knight on f3 hits.');
  });

  it('their Bb5 is said from their seat', () => {
    expect(buildReviewMoveTeaching(RUY, 'Bb5', false)).toBe('The bishop goes after the knight on c6, the guard of your pawn on e5, which their knight on f3 hits.');
  });

  it('Learn says it in full on Bb5, then refers back on Ba4', () => {
    const first = boardTeacherPoint(RUY, 'Bb5', AFTER_BB5_A6, new Map());
    expect(first?.text).toBe('The bishop goes after the knight on c6, the guard of their pawn on e5, which your knight on f3 hits.');
    expect(first?.squares).toEqual(['c6', 'e5', 'f3']);
    const said = spokenIdeaCounts(new Set(first?.claims ?? []));
    expect(said.get('pressure-c6-e5')).toBe(1);
    const again = boardTeacherPoint(RUY_BA4, 'Ba4', AFTER_BA4_NF6, said);
    expect(again?.text).toBe('The bishop keeps going after the knight on c6, the guard of e5.');
  });
});

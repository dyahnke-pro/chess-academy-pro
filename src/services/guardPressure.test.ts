// The lesson voice says what a move goes after, not the empty square it covers
// (P4: the Ruy's Bb5 was "it bears down on c4" where the written note teaches
// the attack on e5's guard). The idea is decided by the fundamentals'
// `attack-defender` — the computer Review leads with — and the board teacher
// says it from the speaker's seat, so Learn, Review and the lessons agree.
// Real boards from the masterclass lessons.
import { describe, it, expect } from 'vitest';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './pvPlayback';
import { boardTeacherPoint, spokenIdeaCounts } from './learnBoardTeaching';

const RUY = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const AFTER_BB5_A6 = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
const RUY_BA4 = 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4';
const FOUR_KNIGHTS = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';

describe('the board teacher says the pressure on the only guard', () => {
  it('the Ruy\'s Bb5 goes after the knight on c6, the only guard of e5', () => {
    expect(buildReviewMoveTeaching(RUY, 'Bb5', true)).toBe('The bishop goes after their knight on c6, the only guard of their pawn on e5.');
  });

  it('said from the other seat the other way round — their Bb5 against your knight', () => {
    expect(buildReviewMoveTeaching(RUY, 'Bb5', false)).toBe('The bishop goes after your knight on c6, the only guard of your pawn on e5.');
  });

  it('the Four Knights\' Bb5 goes after the same guard', () => {
    expect(buildReviewMoveTeaching(FOUR_KNIGHTS, 'Bb5', true)).toBe('The bishop goes after their knight on c6, the only guard of their pawn on e5.');
  });

  it('nothing when the move does not touch the guard (the Italian\'s Bc4)', () => {
    expect(buildReviewMoveTeaching(RUY, 'Bc4', true) ?? '').not.toMatch(/goes after|only guard/);
  });

  it('nothing on a capture — the trade is its own point', () => {
    expect(buildReviewMoveTeaching(RUY_BA4, 'Bxc6', true) ?? '').not.toMatch(/goes after|only guard/);
  });
});

describe('every surface hears the same idea', () => {
  it('the lesson briefing: Bb5 in the Ruy no longer "covers c4"', () => {
    const text = buildReviewMoveBriefing({ fenBefore: RUY, san: 'Bb5', prev: NO_PREV_CAPTURE, phrases: null, moverIsStudent: true, register: 'teach', line: ['a6', 'Ba4'], theirLast: null }) ?? '';
    expect(text).toMatch(/goes after their knight on c6, the only guard of their pawn on e5/);
    expect(text).not.toMatch(/c4/);
  });

  it('Learn says it in full once, then refers back', () => {
    const first = boardTeacherPoint(RUY, 'Bb5', AFTER_BB5_A6, new Map());
    expect(first?.text).toBe('The bishop goes after their knight on c6, the only guard of their pawn on e5.');
    expect(first?.squares).toEqual(['c6', 'e5']);
    const said = spokenIdeaCounts(new Set(first?.claims ?? []));
    expect(said.get('pressure-c6-e5')).toBe(1);
    expect(boardTeacherPoint(RUY, 'Bb5', AFTER_BB5_A6, said)?.text).toBe('The bishop keeps going after their knight on c6, the guard of e5.');
  });
});

// THE THREE FACTS IN LEARN (WO-THINK-01, David 2026-10-29: "We deepened the
// depth calculator … I feel it hasn't been wired in yet"). Review and every
// lesson said them through the one briefing; Learn's live game never read
// them. The same computers (`threeFacts`), on real boards, with the Learn
// rules: their move's set-up said with their move; your move's answer to
// their last one said as your move's reason; your own set-up held until you
// play it, and said then only while it is still true on the board.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { theirDeepFactTeaching, bindingTeaching, studentDeepFactPromise, notePromise, payoffFor } from './learnBoardTeaching';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { createStoryStore, type StoryStore } from './gameStory';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const memory = (): StoryStore => createStoryStore('three-facts');

describe('their move: what it sets up, said with their move', () => {
  it('…g6 makes room for their bishop on g7 a move later, where it hits your rook on a1', () => {
    // 1.e4 c5 2.a3 g6, and the engine's line from there: 3.b4 Nc6 4.d3 Bg7.
    const h = theirDeepFactTeaching(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Nc6', 'd3', 'Bg7'], 'w');
    expect(h?.text).toBe('They play g6, making room for their bishop on g7 a move later, where it hits your rook on a1.');
    expect(h?.lane).toBe('theirIntent');
    expect(h?.namesStudentMove).toEqual(NAMES_NO_MOVE);
    expect(h?.claims).toContain('their-prepares:f8g7');
  });

  it('a set-up that waits on a move of yours names it, so the door holds it while it is yours to play', () => {
    const h = theirDeepFactTeaching(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Bg7'], 'w');
    expect(h?.text).toMatch(/once your b4 opens the diagonal\.$/);
    expect(h?.namesStudentMove).not.toEqual(NAMES_NO_MOVE);
  });

  it('nothing without the engine\'s line', () => {
    expect(theirDeepFactTeaching(fenAfter(['e4', 'c5', 'a3']), 'g6', null, 'w')).toBeNull();
  });
});

describe('your move: what their last move aimed at, and how yours answers it', () => {
  it('…Bg7 against b4: it hits back on the side they are attacking', () => {
    const history = ['e4', 'c5', 'a3', 'g6', 'b4', 'Bg7'];
    const h = bindingTeaching({ fenBefore: fenAfter(history.slice(0, 5)), san: 'Bg7', history });
    expect(h?.text).toMatch(/^Their b4 is aimed at your pawn on c5, so your .*g7 hits back on the side they're attacking\.$/);
    expect(h?.ownMoveReason).toBe(true);
    expect(h?.lane).toBe('movePoint');
  });

  it('…b6 covers the pawn their b4 is aimed at', () => {
    const history = ['e4', 'c5', 'a3', 'g6', 'b4', 'b6'];
    const h = bindingTeaching({ fenBefore: fenAfter(history.slice(0, 5)), san: 'b6', history });
    expect(h?.text).toMatch(/^Their b4 is aimed at your pawn on c5, and your .*b6 covers it\.$/);
  });

  it('nothing when the move answers neither way', () => {
    const history = ['e4', 'c5', 'a3', 'g6', 'b4', 'h6'];
    expect(bindingTeaching({ fenBefore: fenAfter(history.slice(0, 5)), san: 'h6', history })).toBeNull();
  });
});

describe('your set-up: held until you play it, said then only while it is true', () => {
  // 1.e4 c5 2.a3 g6 3.b4 — the student (Black) played …g6, the coach b4, and
  // the engine's line from there starts …Bg7.
  const before = fenAfter(['e4', 'c5', 'a3']);
  const afterReply = fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']);

  it('playing the set-up move closes the loop on the board it lands on', () => {
    const p = studentDeepFactPromise(before, 'g6', 'b4', ['Bg7']);
    expect(p?.say).toMatch(/^Your bishop on g7 hits their rook on a1 now — .*g6 made that possible\.$/);
    const mem = memory();
    notePromise(mem, p!, 4);
    const mv = new Chess(afterReply).move('Bg7');
    expect(payoffFor(mem, { piece: mv.piece, to: mv.to, san: mv.san, after: mv.after }, 6)?.say).toBe(p!.say);
  });

  it('a hit that no longer stands is not said (they closed the diagonal first)', () => {
    const p = studentDeepFactPromise(before, 'g6', 'b4', ['Bg7']);
    const mem = memory();
    notePromise(mem, p!, 4);
    // 3…Nc6 4.c3 Bg7: c3 shuts the long diagonal before the bishop arrives.
    const board = new Chess(afterReply);
    board.move('Nc6'); board.move('c3');
    const mv = board.move('Bg7');
    expect(payoffFor(mem, { piece: mv.piece, to: mv.to, san: mv.san, after: mv.after }, 8)).toBeNull();
  });

  it('nothing without the reply or the engine\'s line', () => {
    expect(studentDeepFactPromise(before, 'g6', null, ['Bg7'])).toBeNull();
    expect(studentDeepFactPromise(before, 'g6', 'b4', null)).toBeNull();
  });
});

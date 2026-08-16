/**
 * NEGATIVE CONTROLS FOR THE COACH-TAB AUDIT.
 *
 * David, 2026-08-16: "If the harness was wrong then that means the test didn't
 * complete and you don't have working data from the audit right. I hope you're
 * not counting that as a pass."
 *
 * He is right, and the correction is not "I fixed the harness" — six harness
 * bugs in one session all produced the same shape of wrong answer, and fixing
 * the sixth says nothing about a seventh. What separates a meaningful green
 * from a decorative one is whether the check has been SHOWN to go red on input
 * it must reject.
 *
 * Three of the audit's checks earned that the honest way: they failed, product
 * code changed, they passed (Learn nav, Play nav under the blunder card, eval
 * agreement). The rest — the parity graders, the tactic-narration matcher, the
 * Play-silence classifier — had only ever been green, or had only ever failed
 * for harness reasons. Worse, the Play-silence "check" called pass()
 * unconditionally: a print statement wearing a checkmark.
 *
 * So every grader is exercised here against input it MUST reject. These tests
 * are about the AUDIT, not the app: they fail when the audit would wave
 * something through.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no type declarations by design.
import { isGrounded, TACTIC_WORDS, SANCTIONED, evalSpread, evalMagnitudeOf, freshTexts, tally } from '../../scripts/audit-lib/coach-tab-graders.mjs';

describe('isGrounded — must reject non-answers', () => {
  it('rejects every stock refusal the coach can emit', () => {
    for (const t of [
      "I can only speak to what I can verify from the position.",
      "I can't verify that precisely from grounded data right now.",
      "I don't have enough to go on there.",
      "Hit a snag — try that again?",
      'Connection error',
    ]) expect(isGrounded({ ok: true, text: t }), t).toBe(false);
  });

  it('rejects a reply that never arrived', () => {
    expect(isGrounded({ ok: false, text: '' })).toBe(false);
    expect(isGrounded(undefined)).toBe(false);
  });

  it('rejects a bare move announcement, which is not an answer to a question', () => {
    // Play injects these into the same transcript. If the grader took one for
    // an answer, parity would pass on a surface that said nothing.
    expect(isGrounded({ ok: true, text: 'Pawn to e4.' })).toBe(false);
    expect(isGrounded({ ok: true, text: 'C' })).toBe(false);
  });

  it('accepts a SHORT but real answer — the floor that graded these as thin was wrong', () => {
    expect(isGrounded({ ok: true, text: 'Queen on d8 pins pawn on d2 against queen on d1.' })).toBe(true);
    expect(isGrounded({ ok: true, text: 'The best move is d4. Black is winning (about 4.9 points).' })).toBe(true);
  });
});

describe('evalSpread — must catch a contradiction and must not invent agreement', () => {
  it('catches the 2.4-pawn contradiction that was actually shipped', () => {
    const spread = evalSpread([
      'The best move is Nc3. Black is winning (about 2.9 points).',
      'The engine plays Nc3. Black is winning (about 2.9 points).',
      'Your plan: e4, then d4, then Nc3. White is slightly better (about 0.5 points).',
    ]);
    expect(spread).toBeCloseTo(2.4, 5);
    expect(spread).toBeGreaterThan(1.5);   // the threshold the audit fails on
  });

  it('reports NO COMPARISON rather than agreement when fewer than two answers cite a number', () => {
    // The dangerous failure mode: a run where the coach stopped quoting evals
    // would otherwise look like perfect consistency. null forces "not
    // exercised", which is not a pass.
    expect(evalSpread(['The best move is Nc3.'])).toBeNull();
    expect(evalSpread([])).toBeNull();
    expect(evalSpread(['no numbers here', 'nor here'])).toBeNull();
  });

  it('tolerates an engine settling, so it does not cry wolf', () => {
    expect(evalSpread(['about 0.3 points', 'about 0.5 points'])).toBeLessThan(1.5);
  });

  it('reads the magnitude, not the sign — the wording carries the side', () => {
    expect(evalMagnitudeOf('Black is winning (about 2.9 points).')).toBeCloseTo(2.9, 5);
    expect(evalMagnitudeOf('White is slightly better (about 0.5 points).')).toBeCloseTo(0.5, 5);
    expect(evalMagnitudeOf('no number at all')).toBeNull();
  });
});

describe('TACTIC_WORDS — must not call ordinary prose a tactic', () => {
  it('rejects narration that names no tactical content', () => {
    for (const t of [
      'Welcome back to the board. What would you like to sharpen today?',
      'This game is now the Caro-Kann Defense.',
      'Pawn to e4.',
      'Develops the knight and eyes the centre.',
    ]) expect(TACTIC_WORDS.test(t), t).toBe(false);
  });

  it('accepts real tactical language', () => {
    for (const t of [
      'The knight forks the king and rook.',
      'Queen on d8 pins pawn on d2.',
      'That leaves the bishop hanging on b5.',
      'It wins a pawn on f7.',
    ]) expect(TACTIC_WORDS.test(t), t).toBe(true);
  });
});

describe('SANCTIONED — Play may dictate moves, not volunteer teaching', () => {
  it('accepts the lines Play is allowed to speak unprompted', () => {
    for (const t of ['Pawn to e4.', 'Knight takes f7.', 'Castles.', 'This game is now the Caro-Kann Defense.', 'Moving into the middlegame.'])
      expect(SANCTIONED.test(t), t).toBe(true);
  });

  it('REJECTS volunteered teaching — the contract Play would be breaking', () => {
    // If this ever returns true, the silence check waves through exactly the
    // behaviour it exists to catch.
    for (const t of [
      "Here's the plan: trade off the light-squared bishop, then push d5 and take the outpost.",
      'Notice how the knight has no good squares once you play a6.',
      'You should be thinking about king safety here.',
    ]) expect(SANCTIONED.test(t), t).toBe(false);
  });
});

describe('freshTexts — a repeat is a new reply, an unchanged screen is not', () => {
  const T = (...xs: string[]) => tally(xs.map((text) => ({ role: 'assistant', text })));

  it('sees a repeated announcement as a genuinely new bubble', () => {
    // The bug this replaced: set-membership discarded the answer to "what
    // opening is this?" because Play had already announced the same sentence,
    // and reported the surface silent when it had answered.
    const before = T('This game is now the Caro-Kann Defense.');
    const after = T('This game is now the Caro-Kann Defense.', 'This game is now the Caro-Kann Defense.');
    expect(freshTexts(before, after)).toEqual(['This game is now the Caro-Kann Defense.']);
  });

  it('finds NOTHING when the transcript did not change — no phantom answers', () => {
    const same = T('a reply that was already there');
    expect(freshTexts(same, same)).toEqual([]);
  });

  it('ignores the student\'s own message, so a question is never read back as its answer', () => {
    const before = tally([{ role: 'assistant', text: 'earlier' }]);
    const after = tally([
      { role: 'assistant', text: 'earlier' },
      { role: 'user', text: "what's my best move?" },
    ]);
    expect(freshTexts(before, after)).toEqual([]);
  });
});

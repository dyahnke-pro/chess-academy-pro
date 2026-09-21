/**
 * "FLIP THE BOARD" NEVER CHANGES WHICH SIDE THE STUDENT PLAYS (2026-09-21).
 *
 * 🔴 THE BUG THIS BLAMES, which shipped to prod and ran there for an hour.
 * The `setOrientation` hand called `setPlayerColor` on BOTH Play and Learn.
 * `playerColor` is not a view flag — on `CoachGamePage` it decides whose move
 * it is, how the GAME RESULT is attributed, and which name goes on which side
 * of the saved PGN; on `CoachTeachPage` it decides which seat the lesson is
 * taught from, and the seat is part of what identifies a teaching claim.
 *
 * So "flip the board" mid-game swapped the student to the other colour, handed
 * them the opponent's position, and mis-recorded who won.
 *
 * Two asks were conflated. "Flip the board" is about the VIEW. "I want to play
 * black" is about the SIDE and means a new game. This holds them apart by
 * scanning the handler, because the failure is silent: everything still
 * renders, and the wrong result is only visible later in the saved game.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SURFACES = [
  'components/Coach/CoachGamePage.tsx',
  'components/Coach/CoachTeachPage.tsx',
];

/** The `setOrientation:` handler body, comments stripped so prose ABOUT the
 *  bug never counts as the bug (a trap that produced a false reading of the
 *  hands question earlier the same night). */
function setOrientationBody(src: string): string | null {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // 🚨 THE DECLARATION, NEVER A CALL. Two earlier cuts of this were wrong and
  // the second was WORSE than the first because it passed:
  //   • `setOrientation[:(]` missed Play, whose handler is the named
  //     `handleChatSetOrientation`, and the gate said "did it move?";
  //   • adding `setOrientation\s*(` then matched `gameRef.current
  //     .setOrientation(o)` — a CALL 300 lines above Learn's real handler — so
  //     the slice never reached the handler and the gate went green against the
  //     actual bug. Proven by mutation: re-introducing `setPlayerColor` did not
  //     fail it.
  // `(?<!\.)` is what makes it the declaration: a method call is dot-prefixed.
  const i = code.search(/(?:handleChatSetOrientation\s*=|(?<!\.)\bsetOrientation\s*:)/);
  if (i < 0) return null;
  return code.slice(i, i + 700);
}

describe('flip the board is a view, not a side swap', () => {
  it.each(SURFACES)('%s does not setPlayerColor when flipping', (rel) => {
    const src = readFileSync(resolve(__dirname, '..', rel), 'utf8');
    const body = setOrientationBody(src);
    expect(body, `${rel} has no setOrientation handler — did it move?`).toBeTruthy();
    expect(
      /setPlayerColor\s*\(/.test(body!),
      `${rel}: the orientation hand writes playerColor. That is not a view flag — `
      + 'it decides whose turn it is, how the game result is attributed, and which '
      + 'seat the lesson is taught from. Flip a VIEW flag instead (boardFlipped).',
    ).toBe(false);
  });

  it.each(SURFACES)('%s renders the board from a VIEW orientation', (rel) => {
    const src = readFileSync(resolve(__dirname, '..', rel), 'utf8');
    // If the board still reads `playerColor` directly, a flip cannot show.
    expect(src).toContain('boardOrientation');
    expect(
      /orientation=\{playerColor\}/.test(src),
      `${rel}: a board still takes its orientation straight from playerColor, so `
      + 'either the flip does nothing or it had to change the side to work.',
    ).toBe(false);
  });

  it('CAN FIRE — the negative control is the code that really shipped', () => {
    const shipped = `handleChatSetOrientation = useCallback((o) => { setPlayerColor(o); return { ok: true }; }, []);`;
    expect(/setPlayerColor\s*\(/.test(setOrientationBody(shipped)!)).toBe(true);
  });
});

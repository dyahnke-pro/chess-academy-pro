/**
 * ONE PLAY-LINE BUTTON (David 2026-11-17: "I just want one button for
 * unification. Make sure it looks the same, is directly under the board …
 * and make sure they all do the same thing").
 *
 * Every line the app plays on a board goes through ONE walker
 * (`useLineWalk`): a source puts its line in the walker's "line just stated"
 * slot (`state`), and ONE button under the board (`PlayLineButton`, which the
 * board bar renders for its line slot) plays it (`playStated`). This gate
 * fails on:
 *   - a screen that uses the walker but renders no button under its board;
 *   - any of the retired players or per-message buttons coming back (the
 *     violet Explore chips, the chat "Walk …" pills, `WalkLineButton`,
 *     Review's private line players, Play's interval preview).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
  });
}
const SRC = files('src/components').concat(files('src/hooks'));
const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('one Play-line button', () => {
  it('every screen with the line walker renders the one button under its board', () => {
    const missing = SRC.filter((p) => !p.endsWith('useLineWalk.ts') && /\buseLineWalk\(/.test(code(p)))
      .filter((p) => !/<CoachBoardBar\b|<PlayLineButton\b/.test(code(p)));
    expect(missing).toEqual([]);
  });

  it('no retired line player or per-message line button comes back', () => {
    const banned: Array<[RegExp, string]> = [
      [/\bWalkLineButton\b/, 'WalkLineButton (use PlayLineButton under the board)'],
      [/\bonWalkLine\b/, 'onWalkLine (put the line in the walker\'s slot: lineWalk.state)'],
      [/\bwalkSpokenLine\b/, 'a private Review line player'],
      [/\bplayExploreLine\b/, 'the Explore chips\' private player'],
      [/message-walk-line/, 'the chat "Walk …" pills'],
      [/tacticAutoPlayRef/, 'Play\'s interval tactic preview'],
    ];
    const hits = SRC.flatMap((p) => banned.filter(([re]) => re.test(code(p))).map(([, why]) => `${p}: ${why}`));
    expect(hits).toEqual([]);
    expect(existsSync('src/components/Board/WalkLineButton.tsx')).toBe(false);
  });

  it('the board bar\'s line slot is the one button', () => {
    expect(code('src/components/Board/CoachBoardBar.tsx')).toMatch(/<PlayLineButton\b/);
  });
});

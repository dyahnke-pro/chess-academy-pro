// NOTHING BUILT-BUT-UNWIRED (G8.5) — the Learn focus (WO-LEARN-FOCUS-01).
// The focus runner only works if the page lends it EVERY hand: the game's
// start, the user's move (before the coach replies), the coach's reply (the
// next board), the engine read, the coach's move choice, the game's end, the
// banner, the record of steered plies, and the voice owner. A runner wired at
// three of those places is green in its own tests and silent in the app.
// Scanned with comments stripped, so a comment naming a call is not a call.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const PAGE = strip(readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8'));

describe('the Learn focus is wired at every place it needs a hand', () => {
  it.each([
    ['the game starts with a picked focus', /focusRef\.current\.start\(pick\)/],
    ['a plain classic entry starts one', /if \(focusKick\) void startFocusGame\(\)/],
    ['a fresh board starts the next one', /void startFocusGame\(\);\s*return \{ ok: true \}/],
    ["the user's move is checked before the coach replies", /focusRef\.current\.moved\(/],
    ["the coach's reply hands over the next board", /focusRef\.current\.board\(/],
    ['a late engine read reaches it', /focusRef\.current\.read\(/],
    ["the coach's move choice carries the focus dials and the open motif levels", /focus: \{ id: focusId, punish, levels: focusRef\.current\.levels\(\) \}/],
    ['a steered reply is remembered', /if \(adaptive\.focusSteered\) focusSteerPendingRef\.current = true/],
    ['the game over ends it', /focusRef\.current\.gameOver\(\)/],
    ['the steered plies are saved on the game', /steeredPlies: \[\.\.\.steeredPliesRef\.current\]/],
    ['the banner is drawn', /<FocusBanner /],
    ['the end line reaches the game-over card', /focusLine=\{focusEnd\}/],
    ['the voice owner is registered', /registerLearnVoiceOwner\(/],
    ['whatever ends an owned game stops the focus', /focusRef\.current\.stop\(\)/],
    ['the focus pays its own finds (coins + burst + streak)', /reward: \(r, square, ply\) => \{[\s\S]*?fireLearnReward\(\{ kind: r[\s\S]*?jackpot\.award\(r, next\.streak\)/],
    // …and in a Campaign move that already paid the mission's find (2026-10-21).
    ["the grade's reward stands down in a focus game", /const earned = gemRewarded \|\| focusPays \|\| missionPaidRef\.current \? null : learnRewardFor/],
    ["the grade's streak stands down in a focus game", /const next = focusPays \? learnTallyRef\.current : tallyMove/],
    ["the gem's reward stands down in a focus game", /if \(res\.found && !focusPays\) \{/],
  ])('%s', (_, pattern) => {
    expect(PAGE).toMatch(pattern);
  });

  it('an ended lesson\'s card survives a re-run of the game-over effect (it clears only when the board moves on)', () => {
    expect(PAGE).toMatch(/endedAtFenRef\.current = game\.fen;\s*focusRef\.current\.gameOver\(\)/);
    expect(PAGE).toMatch(/if \(!game\.isGameOver\) \{\s*if \(endedAtFenRef\.current && samePosition\(endedAtFenRef\.current, game\.fen\)\) return;/);
  });

  it('the steered plies are saved by BOTH save paths (game over and End)', () => {
    expect(PAGE.match(/steeredPlies: \[\.\.\.steeredPliesRef\.current\]/g)?.length).toBe(2);
  });
});

// NOTHING BUILT-BUT-UNWIRED (G8.5) — the Learn focus (WO-LEARN-FOCUS-01 →
// WO-FOCUS-TACTICS-01).
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
  it('the next board\'s ply is never read off the render-lagged gameRef', () => {
    const call = /focusRef\.current\.board\(\{[^}]*\}\)/.exec(PAGE)?.[0] ?? '';
    expect(call).not.toBe('');
    expect(call).not.toMatch(/gameRef/);
  });
  it.each([
    ['the game starts set up from the record', /const setup = await focusRef\.current\.setUp\(\)[\s\S]*?focusRef\.current\.start\(setup\)/],
    ['a plain classic entry starts one', /if \(focusKick\) void startFocusGame\(\)/],
    ['a fresh board starts the next one', /void startFocusGame\(\);\s*return \{ ok: true \}/],
    ["the user's move is checked before the coach replies", /focusRef\.current\.moved\(/],
    ["the coach's reply hands over the next board", /focusRef\.current\.board\(/],
    ['a late engine read reaches it', /focusRef\.current\.read\(/],
    ["the coach's move choice carries the focus dials, the open motif levels, the rung and the plant ask", /focus: \{ id: focusId, punish, levels: focusRef\.current\.levels\(\), rung: focusRung, plant \}/],
    ['the plant is asked at the board ply the runner counts, from the board the coach moves on', /focusRef\.current\.plantAsk\(plyOfFen\(fen\) \+ 2, fen\)/],
    ['a steered reply is remembered', /if \(adaptive\.focusSteered\) focusSteerPendingRef\.current = true/],
    ['a planted reply is remembered, with its seat', /if \(adaptive\.focusPlanted\) focusPlantPendingRef\.current = adaptive\.focusPlanted/],
    ['the next board says it was planted', /steered, planted \}\)/],
    // The record reads `promptedPlies` / `steeredPlies` 1-based (a move's
    // before-board index + 1, autoAnalyzeGame). `gameRef` lags a render behind
    // the reply, so reading it here filed every focus ply one short and no
    // prompted or steered ply ever matched the user's move.
    ['the next board carries the 1-based ply the record counts', /focusRef\.current\.board\(\{[^}]*ply: move\.history\.length \+ 2,/],
    ['the game over ends it', /focusRef\.current\.gameOver\(\)/],
    ['the steered plies are saved on the game', /steeredPlies: \[\.\.\.steeredPliesRef\.current\]/],
    ['the banner is drawn, with Show me', /<FocusBanner [^>]*onShowMe=\{focus\.showMe\}/],
    ['the recap reaches the game-over card: the line, the rung, the missed chances and Play it out', /focus=\{focusEnd \? \{ line: focusEnd\.text, progress: focusEnd\.progress, missed: focusEnd\.missed, playedOut, onPlayOut: playOutMissed \} : null\}/],
    ['Play it out is a told drill (its answers count neither way)', /aid: FOCUS_REPLAY_AID, label: 'Play it out', told: true/],
    ['a told drill records its answers prompted, both ways', /prompted: cur\.hintUsed \|\| !!cur\.drill\.told,[\s\S]*?prompted: cur\.hintUsed \|\| !!cur\.drill\.told,/],
    ['a finished replay comes back to the card and pays the retry reward', /solved\.drill\.aid === FOCUS_REPLAY_AID[\s\S]*?focusReplayDoneRef\.current\(!opts\?\.skipped\)/],
    ['a castling probe holds the move and reads the castled what-if', /verdict\.verdict === 'probe' && verdict\.probe[\s\S]*?stockfishEngine\.analyzeWithBudget\(probe\.whatIf, COACH_TURN_DEPTH, 900, \{ signal: turnSignal \}\)[\s\S]*?focusRef\.current\.castleRead\(before, /],
    ['"Go back and castle" takes back to the board castling was ready on', /rewind: \(ply\) => \{[\s\S]*?focusTakeBackRef\.current\(count\)/],
    ['the takeback is lent to the rewind', /focusTakeBackRef\.current = handleTakeBack;/],
    ['the voice owner is registered', /registerLearnVoiceOwner\(/],
    ['whatever ends an owned game stops the focus', /focusRef\.current\.stop\(\)/],
    ['the focus pays its own finds (coins + burst + streak), and a rung-up its label', /reward: \(r, square, ply, label\) => \{[\s\S]*?fireLearnReward\(\{ kind: r[\s\S]*?label[\s\S]*?jackpot\.award\(r, next\.streak\)/],
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

  it('the steered plies are saved by EVERY save path (game over, End, a fortress pass) — one builder', () => {
    // The page builds a Learn game's record in ONE place, and every save path
    // goes through it: a path can no longer drop a field the others carry.
    expect(PAGE.match(/steeredPlies: \[\.\.\.steeredPliesRef\.current\]/g)?.length).toBe(1);
    expect(PAGE.match(/buildLearnGameRecord\(\{/g)?.length).toBe(1);
    expect(PAGE.match(/learnRecordOf\((game|g), /g)?.length).toBe(3);
  });
});

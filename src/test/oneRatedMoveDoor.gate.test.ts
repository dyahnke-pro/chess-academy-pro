// ONE DOOR FOR A RATED OPPONENT'S MOVE (David 2026-10-22: "make more human …
// Check to make sure this is an app wide fix. Even the play in opening tab").
//
// Every opponent that plays at a rating picks its move through `humanReply`
// (the fitted human model, falling back to the engine's Elo cap). A new
// surface that called the engine's capped search directly would bring back
// the engine-flavoured opponent on that one tab, green in every test. So:
//   1. only `humanReply.ts` and `coachGameEngine.ts` may ask the engine for a
//      best move AT A RATING (a fourth argument to `getBestMove`, or a
//      `UCI_Elo` option);
//   2. in `coachGameEngine` the human layer comes before the first capped
//      search;
//   3. every rated opponent surface reaches the door, by name.
// Scanned with comments stripped, so a comment naming a call is not a call.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const strip = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** The argument lists of every `getBestMove(` call in a source. */
function bestMoveCalls(src: string): string[] {
  const out: string[] = [];
  let k = src.indexOf('getBestMove(');
  while (k >= 0) {
    let depth = 0;
    let j = k + 'getBestMove('.length - 1;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth += 1;
      else if (src[j] === ')') { depth -= 1; if (depth === 0) break; }
    }
    out.push(src.slice(k + 'getBestMove('.length, j));
    k = src.indexOf('getBestMove(', j);
  }
  return out;
}
function topLevelArgs(args: string): number {
  let depth = 0; let n = args.trim() ? 1 : 0;
  for (const ch of args) {
    if ('([{'.includes(ch)) depth += 1;
    else if (')]}'.includes(ch)) depth -= 1;
    else if (ch === ',' && depth === 0) n += 1;
  }
  return n;
}

const ALLOWED = new Set(['services/humanReply.ts', 'services/coachGameEngine.ts', 'services/stockfishEngine.ts']);

describe('one door for a rated opponent\'s move', () => {
  it('only the door (and its fallback ladder) asks the engine for a move at a rating', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (ALLOWED.has(rel)) continue;
      const src = strip(readFileSync(file, 'utf8'));
      for (const args of bestMoveCalls(src)) {
        if (topLevelArgs(args) >= 4) offenders.push(`${rel}: getBestMove(${args.replace(/\s+/g, ' ').slice(0, 80)})`);
      }
      if (/UCI_Elo\s*:/.test(src)) offenders.push(`${rel}: sets UCI_Elo`);
    }
    expect(offenders, 'a rated opponent move must go through humanReply.ratedMove / humanReply').toEqual([]);
  });

  it('getAdaptiveMove tries the human move before its capped search', () => {
    const src = strip(readFileSync(join(ROOT, 'services/coachGameEngine.ts'), 'utf8'));
    const human = src.indexOf('await humanReply(fen, targetElo)');
    const capped = src.indexOf('stockfishEngine.getBestMove(fen, movetime, skillLevel, targetElo)');
    expect(human).toBeGreaterThan(0);
    expect(capped).toBeGreaterThan(human);
  });

  it.each([
    ['Learn and the Campaign (getAdaptiveMove)', 'components/Coach/CoachTeachPage.tsx', /getAdaptiveMove\(/],
    ['the Openings Play tab (getAdaptiveMove)', 'components/Openings/OpeningPlayMode.tsx', /getAdaptiveMove\(/],
    ['Play\'s fast path (ratedPlayMove → ratedMove)', 'components/Coach/CoachGamePage.tsx', /await ratedPlayMove\(game\.fen, config\)/],
    ['mistake-puzzle play-on (getCoachMove → ratedMove)', 'components/Puzzles/MistakePuzzleBoard.tsx', /getCoachMove\(/],
    ['endgame play-outs (getCoachMove → ratedMove)', 'hooks/useEndgamePlayout.ts', /getCoachMove\(/],
    ['the play-out door itself', 'services/coachPlaySession.ts', /ratedMove\(fen, config\)\.catch/],
  ])('%s reaches the door', (_, file, pattern) => {
    expect(strip(readFileSync(join(ROOT, file), 'utf8'))).toMatch(pattern);
  });

  it.each([
    ['Learn and the Campaign', 'components/Coach/CoachTeachPage.tsx'],
    ['Play', 'components/Coach/CoachGamePage.tsx'],
    ['the Openings Play tab', 'components/Openings/OpeningPlayMode.tsx'],
    ['mistake-puzzle play-on', 'components/Puzzles/MistakePuzzleBoard.tsx'],
    ['endgame play-outs', 'hooks/useEndgamePlayout.ts'],
  ])('%s reads its opponent\'s strength once per game (gameOpponentStrength)', (_, file) => {
    const src = strip(readFileSync(join(ROOT, file), 'utf8'));
    expect(src).toMatch(/await gameOpponentStrength\(/);
    // A game surface may not build its own number: no raw `opponentStrength(`
    // and no direct `gameStrength(` read beside the door.
    expect(src).not.toMatch(/\bopponentStrength\(/);
    expect(src).not.toMatch(/\bgameStrength\(/);
  });
});

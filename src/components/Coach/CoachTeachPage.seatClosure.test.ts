import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 🔒 THE SEAT IS NEVER READ FROM A STALE CLOSURE (prod Learn audit 2026-09-24).
// `computeInstantTeaching` listed only the ratings as deps, so the `playerColor`
// it read was the first render's 'white'. A Black student then heard the White
// lesson — "Black snatches your e-pawn" — while `curatedBeatAt`'s seat guard
// worked exactly as built: it was handed the wrong seat. Any useCallback here
// that reads `playerColor` must list it (or take the seat as an argument).
describe('CoachTeachPage callbacks never close over a stale seat', () => {
  it('every useCallback reading playerColor lists it in its deps', () => {
    const lines = readFileSync(resolve(__dirname, 'CoachTeachPage.tsx'), 'utf8').split('\n');
    const stale: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i].match(/^(\s*)const (\w+) = useCallback\(/);
      if (!m) continue;
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith(`${m[1]}}, [`)) j += 1;
      const body = lines.slice(i, j).join('\n').replace(/\/\/.*$/gm, '');
      // `drill.playerColor` / `args.playerColor` are fields, not the state.
      const readsState = /(?<![.\w])playerColor\b/.test(body);
      if (readsState && !/\bplayerColor\b/.test(lines[j] ?? '')) stale.push(`${m[2]} (line ${i + 1})`);
    }
    expect(stale).toEqual([]);
  });
});

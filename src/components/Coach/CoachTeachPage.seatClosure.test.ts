import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 🔒 THE SEAT IS NEVER READ FROM A STALE CLOSURE (prod Learn audit 2026-09-24).
// `computeInstantTeaching` listed only the ratings as deps, so the `playerColor`
// it read was the first render's 'white'. A Black student then heard the White
// lesson — "Black snatches your e-pawn" — while `curatedBeatAt`'s seat guard
// worked exactly as built: it was handed the wrong seat. Any useCallback here
// that reads `playerColor` must list it (or take the seat as an argument).

/** Every useCallback that reads the `playerColor` state without listing it. A
 *  callback ends at its own indent's `}, [` or `}), [` (a callback returning an
 *  expression); `drill.playerColor` and a `playerColor:` key are not the state. */
function staleSeatCallbacks(src: string): string[] {
  const lines = src.split('\n');
  const stale: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(\s*)const (\w+) = useCallback\(/);
    if (!m) continue;
    const end = new RegExp(`^${m[1]}\\}\\)?, \\[`);
    let j = i + 1;
    while (j < lines.length && !end.test(lines[j])) j += 1;
    const body = lines.slice(i, j).join('\n').replace(/\/\/.*$/gm, '');
    const readsState = /(?<![.\w])playerColor\b(?!:)/.test(body);
    if (readsState && !/\bplayerColor\b/.test(lines[j] ?? '')) stale.push(`${m[2]} (line ${i + 1})`);
  }
  return stale;
}

describe('CoachTeachPage callbacks never close over a stale seat', () => {
  it('every useCallback reading playerColor lists it in its deps', () => {
    expect(staleSeatCallbacks(readFileSync(resolve(__dirname, 'CoachTeachPage.tsx'), 'utf8'))).toEqual([]);
  });
  it('the scanner catches a stale seat, in either ending, and passes a key or a field', () => {
    const src = [
      '  const a = useCallback(() => {',
      "    say(playerColor === 'white' ? 'x' : 'y');",
      '  }, [rating]);',
      '  const b = useCallback((g) => build({',
      '    seat: playerColor,',
      '  }), [rating]);',
      '  const c = useCallback((m) => drill({',
      "    playerColor: m.fen.includes(' b ') ? 'black' : 'white',",
      '    other: args.playerColor,',
      '  }), [m]);',
      '  const d = useCallback(() => {',
      '    use(playerColor);',
      '  }, [playerColor]);',
    ].join('\n');
    expect(staleSeatCallbacks(src)).toEqual(['a (line 1)', 'b (line 4)']);
  });
});

// ONE MATE TRIGGER (U2, 2026-11-21). "Is a forced mate on the board" closes a
// turn to everything but the mate. `boardState` defines it (the engine's mate
// number, or a mate in one off the board); `positionFacts` built the same
// BoardState by hand beside it for a board no move produced. One builder now
// (`boardStateAt`); a second fails here.
//
// OPEN, not unified here (different inputs, a behaviour change to prove first):
// the board read's own trigger (`boardReadFacts`: the engine's mate only) and
// Learn's (a fact staked at a forced mate).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = 'src/services/boardState.ts';
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('one mate trigger', () => {
  it('no file but boardState builds a board state\'s mate flag', () => {
    const offenders = sources('src').filter((f) => f !== HOME)
      .filter((f) => /\bmateOnBoard:\s*(?!boolean)[^,}\n]*(?:isMateEval|mateInOne|\.mate\b)/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

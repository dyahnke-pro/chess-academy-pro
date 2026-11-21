// ONE FLUX RULE (U2, 2026-11-21). "Is an exchange still in progress" decides
// what may be said on every surface: Learn's door holds an idea mid-trade
// (`midExchange`), Review's board veto holds a standing claim on a board in
// flux, and Review's "if they sit still" probe skips a capture they will take
// back. Review kept a private copy (`coachFeatureService.pendingRecapture`,
// any legal retake) while the other two read `boardState.inFluxAfter` (a legal
// retake, by SEE); they agreed today, and the copy is gone before they drift.
// One definition now; a second fails here.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const HOME = new Set(['src/services/boardState.ts', 'src/utils/justCaptured.ts']);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('one flux rule', () => {
  it('no file but boardState (and its history wrapper) defines an exchange-in-progress test', () => {
    const offenders = sources('src').filter((f) => !HOME.has(f))
      .filter((f) => /\bfunction\s+(?:pendingRecapture|inFlux\w*|\w*InFlux\w*|exchangeInProgress)\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

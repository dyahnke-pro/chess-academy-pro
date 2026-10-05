import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gradeMove, cpBand, moverFault } from './accuracyService';
import { classifyMove } from './moveRating';
import { SLIP_CP } from './slipDetector';

// Narration unification step 3: ONE grader. A missed mate in eight with the
// played move still +7 was a blunder in Learn's live grade, silent in the
// callout and "good" in review.
describe('the one grader', () => {
  it('one mate rule', () => {
    expect(gradeMove({ beforeCp: null, afterCp: 700, mateBefore: 8 })).toBeNull();
    expect(gradeMove({ beforeCp: null, afterCp: 700, mateBefore: 2 })).toBe('blunder');
    expect(gradeMove({ beforeCp: 100, afterCp: null, mateAfter: -3 })).toBe('blunder');
    expect(gradeMove({ beforeCp: null, afterCp: null, mateBefore: 5, mateAfter: 7 })).toBeNull();
    expect(gradeMove({ beforeCp: null, afterCp: 50, mateBefore: 8 })).toBe('blunder');
  });

  it('one ladder: win% with evals, 50/100/300 without', () => {
    expect(gradeMove({ beforeCp: 1300, afterCp: 1000 })).toBeNull(); // decided either way
    expect(gradeMove({ beforeCp: 50, afterCp: -250 })).toBe('blunder');
    expect(cpBand(250)).toBe('mistake');
    expect(cpBand(300)).toBe('blunder');
    expect(moverFault(250, null)).toBe('mistake');
    expect(SLIP_CP.blunder).toBe(300);
  });

  it('"was that good?" uses the same rule for a long missed mate', () => {
    expect(classifyMove({ wasBest: false, cpLoss: 9000, missedMate: null, allowedMate: null, mateBefore: 8, isWhiteMove: true, evalAfter: 700 })).not.toBe('blunder');
  });

  // GATE: no service grades from its own centipawn ladder.
  it('no hand-written blunder ladder outside accuracyService', () => {
    const dir = __dirname;
    const bad: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'accuracyService.ts' || f === 'gameAnalysisService.ts') continue;
      const src = readFileSync(join(dir, f), 'utf8');
      if (/>=?\s*\d+\)?\s*return\s*'blunder'/.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});

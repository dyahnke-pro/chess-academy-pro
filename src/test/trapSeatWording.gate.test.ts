// THE SEAT IS REQUIRED: every function in trapWords.ts / trapLine.ts that picks
// the word "trap" takes who plays the slip as a NON-optional parameter, and the
// student's own slip never reads "trap".
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as words from '../services/trapWords';

describe('trapSeatWording', () => {
  const src = readFileSync('src/services/trapWords.ts', 'utf8');
  it('every exported function takes the seat as a required parameter', () => {
    const sigs = [...src.matchAll(/export function (\w+)\(([^)]*)\)/g)];
    expect(sigs.length).toBeGreaterThan(3);
    for (const [, name, params] of sigs) {
      expect(params, name).toMatch(/slipBy: FactSeat/);
      expect(params, name).not.toMatch(/slipBy\?/);
    }
  });
  it('the student\'s own slip is never worded as a trap, whatever its kind', () => {
    for (const kind of ['trap', 'known-mistake'] as const) {
      for (const text of [words.knownLead(kind, 'student'), words.clubLore(kind, 'student'), words.slipChip(kind, 'student')]) {
        expect(text).not.toMatch(/trap/i);
      }
    }
  });
});

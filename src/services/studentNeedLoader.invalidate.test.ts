import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// CLOSE THE RECORD (2026-10-01). The need base cached capabilities + the spine
// for its TTL and nothing cleared it; the tactics writers fired no change
// event. So a solve in Tactics reached the coach minutes late. Both halves of
// the wire are pinned here: every writer emits, both caches listen.
const read = (f: string): string => readFileSync(join(__dirname, f), 'utf8');

describe('student-model writes reach the next read', () => {
  it('both caches subscribe to the one change event', () => {
    expect(read('studentNeedLoader.ts')).toMatch(/onWeaknessModelChanged\(invalidateStudentNeedContext\)/);
    expect(read('weaknessSignalLoader.ts')).toMatch(/onWeaknessModelChanged\(invalidateWeaknessSignals\)/);
  });

  it('every tactics writer fires it', () => {
    const emits = (src: string, fn: string): boolean => {
      const body = src.slice(src.indexOf(fn));
      return /emitWeaknessModelChanged\(\)/.test(body.slice(0, body.indexOf('\n}\n') + 3));
    };
    expect(emits(read('capabilityEvidence.ts'), 'export async function recordCapabilityEvidence')).toBe(true);
    expect(emits(read('mistakePuzzleService.ts'), 'export async function gradeMistakePuzzle')).toBe(true);
    expect(emits(read('misconceptionService.ts'), 'export async function recordTagDrillResult')).toBe(true);
  });
});

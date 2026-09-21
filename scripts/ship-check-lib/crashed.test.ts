import { describe, it, expect } from 'vitest';
import { crashed } from './crashed.mjs';

/**
 * The guard this file protects has been wrong twice, both times in the
 * direction of a FALSE GREEN, so the negative controls matter as much as the
 * positives: a tool that exits non-zero because it found REAL problems must
 * never be reported as a crash, or every genuine red becomes "unknown".
 */
describe('crashed() — did the tool die?', () => {
  describe('deaths it must catch', () => {
    it('catches a process killed from outside, which prints NOTHING', () => {
      // The regression this module exists for. `Killed: 9` is written by the
      // SHELL, about the child — it never reaches the child's own stdout, so
      // a text-only check saw an empty string and scored zero errors.
      expect(crashed('', { status: null, signal: 'SIGKILL' })).toBe(true);
    });

    it('catches a harness timeout (SIGTERM) with partial output', () => {
      expect(crashed('Tests 4 passed', { status: null, signal: 'SIGTERM' })).toBe(true);
    });

    it('catches a spawn that never started (command not found)', () => {
      expect(crashed('', { error: new Error('spawn ENOENT') })).toBe(true);
    });

    it('catches a V8 heap death that DID narrate itself', () => {
      // This one exits 1 with a status and no signal — only the text says so.
      expect(crashed('FATAL ERROR: Reached heap limit Allocation failed', { status: 1, signal: null })).toBe(true);
    });

    it('still works text-only, for callers with no spawn result', () => {
      expect(crashed('Segmentation fault')).toBe(true);
      expect(crashed('0 problems')).toBe(false);
    });
  });

  describe('NEGATIVE CONTROLS — a live tool reporting real problems is not a crash', () => {
    it('does not call a clean run a crash', () => {
      expect(crashed('Tests 12 passed', { status: 0, signal: null })).toBe(false);
    });

    it('does not call real type errors a crash', () => {
      // tsc exits 2 when it finds errors. Treating that as "unknown" would
      // erase every genuine red the ceiling exists to measure.
      expect(crashed('error TS2339: a\nerror TS2339: b', { status: 2, signal: null })).toBe(false);
    });

    it('does not call real test failures a crash', () => {
      expect(crashed('Tests 1 failed | 11 passed\nAssertionError', { status: 1, signal: null })).toBe(false);
    });

    it('does not call real lint errors a crash', () => {
      expect(crashed('✖ 3 problems (3 errors, 0 warnings)', { status: 1, signal: null })).toBe(false);
    });
  });

  it('treats an absent status as a death, not as success', () => {
    // A result object with neither status nor signal means the caller could
    // not establish that the process exited cleanly. Absent ≠ fine.
    expect(crashed('whatever', {})).toBe(true);
  });
});

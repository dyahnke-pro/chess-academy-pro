// ON A MISTAKE TURN THE VERDICT SPEAKS FIRST (OS-18; Smith-Morra replay
// 2026-10-20, move 14: the verdict was heard 10 s after it was built, queued
// behind the instant threat line).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { instantWaitsForVerdict } from './verdictFirst';

// White to move; Black's rook on e8 has mate on e1 if White passes.
const MATE_THREAT = 'k3r3/8/8/8/8/8/5PPP/6K1 w - - 0 1';
const QUIET = 'k7/8/8/8/8/8/5PPP/6K1 w - - 0 1';
const base = { verdictUrgent: true, fenAfterReply: QUIET, student: 'w' as const, mateTurn: false };

describe('the instant line waits for the verdict on a mistake turn', () => {
  it('a priced mistake holds the instant line; a fine move does not', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185 })).toBe(true);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 30 })).toBe(false);
  });
  it('an unpriced move holds only when it may have cost something', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: null })).toBe(true);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: null, verdictUrgent: false })).toBe(false);
  });
  it('a mate goes first: a mate threat on the board, or a forced mate leading the wave', () => {
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185, fenAfterReply: MATE_THREAT })).toBe(false);
    expect(instantWaitsForVerdict({ ...base, moveCostCp: 185, mateTurn: true })).toBe(false);
  });
  it('Learn holds the instant line on the verdict, and releases it when the verdict is handed over', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/if \(instantWaits\) void Promise\.race\(\[verdictHeard, [^\n]*VERDICT_HOLD_MS[^\n]*\.then\(sayInstant\)/);
    expect(page).toMatch(/speakLateWave\(p, verdictLines\);\n\s*\}\n\s*\}\n\s*\}\n\s*verdictHandedOver\(\);/);
    expect(page).toMatch(/void verdictPass\.finally\(verdictHandedOver\)/);
  });
});

/**
 * 🔒 ONE COACH, ONE DOOR (WO-CHAT-01, David 2026-10-09: "Make sure this works
 * on all coach surfaces. Remember, 1 UNIFIED COACH!").
 *
 * A student's own words reach the coach through `dispatchCoachTurn` on every
 * screen, so every screen gets the same reading, requests, language and
 * proofs. My Mistakes' question box called `coachService.ask` directly and
 * answered as a different coach: no reading, no requests, no proof lines.
 *
 * A direct `coachService.ask(` from UI code is allowed only for a prompt the
 * APP wrote (an auto-explain, a reaction to a move, an alert), each named here
 * with its reason. A new direct call fails until someone decides which it is.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['src/components', 'src/hooks', 'src/services'];

/** file → number of direct calls, each an app-written prompt. */
const INTERNAL_PROMPTS: Record<string, { calls: number; why: string }> = {
  'src/components/Coach/CoachGamePage.tsx': { calls: 2, why: 'explore-mode "react to this move" prompt; weakness-spine alert' },
  'src/components/Coach/CoachAnalysePage.tsx': { calls: 1, why: 'auto-explain on load' },
  'src/components/Coach/ExplainPositionSessionView.tsx': { calls: 1, why: 'auto-explain on open' },
  'src/services/puzzlesFamilyFallbackNotify.ts': { calls: 1, why: 'app notice when a puzzle family falls back' },
  'src/components/Coach/CoachTeachPage.tsx': { calls: 0, why: 'move reports carry an injected directive; they pick the direct call via `viaDoor`' },
};

function scan(): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.tsx?$/.test(e.name) || /\.test\./.test(e.name)) continue;
      // Comments out, then count across lines: review's call was written
      // `coachService\n  .ask(` and a per-line scan never saw it.
      const code = fs.readFileSync(p, 'utf8').split('\n')
        .filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
      const n = (code.match(/coachService\s*\.\s*ask\s*\(/g) ?? []).length;
      if (n > 0) out[p.split(path.sep).join('/')] = n;
    }
  };
  for (const r of ROOTS) walk(r);
  return out;
}

describe('one coach, one door', () => {
  it('no UI code calls the coach directly except for prompts the app wrote', () => {
    const found = scan();
    const extra = Object.entries(found)
      .filter(([f, n]) => n > (INTERNAL_PROMPTS[f]?.calls ?? 0))
      .map(([f, n]) => `${f}: ${n} direct call(s)`);
    expect(extra, 'a student\'s words must go through dispatchCoachTurn — or name the app-written prompt here').toEqual([]);
  });

  it.each([
    'src/components/Puzzles/MistakePuzzleBoard.tsx',
    'src/components/Coach/CoachGameReview.tsx',
    'src/components/Search/SmartSearchBar.tsx',
  ])('%s asks through the door', (file) => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/dispatchCoachTurn\(/);
    expect(src).not.toMatch(/coachService\s*\.\s*ask\s*\(/);
  });
});

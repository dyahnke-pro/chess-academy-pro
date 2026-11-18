// ONE COACH ON EVERY SURFACE (David 2026-11-18: "Unify the other coach
// surfaces as well"). The opening Play rung's slip reveal kept its own copy of
// the error computer (a hanging-piece read, the engine walk reworded, no
// habit), and the puzzle family's wrong-try reader said "what it allowed" in
// private templates before it asked the one error computer. Both now speak
// through the one computer; this fails if either drifts back.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('one coach on the other surfaces', () => {
  it('the Play rung slip reveal is the one error computer and the one habit', () => {
    const src = code('src/services/discussionPractice.ts');
    const body = src.slice(src.indexOf('export function buildSlipReveal'), src.indexOf('export function gradeReasonLead'));
    expect(body).toMatch(/errorCallFor\(/);
    expect(body).toMatch(/correctionHabit\(/);
    expect(body).not.toMatch(/assembleEngineReasoning|hangingPieces/);
  });
  it('a puzzle wrong try asks the one error computer before any private template', () => {
    const src = code('src/services/puzzleTeaching.ts');
    const body = src.slice(src.indexOf('export async function refuteWrongTry'));
    expect(body.indexOf('errorWhyFor(')).toBeGreaterThan(-1);
    expect(body.indexOf('errorWhyFor(')).toBeLessThan(body.indexOf('lineWins('));
  });
});

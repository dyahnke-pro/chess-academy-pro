// "Track A spoke" means the voice STARTED the line (OS-1 replay 2026-10-19:
// two verdicts were logged as spoken at enqueue and never voiced).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const code = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('Learn logs what the voice reached, and what it never did', () => {
  it('the spoke row is written inside the chain link, after the generation check', () => {
    const at = code.indexOf('summary: `track A spoke:');
    expect(at).toBeGreaterThan(0);
    const link = code.lastIndexOf('.then(() => {', at);
    const between = code.slice(link, at);
    expect(between).toMatch(/if \(trackAGenRef\.current !== myTrackAGen\) \{[\s\S]*'coach-narration-dropped'[\s\S]*return undefined;\s*\}/);
  });
  it('there is one producer of the spoke row', () => {
    expect(code.match(/track A spoke:/g)?.length).toBe(1);
  });
});

/**
 * THE COACH TALKS LIKE A PERSON (David 2026-11-08: "I want all narrations to
 * follow this pattern"). Every spoken line of the decision baseline — four
 * real games through Review, Learn, chat and the lessons — is scored for the
 * robotic patterns in `scripts/voice/robotic-marks.mjs`. The count per
 * surface may only fall: a rise fails here, and a fall must lower its ceiling
 * in `humanVoice.baseline.json` in the same commit, so the next robotic line
 * cannot spend the headroom.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { roboticMarks } from '../../scripts/voice/robotic-marks.mjs';

const baseline = JSON.parse(readFileSync('src/test/fixtures/decision-baseline.json', 'utf8')) as Record<string, { spoken: string[] }>;
const ceiling = JSON.parse(readFileSync('src/test/humanVoice.baseline.json', 'utf8')) as Record<string, number>;

const counts: Record<string, number> = {};
for (const [key, rec] of Object.entries(baseline)) {
  const surface = key.split(':')[0];
  counts[surface] ??= 0;
  for (const raw of rec.spoken) counts[surface] += roboticMarks(raw.replace(/^\d+:\s*/, '')).length;
}

describe('the robotic patterns only fall', () => {
  it.each(Object.keys(ceiling))('%s', (surface) => {
    const n = counts[surface] ?? 0;
    expect(n, `${surface}: ${n} robotic marks against a ceiling of ${ceiling[surface]} — fix the producer (node scripts/voice/robotic-count.mjs names the lines)`).toBeLessThanOrEqual(ceiling[surface]);
    expect(n, `${surface} fell to ${n}: lower its ceiling in src/test/humanVoice.baseline.json`).toBe(ceiling[surface]);
  });

  it('every surface is held', () => {
    expect(Object.keys(counts).sort()).toEqual(Object.keys(ceiling).sort());
  });

  it('negative control: the robotic patterns are found', () => {
    expect(roboticMarks('The plan is to break with a4; put a rook on the d file; improve your rook on a1.').map((m) => m.mark)).toContain('semicolon');
    expect(roboticMarks('Their Nxe5 was a mistake — the stronger move was f6 — it would guard e5.').map((m) => m.mark)).toContain('dash-chain');
    expect(roboticMarks('Your bishop on d3 is hanging: their knight and queen both hit it.')).toEqual([]);
  });
});

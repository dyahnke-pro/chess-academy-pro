import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildVoiceServiceMock, MOCKED_VOICE_METHODS } from './voice-service';

const REPO = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.test\.tsx?$/.test(f)) out.push(f);
  }
  return out;
}

describe('the shared voiceService mock', () => {
  it('covers EVERY speak* method the real service exposes', () => {
    // Read the real class rather than importing it (importing voiceService in a
    // node env drags in audio globals). A speak method ADDED to the service and
    // not to the mock is exactly the drift that put `speakForced` out of reach
    // and left a row red on `main` for eleven days.
    const src = readFileSync(join(REPO, 'src/services/voiceService.ts'), 'utf-8');
    const real = [...src.matchAll(/^ {2}(?:async )?(speak[A-Za-z]*)\s*\(/gm)].map((m) => m[1]);
    expect(real.length, 'found no speak methods — the scan is vacuous').toBeGreaterThan(4);
    const missing = [...new Set(real)].filter((m) => !MOCKED_VOICE_METHODS.includes(m));
    expect(missing, 'add these to ASYNC_METHODS in voice-service.ts').toEqual([]);
  });

  it('every entry is a spy, and the async ones resolve', async () => {
    const m = buildVoiceServiceMock();
    for (const name of MOCKED_VOICE_METHODS) {
      expect(typeof m[name], `${name} is not a function`).toBe('function');
    }
    await expect((m.speakForced as (s: string) => Promise<void>)('x')).resolves.toBeUndefined();
    expect(m.speakForced).toHaveBeenCalledWith('x');
  });

  it('hand-rolled voiceService mocks only ever SHRINK', () => {
    // A hand-rolled mock lists whatever the code called the day it was written,
    // so it silently rots when the code starts calling something else. New test
    // files use buildVoiceServiceMock; this ceiling lets the existing ones be
    // migrated over time and never lets a new one be added.
    const HAND_ROLLED_CEILING = 61;
    const files = walk(join(REPO, 'src'));
    expect(files.length, 'the walk found no test files — vacuous').toBeGreaterThan(100);
    const handRolled = files.filter((f) => {
      const s = readFileSync(f, 'utf-8');
      return /vi\.mock\([^)]*voiceService/.test(s) && !s.includes('buildVoiceServiceMock');
    });
    expect(
      handRolled.length,
      `${handRolled.length} test files hand-roll a voiceService mock. This ceiling only ` +
      'shrinks — use buildVoiceServiceMock() from src/test/mocks/voice-service.ts, and ' +
      'LOWER the ceiling when you migrate one. Never raise it.',
    ).toBeLessThanOrEqual(HAND_ROLLED_CEILING);
  });
});

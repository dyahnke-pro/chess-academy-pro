// EVERY LEARN LINE REACHES THE VOICE THROUGH ONE DOOR (David 2026-09-24).
// Chess lines are worded by the computer (the DNA stems, in code) and handed
// through `voiceFacts` via `speakComputed`; the LLM phrases only off-topic chat.
// A direct `voiceService.speak*(` in CoachTeachPage is a line that skipped the
// chokepoint. Scanned by STATEMENT with comments stripped, so a comment naming
// the method is not a violation.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const TEACH = stripComments(readFileSync(resolve(__dirname, '../components/Coach/CoachTeachPage.tsx'), 'utf8'));
const HELPER = readFileSync(resolve(__dirname, '../services/speakComputed.ts'), 'utf8');

describe('speakComputed is the only way CoachTeachPage speaks', () => {
  it('no direct voiceService.speak / speakForced call', () => {
    const hits = TEACH.split('\n').filter((l) => /voiceService\.(speak|speakForced)\(/.test(l));
    expect(hits).toEqual([]);
  });

  it('positive control: the page does speak, through the helper', () => {
    expect((TEACH.match(/speakComputed\(/g) ?? []).length).toBeGreaterThanOrEqual(30);
  });

  it('the helper hands every line through voiceFacts, computer-worded (no model)', () => {
    expect(HELPER).toMatch(/voiceFacts\(text, \{ preferRaw: true/);
    expect(HELPER).not.toMatch(/warm:\s*true/);
  });
});

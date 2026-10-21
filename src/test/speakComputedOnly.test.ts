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
const LEARN_VOICE = readFileSync(resolve(__dirname, '../services/learnVoice.ts'), 'utf8');

describe('speakComputed is the only way CoachTeachPage speaks', () => {
  it('no direct voiceService.speak / speakForced call', () => {
    const hits = TEACH.split('\n').filter((l) => /voiceService\.(speak|speakForced)\(/.test(l));
    expect(hits).toEqual([]);
  });

  it('positive control: the page does speak, through its one door (`speakLearn`, which calls the helper)', () => {
    expect((TEACH.match(/speakLearn\(/g) ?? []).length).toBeGreaterThanOrEqual(30);
    expect(LEARN_VOICE).toMatch(/return speakComputed\(text,/);
  });

  // FAIL CLOSED (WO-LEARN-FOCUS-01): the page never calls the helper around
  // its door, and every call through the door names a channel — so a line
  // volunteered during a mission or focus game cannot reach the voice.
  it('the page never calls speakComputed directly — every line goes through speakLearn', () => {
    expect(TEACH).not.toMatch(/speakComputed\(/);
  });

  it('every speakLearn call names its channel', () => {
    const calls = TEACH.split('speakLearn(').slice(1).map((rest) => rest.slice(0, 400));
    const missing = calls.filter((c) => !/channel:\s*/.test(c.slice(0, c.indexOf('}') + 1 || 400)));
    expect(missing).toEqual([]);
  });

  it('the phase wave\'s package speaks only when a volunteered line may', () => {
    const pkg = TEACH.split('\n').filter((l) => /voiceService\.speakPackage\(/.test(l));
    expect(pkg.length).toBeGreaterThan(0);
    for (const l of pkg) expect(l).toMatch(/learnVoiceAllows\('free-play'\)/);
  });

  it('the helper hands every line through voiceFacts, computer-worded (no model)', () => {
    expect(HELPER).toMatch(/voiceFacts\(text, \{ preferRaw: true/);
    expect(HELPER).not.toMatch(/warm:\s*true/);
  });
});

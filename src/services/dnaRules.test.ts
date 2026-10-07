import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { dnaPass } from './dnaRules';

describe('dnaPass — the code-side DNA every narration passes (David 2026-10-07)', () => {
  it('cuts the sentence of praise or interface talk, never the teaching beside it', () => {
    const r = dnaPass('Great move! The knight on f3 now hits e5. Tap the button to continue.');
    expect(r.text).toBe('The knight on f3 now hits e5.');
    expect(r.refused).toEqual(['dna: praise', 'dna: interface talk']);
  });
  it('rephrases move numbers away, keeping the move', () => {
    expect(dnaPass('After 3.Bb5 the pin is on, and 3...a6 asks it.').text).toBe('After Bb5 the pin is on, and …a6 asks it.');
  });
  it('kids keep milestone praise and tap instructions; a book passage is read as written', () => {
    expect(dnaPass('Great job! Tap the knight.', { kid: true }).text).toBe('Great job! Tap the knight.');
    expect(dnaPass('Excellent! 1.e4 is best by test.', { verbatim: true }).text).toBe('Excellent! 1.e4 is best by test.');
  });
  it('teaching that uses the word "good" still speaks', () => {
    expect(dnaPass('The knight on f3 is the only good defender of e5.').text).toBe('The knight on f3 is the only good defender of e5.');
  });
});

describe('ONE CHOKEPOINT: nothing reaches speech around voiceService (gate)', () => {
  it('speakInternal runs dnaPass', () => {
    const src = readFileSync('src/services/voiceService.ts', 'utf8');
    const body = src.slice(src.indexOf('private async speakInternalTracked('));
    expect(body.slice(0, 6000)).toMatch(/dnaPass\(text,/);
  });
  it('no file calls the device speech engine directly (the voice-settings preview aside)', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
    });
    // The preview plays a fixed sample in a chosen DEVICE voice — the one call
    // that is about the voice, not a narration.
    const ALLOWED = new Set(['src/services/voiceService.ts', 'src/services/speechService.ts', 'src/components/Settings/VoiceSettingsPanel.tsx']);
    const offenders = walk('src').filter((p) => !ALLOWED.has(p) && /speechService\.speak\(|speechSynthesis\.speak\(/.test(readFileSync(p, 'utf8').replace(/\/\/[^\n]*/g, '')));
    expect(offenders, 'speak through voiceService so the DNA, Silent and the brief cap apply').toEqual([]);
  });
});

// #25 SSML prosody-spike gates: the spike is ADDITIVE and G4-safe.
//   1. Neural voices get a slight rate/pitch lift composed over the
//      personality base; generative voices are a documented no-op.
//   2. Text is XML-escaped inside the SSML wrapper.
//   3. G4 REGRESSION: the buffered Polly path stays dead — the endpoint
//      source must never call transformToByteArray (streaming canonical).
//   4. getTtsUrl threads the prosody param (and only when asked).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildSsmlForEngine } from '../../api/tts';
import { getTtsUrl } from './voiceService';

describe('SSML prosody spike (#25)', () => {
  it('lifts rate and pitch over the personality base on neural voices', () => {
    const base = buildSsmlForEngine('You called it.', 'neural', 'default');
    const spiked = buildSsmlForEngine('You called it.', 'neural', 'default', 'spike');
    expect(base).toContain('rate="95%"');
    expect(spiked).toContain('rate="103%"'); // 95 + 8
    expect(spiked).toContain('pitch="+6%"');
    expect(spiked).toContain('<speak>');
  });

  it('composes over a non-default personality base', () => {
    const spiked = buildSsmlForEngine('There it is.', 'neural', 'edgy', 'spike');
    expect(spiked).toContain('rate="113%"'); // 105 + 8
  });

  it('is a no-op on generative engines (structural wrap only)', () => {
    const spiked = buildSsmlForEngine('You called it.', 'generative', 'default', 'spike');
    expect(spiked).toBe('<speak><p>You called it.</p></speak>');
    expect(spiked).not.toContain('prosody');
  });

  it('XML-escapes the text inside the wrapper', () => {
    const spiked = buildSsmlForEngine('Qxe7+ & <check>', 'neural', 'default', 'spike');
    expect(spiked).toContain('&amp;');
    expect(spiked).toContain('&lt;check&gt;');
    expect(spiked).not.toContain('<check>');
  });

  it('G4 regression: the buffered Polly path stays dead in api/tts.ts', () => {
    // The name may appear in the G4 doc COMMENT explaining why it's banned —
    // strip comment lines, then assert no live CALL survives.
    const src = readFileSync('api/tts.ts', 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(src).not.toMatch(/\.transformToByteArray\s*\(/);
  });

  it('getTtsUrl threads the prosody param only when asked', () => {
    expect(getTtsUrl('hi', 'joanna', true, 'default', 'spike')).toContain('&prosody=spike');
    expect(getTtsUrl('hi', 'joanna', true, 'default')).not.toContain('prosody=');
  });
});

import { describe, it, expect } from 'vitest';
import { stripLeadingArtifact } from './coachService';

// Production audit 2026-06-02: tool-use chat turns leaked a constant
// leading "C" ("CWe're at the Najdorf…", "CLet me get the engine's read…").
// This guard strips that artifact at the coachService.ask return boundary.
describe('stripLeadingArtifact', () => {
  it('strips the leaked leading "C" before a capitalised word', () => {
    expect(stripLeadingArtifact("CWe're at the Najdorf Variation")).toBe(
      "We're at the Najdorf Variation",
    );
    expect(stripLeadingArtifact("CLet me get the engine's read")).toBe(
      "Let me get the engine's read",
    );
  });

  it('leaves legitimate coach prose untouched', () => {
    const ok = [
      'Nf3 is the best move here', // letter then lowercase
      'White has the bishop pair', // W then lowercase h
      'Black should play …c5', //
      'OK, so the plan is simple', // O then K (cap) then comma, not cap+lower
      'I think you should castle', // I then space
      'The Najdorf comes from 1.e4 c5', // T then lowercase h
      'FIDE rules say…', // all-caps acronym, no cap+lower after first
      'e4 is a strong first move', // lowercase start
    ];
    for (const s of ok) expect(stripLeadingArtifact(s)).toBe(s);
  });

  it('does not touch a single bare character (the collapse case is left for telemetry)', () => {
    expect(stripLeadingArtifact('C')).toBe('C');
    expect(stripLeadingArtifact('')).toBe('');
  });
});

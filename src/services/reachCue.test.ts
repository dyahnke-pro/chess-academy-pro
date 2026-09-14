import { describe, it, expect } from 'vitest';
import { reachCueFor, spikeIncomingCue } from './reachCue';
import type { ReachEvent } from './reachRating';

describe('reachCueFor (computed cue → coach line)', () => {
  it('a tier-up is LOUD: visual + a concrete step-up voice line', () => {
    const c = reachCueFor({ kind: 'tier-up', tier: 11, rating: 1650 });
    expect(c).not.toBeNull();
    expect(c!.tone).toBe('up');
    expect(c!.voice).toBeTruthy();
    expect(c!.visual).toMatch(/level up/i);
    // Not empty praise — it names that the difficulty is stepping up.
    expect(c!.voice).not.toMatch(/great job|well done|excellent/i);
  });

  it('a settle is GENTLE: visual only, no spoken callout, never "worse"', () => {
    const c = reachCueFor({ kind: 'settle', tier: 9 });
    expect(c!.tone).toBe('down');
    expect(c!.voice).toBeNull();
    expect(c!.visual).not.toMatch(/worse|bad|failing/i);
  });

  it('a spike-cleared celebrates cracking one above your level', () => {
    const c = reachCueFor({ kind: 'spike-cleared', rating: 1800 });
    expect(c!.tone).toBe('spike');
    expect(c!.voice).toBeTruthy();
  });

  it('a streak cue names the run', () => {
    const c = reachCueFor({ kind: 'streak', streak: 5 });
    expect(c!.visual).toMatch(/5 in a row/i);
    expect(c!.tone).toBe('up');
  });

  it('rotate varies the phrasing so a session does not repeat one line', () => {
    const ev: ReachEvent = { kind: 'tier-up', tier: 11, rating: 1650 };
    const a = reachCueFor(ev, 0)!.voice;
    const b = reachCueFor(ev, 1)!.voice;
    expect(a).not.toBe(b);
  });
});

describe('spikeIncomingCue', () => {
  it('warns a boss puzzle is coming, above the usual level', () => {
    const c = spikeIncomingCue(0);
    expect(c.tone).toBe('spike');
    expect(c.voice).toMatch(/boss|above|stretch|harder/i);
    expect(c.visual).toMatch(/boss/i);
  });
});

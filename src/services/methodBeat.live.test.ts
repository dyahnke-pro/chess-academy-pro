/**
 * The PRESENT-TENSE method register — the habit taught on a live board.
 *
 * Guards the two things that make it teaching rather than filler: it is earned
 * by a computed signal (never generic advice on a quiet position), and it never
 * restates a claim the briefing already makes as a fact.
 */
import { describe, it, expect } from 'vitest';
import { liveMethodBeatFor } from './methodBeat';

const base = { bestSan: null as string | null, threatStanding: false, isStudentMove: true };

describe('liveMethodBeatFor', () => {
  it('teaches the method to the PLAYER only', () => {
    expect(liveMethodBeatFor({ ...base, threatStanding: true, isStudentMove: false })).toBeNull();
  });

  it('is silent on a quiet position with nothing forcing (empty > generic)', () => {
    expect(liveMethodBeatFor({ ...base, bestSan: 'Nf3' })).toBeNull();
    expect(liveMethodBeatFor(base)).toBeNull();
  });

  it('teaches threat identification as a HABIT when a threat is standing', () => {
    const beat = liveMethodBeatFor({ ...base, threatStanding: true });
    expect(beat).toBeTruthy();
    expect(beat!).toMatch(/their|they/i);
    // The habit, not the threat itself — the briefing already names the threat.
    expect(beat!).toMatch(/first|before|order of operations/i);
  });

  it('teaches the forcing scan when the move that is there is forcing', () => {
    for (const san of ['Qxh7+', 'Rxe8#', 'Nxd5']) {
      const beat = liveMethodBeatFor({ ...base, bestSan: san });
      expect(beat, san).toBeTruthy();
      expect(beat!).toMatch(/check|captur|forcing/i);
    }
  });

  it('never hands over the move', () => {
    const beat = liveMethodBeatFor({ ...base, bestSan: 'Qxh7+' });
    expect(beat!).not.toContain('Qxh7');
    expect(beat!).not.toMatch(/h7/);
  });

  it('is PRESENT tense — never the review register', () => {
    const beats = [
      liveMethodBeatFor({ ...base, threatStanding: true }),
      liveMethodBeatFor({ ...base, bestSan: 'Qxh7+' }),
    ].filter((b): b is string => !!b);
    expect(beats.length).toBe(2);
    for (const b of beats) {
      // "the move you wanted was", "this was the moment" — retrospective stems
      // spoken on a live board are both a register violation and a lie: nothing
      // has been played yet.
      expect(b).not.toMatch(/\bwas\b|\bwanted\b|would have/i);
    }
  });

  it('castling is not a forcing move (the regex must not match O-O)', () => {
    expect(liveMethodBeatFor({ ...base, bestSan: 'O-O' })).toBeNull();
    expect(liveMethodBeatFor({ ...base, bestSan: 'O-O-O' })).toBeNull();
  });

  it('rotates stems so a long game never repeats one verbatim', () => {
    const seen = new Set<string>();
    for (let ply = 0; ply < 6; ply += 1) {
      const b = liveMethodBeatFor({ ...base, threatStanding: true }, ply);
      if (b) seen.add(b);
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it('the standing threat outranks the forcing scan — their idea comes first', () => {
    const both = liveMethodBeatFor({ ...base, threatStanding: true, bestSan: 'Qxh7+' });
    expect(both!).toMatch(/their|they/i);
  });

  it('teaches candidate-move discipline when the position holds a real choice', () => {
    const beat = liveMethodBeatFor({ ...base, bestSan: 'Nf3', realChoice: true });
    expect(beat).toBeTruthy();
    expect(beat!).toMatch(/candidate|options/i);
  });

  it('does NOT teach candidate discipline on a forced recapture (no real choice)', () => {
    expect(liveMethodBeatFor({ ...base, bestSan: 'Nf3', realChoice: false })).toBeNull();
  });

  it('a standing threat and a forcing move both outrank the candidate habit', () => {
    expect(liveMethodBeatFor({ ...base, bestSan: 'Nf3', threatStanding: true, realChoice: true })!).toMatch(/their|they/i);
    expect(liveMethodBeatFor({ ...base, bestSan: 'Qxh7+', realChoice: true })!).toMatch(/check|captur|forcing/i);
  });

  it('exactly ONE habit speaks per position — never a stack of advice', () => {
    const beat = liveMethodBeatFor({ ...base, bestSan: 'Qxh7+', threatStanding: true, realChoice: true });
    expect(beat).toBeTruthy();
    expect(beat!.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(2);
  });
});

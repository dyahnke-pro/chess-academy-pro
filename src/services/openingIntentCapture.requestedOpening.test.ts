import { describe, it, expect, beforeEach } from 'vitest';
import { tryCaptureOpeningIntent } from './openingIntentCapture';
import { getOpeningMoves } from './openingDetectionService';
import { useCoachMemoryStore } from '../stores/coachMemoryStore';

/**
 * David 2026-06-04 deep coach audit: requesting "let's play the Italian Game"
 * then 1.e4 had the coach answer ...e6 (French), NOT ...e5 — because the
 * intended opening was only ever set by the LLM's set_intended_opening tool
 * (non-deterministic, racing the next move) and the deterministic
 * `tryCaptureOpeningIntent` helper was wired into NO surface. These tests lock
 * the deterministic contract: a typed request captures a RESOLVABLE opening
 * name whose ply-1 reply to 1.e4 is the requested opening's book move.
 */
describe('requested-opening deterministic capture (Learn/Play chat)', () => {
  beforeEach(() => {
    useCoachMemoryStore.getState().clearIntendedOpening('test-reset');
  });

  const cases: Array<[string, string]> = [
    ["let's play the Italian Game", 'e5'],
    ["let's play the Sicilian Defense", 'c5'],
    ['I want to play the Italian Game', 'e5'],
    ['can we play the Sicilian Defense', 'c5'],
  ];

  for (const [request, expectedReply] of cases) {
    it(`"${request}" → intended opening whose reply to 1.e4 is ...${expectedReply}`, () => {
      const captured = tryCaptureOpeningIntent(request, 'coach-teach', 'white');
      expect(captured).not.toBeNull();
      const stored = useCoachMemoryStore.getState().intendedOpening;
      expect(stored?.name).toBeTruthy();
      const moves = getOpeningMoves(stored!.name);
      expect(moves).not.toBeNull();
      // ply 1 = the coach's (Black's) reply to the student's 1.e4
      expect(moves![1]).toBe(expectedReply);
    });
  }

  it('the two requests resolve to DIFFERENT replies (spine plays what you ask)', () => {
    const a = tryCaptureOpeningIntent("let's play the Italian Game", 'coach-teach', 'white');
    const italReply = getOpeningMoves(a!.name)![1];
    useCoachMemoryStore.getState().clearIntendedOpening('test');
    const b = tryCaptureOpeningIntent("let's play the Sicilian Defense", 'coach-teach', 'white');
    const sicReply = getOpeningMoves(b!.name)![1];
    expect(italReply).toBe('e5');
    expect(sicReply).toBe('c5');
    expect(italReply).not.toBe(sicReply);
  });

  it('a move report never captures an opening (no false intent)', () => {
    const captured = tryCaptureOpeningIntent('I played e4. Your move.', 'coach-teach', 'white');
    expect(captured).toBeNull();
  });
});

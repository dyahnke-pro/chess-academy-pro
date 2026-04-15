import { describe, it, expect } from 'vitest';
import {
  findPlanForOpening,
  findPlanBySubject,
  sessionFromPlan,
  resolveMiddlegameSession,
} from './middlegamePlanner';

describe('middlegamePlanner', () => {
  it('finds an exact plan by openingId', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    expect(plan?.id).toContain('italian');
  });

  it('returns null when no plan matches', () => {
    expect(findPlanForOpening('totally-made-up-opening')).toBeNull();
  });

  it('finds a plan by free-text subject', () => {
    const plan = findPlanBySubject('italian game');
    expect(plan).not.toBeNull();
  });

  it('returns null for empty subjects', () => {
    expect(findPlanBySubject('')).toBeNull();
    expect(findPlanBySubject('  ')).toBeNull();
  });

  it('builds a WalkthroughSession with a non-starting fen and middlegame kind', () => {
    const plan = findPlanForOpening('italian-game');
    expect(plan).not.toBeNull();
    const session = sessionFromPlan(plan!);
    expect(session).not.toBeNull();
    expect(session!.kind).toBe('middlegame');
    // The starting FEN is the middlegame critical position, not the
    // standard start position — this is the key invariant: board
    // context carries over from opening → middlegame.
    expect(session!.startFen).not.toContain('rnbqkbnr/pppppppp');
    expect(session!.steps.length).toBeGreaterThan(0);
    // Each step has embedded narration (no parallel array to maintain)
    for (const step of session!.steps) {
      expect(step.narration.length).toBeGreaterThan(0);
    }
  });

  it('resolveMiddlegameSession accepts subject or openingId', () => {
    const a = resolveMiddlegameSession({ openingId: 'italian-game' });
    const b = resolveMiddlegameSession({ subject: 'italian' });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
  });

  it('resolveMiddlegameSession returns null for unknown input', () => {
    expect(resolveMiddlegameSession({ subject: 'zzzzzzz' })).toBeNull();
  });
});

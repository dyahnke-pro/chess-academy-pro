import { describe, expect, it } from 'vitest';
import { ownTakebackPlies } from './coachSessionRouter';

describe('the student\'s own takeback lands on their turn (David 2026-10-23: "I can\'t move the pieces")', () => {
  it('your move, the coach still to reply → take back 1', () => {
    expect(ownTakebackPlies(1, 'user')).toBe(1);
    expect(ownTakebackPlies(2, 'user')).toBe(1);
  });
  it('the coach replied → take back 2, never the coach\'s reply alone', () => {
    expect(ownTakebackPlies(2, 'coach')).toBe(2);
    expect(ownTakebackPlies(40, 'coach')).toBe(2);
  });
  it('you have not moved yet → nothing to take back', () => {
    expect(ownTakebackPlies(1, 'coach')).toBe(0); // Black student, the coach opened
    expect(ownTakebackPlies(0, 'coach')).toBe(0); // White student, empty board
    expect(ownTakebackPlies(0, 'user')).toBe(0);
  });
});

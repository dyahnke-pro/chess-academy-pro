import { describe, it, expect } from 'vitest';
import { matchEndgameLesson } from './endgameLessonsService';

// P-V.1 — general endgame-technique matcher over the hand-authored catalog.
describe('matchEndgameLesson (P-V.1)', () => {
  it.each([
    ['how do I win a Lucena position', 'lucena-position'],
    ['how do I hold a Philidor rook ending', 'philidor-rook-ending'],
    ['how do I use the opposition', 'opposition'],
    ['what is the rule of the square', 'rule-of-the-square'],
    ['how do I win king and pawn vs king', 'k-vs-kp-opposition-draw'],
    ['how do I defend queen vs rook', 'queen-vs-rook-fortress'],
    ['how do I win with a rook behind the passed pawn', 'rooks-behind-passed-pawns'],
    ['how do opposite color bishops draw', 'opposite-color-bishops'],
    ['what is triangulation', 'triangulation'],
    ['how do I cut off the king', 'cutting-off-the-king'],
  ])('matches "%s" → %s', (q, id) => {
    const lesson = matchEndgameLesson(q);
    expect(lesson).not.toBeNull();
    expect(lesson!.id).toBe(id);
    expect(lesson!.narration.rule.length).toBeGreaterThan(0);
  });

  it('returns null for a vague or off-topic ask', () => {
    expect(matchEndgameLesson('how do I win the endgame')).toBeNull();
    expect(matchEndgameLesson('what should I play')).toBeNull();
    expect(matchEndgameLesson('')).toBeNull();
  });
});

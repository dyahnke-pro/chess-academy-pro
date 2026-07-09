import { describe, it, expect } from 'vitest';
import { assembleTeachingAnswer } from './groundedAnswer';
import type { LessonScript } from '../types';

// F11 (coach grounding build): "how do you teach opening X" is grounded in the
// app's OWN teaching structure (the WLPP grammar + the curated LessonScript),
// never a free-LLM guess about how the app works.

const LESSON: LessonScript = {
  openingId: 'caro-kann',
  title: 'Caro-Kann',
  minutes: 12,
  orientation: 'black',
  beats: [
    { id: 'b1', moves: ['e4', 'c6'], say: 'Solid and sound.', sayShort: 'c6 — solid setup' },
    { id: 'b2', moves: ['e4', 'c6', 'd4', 'd5'], say: 'Strike the center.', sayShort: 'd5 strikes the center' },
    { id: 'b3', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3'], say: 'Develop.', sayShort: 'free the bishop first' },
  ],
  sources: ['book:caro-kann', 'concept:pawn-chain'],
};

describe('assembleTeachingAnswer', () => {
  it('describes WLPP + the curated lesson shape, grounded in the LessonScript', () => {
    const a = assembleTeachingAnswer({ openingName: 'Caro-Kann', lesson: LESSON });
    expect(a).not.toBeNull();
    const f = a!.facts;
    expect(f).toContain('Caro-Kann');
    expect(f).toMatch(/Watch, Learn, Practice, Play/);
    expect(f).toContain('12 minute');
    expect(f).toContain('3 key position');
    // Authored short-register cues surface as the ideas drilled.
    expect(f).toContain('c6 — solid setup');
    // Sources come from the lesson (independent verification refs).
    expect(a!.sources).toEqual(['book:caro-kann', 'concept:pawn-chain']);
  });

  it('names supporting plans / traps / quiz when present', () => {
    const a = assembleTeachingAnswer({
      openingName: 'Caro-Kann',
      lesson: LESSON,
      extras: { plans: 2, traps: 1, quiz: true },
    });
    expect(a!.facts).toContain('2 middlegame plans');
    expect(a!.facts).toContain('1 trap');
    expect(a!.facts).toContain('checkpoint quizzes');
  });

  it('falls back to the general WLPP method (still grounded) when no lesson exists', () => {
    const a = assembleTeachingAnswer({ openingName: 'Grob', lesson: null });
    expect(a).not.toBeNull();
    expect(a!.facts).toContain('Grob');
    expect(a!.facts).toMatch(/Watch, Learn, Practice, Play/);
    expect(a!.sources).toEqual(['app:lesson-method']);
  });

  it('handles no lesson and no name without crashing', () => {
    const a = assembleTeachingAnswer({ lesson: null });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/Watch, Learn, Practice, Play/);
  });
});

import { describe, it, expect, vi } from 'vitest';

vi.mock('./analytics', () => ({ captureEvent: vi.fn() }));

import { detectCoachNonAnswer, reportCoachNonAnswer, isMoveReport } from './coachNonAnswer';
import { captureEvent } from './analytics';

describe('detectCoachNonAnswer', () => {
  it('flags a greeting served to a real question (David 2026-06-14)', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-teach',
      question: 'What is the weakest aspect of my game?',
      answer: 'Welcome to my classroom — what would you like to learn today?',
    });
    expect(r.isNonAnswer).toBe(true);
    expect(r.reason).toBe('fallback-or-greeting');
  });

  it('flags the offline fallback', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-chat',
      question: 'how do I improve my endgames?',
      answer: "I'm having trouble connecting right now. Keep playing!",
    });
    expect(r.isNonAnswer).toBe(true);
  });

  it('flags a re-ask of a near-duplicate question', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-teach',
      question: 'what is the weakest aspect of my game?',
      answer: 'The knight is the born forker, leaping over defenders.',
      priorUserQuestions: ['What is the weakest aspect of my game?'],
    });
    expect(r.isNonAnswer).toBe(true);
    expect(r.reason).toBe('re-ask');
  });

  it('flags a re-worded re-ask (high token overlap)', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-chat',
      question: 'what are my biggest weaknesses',
      answer: 'Bishops are strong on long diagonals.',
      priorUserQuestions: ['what are my weaknesses'],
    });
    expect(r.isNonAnswer).toBe(true);
    expect(r.reason).toBe('re-ask');
  });

  it('does NOT flag a substantive on-topic answer', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-chat',
      question: 'what are my weaknesses?',
      answer: 'Your data shows you lose material to back-rank tactics and drop pawns in rook endgames most often.',
    });
    expect(r.isNonAnswer).toBe(false);
  });

  it('does NOT flag a greeting in reply to a greeting (not a question)', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-teach',
      question: 'hi',
      answer: 'Welcome to my classroom — what would you like to learn today?',
    });
    expect(r.isNonAnswer).toBe(false);
  });

  it('does NOT flag distinct consecutive questions as a re-ask', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-chat',
      question: 'what is the best move here?',
      answer: 'Develop the knight to f3, hitting the centre.',
      priorUserQuestions: ['what are my weaknesses?'],
    });
    expect(r.isNonAnswer).toBe(false);
  });

  // David 2026-06-16: consecutive step-by-step MOVE REPORTS share "I played"
  // and were falsely flagged as re-asks, spamming coach_non_answer.
  it('does NOT flag consecutive move reports as a re-ask', () => {
    const r = detectCoachNonAnswer({
      surface: 'coach-teach',
      question: 'I played dxc6.',
      answer: 'Recapturing opens the b-file for your rook.',
      priorUserQuestions: ['I played e4.', 'I played Nf3.'],
    });
    expect(r.isNonAnswer).toBe(false);
  });
});

describe('isMoveReport', () => {
  it('recognizes the step-by-step move-report templates', () => {
    for (const s of ['I played e4.', 'I play Nf6', 'I just played dxc6', 'my move is Bb5', 'Nc6, your move']) {
      expect(isMoveReport(s)).toBe(true);
    }
  });
  it('does NOT treat a real question as a move report', () => {
    for (const s of ['what is the best move here?', 'why is the knight strong?', 'is this a fork?']) {
      expect(isMoveReport(s)).toBe(false);
    }
  });
});

describe('reportCoachNonAnswer', () => {
  it('emits coach_non_answer to PostHog on a non-answer', () => {
    vi.mocked(captureEvent).mockClear();
    reportCoachNonAnswer({
      surface: 'coach-teach',
      question: 'what are my weaknesses?',
      answer: 'Welcome to my classroom — what would you like to learn today?',
    });
    expect(captureEvent).toHaveBeenCalledWith('coach_non_answer', expect.objectContaining({
      surface: 'coach-teach',
      reason: 'fallback-or-greeting',
    }));
  });

  it('does not emit on a good answer', () => {
    vi.mocked(captureEvent).mockClear();
    reportCoachNonAnswer({
      surface: 'coach-chat',
      question: 'who is winning?',
      answer: 'White is clearly better — up a clean pawn with the safer king.',
    });
    expect(captureEvent).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import {
  pickNarrationText,
  pickCoachHint,
  pickEvaluation,
  trimToSentences,
} from './walkthroughNarration';
import type { OpeningMoveAnnotation } from '../types';

const STEP_FULL: OpeningMoveAnnotation = {
  san: 'e4',
  annotation: 'White grabs the center. This is a classical opening choice. It opens lines for the bishop.',
  narration: 'White grabs the center with the king pawn. This frees the bishop and queen.',
  shortNarration: 'White takes the center.',
};

const STEP_NO_NARRATION: OpeningMoveAnnotation = {
  san: 'Nf3',
  annotation: 'A flexible developing move. The knight attacks e5. White prepares to castle.',
};

describe('pickNarrationText', () => {
  it('returns empty for silent length', () => {
    expect(pickNarrationText(STEP_FULL, 'silent')).toBe('');
  });

  it('returns empty for null step', () => {
    expect(pickNarrationText(null, 'full')).toBe('');
  });

  it('uses narration field when present for full length', () => {
    expect(pickNarrationText(STEP_FULL, 'full')).toBe(STEP_FULL.narration);
  });

  it('falls back to annotation when narration is absent for full length', () => {
    expect(pickNarrationText(STEP_NO_NARRATION, 'full')).toBe(STEP_NO_NARRATION.annotation);
  });

  it('uses shortNarration field when present for short length', () => {
    expect(pickNarrationText(STEP_FULL, 'short')).toBe(STEP_FULL.shortNarration);
  });

  it('trims annotation to 1 sentence when shortNarration is absent', () => {
    const out = pickNarrationText(STEP_NO_NARRATION, 'short');
    expect(out).toBe('A flexible developing move.');
  });

  it('trims narration (not annotation) when narration is present and shortNarration is not', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'Display version. Display version two.',
      narration: 'Spoken version. Spoken version two.',
    };
    expect(pickNarrationText(step, 'short')).toBe('Spoken version.');
  });
});

describe('pickNarrationText — short-form derivation', () => {
  it('breaks a long single sentence at the first comma when over 28 words', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation:
        'This is the classical king pawn opening where White grabs central space early, opens lines for the bishop and queen, and stakes out real estate in the center so pieces can develop harmoniously.',
    };
    const out = pickNarrationText(step, 'short');
    expect(out).toBe('This is the classical king pawn opening where White grabs central space early.');
  });

  it('leaves short single sentences alone', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'White plays the king pawn.',
    };
    expect(pickNarrationText(step, 'short')).toBe('White plays the king pawn.');
  });

  it('returns empty string when both narration and annotation are missing', () => {
    const step: OpeningMoveAnnotation = { san: 'e4', annotation: '' };
    expect(pickNarrationText(step, 'full')).toBe('');
    expect(pickNarrationText(step, 'short')).toBe('');
  });
});

describe('pickCoachHint', () => {
  it('prefers an explicit coachHint field', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'x',
      coachHint: 'Attack f7 before castling.',
      plans: ['Develop the knight'],
    };
    expect(pickCoachHint(step)).toBe('Attack f7 before castling.');
  });

  it('falls back to the first plan when coachHint is absent', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'x',
      plans: ['Develop knights quickly', 'Castle short'],
    };
    expect(pickCoachHint(step)).toBe('Develop knights quickly');
  });

  it('returns null when no hint source is available', () => {
    const step: OpeningMoveAnnotation = { san: 'e4', annotation: 'x' };
    expect(pickCoachHint(step)).toBeNull();
  });

  it('returns null when coachHint is whitespace and plans is empty', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'x',
      coachHint: '   ',
      plans: [],
    };
    expect(pickCoachHint(step)).toBeNull();
  });

  it('returns null for a null step', () => {
    expect(pickCoachHint(null)).toBeNull();
  });
});

describe('pickEvaluation', () => {
  it('returns the numeric evaluation when present', () => {
    const step: OpeningMoveAnnotation = {
      san: 'e4',
      annotation: 'x',
      evaluation: 28,
    };
    expect(pickEvaluation(step)).toBe(28);
  });

  it('returns null when evaluation is absent', () => {
    const step: OpeningMoveAnnotation = { san: 'e4', annotation: 'x' };
    expect(pickEvaluation(step)).toBeNull();
  });

  it('returns null for a null step', () => {
    expect(pickEvaluation(null)).toBeNull();
  });
});

describe('trimToSentences', () => {
  it('returns the input unchanged when fewer sentences than the cap', () => {
    expect(trimToSentences('One sentence.', 2)).toBe('One sentence.');
  });

  it('keeps only the first N sentences', () => {
    expect(trimToSentences('A. B. C. D.', 2)).toBe('A. B.');
  });

  it('handles question marks and exclamation marks as sentence terminators', () => {
    expect(trimToSentences('A! B? C.', 2)).toBe('A! B?');
  });

  it('returns input unchanged if no sentence terminators found', () => {
    expect(trimToSentences('no terminator', 1)).toBe('no terminator');
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildCustomLessonPlan,
  matchCustomLessonRequest,
  customLessonIntro,
  partTransition,
  customLessonOutro,
  lessonChipFor,
  FULL_LESSON_CHIP,
  type CustomLessonPlan,
} from './customLessonPlan';
import type { UnifiedWeakness } from './weaknessSpine';
import type { CoachCurriculumRecord } from '../db/schema';

function w(tag: string, label: string, over: Partial<UnifiedWeakness> = {}): UnifiedWeakness {
  return {
    tag,
    label,
    openCount: 3,
    key: tag,
    bucket: 'tactical',
    total: 5,
    severity: 50,
    sources: ['analysis'],
    puzzleThemes: [],
    positions: [],
    lastSeenAt: Date.now(),
    ...over,
  };
}

function arc(...tags: { tag: string; label: string; status: 'active' | 'queued' | 'mastered' }[]): CoachCurriculumRecord {
  return {
    id: 'active',
    items: tags.map((t) => ({ tag: t.tag, label: t.label, patternThemes: [], status: t.status, addedAt: 1 })),
    updatedAt: 1,
  };
}

describe('buildCustomLessonPlan', () => {
  it('is empty when there are no open holes', () => {
    const plan = buildCustomLessonPlan(null, [w('analysis:tactic:fork', 'Forks', { openCount: 0 })]);
    expect(plan.parts).toHaveLength(0);
    expect(plan.pickerLine).toBe('');
    expect(plan.pickerChips).toEqual([]);
  });

  it('orders parts by the live curriculum arc, joined to the profile', () => {
    const profile = [
      w('analysis:tactic:fork', 'Forks', { severity: 40, bucket: 'tactical' }),
      w('analysis:phase:endgame', 'Endgames', { severity: 90, bucket: 'endgame' }),
    ];
    // Arc puts Forks (active) before Endgames (queued) even though Endgames is
    // more severe — the persisted plan drives the order.
    const plan = buildCustomLessonPlan(
      arc({ tag: 'analysis:tactic:fork', label: 'Forks', status: 'active' }, { tag: 'analysis:phase:endgame', label: 'Endgames', status: 'queued' }),
      profile,
    );
    expect(plan.parts.map((p) => p.tag)).toEqual(['analysis:tactic:fork', 'analysis:phase:endgame']);
    expect(plan.parts[0].bucket).toBe('tactical');
    expect(plan.parts[0].concept).not.toBeNull(); // fork has a concept map
    expect(plan.parts[1].bucket).toBe('endgame');
  });

  it('falls back to top-open-by-severity when there is no arc', () => {
    const profile = [
      w('analysis:tactic:fork', 'Forks', { severity: 40 }),
      w('analysis:tactic:pin', 'Pins', { severity: 90 }),
    ];
    const plan = buildCustomLessonPlan(null, profile);
    expect(plan.parts.map((p) => p.tag)).toEqual(['analysis:tactic:pin', 'analysis:tactic:fork']);
  });

  it('drops arc steps that are no longer open in the profile', () => {
    const profile = [w('analysis:tactic:fork', 'Forks', { openCount: 3 })];
    const plan = buildCustomLessonPlan(
      arc(
        { tag: 'analysis:tactic:fork', label: 'Forks', status: 'active' },
        { tag: 'analysis:tactic:pin', label: 'Pins', status: 'queued' }, // not in profile → dropped
      ),
      profile,
    );
    expect(plan.parts.map((p) => p.tag)).toEqual(['analysis:tactic:fork']);
  });

  it('respects the max part cap', () => {
    const profile = [
      w('analysis:tactic:fork', 'Forks', { severity: 90 }),
      w('analysis:tactic:pin', 'Pins', { severity: 80 }),
      w('analysis:tactic:skewer', 'Skewers', { severity: 70 }),
      w('analysis:phase:endgame', 'Endgames', { severity: 60, bucket: 'endgame' }),
    ];
    expect(buildCustomLessonPlan(null, profile).parts).toHaveLength(3);
    expect(buildCustomLessonPlan(null, profile, 2).parts).toHaveLength(2);
  });

  it('builds the picker line + chips (3 holes = full-lesson chip first)', () => {
    const profile = [
      w('analysis:tactic:fork', 'Forks', { severity: 90 }),
      w('analysis:tactic:pin', 'Pins', { severity: 80 }),
      w('analysis:phase:endgame', 'Endgames', { severity: 70, bucket: 'endgame' }),
    ];
    const plan = buildCustomLessonPlan(null, profile);
    expect(plan.pickerLine).toContain('forks');
    expect(plan.pickerLine).toContain('pins');
    expect(plan.pickerLine).toContain('endgames');
    expect(plan.pickerChips[0]).toBe(FULL_LESSON_CHIP);
    expect(plan.pickerChips).toContain(lessonChipFor('Forks'));
    expect(plan.pickerChips.length).toBeLessThanOrEqual(4);
  });

  it('single hole → no full-lesson chip, just the one', () => {
    const plan = buildCustomLessonPlan(null, [w('analysis:tactic:fork', 'Forks')]);
    expect(plan.pickerChips).toEqual([lessonChipFor('Forks')]);
    expect(plan.pickerLine).toContain('build you a lesson on it');
  });
});

describe('matchCustomLessonRequest', () => {
  const plan: CustomLessonPlan = buildCustomLessonPlan(null, [
    w('analysis:tactic:fork', 'Forks', { severity: 90 }),
    w('analysis:phase:endgame', 'Endgames', { severity: 70, bucket: 'endgame' }),
  ]);

  it('matches the full-lesson chip → all tags', () => {
    const m = matchCustomLessonRequest(FULL_LESSON_CHIP, plan);
    expect(m).toEqual({ tags: ['analysis:tactic:fork', 'analysis:phase:endgame'], entry: 'chip' });
  });

  it('matches a per-hole chip → that one tag', () => {
    const m = matchCustomLessonRequest(lessonChipFor('Forks'), plan);
    expect(m).toEqual({ tags: ['analysis:tactic:fork'], entry: 'chip' });
  });

  it('matches a general typed "build me a lesson" → all tags', () => {
    expect(matchCustomLessonRequest('build me a lesson', plan)?.tags).toEqual(['analysis:tactic:fork', 'analysis:phase:endgame']);
    expect(matchCustomLessonRequest('put together a study session for me', plan)?.entry).toBe('typed');
    expect(matchCustomLessonRequest('custom lesson on my weaknesses', plan)?.tags.length).toBe(2);
  });

  it('matches a typed "a lesson on endgames" → that hole', () => {
    const m = matchCustomLessonRequest('can I get a lesson on endgames', plan);
    expect(m).toEqual({ tags: ['analysis:phase:endgame'], entry: 'typed' });
  });

  it('does NOT hijack a bare opening name or unrelated ask', () => {
    expect(matchCustomLessonRequest('endgames', plan)).toBeNull();
    expect(matchCustomLessonRequest('teach me the Caro-Kann', plan)).toBeNull();
    expect(matchCustomLessonRequest('what are my weaknesses?', plan)).toBeNull();
    expect(matchCustomLessonRequest('', plan)).toBeNull();
  });

  it('general intent still resolves with no plan (empty tags)', () => {
    const m = matchCustomLessonRequest('build me a custom lesson', null);
    expect(m).toEqual({ tags: [], entry: 'typed' });
  });
});

describe('spoken beats (code-authored)', () => {
  const parts = buildCustomLessonPlan(null, [
    w('analysis:tactic:fork', 'Forks', { severity: 90 }),
    w('analysis:phase:endgame', 'Endgames', { severity: 70, bucket: 'endgame' }),
  ]).parts;

  it('intro names the count + first hole', () => {
    expect(customLessonIntro(parts)).toContain('2 parts');
    expect(customLessonIntro(parts)).toContain('forks');
    expect(customLessonIntro([parts[0]])).toContain('focused lesson on forks');
    expect(customLessonIntro([])).toBe('');
  });

  it('part transition numbers the part (only for multi-part)', () => {
    expect(partTransition(parts[1], 1, 2)).toBe('Part 2 of 2: endgames.');
    expect(partTransition(parts[0], 0, 1)).toBe('');
  });

  it('outro pluralizes', () => {
    expect(customLessonOutro(1)).toContain('1 pattern worked');
    expect(customLessonOutro(3)).toContain('3 patterns worked');
  });
});

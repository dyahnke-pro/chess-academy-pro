import { describe, it, expect } from 'vitest';
import { auditKindToEvent, buildEventProps } from './analytics';

describe('the mistake-lesson row reaches PostHog', () => {
  it('maps to mistake_lesson', () => {
    expect(auditKindToEvent('mistake-lesson')).toBe('mistake_lesson');
  });
  it('its props are columns, not a context slice', () => {
    const row = { seat: 'you', cost_cp: 72, phase: 'opening', surface: 'learn', cause: 'colour-conceded', motif: null, tag: 'bad-trade', spoken: true, silent_why: null, slots_filled: ['lesson', 'consequence', 'repair'] };
    const props = buildEventProps({ timestamp: 0, kind: 'mistake-lesson', category: 'subsystem', source: 'mistakeLesson', summary: 'you colour-conceded spoken', context: JSON.stringify(row), buildId: 'b1' });
    expect(props).toMatchObject({ ...row, build_id: 'b1' });
    expect(props.context).toBeUndefined();
  });
});

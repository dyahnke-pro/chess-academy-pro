import { describe, it, expect } from 'vitest';
import { parseActions } from './coachActionDispatcher';

describe('parseActions', () => {
  it('extracts a single action with JSON args', () => {
    const { cleanText, actions } = parseActions(
      'Sure, let me start one. [[ACTION:start_play {"opening":"KIA","narrate":true}]]',
    );
    expect(cleanText).toBe('Sure, let me start one.');
    expect(actions).toHaveLength(1);
    expect(actions[0].name).toBe('start_play');
    expect(actions[0].args).toEqual({ opening: 'KIA', narrate: true });
  });

  it('extracts multiple actions in order', () => {
    const text =
      'Looking up. [[ACTION:list_games {"limit":3}]] Analyzing now. [[ACTION:analyze_game {"id":"g-1"}]]';
    const { cleanText, actions } = parseActions(text);
    expect(actions.map((a) => a.name)).toEqual(['list_games', 'analyze_game']);
    expect(cleanText).toContain('Looking up.');
    expect(cleanText).toContain('Analyzing now.');
    expect(cleanText).not.toContain('[[ACTION');
  });

  it('handles tags with no JSON args', () => {
    const { cleanText, actions } = parseActions('Reset! [[ACTION:set_focus]]');
    expect(actions).toHaveLength(1);
    expect(actions[0].args).toEqual({});
    expect(cleanText).toBe('Reset!');
  });

  it('drops malformed JSON args silently', () => {
    const { cleanText, actions } = parseActions('[[ACTION:start_play {"opening": invalid}]]');
    expect(actions).toHaveLength(1);
    expect(actions[0].args).toEqual({});
    expect(cleanText).toBe('');
  });

  it('returns empty actions when none present', () => {
    const { cleanText, actions } = parseActions('Just chatting, no tags here.');
    expect(actions).toEqual([]);
    expect(cleanText).toBe('Just chatting, no tags here.');
  });
});

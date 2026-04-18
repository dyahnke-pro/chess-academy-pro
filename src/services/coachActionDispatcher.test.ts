import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseActions,
  dispatchActions,
  getRegisteredActionNames,
} from './coachActionDispatcher';
import {
  useCoachSessionStore,
  __resetCoachSessionStoreForTests,
} from '../stores/coachSessionStore';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';

vi.mock('./voiceService', () => ({
  voiceService: {
    speak: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
  },
}));

vi.mock('./openingService', async () => {
  const actual = await vi.importActual<typeof import('./openingService')>('./openingService');
  return {
    ...actual,
    searchOpenings: vi.fn(async (query: string) => {
      if (query.toLowerCase().includes('king')) {
        return [{ id: 'kia-1', name: "King's Indian Attack", eco: 'A05', pgn: 'Nf3 Nf6 g3 d5' }];
      }
      return [];
    }),
  };
});

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

describe('action registry', () => {
  it('registers the documented action set', () => {
    const names = getRegisteredActionNames();
    expect(names).toEqual(
      expect.arrayContaining([
        'list_games',
        'analyze_game',
        'start_play',
        'narrate',
        'navigate',
        'set_focus',
        'set_narration',
      ]),
    );
  });
});

describe('dispatchActions', () => {
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    __resetCoachSessionStoreForTests();
    resetFactoryCounter();
    navigate = vi.fn();
    await db.games.clear();
    await db.meta.clear();
    // Make sure coachVoiceOn starts off so toggle assertions are deterministic.
    if (useAppStore.getState().coachVoiceOn) {
      useAppStore.getState().toggleCoachVoice();
    }
  });

  it('analyze_game opens game review for the most recent game when no id', async () => {
    await db.games.bulkAdd([
      buildGameRecord({ id: 'g-old', date: '2024-01-01', white: 'me', black: 'opp', result: '1-0' }),
      buildGameRecord({ id: 'g-new', date: '2025-01-01', white: 'me', black: 'opp2', result: '0-1' }),
    ]);

    await dispatchActions(
      [{ name: 'analyze_game', args: {}, index: 0 }],
      { navigate },
    );

    expect(navigate).toHaveBeenCalledWith('/coach/play?review=g-new');
    const focus = useCoachSessionStore.getState().focus;
    expect(focus.kind).toBe('game');
    expect(focus.value).toBe('g-new');
  });

  it('analyze_game returns an error when the library is empty', async () => {
    await dispatchActions(
      [{ name: 'analyze_game', args: {}, index: 0 }],
      { navigate },
    );
    expect(navigate).not.toHaveBeenCalled();
    const records = useCoachSessionStore.getState().recentActions;
    expect(records[records.length - 1].result).toBe('error');
  });

  it('start_play resolves opening name and forwards openingPgn', async () => {
    await dispatchActions(
      [
        {
          name: 'start_play',
          args: { opening: "King's Indian Attack", side: 'white', narrate: true },
          index: 0,
        },
      ],
      { navigate },
    );
    expect(navigate).toHaveBeenCalledTimes(1);
    const url = navigate.mock.calls[0][0] as string;
    expect(url).toContain('/coach/session/play-against');
    expect(url).toContain('opening=King%27s+Indian+Attack');
    expect(url).toContain('openingPgn=Nf3+Nf6+g3+d5');
    expect(url).toContain('side=white');
    expect(url).toContain('narrate=1');
    // narrate=true should flip session-store narration AND the
    // coachVoiceOn flag in appStore.
    expect(useCoachSessionStore.getState().narrationMode).toBe(true);
    expect(useAppStore.getState().coachVoiceOn).toBe(true);
  });

  it('navigate validates path is relative', async () => {
    await dispatchActions(
      [{ name: 'navigate', args: { path: 'https://evil.com' }, index: 0 }],
      { navigate },
    );
    expect(navigate).not.toHaveBeenCalled();
    const last = useCoachSessionStore.getState().recentActions.at(-1);
    expect(last?.result).toBe('error');
  });

  it('narrate pushes onto the narration queue', async () => {
    await dispatchActions(
      [{ name: 'narrate', args: { text: 'Watch the e-file.' }, index: 0 }],
      { navigate },
    );
    const pending = useCoachSessionStore.getState().pendingNarration;
    expect(pending?.text).toBe('Watch the e-file.');
  });

  it('set_focus rejects unknown kinds', async () => {
    await dispatchActions(
      [{ name: 'set_focus', args: { kind: 'planet', value: 'mars' }, index: 0 }],
      { navigate },
    );
    const last = useCoachSessionStore.getState().recentActions.at(-1);
    expect(last?.result).toBe('error');
  });

  it('records every action result on the session store', async () => {
    await dispatchActions(
      [
        { name: 'set_focus', args: { kind: 'screen', value: '/coach/play' }, index: 0 },
        { name: 'navigate', args: { path: '/coach/chat' }, index: 1 },
      ],
      { navigate },
    );
    const recent = useCoachSessionStore.getState().recentActions;
    expect(recent).toHaveLength(2);
    expect(recent.map((r) => r.name)).toEqual(['set_focus', 'navigate']);
    expect(recent[0].result).toBe('ok');
    expect(recent[1].result).toBe('ok');
  });
});

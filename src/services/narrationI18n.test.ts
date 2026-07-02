import { describe, it, expect } from 'vitest';
import { localizeBeats } from './narrationI18n';
import type { LessonBeat } from '../types';
import { VIENNA_GAME_LESSON } from '../data/lessons/vienna';
import esPack from '../data/lessons/i18n/vienna-game.es.json';

const squares = (s: string): string[] => (s.match(/[a-h][1-8]/g) ?? []).sort();

describe('narrationI18n.localizeBeats', () => {
  it('swaps translated beats and keeps English for untranslated ones', () => {
    const beats: LessonBeat[] = [
      { id: 'a', moves: [], say: 'English A', sayShort: 'a' },
      { id: 'b', moves: [], say: 'English B' },
    ];
    const out = localizeBeats(beats, { a: { say: 'Español A', sayShort: 'á' } });
    expect(out[0].say).toBe('Español A');
    expect(out[0].sayShort).toBe('á');
    expect(out[1].say).toBe('English B'); // no translation → stays English
  });

  it('a null pack is an identity (English preference / missing pack)', () => {
    const beats: LessonBeat[] = [{ id: 'a', moves: [], say: 'x' }];
    expect(localizeBeats(beats, null)).toBe(beats);
  });
});

describe('shipped Vienna Spanish pack', () => {
  it('covers every beat and preserves every board square (G3 board-accuracy guard)', () => {
    const packBeats = esPack.beats as Record<string, { say: string; sayShort?: string }>;
    for (const beat of VIENNA_GAME_LESSON.beats) {
      const t = packBeats[beat.id];
      expect(t, `missing Spanish for beat "${beat.id}"`).toBeTruthy();
      expect(t.say.length).toBeGreaterThan(0);
      // The translated prose must mention the exact same squares as the English
      // — that's what keeps the board claims from drifting under translation.
      expect(squares(t.say), `square drift in beat "${beat.id}"`).toEqual(squares(beat.say));
    }
  });
});

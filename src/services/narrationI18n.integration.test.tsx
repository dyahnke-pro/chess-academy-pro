import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLocalizedBeats } from './narrationI18n';
import { useAppStore } from '../stores/appStore';
import { buildUserProfile } from '../test/factories';
import { VIENNA_GAME_LESSON } from '../data/lessons/vienna';
import esPack from '../data/lessons/i18n/vienna-game.es.json';

/**
 * END-TO-END runtime proof for the narration-localization pilot.
 *
 * This drives the EXACT hook LessonPlayer renders (`useLocalizedBeats`) through
 * the REAL lazy pack loader (`loadNarrationPack` → import.meta.glob) → the REAL
 * shipped Spanish pack (src/data/lessons/i18n/vienna-game.es.json) → localized
 * beats, gated by the app-store `narrationLanguage` preference. No browser and
 * no network — it exercises the real module graph the same way the running app
 * does, so a green run means: set Spanish → the Watch narration IS Spanish.
 */
const squares = (s: string): string[] => (s.match(/[a-h][1-8]/g) ?? []).sort();

function setNarrationLanguage(lang: string): void {
  useAppStore.getState().setActiveProfile(
    buildUserProfile({ preferences: { ...buildUserProfile().preferences, narrationLanguage: lang } }),
  );
}

describe('narrationI18n end-to-end (real pack, real hook, real store)', () => {
  beforeEach(() => {
    useAppStore.setState({ activeProfile: null });
  });
  afterEach(() => {
    useAppStore.setState({ activeProfile: null });
  });

  it('English preference → the Watch narration stays the hand-authored English', async () => {
    setNarrationLanguage('en');
    const { result } = renderHook(() => useLocalizedBeats(VIENNA_GAME_LESSON.openingId, VIENNA_GAME_LESSON.beats));
    // English is a synchronous identity — no pack fetch.
    expect(result.current[0].say).toBe(VIENNA_GAME_LESSON.beats[0].say);
  });

  it('Spanish preference → the Watch narration swaps to the shipped Spanish pack, board squares preserved', async () => {
    setNarrationLanguage('es');
    const { result } = renderHook(() => useLocalizedBeats(VIENNA_GAME_LESSON.openingId, VIENNA_GAME_LESSON.beats));

    // The lazy pack resolves asynchronously; the hook returns English until it lands.
    await waitFor(() => {
      expect(result.current[0].say).not.toBe(VIENNA_GAME_LESSON.beats[0].say);
    });

    const firstSpanish = (esPack.beats as Record<string, { say: string }>)[VIENNA_GAME_LESSON.beats[0].id].say;
    expect(result.current[0].say).toBe(firstSpanish);
    // The Spanish prose is genuinely Spanish (a marker word the English never has).
    expect(result.current[0].say.toLowerCase()).toContain('ajedrez');

    // EVERY beat: localized to Spanish AND every board square identical to the
    // English source (the G3 board-accuracy guard — the picture can't drift).
    for (let i = 0; i < VIENNA_GAME_LESSON.beats.length; i++) {
      const en = VIENNA_GAME_LESSON.beats[i];
      const got = result.current[i];
      const packSay = (esPack.beats as Record<string, { say: string }>)[en.id].say;
      expect(got.say, `beat ${en.id} not localized`).toBe(packSay);
      expect(squares(got.say), `square drift in beat ${en.id}`).toEqual(squares(en.say));
    }
  });
});

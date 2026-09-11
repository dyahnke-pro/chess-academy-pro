// David 2026-08-02: "make sure the coach can speak different languages while
// teaching… make sure it's everywhere." The preference shipped honoured in ONE
// place (the openings tab's written packs); every spoken surface was English.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const voiceFactsMock = vi.fn();
vi.mock('./coachApi', () => ({ voiceFacts: (...a: unknown[]) => voiceFactsMock(...a) }));

import { localizeSpokenText, spokenLanguageName, __clearSpokenLanguageCache } from './spokenLanguage';
import { useAppStore } from '../stores/appStore';
import { buildUserProfile } from '../test/factories';

const setLanguage = (narrationLanguage: string | undefined): void => {
  const profile = buildUserProfile();
  useAppStore.setState({
    activeProfile: { ...profile, preferences: { ...profile.preferences, narrationLanguage } },
  });
};

describe('spokenLanguage', () => {
  beforeEach(() => {
    __clearSpokenLanguageCache();
    voiceFactsMock.mockReset();
    voiceFactsMock.mockResolvedValue('El caballo va a f3.');
  });

  it('is a no-op on English, and never calls the model', async () => {
    for (const lang of ['en', undefined, 'en-US']) {
      setLanguage(lang);
      expect(spokenLanguageName()).toBeNull();
      expect(await localizeSpokenText('Knight to f3.')).toBe('Knight to f3.');
    }
    expect(voiceFactsMock).not.toHaveBeenCalled();
  });

  it('speaks the chosen language, asking for it by name', async () => {
    setLanguage('es');
    expect(spokenLanguageName()).toBe('Spanish');
    expect(await localizeSpokenText('Knight to f3.')).toBe('El caballo va a f3.');
    expect(voiceFactsMock).toHaveBeenCalledWith(
      'Knight to f3.',
      expect.objectContaining({ targetLanguage: 'Spanish' }),
    );
  });

  it('pays for a line once — a beat re-spoken on resume is free', async () => {
    setLanguage('es');
    await localizeSpokenText('Knight to f3.');
    await localizeSpokenText('Knight to f3.');
    await localizeSpokenText('Knight to f3.');
    expect(voiceFactsMock).toHaveBeenCalledTimes(1);
  });

  it('speaks English rather than going silent when translation fails', async () => {
    setLanguage('es');
    voiceFactsMock.mockRejectedValue(new Error('no provider'));
    expect(await localizeSpokenText('Knight to f3.')).toBe('Knight to f3.');
    voiceFactsMock.mockResolvedValue('');
    __clearSpokenLanguageCache();
    expect(await localizeSpokenText('Knight to f3.')).toBe('Knight to f3.');
    voiceFactsMock.mockResolvedValue(null);
    __clearSpokenLanguageCache();
    expect(await localizeSpokenText('Knight to f3.')).toBe('Knight to f3.');
  });

  it('ignores a language it has no name for', async () => {
    setLanguage('xx');
    expect(spokenLanguageName()).toBeNull();
    expect(await localizeSpokenText('Knight to f3.')).toBe('Knight to f3.');
    expect(voiceFactsMock).not.toHaveBeenCalled();
  });

  it('leaves empty text alone', async () => {
    setLanguage('es');
    expect(await localizeSpokenText('   ')).toBe('   ');
    expect(voiceFactsMock).not.toHaveBeenCalled();
  });
});

// David 2026-09-11: "the app should speak and write in whatever language the
// user types or speaks." The coach chat reply is written in the DETECTED input
// language; the voice must speak THAT, not re-translate it to the narration
// setting (type Spanish, don't hear the French setting). Detected input wins;
// the setting only localizes an English source.
describe('spokenLanguage — a reply already in the student\'s language is spoken as-is', () => {
  beforeEach(() => {
    __clearSpokenLanguageCache();
    voiceFactsMock.mockReset();
    voiceFactsMock.mockResolvedValue('SHOULD-NOT-BE-CALLED');
  });

  it('does NOT re-translate an already-non-English reply to the setting', async () => {
    setLanguage('fr'); // setting says French…
    // …but the reply is already Spanish (the student typed Spanish). Speak it as-is.
    const spanish = '¿Cuál es la mejor jugada? El caballo va a f3, que es la mejor.';
    expect(await localizeSpokenText(spanish)).toBe(spanish);
    expect(voiceFactsMock).not.toHaveBeenCalled();
  });

  it('still localizes an ENGLISH source to the setting (lessons / computed narration)', async () => {
    setLanguage('fr');
    voiceFactsMock.mockResolvedValue('Le cavalier va en f3.');
    expect(await localizeSpokenText('The knight goes to f3.')).toBe('Le cavalier va en f3.');
    expect(voiceFactsMock).toHaveBeenCalledWith(
      'The knight goes to f3.',
      expect.objectContaining({ targetLanguage: 'French' }),
    );
  });
});

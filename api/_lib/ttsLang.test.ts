import { describe, it, expect } from 'vitest';
import { detectVoiceForText } from './ttsLang.js';

// Regression for the 2026-08-28 "European accent" bug: a chess narration that
// mentions a foreign opening / player NAME (Grünfeld, König, Réti) carries a
// diacritic, and a single German umlaut scored 2 — over the >1 threshold — so
// the WHOLE coach voice flipped to a German voice. Foreign names must not flip
// the voice; only real foreign-language text (function words) should.
describe('detectVoiceForText — foreign NAMES in English chess text stay English', () => {
  it('keeps English for a Grünfeld narration (lone ü)', () => {
    expect(detectVoiceForText('The Grünfeld hits the centre with an early d5 break.')).toBeNull();
  });
  it('keeps English when naming the King as König or mentioning Réti', () => {
    expect(detectVoiceForText('Watch the König on g1; the Réti aims at the long diagonal.')).toBeNull();
  });
  it('keeps English for a Spanish/Italian opening name (single diacritic, no stopwords)', () => {
    expect(detectVoiceForText('The Muñoz line and the à-la-Italian setup both develop fast.')).toBeNull();
  });

  // Genuine foreign-language passages (real function words) MUST still switch.
  it('still switches to German for a real German sentence', () => {
    const v = detectVoiceForText('Der Läufer ist stark und das Zentrum gehört dir.');
    expect(v?.languageCode).toBe('de-DE');
  });
  it('still switches to Spanish for a real Spanish sentence', () => {
    const v = detectVoiceForText('El alfil controla el tablero y la dama está lista.');
    expect(v?.languageCode).toBe('es-ES');
  });
  // Non-Latin scripts stay definitive (unchanged behaviour).
  it('detects Cyrillic as Russian', () => {
    expect(detectVoiceForText('Слон силён в центре.')?.languageCode).toBe('ru-RU');
  });
});

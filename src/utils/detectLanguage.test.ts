import { describe, it, expect } from 'vitest';
import { detectLanguage } from './detectLanguage';

// The 2026-07-11 fidelity-trip cluster: English chess asks were misdetected
// as Portuguese/Italian (bare articles + the lowercased "O-O" castling
// token), forcing a pointless phrasing/translation call whose invented
// numbers the net then refused. English now competes; castling is stripped.

describe('detectLanguage — English chess asks stay English', () => {
  it('castling notation never reads as the Portuguese article', () => {
    expect(detectLanguage('Should I castle O-O or take, as Black?').code).toBe('en');
    expect(detectLanguage('is o-o-o better than o-o here').code).toBe('en');
  });

  it('English sentences with incidental foreign-looking articles stay English', () => {
    expect(detectLanguage('what about a rook lift as an alternative?').code).toBe('en');
    expect(detectLanguage('why is Nf3 better than the others, what about a bishop move').code).toBe('en');
    expect(detectLanguage('take a look at the los angeles game').code).toBe('en');
  });

  it('still detects genuine non-English asks', () => {
    expect(detectLanguage('¿Cuál es la mejor jugada en esta posición?').code).toBe('es');
    expect(detectLanguage('Quel est le meilleur coup pour les blancs ici ?').code).toBe('fr');
    expect(detectLanguage('Was ist der beste Zug, und warum ist die Dame gut?').code).toBe('de');
    expect(detectLanguage('Qual é o melhor lance para as pretas?').code).toBe('pt');
    expect(detectLanguage('Какой ход лучший?').code).toBe('ru');
  });

  it('accent fingerprints still confirm short non-English strings', () => {
    expect(detectLanguage('¿mejor?').code).toBe('es');
    expect(detectLanguage('warum äußerst?').code).toBe('de');
  });

  it('defaults to English on empty / notation-only input', () => {
    expect(detectLanguage('').code).toBe('en');
    expect(detectLanguage('Nf3 Nc6 Bb5').code).toBe('en');
    expect(detectLanguage(undefined).code).toBe('en');
  });
});

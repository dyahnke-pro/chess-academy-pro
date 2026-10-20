import { describe, expect, it } from 'vitest';
import { buildCoachChatContext, detectConceptsInText, getConcept, getOpeningPassages, resolveOpeningIdFromName } from './chessConceptService';

describe('chessConceptService', () => {
  describe('resolveOpeningIdFromName', () => {
    it.each([
      ['Ruy Lopez', 'ruy-lopez'],
      ['Ruy Lopez: Berlin Defence', 'ruy-lopez'],
      ['Spanish Game', 'ruy-lopez'],
      ['Italian Game: Giuoco Piano', 'italian-game'],
      ['Sicilian Defence: Najdorf, English Attack', 'sicilian-najdorf'],
      ['French Defence', 'french-defence'],
      ['Caro-Kann Defence', 'caro-kann'],
      ['Queen\'s Gambit Declined: Orthodox Defence', 'qgd'],
      ['Queen\'s Gambit Accepted', 'qga'],
      ['Queen\'s Gambit: Albin Counter-Gambit', 'queens-gambit'],
      ['King\'s Indian Defence: Mar del Plata', 'kings-indian-defence'],
      ['Réti Opening', 'reti-opening'],
      ['Grünfeld Defence', 'grunfeld-defence'],
    ])('resolves %s → %s', (name, id) => {
      expect(resolveOpeningIdFromName(name)).toBe(id);
    });

    it('returns null for unknown', () => {
      expect(resolveOpeningIdFromName('Some Made-Up Opening Name')).toBeNull();
      expect(resolveOpeningIdFromName('')).toBeNull();
    });

    it('does not confuse Queens Gambit with QGD/QGA', () => {
      expect(resolveOpeningIdFromName("Queen's Gambit Declined")).toBe('qgd');
      expect(resolveOpeningIdFromName("Queen's Gambit Accepted")).toBe('qga');
      expect(resolveOpeningIdFromName("Queen's Gambit")).toBe('queens-gambit');
    });
  });

  describe('getOpeningPassages', () => {
    it('returns ≥1 passage for openings the books cover', () => {
      const ruy = getOpeningPassages('Ruy Lopez');
      expect(ruy.length).toBeGreaterThan(0);
      expect(ruy[0].text.length).toBeGreaterThan(50);
      expect(ruy[0].author).toBeTruthy();
    });

    it('returns [] for openings not in the books', () => {
      expect(getOpeningPassages('Some Imaginary Opening')).toEqual([]);
    });
  });


  describe('detectConceptsInText', () => {
    it('detects concepts named in text', () => {
      const hits = detectConceptsInText(
        'White has the bishop pair and a strong passed pawn on the queenside.',
      );
      expect(hits).toContain('pos-bishop-pair');
      expect(hits).toContain('pawn-passed');
    });

    it('detects opening principles', () => {
      const hits = detectConceptsInText('Castle early for king safety and develop the pieces.');
      expect(hits).toContain('pos-king-safety');
    });

    it('returns empty for unrelated text', () => {
      expect(detectConceptsInText('Hello world')).toEqual([]);
    });
  });

  describe('getConcept', () => {
    it('returns concept with book-backed passages for covered concepts', () => {
      const c = getConcept('end-opposition');
      expect(c).not.toBeNull();
      if (!c) return;
      expect(c.name).toBe('Opposition');
      expect(c.passages.length).toBeGreaterThan(0);
    });

    it('returns concept with fallback definition for modern concepts', () => {
      const c = getConcept('end-lucena');
      expect(c).not.toBeNull();
      if (!c) return;
      // Lucena is in the book data via Capablanca's section
      // OR has a fallback. Either way the concept resolves.
      expect(c.passages.length > 0 || Boolean(c.fallbackDefinition)).toBe(true);
    });

    it('returns null for unknown concept ids', () => {
      expect(getConcept('totally-fake-concept')).toBeNull();
    });
  });


  describe('buildCoachChatContext', () => {
    it('builds a block when the user message names an opening', () => {
      const block = buildCoachChatContext('Tell me about the Ruy Lopez');
      expect(block).toContain('REFERENCE FROM CHESS CLASSICS');
    });

    it('builds a block when the user message names a concept', () => {
      const block = buildCoachChatContext('What is the opposition in king and pawn endings?');
      expect(block).toContain('REFERENCE FROM CHESS CLASSICS');
    });

    it('returns empty string for empty input', () => {
      expect(buildCoachChatContext('')).toBe('');
    });

    it('returns empty string when nothing chess-relevant matched', () => {
      expect(buildCoachChatContext('hi how are you')).toBe('');
    });
  });


});

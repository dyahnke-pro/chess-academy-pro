import { describe, it, expect } from 'vitest';
import { sanitizeForTTS, detectSanitizerLeak } from './voiceService';

/**
 * Regression coverage for the TTS sanitizer — the last line of defense
 * before narration reaches the speech engine. Covers every piece-letter
 * shorthand shape we've seen the LLM emit in real sessions plus the
 * common-English false-positive cases we explicitly DON'T want to
 * mangle ("Plan B", "R.I.P.", "Dr. P").
 */
describe('sanitizeForTTS', () => {
  describe('piece-letter shorthand — should expand', () => {
    const expandCases: [string, string][] = [
      ['hanging P on f3', 'hanging pawn on f3'],
      ['hanging P', 'hanging pawn'],
      ['hanging Q', 'hanging queen'],
      ['the N on c3', 'the knight on c3'],
      ["Your hanging P on f3", 'Your hanging pawn on f3'],
      ['P is hanging', 'pawn is hanging'],
      ['P on f3', 'pawn on f3'],
      ['Q to d1', 'queen to d1'],
      ['N from b1 to c3', 'knight from b1 to c3'],
      ["Black's P on f3", "Black's pawn on f3"],
      ['weak P on f3', 'weak pawn on f3'],
      ['protect P', 'protect pawn'],
      ['save P', 'save pawn'],
      ['lose P', 'lose pawn'],
      ['hang P', 'hang pawn'],
      ['Watch the P.', 'Watch the pawn.'],
      ['Grab the P!', 'Grab the pawn!'],
      ['the B attacks the R', 'the bishop attacks the rook'],
      ['the piece at f3 (P) is hanging', 'the piece at f3 (pawn) is hanging'],
    ];
    for (const [input, expected] of expandCases) {
      it(`${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
        expect(sanitizeForTTS(input)).toBe(expected);
      });
    }
  });

  describe('bracketed / arrowed piece-on-square shorthand', () => {
    it('"P(f3)" is expanded to "pawn on f3"', () => {
      // We accept the trailing ")" left behind — downstream TTS handles it fine.
      expect(sanitizeForTTS('The P(f3) is hanging')).toContain('pawn on f3');
    });
    it('arrow shorthand "P → f3" → "pawn on f3"', () => {
      expect(sanitizeForTTS('P → f3')).toBe('pawn on f3');
    });
    it('dashed shorthand "P-f3" → "pawn on f3"', () => {
      expect(sanitizeForTTS('see P-f3')).toContain('pawn on f3');
    });
    it('parenthesized "(on f3)" form still expands', () => {
      expect(sanitizeForTTS('P (on f3)')).toContain('pawn on f3');
    });
  });

  describe('SAN moves', () => {
    it('"Nxf7" → "knight takes f7"', () => {
      expect(sanitizeForTTS('Nxf7 is the move')).toBe('knight takes f7 is the move');
    });
    it('"Bc4" → "bishop to c4"', () => {
      expect(sanitizeForTTS('play Bc4')).toBe('play bishop to c4');
    });
    it('pawn capture "exd5" → "e-pawn takes d5"', () => {
      expect(sanitizeForTTS('exd5 opens the center')).toBe('e-pawn takes d5 opens the center');
    });
    it('castling "O-O" → "castle kingside"', () => {
      expect(sanitizeForTTS('then O-O')).toBe('then castle kingside');
    });
    it('castling "O-O-O" → "castle queenside"', () => {
      expect(sanitizeForTTS('then O-O-O')).toBe('then castle queenside');
    });
  });

  describe('general-English false-positive guards', () => {
    const noChangeCases = [
      'Plan B',
      'Plan B.',
      'Section R',
      'part Q',
      'Dr. P',
      'R.I.P.',
      'Q and A',
      'Option B',
      'Table 1: P vs Q matchup',
    ];
    for (const input of noChangeCases) {
      it(`${JSON.stringify(input)} is left unchanged`, () => {
        expect(sanitizeForTTS(input)).toBe(input);
      });
    }
  });

  describe('detectSanitizerLeak (defense-in-depth)', () => {
    // Should flag — piece-letter shorthand in a chess context
    const shouldLeak = [
      'hanging P on f3',
      'the Q attacks',
      'your R is pinned',
      'save the B',
      'N hangs',
      'P to d4',
      "Black's P on d5",
    ];
    for (const t of shouldLeak) {
      it(`flags ${JSON.stringify(t)}`, () => {
        expect(detectSanitizerLeak(t)).toBe(true);
      });
    }

    // Should NOT flag — sanitized output or general English
    const shouldNotLeak = [
      'hanging pawn on f3',
      'the queen attacks',
      'Plan B',
      'Section R',
      'Q and A',
      'Dr. P',
      'R.I.P.',
      'This is just normal narration without chess shorthand.',
      '',
    ];
    for (const t of shouldNotLeak) {
      it(`passes ${JSON.stringify(t)}`, () => {
        expect(detectSanitizerLeak(t)).toBe(false);
      });
    }
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizeForTTS('')).toBe('');
    });
    it('handles plain prose without chess notation', () => {
      const text = 'This is a normal sentence without any chess shorthand.';
      expect(sanitizeForTTS(text)).toBe(text);
    });
    it('handles already-expanded narration', () => {
      const text = 'The knight on f3 is hanging.';
      expect(sanitizeForTTS(text)).toBe(text);
    });
    it('handles mixed shapes in one sentence', () => {
      // "a B" via AFTER_CONTEXT + "Q to d8" via ISOLATED → both expanded
      expect(sanitizeForTTS('Trade a B for Q to d8')).toBe('Trade a bishop for queen to d8');
    });
  });
});

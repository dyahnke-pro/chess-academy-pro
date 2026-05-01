import { describe, it, expect } from 'vitest';
import { sanitizeCoachText, sanitizeCoachStream, formatForSpeech } from './sanitizeCoachText';

describe('sanitizeCoachText', () => {
  describe('passthrough', () => {
    it('returns plain text unchanged', () => {
      expect(sanitizeCoachText('Knight to f3 develops the kingside.')).toBe(
        'Knight to f3 develops the kingside.',
      );
    });

    it('handles unicode + punctuation cleanly', () => {
      expect(sanitizeCoachText('Mmm — that’s the Italian Game!')).toBe(
        'Mmm — that’s the Italian Game!',
      );
    });
  });

  describe('null-ish and empty inputs', () => {
    it.each([
      ['', ''],
      [' ', ''],
      ['\n\n', ''],
      ['\t  \t', ''],
    ])('%j → %j', (input, expected) => {
      expect(sanitizeCoachText(input)).toBe(expected);
    });

    it('null returns empty string', () => {
      expect(sanitizeCoachText(null)).toBe('');
    });

    it('undefined returns empty string', () => {
      expect(sanitizeCoachText(undefined)).toBe('');
    });
  });

  describe('double-bracket markup', () => {
    it('strips a single [[ACTION:...]] tag', () => {
      const input =
        'Looking up. [[ACTION:lichess_opening_lookup {"fen":"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"}]] One sec.';
      expect(sanitizeCoachText(input)).toBe('Looking up. One sec.');
    });

    it('strips multiple actions in one string', () => {
      const input =
        'First [[ACTION:list_games {"limit":3}]] then [[ACTION:analyze_game {"id":"g-1"}]] done.';
      expect(sanitizeCoachText(input)).toBe('First then done.');
    });

    it('strips action with deeply nested JSON braces', () => {
      const input =
        'Setting up [[ACTION:foo {"x":{"y":{"z":[1,2,3]}}}]] there.';
      expect(sanitizeCoachText(input)).toBe('Setting up there.');
    });

    it('strips action whose args span newlines', () => {
      const input = 'Calling [[ACTION:complex {\n  "fen": "rnbqkbnr/...",\n  "depth": 12\n}]] now.';
      expect(sanitizeCoachText(input)).toBe('Calling now.');
    });

    it('strips other directive shapes', () => {
      expect(sanitizeCoachText('Look at [[BOARD:arrow:e2-e4:green]] this.')).toBe(
        'Look at this.',
      );
      expect(sanitizeCoachText('Say [[SPEAK:"hello"]] aloud.')).toBe('Say aloud.');
      expect(sanitizeCoachText('Go to [[NAVIGATE:"/coach/teach"]] there.')).toBe(
        'Go to there.',
      );
    });

    it('strips a no-args directive (just [[NAME]])', () => {
      expect(sanitizeCoachText('Reset [[RESET_BOARD]] and try.')).toBe('Reset and try.');
    });
  });

  describe('legacy single-bracket markup', () => {
    it('strips legacy [ACTION: ...]', () => {
      expect(
        sanitizeCoachText('Try this [ACTION: drill_opening:sicilian-najdorf] today.'),
      ).toBe('Try this today.');
    });

    it('strips multiple legacy single-bracket tags', () => {
      const input = '[ACTION: puzzle_theme:fork] and [ACTION: drill_opening:queens-gambit]';
      expect(sanitizeCoachText(input)).toBe('and');
    });

    it('strips [BOARD: ...] legacy tag', () => {
      expect(sanitizeCoachText('Look [BOARD: arrow:e2-e4:green] there.')).toBe(
        'Look there.',
      );
    });

    it('does NOT touch chess-notation single brackets', () => {
      // Legitimate chess prose uses brackets in patterns like
      // "[1.e4 e5 2.Nf3]" or "[White to move]". The legacy regex
      // requires a colon-separated DIRECTIVE name (uppercase, 2+ chars)
      // so plain bracketed prose stays.
      expect(sanitizeCoachText('Position [White to move] is sharp.')).toBe(
        'Position [White to move] is sharp.',
      );
      expect(sanitizeCoachText('Move list: [1.e4 e5 2.Nf3].')).toBe(
        'Move list: [1.e4 e5 2.Nf3].',
      );
    });
  });

  describe('whitespace cleanup', () => {
    it('collapses multiple spaces left by stripped tags', () => {
      // Tag stripped → leaves "Knight  to f3" (double space) → "Knight to f3"
      expect(sanitizeCoachText('Knight [[ACTION:foo]] to f3')).toBe('Knight to f3');
    });

    it('trims leading and trailing whitespace', () => {
      expect(sanitizeCoachText('   hello   ')).toBe('hello');
    });

    it('keeps single newlines untouched', () => {
      expect(sanitizeCoachText('Line one.\nLine two.')).toBe('Line one.\nLine two.');
    });
  });

  describe('mid-sentence stripping reads grammatical', () => {
    it('strips action mid-sentence and the sentence still flows', () => {
      const input =
        "I'll set the board now [[ACTION:set_board_position {\"fen\":\"rnbqkbnr/8\"}]] and we'll go from there.";
      const out = sanitizeCoachText(input);
      expect(out).toBe(
        "I'll set the board now and we'll go from there.",
      );
      // No leftover brackets, no double-spaces, no trailing comma issues.
      expect(out).not.toMatch(/\[\[/);
      expect(out).not.toMatch(/\s{2,}/);
    });
  });

  describe('idempotency', () => {
    it('sanitize(sanitize(x)) === sanitize(x)', () => {
      const inputs = [
        'plain text',
        '[[ACTION:foo]] hello',
        'mixed [[ACTION:a]] and [[BOARD:b]] here',
        '   [[ACTION:foo]]   ',
      ];
      for (const i of inputs) {
        const once = sanitizeCoachText(i);
        const twice = sanitizeCoachText(once);
        expect(twice).toBe(once);
      }
    });
  });
});

describe('sanitizeCoachStream', () => {
  it('emits a clean buffer when no markup is in flight', () => {
    const r = sanitizeCoachStream('Hello there, knight to f3.');
    expect(r.safe).toBe('Hello there, knight to f3.');
    expect(r.pending).toBe('');
  });

  it('strips a complete markup mid-buffer and returns no pending', () => {
    // Streaming preserves trailing whitespace by design — sentence
    // splitter / chat renderer trims sentences before display / TTS.
    const r = sanitizeCoachStream('Hello [[ACTION:foo]] world.');
    expect(r.safe).toBe('Hello world.');
    expect(r.pending).toBe('');
  });

  it('holds back everything from a half-arrived [[ marker', () => {
    // Imagine the chunk ended with "...so [[ACT" — we should NOT emit
    // the partial marker. Trailing space before `[[` is preserved on
    // the safe side so when the next chunk lands the tokens splice.
    const r = sanitizeCoachStream("Hello there, so [[ACT");
    expect(r.safe).toBe('Hello there, so ');
    expect(r.pending).toBe('[[ACT');
  });

  it('holds back when only the directive name has arrived', () => {
    const r = sanitizeCoachStream('Setting board [[ACTION');
    expect(r.safe).toBe('Setting board ');
    expect(r.pending).toBe('[[ACTION');
  });

  it('holds back when args are arriving but not closed', () => {
    const r = sanitizeCoachStream(
      'Looking [[ACTION:lichess_opening_lookup {"fen":"rnbqkb',
    );
    expect(r.safe).toBe('Looking ');
    expect(r.pending).toBe('[[ACTION:lichess_opening_lookup {"fen":"rnbqkb');
  });

  it('chunked stream sequence — partial then completion releases clean prose', () => {
    // Simulate two chunks. Caller would concat chunk1 + chunk2 into a
    // running buffer.
    const chunk1 = 'I will now [[ACT';
    const r1 = sanitizeCoachStream(chunk1);
    expect(r1.safe).toBe('I will now ');
    expect(r1.pending).toBe('[[ACT');

    // Caller buffers `pending`, appends chunk2.
    const chunk2 = 'ION:set_board_position {"fen":"rnb"}]] go from there.';
    const r2 = sanitizeCoachStream(r1.pending + chunk2);
    // Marker stripped, trailing prose comes through with leading space.
    expect(r2.safe).toBe(' go from there.');
    expect(r2.pending).toBe('');
  });

  it('streaming buffer never emits partial markup on safe output', () => {
    // Series of chunks, each scanned via sanitizeCoachStream. We
    // assert no `safe` output ever contains `[[`.
    const fullText = 'Hello [[ACTION:foo {"x":"y"}]] middle [[ACTION:bar]] end.';
    let buffer = '';
    let aggregated = '';
    // Feed character-by-character — worst case for streaming.
    for (const ch of fullText) {
      buffer += ch;
      const { safe, pending } = sanitizeCoachStream(buffer);
      aggregated += safe;
      buffer = pending;
    }
    // Whatever is still in the buffer at the end (none, in this case) gets flushed.
    aggregated += sanitizeCoachText(buffer);
    expect(aggregated).not.toMatch(/\[\[/);
    // Final aggregated should equal the sanitized full text up to whitespace.
    const finalText = aggregated.replace(/\s{2,}/g, ' ').trim();
    expect(finalText).toBe('Hello middle end.');
  });

  it('null / empty input safe', () => {
    expect(sanitizeCoachStream('')).toEqual({ safe: '', pending: '' });
    expect(sanitizeCoachStream(null)).toEqual({ safe: '', pending: '' });
    expect(sanitizeCoachStream(undefined)).toEqual({ safe: '', pending: '' });
  });
});

describe('formatForSpeech', () => {
  it('passes plain prose through unchanged', () => {
    expect(formatForSpeech('Knight to f3 develops the kingside.')).toBe(
      'Knight to f3 develops the kingside.',
    );
  });

  it('strips markdown bold markers around inline emphasis', () => {
    expect(formatForSpeech('The **f7 square** is the weak point.')).toBe(
      'The f7 square is the weak point.',
    );
  });

  it('strips italic markers', () => {
    expect(formatForSpeech('You need to know __when__ to break.')).toBe(
      'You need to know when to break.',
    );
  });

  it('drops standalone bold-marker fragments like ****', () => {
    expect(formatForSpeech('****')).toBe('');
    expect(formatForSpeech('**')).toBe('');
  });

  it('drops bare numbered-list leaders on their own line', () => {
    expect(formatForSpeech('1. The first thing')).toBe('The first thing');
    expect(formatForSpeech('12.  Twelfth point')).toBe('Twelfth point');
  });

  it('drops horizontal rules', () => {
    expect(formatForSpeech('---')).toBe('');
    expect(formatForSpeech('***')).toBe('');
    expect(formatForSpeech('___')).toBe('');
  });

  it('drops bullet markers but keeps the bullet content', () => {
    expect(formatForSpeech('* foo bar')).toBe('foo bar');
    expect(formatForSpeech('- foo bar')).toBe('foo bar');
  });

  it('preserves inline SAN move-numbers', () => {
    expect(formatForSpeech('After 1. e4 e5 2. Nc3 Nc6 3. Bc4 we reach the Vienna.'))
      .toBe('After 1. e4 e5 2. Nc3 Nc6 3. Bc4 we reach the Vienna.');
  });

  it('handles empty / null input', () => {
    expect(formatForSpeech('')).toBe('');
  });
});

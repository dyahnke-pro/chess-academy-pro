import { describe, expect, it } from 'vitest';
import {
  resolveCoachNarration,
  coachNarrationToLength,
  resolvePhaseNarrationVerbosity,
  resolveLlmNarrationDensity,
  applyBriefVoiceCap,
} from './coachNarration';

describe('resolveCoachNarration', () => {
  it('returns full for undefined prefs', () => {
    expect(resolveCoachNarration(undefined)).toBe('full');
    expect(resolveCoachNarration(null)).toBe('full');
  });

  it('returns full when no setting and no legacy gating', () => {
    expect(resolveCoachNarration({})).toBe('full');
  });

  it('respects explicit coachNarration over legacy fields', () => {
    expect(
      resolveCoachNarration({
        coachNarration: 'silent',
        coachCommentaryVerbosity: 'every-move',
      }),
    ).toBe('silent');
    expect(
      resolveCoachNarration({
        coachNarration: 'brief',
        phaseNarrationVerbosity: 'full',
      }),
    ).toBe('brief');
    expect(
      resolveCoachNarration({
        coachNarration: 'full',
        coachVerbosity: 'none',
      }),
    ).toBe('full');
  });

  it('derives silent when any legacy field is at its silent value', () => {
    expect(
      resolveCoachNarration({ coachCommentaryVerbosity: 'off' }),
    ).toBe('silent');
    expect(
      resolveCoachNarration({ phaseNarrationVerbosity: 'off' }),
    ).toBe('silent');
    expect(resolveCoachNarration({ coachVerbosity: 'none' })).toBe('silent');
  });

  it('derives brief when any legacy field is at its brief-equivalent', () => {
    expect(
      resolveCoachNarration({ coachCommentaryVerbosity: 'key-moments' }),
    ).toBe('brief');
    expect(
      resolveCoachNarration({ phaseNarrationVerbosity: 'brief' }),
    ).toBe('brief');
    expect(resolveCoachNarration({ coachVerbosity: 'fast' })).toBe('brief');
  });

  it('biases toward quieter end when signals conflict', () => {
    // Silent wins over brief.
    expect(
      resolveCoachNarration({
        coachCommentaryVerbosity: 'off',
        phaseNarrationVerbosity: 'brief',
      }),
    ).toBe('silent');
    // Brief wins over full.
    expect(
      resolveCoachNarration({
        coachCommentaryVerbosity: 'every-move',
        phaseNarrationVerbosity: 'brief',
      }),
    ).toBe('brief');
  });

  it('returns full when only loud legacy values are present', () => {
    expect(
      resolveCoachNarration({
        coachCommentaryVerbosity: 'every-move',
        phaseNarrationVerbosity: 'full',
        coachVerbosity: 'unlimited',
      }),
    ).toBe('full');
  });
});

describe('coachNarrationToLength', () => {
  it('maps the unified setting to NarrationLength', () => {
    expect(coachNarrationToLength('silent')).toBe('silent');
    expect(coachNarrationToLength('brief')).toBe('short');
    expect(coachNarrationToLength('full')).toBe('full');
  });
});

describe('resolvePhaseNarrationVerbosity', () => {
  it('defaults to standard for empty/undefined prefs', () => {
    expect(resolvePhaseNarrationVerbosity(undefined)).toBe('standard');
    expect(resolvePhaseNarrationVerbosity(null)).toBe('standard');
    expect(resolvePhaseNarrationVerbosity({})).toBe('standard');
  });

  it('maps unified coachNarration to phase verbosity', () => {
    expect(resolvePhaseNarrationVerbosity({ coachNarration: 'silent' })).toBe('off');
    expect(resolvePhaseNarrationVerbosity({ coachNarration: 'brief' })).toBe('brief');
    expect(resolvePhaseNarrationVerbosity({ coachNarration: 'full' })).toBe('standard');
  });

  it('coachNarration wins over legacy phaseNarrationVerbosity', () => {
    expect(
      resolvePhaseNarrationVerbosity({
        coachNarration: 'silent',
        phaseNarrationVerbosity: 'full',
      }),
    ).toBe('off');
    expect(
      resolvePhaseNarrationVerbosity({
        coachNarration: 'brief',
        phaseNarrationVerbosity: 'full',
      }),
    ).toBe('brief');
  });

  it('falls back to legacy phaseNarrationVerbosity when unified unset', () => {
    expect(
      resolvePhaseNarrationVerbosity({ phaseNarrationVerbosity: 'off' }),
    ).toBe('off');
    expect(
      resolvePhaseNarrationVerbosity({ phaseNarrationVerbosity: 'brief' }),
    ).toBe('brief');
    expect(
      resolvePhaseNarrationVerbosity({ phaseNarrationVerbosity: 'full' }),
    ).toBe('full');
  });
});

describe('resolveLlmNarrationDensity', () => {
  it('defaults to unlimited for empty/undefined prefs', () => {
    expect(resolveLlmNarrationDensity(undefined)).toBe('unlimited');
    expect(resolveLlmNarrationDensity(null)).toBe('unlimited');
    expect(resolveLlmNarrationDensity({})).toBe('unlimited');
  });

  it('maps unified coachNarration to LLM density', () => {
    expect(resolveLlmNarrationDensity({ coachNarration: 'silent' })).toBe('none');
    expect(resolveLlmNarrationDensity({ coachNarration: 'brief' })).toBe('fast');
    expect(resolveLlmNarrationDensity({ coachNarration: 'full' })).toBe('unlimited');
  });

  it('coachNarration wins over legacy coachVerbosity (silent/brief)', () => {
    expect(
      resolveLlmNarrationDensity({
        coachNarration: 'silent',
        coachVerbosity: 'unlimited',
      }),
    ).toBe('none');
    expect(
      resolveLlmNarrationDensity({
        coachNarration: 'brief',
        coachVerbosity: 'unlimited',
      }),
    ).toBe('fast');
  });

  it('Full mode honors the legacy coachVerbosity for power users', () => {
    expect(
      resolveLlmNarrationDensity({
        coachNarration: 'full',
        coachVerbosity: 'slow',
      }),
    ).toBe('slow');
    expect(
      resolveLlmNarrationDensity({
        coachNarration: 'full',
        coachVerbosity: 'medium',
      }),
    ).toBe('medium');
  });

  it('falls back to legacy coachVerbosity when unified unset', () => {
    expect(resolveLlmNarrationDensity({ coachVerbosity: 'fast' })).toBe('fast');
    expect(resolveLlmNarrationDensity({ coachVerbosity: 'none' })).toBe('none');
    expect(resolveLlmNarrationDensity({ coachVerbosity: 'unlimited' })).toBe('unlimited');
  });
});

describe('applyBriefVoiceCap', () => {
  it('passes through when verbosity is full', () => {
    const long = 'This is a long response. '.repeat(20).trim();
    const r = applyBriefVoiceCap(long, 'full');
    expect(r.text).toBe(long);
    expect(r.truncated).toBe(false);
  });

  it('passes through when verbosity is silent (caller decides whether to speak)', () => {
    const r = applyBriefVoiceCap('whatever', 'silent');
    expect(r.text).toBe('whatever');
    expect(r.truncated).toBe(false);
  });

  it('passes short text through unchanged on brief', () => {
    const short = 'Knight to f3.';
    const r = applyBriefVoiceCap(short, 'brief');
    expect(r.text).toBe(short);
    expect(r.truncated).toBe(false);
  });

  it('caps to 2 sentences on brief', () => {
    const text = 'First sentence is here. Second sentence is here. Third sentence is here. Fourth sentence is here.';
    const r = applyBriefVoiceCap(text, 'brief');
    expect(r.truncated).toBe(true);
    expect(r.text).not.toContain('Third');
    expect(r.text).not.toContain('Fourth');
    expect(r.text).toContain('First');
    expect(r.text).toContain('Second');
  });

  it('caps to 30 words on brief even if sentences fit', () => {
    // 35 words, single sentence so the sentence cap doesn't trigger
    // — only the word cap should fire.
    const text =
      'The Vienna Gambit starts with f4 a sharp pawn sacrifice to rip open the f-file for your rook giving you fast development and an attack on the f7 square which is often weak in many openings indeed.';
    const r = applyBriefVoiceCap(text, 'brief');
    expect(r.truncated).toBe(true);
    const wordCount = r.text.split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(30);
  });

  it("matches David's audit example — 497-char response gets clipped to ≤30 words on brief", () => {
    // From audit Finding 5 (the response that ignored "short"):
    const audited =
      "The move is f4 — that's what turns this into the Vienna Gambit. By pushing the f-pawn forward, you're offering it as a sacrifice to open up lines for your pieces and create attacking chances against Black's king. The key idea is to gain rapid development and put pressure on f7, which is often weak in the opening. This sacrifice can lead to dynamic positions where White has the initiative.";
    const r = applyBriefVoiceCap(audited, 'brief');
    expect(r.truncated).toBe(true);
    // Audit Finding 5 reported length=497 in prod; our test fixture
    // is shorter (we transcribed only the visible textPreview). 300
    // is the loose lower bound that proves the truncator fired.
    expect(r.originalLength).toBeGreaterThan(300);
    const words = r.text.split(/\s+/).length;
    expect(words).toBeLessThanOrEqual(30);
  });

  it('returns originalLength so callers can audit how much was clipped', () => {
    const r = applyBriefVoiceCap('  hello world  ', 'brief');
    expect(r.originalLength).toBe(15);
  });

  describe('Bug F regression — sentence splitter must not eat digits before periods', () => {
    // Live audit 2026-05-19: the previous regex
    // `/[^.!?\n]+(?<!\d)[.!?]?/g` backtracked when the SAN-disambiguation
    // lookbehind failed, dropping the digit from any SAN ending in
    // [1-8] followed by a period. Combined with the join-with-space,
    // the digit AND the period vanished from spoken output.

    it('"Nb4. Your opponent..." keeps the 4 and the period boundary', () => {
      // From audit Finding 179 (spoken "Well played, knight to b Your
      // opponent r" with the 4 silently dropped).
      const input = 'Well played, knight to b4. Your opponent responds with h5. Now we continue.';
      const r = applyBriefVoiceCap(input, 'brief');
      expect(r.text).toContain('knight to b4');
      expect(r.text).not.toMatch(/knight to b\s+Your/);
    });

    it('"Nbd7. Nbd7..." does NOT collapse into "Nbd Nbd7"', () => {
      // From audit Finding 217 (spoken "Correct, Nbd Nbd7 gets the
      // knight..." — the leading "Nbd7" lost its 7 AND its period).
      const input = 'Correct, Nbd7. Nbd7 gets the knight into the game. The knight is well-placed.';
      const r = applyBriefVoiceCap(input, 'brief');
      // The leading "Nbd7" must keep its 7.
      expect(r.text).toMatch(/Correct,\s+Nbd7\b/);
      // Must NOT have the truncated "Nbd " (with space, no digit).
      expect(r.text).not.toMatch(/\bNbd Nbd7\b/);
    });

    it('"cxd5. The position..." keeps the 5', () => {
      // From audit Finding 283 — "That's it! c-pawn takes d The position..."
      const input = "That's it. cxd5 picks up material. The position keeps getting better.";
      const r = applyBriefVoiceCap(input, 'brief');
      expect(r.text).toContain('cxd5');
      expect(r.text).not.toMatch(/cxd\s/);
    });

    it('"f3.f4 then..." does NOT split on SAN-disambiguation periods', () => {
      // SAN disambiguation: "f3." in opening notation isn't a sentence
      // end. Splitter must skip it and keep the following text.
      const input = 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 we reach the Italian Game. This is sharp.';
      const r = applyBriefVoiceCap(input, 'brief');
      // The early-out should fire (2 actual sentences within word
      // budget) and return the input unchanged.
      expect(r.truncated).toBe(false);
      expect(r.text).toContain('Nf3 Nc6');
    });

    it('joined sentences preserve their own terminators (no run-on speech)', () => {
      const input = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const r = applyBriefVoiceCap(input, 'brief');
      expect(r.truncated).toBe(true);
      // Both kept sentences should still have their terminators.
      expect(r.text).toMatch(/First sentence\..+Second sentence\./);
    });
  });
});

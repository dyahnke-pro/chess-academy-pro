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
});

import { describe, it, expect } from 'vitest';
import { spokenMoveLabel } from './reviewTurningPoint';
import { pastTenseReviewNarration } from './coachFeatureService';
import type { ReviewMoveSegment } from './coachFeatureService';

// ── THE REGISTER GATE ────────────────────────────────────────────────────────
// Three defects found 2026-09-16 by READING the shipped review narration of
// David's own Alapin game (audit-reports/review-overhaul-2026-09-16T16-08-38).
// Every unit test was green while all three were live in the voice, which is
// why the assertions below are written against the exact shipped strings.

describe('spokenMoveLabel — no move-number prefix in spoken prose (G9.4)', () => {
  it('moves the number out of prefix position for White', () => {
    expect(spokenMoveLabel('12. Ne5')).toBe('move 12, Ne5');
  });
  it('handles the Black ellipsis form', () => {
    expect(spokenMoveLabel('12… Nb6')).toBe('move 12, Nb6');
    expect(spokenMoveLabel('7... Nxd5')).toBe('move 7, Nxd5');
  });
  it('leaves a label with no number prefix alone', () => {
    expect(spokenMoveLabel('Ne5')).toBe('Ne5');
  });
  it('never leaves a bare "<n>." that TTS reads as a number', () => {
    for (const l of ['12. Ne5', '3… c5', '21. Rxa8']) {
      expect(/^\d+(\.|…|\.\.\.)/.test(spokenMoveLabel(l))).toBe(false);
    }
  });
});

const past = (narration: string): string => {
  const seg = { narration } as unknown as ReviewMoveSegment;
  pastTenseReviewNarration([seg]);
  return (seg as { narration: string }).narration;
};

describe('pastTenseReviewNarration — retrospective, but never over a plan', () => {
  it('past-tenses a statement of what happened', () => {
    expect(past("You're clearly better.")).toBe('You were clearly better.');
    expect(past("That's the same knight again.")).toBe('That was the same knight again.');
  });

  it('PRESERVES the capital — a sentence never opens lowercase', () => {
    // Shipped: "you were balanced: you were two pieces further developed."
    // "That's your cue to take over" became "that was your cue to take over".
    for (const src of ["You're balanced.", "That's your cue.", "They're building something.", "It's open."]) {
      const out = past(src);
      expect(out[0]).toBe(out[0].toUpperCase());
    }
  });

  it('NEVER past-tenses a plan — it describes what to do next', () => {
    // Shipped nonsense, verbatim from David's Alapin review:
    const plan = "The plan from here is to rescue your worst piece. Here's how: don't play a single attacking move until it's fixed, because a piece doing nothing means you're effectively playing down a piece.";
    const out = past(plan);
    expect(out).toContain("until it's fixed");
    expect(out).toContain("you're effectively playing down a piece");
    expect(out).not.toContain('it was fixed');
    expect(out).not.toContain('you were effectively');
  });

  it('is consistent whatever the sentence ORDER — the old marker-cut was not', () => {
    // Same two sentences, both orders. The old positional cut past-tensed
    // "Watch what they're building" in one order and not the other.
    const a = past("You're a bit worse. Watch what they're building — their idea runs Nxd5.");
    const b = past("Watch what they're building — their idea runs Nxd5. You're a bit worse.");
    expect(a).toContain("Watch what they're building");
    expect(b).toContain("Watch what they're building");
    expect(a).toContain('You were a bit worse');
    expect(b).toContain('You were a bit worse');
  });

  it('is lossless on whitespace', () => {
    const src = "You're better.  They're worse.\nThe plan from here is to push.";
    expect(past(src)).toBe("You were better.  They were worse.\nThe plan from here is to push.");
  });
});

describe('the past-tense pass leaves instructions alone and keeps one tense (walk 5, R17/R18)', () => {
  it('every sentence of a HOW stays an instruction — never "check, captured, threat"', () => {
    const out = past("The move looks fine for two moves — then fxe6 lands. Here's how: Calculate to a QUIET position, not to a good feeling. Follow every forcing reply — check, capture, threat — until nothing forces, then judge.");
    expect(out).toMatch(/check, capture, threat/);
    expect(out).not.toMatch(/captured, threat/);
  });
  it('the rotated HOW stems are instructions too', () => {
    expect(past('The habit that fixes it: take the free piece first.')).toMatch(/take the free piece/);
  });
  it('"the move X captures …, creates …, wins …" moves as one tense', () => {
    const out = past('Your opponent: the move Qxh7 captures the pawn, creates a passed pawn on h2, wins material.');
    expect(out).toMatch(/Qxh7 captured the pawn, created a passed pawn on h2, won material/);
  });
});

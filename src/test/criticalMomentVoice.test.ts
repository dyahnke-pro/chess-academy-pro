/**
 * The CRIT row's three outcomes, including the one prod would not produce.
 *
 * 🚨 WHY THIS EXISTS. `CRIT spoken-names-count-and-stake` has three branches
 * and, after three prod review runs, one of them had still never executed.
 * Every rotation came back `register=credit`, so CLAIMED-ELSEWHERE — the
 * branch the fix was written for — stayed unverified, and there was no reason
 * to think the next rotation would be different.
 *
 * "Keep running the audit until a rare game turns up" is not a plan; it is
 * hoping. A branch that only a rare game can reach is testable by being a PURE
 * FUNCTION, which is why `judgeCriticalVoice` was lifted out of the audit.
 *
 * The distinction it protects is not cosmetic. A moment the question plan owns
 * is SUPPOSED to be quiet in the critical register — `handleWalkForward`
 * suppresses the beat so the card is not handed its own answer. But "another
 * card owns it" may never be assumed: an unconditional yield to a sibling that
 * never claims it is a real defect, and the student gets nothing. That was
 * measured on a prod tape at ply 64 — "the punishment Bd7+ is immediate —
 * another fundamental owns it", with no other fundamental firing. A row that
 * excused itself on the assumption would have blessed exactly that.
 */

import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types shipped
import { judgeCriticalVoice, sanToWords } from '../../scripts/audit-lib/critical-moment-voice.mjs';

describe('sanToWords — the coach speaks moves, it never spells SAN', () => {
  it('renders the spoken form the narration actually uses', () => {
    expect(sanToWords('Ke6')).toBe('king to e6');
    expect(sanToWords('Nd6')).toBe('knight to d6');
    expect(sanToWords('e4')).toBe('pawn to e4');
    expect(sanToWords('Bd7+')).toBe('bishop to d7');
  });

  it('handles captures and disambiguators — a first cut went blind on both', () => {
    // Returning null on a capture would have blinded the row to exactly the
    // moves a critical moment tends to be about.
    expect(sanToWords('Qxa5')).toBe('queen takes a5');
    expect(sanToWords('exd5')).toBe('pawn takes d5');
    expect(sanToWords('Nbd7')).toBe('knight to d7');
  });

  it('returns null rather than guessing when there is no destination square', () => {
    expect(sanToWords('O-O')).toBeNull();
    expect(sanToWords('')).toBeNull();
    expect(sanToWords(undefined as unknown as string)).toBeNull();
  });
});

describe('judgeCriticalVoice — three outcomes, never two', () => {
  it('n/a when no moment was selected', () => {
    const r = judgeCriticalVoice({ momentSelected: false, criticalLines: [], playedSan: null, spoken: [] });
    expect(r.verdict).toBe('not-applicable');
    expect(r.pass).toBe(true);
  });

  it('SPOKEN-HERE — the critical register said it (the branch prod keeps producing)', () => {
    const r = judgeCriticalVoice({
      momentSelected: true,
      criticalLines: ['That was a critical moment. Only one move kept you level here, and it was rook to d1.'],
      playedSan: 'Rd1',
      spoken: ['That was a critical moment. Only one move kept you level here, and it was rook to d1.'],
    });
    expect(r.verdict).toBe('spoken-here');
    expect(r.pass).toBe(true);
  });

  it('CLAIMED-ELSEWHERE by the SPOKEN form — the branch three prod runs never reached', () => {
    // The real tape: moment selected at ply 68 with played=Ke6, and the
    // turning-point reveal named it in words rather than SAN.
    const r = judgeCriticalVoice({
      momentSelected: true,
      criticalLines: [],
      playedSan: 'Ke6',
      spoken: [
        'Not quite. The game turned at move 34, king to e6 — about 296.7 points.',
        'Your rook clamps down on c4.',
      ],
    });
    expect(r.verdict).toBe('claimed-elsewhere');
    expect(r.pass).toBe(true);
    expect(r.detail).toMatch(/quiet here BY DESIGN/);
    expect(r.detail, 'the row must NAME the line that claimed it, not just assert one existed')
      .toMatch(/king to e6/);
  });

  it('CLAIMED-ELSEWHERE by the raw SAN too', () => {
    const r = judgeCriticalVoice({
      momentSelected: true,
      criticalLines: [],
      playedSan: 'Nxg3',
      spoken: ['The turning point was Nxg3.'],
    });
    expect(r.verdict).toBe('claimed-elsewhere');
  });

  it('SILENT — a yield to a card that never claimed it is a RED', () => {
    // The ply-64 defect in miniature: the beat deferred, nothing else spoke,
    // and the student got nothing. This must never be excused.
    const r = judgeCriticalVoice({
      momentSelected: true,
      criticalLines: [],
      playedSan: 'Kc8',
      spoken: ['Your pawn on c6 now fights for d5.', 'Their knight on f3 now fights for e5.'],
    });
    expect(r.verdict).toBe('silent');
    expect(r.pass).toBe(false);
    expect(r.detail).toMatch(/NOTHING said it aloud/);
  });

  it('a near-miss does NOT count as a claim', () => {
    // "e6" appearing inside another square's prose must not excuse the row —
    // the match has to be the move, not a substring coincidence that happens
    // to look like one.
    const r = judgeCriticalVoice({
      momentSelected: true,
      criticalLines: [],
      playedSan: 'Ke6',
      spoken: ['Your pawn on e6 is backward.'],
    });
    expect(r.verdict, 'naming the SQUARE is not naming the MOVE').toBe('silent');
  });
});

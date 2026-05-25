import { describe, it, expect } from 'vitest';
import commonMistakesData from './common-mistakes.json';
import type { CommonMistake } from '../types';

const data = commonMistakesData as Record<string, CommonMistake[]>;

// Masterclass openings ship the consolidated Pitfalls WLPP tab, so their common
// mistakes MUST carry BOTH narration registers, hand-authored (David 2026-05-24):
//   - explanation     → Watch / Learn-FULL (full prose)
//   - shortNarration  → Learn-LIMITED (≤8-word cue)
// Non-masterclass openings use the graceful fallback (move dictation) and are
// not gated here. Add an opening to this list when it gets the masterclass build.
const MASTERCLASS = ['ruy-lopez', 'vienna-game', 'caro-kann', 'pirc-defence', 'italian-game'];

const CUE_WORD_CAP = 8;
function wordCount(s: string): number {
  return s
    .replace(/[—–-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;
}

describe('common-mistake narration — two registers on masterclass Pitfalls', () => {
  for (const id of MASTERCLASS) {
    const mistakes = data[id] ?? [];
    it(`${id}: has common mistakes to narrate`, () => {
      expect(mistakes.length).toBeGreaterThan(0);
    });

    mistakes.forEach((m, i) => {
      it(`${id}[${i}] (${m.wrongMove}→${m.correctMove}): full explanation present`, () => {
        expect(m.explanation.trim().length).toBeGreaterThan(0);
      });

      it(`${id}[${i}] (${m.wrongMove}→${m.correctMove}): hand-authored ≤${CUE_WORD_CAP}-word short cue`, () => {
        expect(m.shortNarration?.trim(), `${id}[${i}] missing shortNarration (Learn-LIMITED cue)`).toBeTruthy();
        const n = wordCount(m.shortNarration ?? '');
        expect(n, `${id}[${i}] cue "${m.shortNarration}" is ${n} words (cap ${CUE_WORD_CAP})`).toBeLessThanOrEqual(CUE_WORD_CAP);
      });
    });
  }
});

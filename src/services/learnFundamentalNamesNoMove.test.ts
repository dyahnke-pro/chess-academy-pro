// Learn audit on prod (2026-10-13): "Rooks belong on open files: the d-file was
// open and Rd4 takes it" — Learn free play names no move unasked (2026-10-10),
// and the fundamental handed over the move. The same attribution, through the
// real renderer, both ways.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { PrincipleAttribution } from './principleAttribution';

const OPEN_FILE: PrincipleAttribution = {
  id: 'rook-ignored-open-file', tag: 'rook-ignored-open-file' as PrincipleAttribution['tag'], weight: 80, coOccurrence: false,
  evidence: { squares: ['d4'], moves: [], pvMoves: [], counterfactualClean: true } as PrincipleAttribution['evidence'],
  facts: { file: 'd', better: 'Rd4' },
};
vi.mock('./liveFundamental', async (orig) => ({
  ...(await orig<typeof import('./liveFundamental')>()),
  attributeLiveFundamental: () => [OPEN_FILE],
}));

import { learnFundamentalVerdict, type LearnFundamentalInput } from './learnFundamentalNarration';

const INPUT: Omit<LearnFundamentalInput, 'namesBetterMove'> = {
  currentGameId: 'g', replySan: null, fenBefore: '7Q/ppp2p1p/2k1p3/B7/2n1r3/8/PPP1BPP1/2KR3R w - - 3 19',
  historySans: ['e4'], playedSan: 'Kc6', bestSan: 'Rd4', studentColor: 'black', costCp: null,
};

describe('a Learn fundamental never names the move', () => {
  it('namesBetterMove: false — the move-free form', () => {
    for (let ply = 0; ply < 3; ply += 1) {
      const v = learnFundamentalVerdict({ ...INPUT, historySans: Array(ply + 1).fill('e4'), namesBetterMove: false }, new Set());
      expect(v?.verdict).toBeTruthy();
      expect(v!.verdict).not.toMatch(/Rd4/);
    }
  });
  it('NEGATIVE CONTROL: where a surface may name it, it does', () => {
    const v = learnFundamentalVerdict({ ...INPUT, namesBetterMove: true }, new Set());
    expect(v!.verdict).toMatch(/Rd4/);
  });
  it('Learn passes false, and a mate it allowed holds the fundamental', () => {
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/namesBetterMove: false,/);
    expect(src).toMatch(/const fund = look\.stakes\?\.mate\?\.for === 'them' \? null : fundamental;/);
  });
});

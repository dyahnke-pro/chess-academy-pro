// ONE HOLE, ONE KEY (dup map #5, OS-11 g3): the d5 hole was said at 10.Nf3 by
// the opening story ("has a cost for them: no pawn of theirs can cover d5
// again") and again at 11.O-O by the pawn judgement ("so that square stays a
// hole for them"). Every hole reading now says it under `hole:<sq>`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mirroredAsymmetry } from './pawnJudgement';
import { buildVoicePackage, spokenSentenceKeys } from './voicePackage';

const AFTER_BC7 = 'r1bqr1k1/2bp1ppp/p4n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2Q1RK1 w - - 2 12';

describe('the d5 hole is one claim', () => {
  it('the pawn judgement keys its hole for them as hole:d5', () => {
    const r = mirroredAsymmetry(AFTER_BC7, 'w');
    expect(r?.text).toMatch(/stays a hole for them/);
    expect(r?.key).toBe('hole:d5');
  });
  it('the opening story keys the holes it names the same way', () => {
    const src = readFileSync('src/services/openingStory.ts', 'utf8');
    expect(src).not.toMatch(/story:(gift|cost):/);
    expect((src.match(/claimKey: holeKey\(h\.hole\)/g) ?? []).length).toBe(2);
  });
  it('once hole:d5 was said, the second hole sentence is dropped', () => {
    const r = mirroredAsymmetry(AFTER_BC7, 'w')!;
    const said = { kind: 'computed' as const, text: 'Their c5 has a cost for them: no pawn of theirs can cover d5 again.', fen: AFTER_BC7, claims: ['hole:d5'] };
    const pkg = buildVoicePackage([{ kind: 'computed', text: r.text, fen: AFTER_BC7, claims: [r.key] }], '', new Set(spokenSentenceKeys({ kept: [said] })));
    expect(pkg.kept).toHaveLength(0);
  });
});

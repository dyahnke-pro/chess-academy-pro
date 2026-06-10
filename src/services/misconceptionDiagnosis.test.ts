import { describe, it, expect } from 'vitest';
import { diagnoseMisconception, AUTO_TAG_CONFIDENCE, type MisconceptionDiagnosisInput } from './misconceptionDiagnosis';
import { isMisconceptionTagId } from '../data/misconceptionTags';

// The code-first diagnosis layer: the board decides the bucket, ranked by
// confidence. ≥0.90 & clear → auto-tag; else → pop the ranked-candidate picker.
// `random` is NEVER produced here (user-only escape).

function inp(over: Partial<MisconceptionDiagnosisInput>): MisconceptionDiagnosisInput {
  return {
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    playedSan: 'e4',
    studentColor: 'white',
    ...over,
  };
}

describe('diagnoseMisconception — the code-first diagnosis spine', () => {
  it('flags a hung piece (queen walks onto an attacked square) at ≥0.90 → auto-tag', () => {
    // White e4 played, Black pawn on g6 (attacks h5). White blunders Qh5 — the
    // g6 pawn wins the queen. The queen is en prise after the move.
    const d = diagnoseMisconception(inp({
      fenBefore: 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      playedSan: 'Qh5',
      evalBeforeStudent: 20,
      evalAfterStudent: -800,
      studentColor: 'white',
    }));
    expect(d.top?.tag).toBe('hung-material');
    expect(d.top!.confidence).toBeGreaterThanOrEqual(AUTO_TAG_CONFIDENCE);
    expect(d.needsPicker).toBe(false); // clear top ≥0.90
  });

  it('a SOUND move (tiny drop, nothing fired) does NOT pop the picker', () => {
    const d = diagnoseMisconception(inp({
      fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'e4',
      evalBeforeStudent: 25,
      evalAfterStudent: 20, // 5cp drop — not a mistake
    }));
    expect(d.candidates).toEqual([]);
    expect(d.top).toBeNull();
    expect(d.needsPicker).toBe(false); // fine move — don't bug the user
  });

  it('an UNCLASSIFIED slip (real drop, nothing concrete fired) DOES pop the picker', () => {
    // A quiet king move in a bare K+K position with a real eval drop: nothing
    // hangs, it's not forcing / a pawn break / low-scope, so no specific
    // detector buckets it → ask the user (the judgment floor), don't drop it.
    const d = diagnoseMisconception(inp({
      fenBefore: '8/8/8/4k3/8/8/4K3/8 w - - 0 1',
      playedSan: 'Kd2',
      cpLossStudent: 70,
      studentColor: 'white',
    }));
    expect(d.candidates).toEqual([]);
    expect(d.needsPicker).toBe(true);
  });

  it('pops the picker when the top two causes are tied (can\'t attribute)', () => {
    // 1.e4 e5 2.Nf3 Nc6, White grabs Nxe5?? — e5 is defended by the c6 knight,
    // so the knight both hangs (0.95) AND it was a forcing capture that
    // backfired / a bad trade — multiple causes within 0.1 → tie → picker.
    const d = diagnoseMisconception(inp({
      fenBefore: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
      playedSan: 'Nxe5',
      evalBeforeStudent: 15,
      evalAfterStudent: -260,
      studentColor: 'white',
    }));
    expect(d.candidates.length).toBeGreaterThanOrEqual(2);
    expect(d.needsPicker).toBe(true);
  });

  it('NEVER produces random / other (user-only escape), across cases', () => {
    const cases = [
      inp({ fenBefore: 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', playedSan: 'Qh5', evalBeforeStudent: 20, evalAfterStudent: -800 }),
      inp({ playedSan: 'e4', evalBeforeStudent: 25, evalAfterStudent: 20 }),
    ];
    for (const c of cases) {
      for (const cand of diagnoseMisconception(c).candidates) {
        expect(cand.tag).not.toBe('random');
        expect(cand.tag).not.toBe('other');
      }
    }
  });

  it('only ever emits valid closed-set tag ids', () => {
    const d = diagnoseMisconception(inp({
      fenBefore: 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      playedSan: 'Qh5', evalBeforeStudent: 20, evalAfterStudent: -800,
    }));
    for (const c of d.candidates) expect(isMisconceptionTagId(c.tag)).toBe(true);
  });

  it('does not crash on an unparseable / illegal input (no signal → no picker)', () => {
    const d = diagnoseMisconception(inp({ fenBefore: 'not-a-fen', playedSan: 'e4' }));
    expect(d.top).toBeNull();
    expect(d.candidates).toEqual([]);
    expect(d.needsPicker).toBe(false); // can't parse + no eval drop → nothing to ask
  });
});

// WALKED INTO A TACTIC — the record half of the live grade's "that walked into
// a tactic" (2026-10-18). Real amateur game (acc-corpus 184648092550): with
// the knight on a7, …Rcb8 lets Nc6 fork the queen on e7 and the rook on b8.
// Before this, `calculation-depth` stood down ("the punishment is immediate —
// another fundamental owns it"), nothing owned it, and the slip was filed
// under `other` — a skill the heat map could never show.
import { describe, it, expect } from 'vitest';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { renderFundamentalVerdict } from './principleVoice';
import { attributePrinciples } from './principleAttribution';

const HISTORY = 'e4 e5 Nf3 Nc6 c3 Bc5 d4 exd4 cxd4 Bb6 d5 Nb4 a3 Na6 Bxa6 bxa6 O-O a5 Qb3 Ba6 Re1 d6 Be3 Nf6 Nfd2 O-O f3 Re8 Qa4 Qe7 Nc4 Bxc4 Qxc4 Bxe3+ Rxe3 Rab8 Nc3 Rxb2 Nb5 Rc8 Nxa7 Rcb8'.split(' ');
const FEN = '2r3k1/N1p1qppp/3p1n2/p2P4/2Q1P3/P3RP2/1r4PP/R5K1 b - - 0 21';

describe('walked-into-tactic', () => {
  it('files …Rcb8 (Nc6 forks queen and rook) under the opponent-threat skill, not `other`', () => {
    const cls = classifyMisconceptionNow({
      fen: FEN, playedSan: 'Rcb8', bestSan: 'Ra8', gamePhase: 'middlegame',
      historySans: HISTORY,
      pvAfterPlayed: ['Nc6', 'Qe8', 'Nxb8', 'Qxb8', 'Re2', 'Rb7'],
      pvAfterBest: ['Nc6', 'Qd7', 'a4', 'Rb6', 'Rf1'],
      evalBefore: -30, evalAfterPlayed: -230,
    });
    expect(cls?.tag).toBe('missed-opponents-threat');
    expect(cls?.fundamentalId).toBe('walked-into-tactic');
  });

  it('names the blow and what it wins, from the student seat', () => {
    const [a] = attributePrinciples({
      classification: 'mistake', bestSan: 'Ra8', historySans: HISTORY, replySan: null,
      pvAfterPlayed: ['Nc6', 'Qe8', 'Nxb8', 'Qxb8', 'Re2', 'Rb7'],
      pvAfterBest: ['Nc6', 'Qd7', 'a4', 'Rb6', 'Rf1'],
    });
    expect(a?.id).toBe('walked-into-tactic');
    const said = renderFundamentalVerdict([a], { ply: 42, seen: new Set(), replySan: 'Nc6' });
    expect(said).toMatch(/Nc6/);
    // What the line wins, in words (the proof rule, 2026-10-20): the rook for
    // the knight that took it.
    expect(said).toMatch(/they win the exchange/);
    expect(said).not.toMatch(/\b(I|we|our)\b/);
  });

  it('NEGATIVE CONTROL: a quiet line that wins nothing is never a tactic walked into', () => {
    const out = attributePrinciples({
      classification: 'mistake', bestSan: 'Ra8', historySans: HISTORY, replySan: null,
      pvAfterPlayed: ['h3', 'h6', 'Kh2', 'Kh7'],
      pvAfterBest: ['h3'],
    });
    expect(out.some((x) => x.id === 'walked-into-tactic')).toBe(false);
  });
});

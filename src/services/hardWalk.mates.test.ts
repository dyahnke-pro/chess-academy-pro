// Hard walk 2026-10-10 (WO-CHAT-01): 2000-level questions on engine-checked
// mates. Each test is a defect the prod walk found, on its real position.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildDeliberation, namedMoveAnswer, spokenLines } from './deliberation';
import { assembleEngineReasoning, assembleKingSafetyAnswer, assembleThreatAnswer, assembleMoveEvalAnswer, mateThreatsAgainst } from './groundedAnswer';
import { moverLossProof, proofAgainstMover } from './exchangeLedger';

// 0GomC: White mates in 4 — Nh6+ Kf8 Qf6+ Ke8 Bb5+ c6 Bxc6#. Black threatens …Qxg2#.
const GOMC = '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33';
const toUci = (fen: string, sans: string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};
const MATE = ['Nh6+', 'Kf8', 'Qf6+', 'Ke8', 'Bb5+', 'c6', 'Bxc6#'];

describe('hard walk — mates', () => {
  it('a move that starts a forced mate is best because of the mate, not a square', () => {
    const d = buildDeliberation({
      analysis: { topLines: [{ rank: 1, evaluation: 0, mate: 4, moves: toUci(GOMC, MATE) }] },
      fenBefore: GOMC, moverColor: 'w', opponentLastSan: null,
    })!;
    expect(d.bestWhy).toBe('starts a forced mate in 4');
    expect(d.bestLineSans).toEqual(MATE);
  });

  it('the line an answer recites is handed to the board, and only that line', () => {
    const d = buildDeliberation({
      analysis: { topLines: [{ rank: 1, evaluation: 0, mate: 4, moves: toUci(GOMC, MATE) }] },
      fenBefore: GOMC, moverColor: 'w', opponentLastSan: null,
      named: { lineUci: toUci(GOMC, MATE), evaluation: 0, mate: 4 },
    })!;
    const text = namedMoveAnswer(d, 'why-best')!;
    expect(text).toMatch(/^Nh6\+ is the best move here — it starts a forced mate in 4\./);
    const lines = spokenLines(d, GOMC, text);
    expect(lines).toHaveLength(1);
    expect(lines[0].plies.map((p) => p.san)).toEqual(MATE);
    expect(spokenLines(d, GOMC, 'Nothing about a line here.')).toEqual([]);
  });

  it('a rule-out keeps its moves beside its words', () => {
    const p = moverLossProof(GOMC, toUci(GOMC, ['Qxc7', 'Qxg2#']), 'w')!;
    expect(p.short).toBe("Qxc7 and Qxg2# — and it's mate");
    expect(p.line?.sans).toEqual(['Qxc7', 'Qxg2#']);
    expect(proofAgainstMover(GOMC, toUci(GOMC, ['Qxc7', 'Qxg2#']), 'w')).toBe(p.short);
  });

  it('"is my king safe?" names a mate one move away', () => {
    expect(mateThreatsAgainst(GOMC, 'w')).toEqual(['Qxg2#']);
    const a = assembleKingSafetyAnswer(GOMC, 'white', 'me')!;
    expect(a.facts).toMatch(/^Your king is not safe: they threaten …Qxg2# — mate\./);
  });

  it('"what do they threaten?" leads with the mate, then the material', () => {
    const a = assembleThreatAnswer(GOMC, null, 'white', 'opponent')!;
    expect(a.facts).toMatch(/^They threaten …Qxg2# — mate\./);
  });

  it('a king with no mate against it gets no mate claim', () => {
    expect(mateThreatsAgainst('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toEqual([]);
  });

  it('"calculate the main line" says the proven line and plays it', () => {
    const a = assembleMoveEvalAnswer({ fen: GOMC, bestMoveUci: toUci(GOMC, ['Nh6+'])[0], studentColor: 'white', pvSan: MATE } as Parameters<typeof assembleMoveEvalAnswer>[0])!;
    expect(a.facts).toMatch(/Bxc6# — and it's mate/);
    expect(a.lines?.[0].plies.map((p) => p.san)).toEqual(MATE);
  });

  it('"what\'s their best defence?" names the engine reply when nothing is countable', () => {
    const PAWN = '8/8/1p4pp/p2k1p2/P2P1P1P/4K1P1/8/8 w - - 0 35';
    const pv = ['Kd3', 'Kd6', 'Kc4', 'Kc6', 'd5+', 'Kd6', 'Kb5'];
    const d = buildDeliberation({
      analysis: { topLines: [{ rank: 1, evaluation: 495, mate: null, moves: toUci(PAWN, pv) }] },
      fenBefore: PAWN, moverColor: 'w', opponentLastSan: null,
      named: { lineUci: toUci(PAWN, pv), evaluation: 495, mate: null },
    })!;
    expect(namedMoveAnswer(d, 'why-best')).toMatch(/Their best reply is Kd6\./);
  });

  it('the engine walk ("If Rxg5, then Nb5+") hands the moves it said to the board', () => {
    const SETUP = '8/5r2/1p1kpP2/n2p2P1/3P4/1PN3r1/P7/2R3K1 w - - 2 31';
    const a = assembleEngineReasoning({ fenBefore: SETUP, pvSan: ['Kf2', 'Rxg5', 'Nb5+', 'Kd7', 'Rc7+', 'Ke8'], moverColor: 'white' })!;
    expect(a.facts).toMatch(/If Rxg5, then Nb5\+/);
    expect(a.lines?.[0].plies.map((p) => p.san)).toEqual(['Kf2', 'Rxg5', 'Nb5+', 'Kd7', 'Rc7+']);
  });
});

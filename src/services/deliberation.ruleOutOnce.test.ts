import { describe, it, expect } from 'vitest';
import { buildDeliberation, deliberationWeighing, ruleOutClaims, NOTHING_SAID, type Deliberation } from './deliberation';
import { computePositionFacts } from './positionFacts';

// Learn prod audit 2026-10-21 (a Scandinavian, Black, moves 19–21): the coach
// ruled out …Re4+, …Rf4+ and …Rg4 one after another — "Then … they play Qxa7
// — they win a pawn" each time. Two defects behind one repeat: a loss the
// best move suffers too was offered as the reason, and a rule-out carried no
// say-once claim, so the same loose pawn was ruled out turn after turn.

// Stockfish 18 plies, MultiPV from the student's seat (evaluation White-POV).
const line = (rank: number, evaluation: number, uci: string) => ({ rank, evaluation, moves: uci.split(' '), mate: null });

describe('a loss every move suffers is not why one falls short', () => {
  // Move 19, Black to move. The best, …Rd6, loses a7 to Qxa7 as well.
  const fen = '2k4r/ppp2p1p/4pp2/2Q5/3r4/8/PPP1K1P1/R4B1R b - - 3 19';
  const d = buildDeliberation({
    fenBefore: fen, moverColor: 'b', opponentLastSan: null,
    analysis: { topLines: [
      line(1, 730, 'd4d6 c5a7 d6a6 a7d4 e6e5 d4g4 c8b8 g4g7 h8c8 g7f7'),
      line(2, 798, 'd4e4 e2f3 e4e5 c5a7 e5f5 f3e3 h8d8 h1h7 c8d7 h7f7'),
    ] } as never,
  }) as Deliberation;

  it('…Re4+ is not ruled out with the pawn the best move loses too', () => {
    expect(d.alternatives.find((a) => a.san === 'Re4+')?.proof).toBeUndefined();
    expect(deliberationWeighing(d, NOTHING_SAID)).not.toMatch(/Re4\+/);
  });
});

describe('a refutation the best move avoids still speaks', () => {
  // The best (O-O) keeps every piece; Nxe5 drops the knight for a pawn.
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 14';
  const d = buildDeliberation({
    fenBefore: fen, moverColor: 'w', opponentLastSan: null,
    analysis: { topLines: [
      line(1, 82, 'e1g1 f8e7 d2d4 d7d6 d4d5 c6b8 c4d3 g8f6 c2c4 b8d7'),
      line(2, -267, 'f3e5 c6e5 c4b3 d7d5 d2d4 e5g6 b1c3 d5e4 d1e2 g8f6'),
    ] } as never,
  }) as Deliberation;

  it('Nxe5 is ruled out with its line', () => {
    expect(deliberationWeighing(d, NOTHING_SAID)).toBe('Nxe5? Then they answer Nxe5 — you give up a knight for a pawn.');
  });
});

describe('one loss is ruled out once', () => {
  // Two candidates that lose the same pawn on a7 — one claim.
  const d: Deliberation = {
    best: { san: 'Kb8', evalCp: -300, deltaCp: 0 },
    alternatives: [
      { san: 'Rf4+', evalCp: -420, deltaCp: 120, shortfall: 'less-precise', proof: 'you play Rf4+ and, two moves later, they play Qxa7 — they win a pawn', proofSans: ['Rf4+', 'Ke3', 'Rf5', 'Qxa7'] },
      { san: 'Rg4', evalCp: -430, deltaCp: 130, shortfall: 'less-precise', proof: 'you play Rg4 and they answer Qxa7 — they win a pawn', proofSans: ['Rg4', 'Qxa7'] },
    ],
    isRealChoice: true,
    bestWhy: null,
  };

  it('two candidates losing the same pawn are one rule-out', () => {
    const text = deliberationWeighing(d, NOTHING_SAID);
    expect(text).toMatch(/Rf4\+\?/);
    expect(text).not.toMatch(/Rg4\?/);
    expect(ruleOutClaims(d, NOTHING_SAID)).toEqual(['rule-out:a7']);
  });

  it('a loss already ruled out this game is not ruled out again', () => {
    expect(deliberationWeighing(d, new Set(ruleOutClaims(d, NOTHING_SAID)))).toBe('');
  });

  it('a mate is its own claim, never the square\'s', () => {
    const m: Deliberation = { ...d, alternatives: [{ san: 'Kd7', evalCp: -100000, deltaCp: 99000, shortfall: 'clearly-worse', proof: "you play Kd7 and they answer Qxa7 — and it's mate", proofSans: ['Kd7', 'Qxa7#'] }] };
    expect(ruleOutClaims(m, NOTHING_SAID)).toEqual(['rule-out:mate:a7']);
    expect(deliberationWeighing(m, new Set(['rule-out:a7']))).toMatch(/Kd7\?/);
  });
});

describe('the surface remembers a rule-out and does not repeat it (the wire)', () => {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 14';
  const analysis = { evaluation: 82, bestMove: 'e1g1', depth: 18, topLines: [
    line(1, 82, 'e1g1 f8e7 d2d4 d7d6 d4d5 c6b8 c4d3 g8f6 c2c4 b8d7'),
    line(2, -267, 'f3e5 c6e5 c4b3 d7d5 d2d4 e5g6 b1c3 d5e4 d1e2 g8f6'),
    line(3, 56, 'd2d3 f8e7 e1g1 g8f6 f1e1 e8g8 a2a4 d7d6 c2c3 h7h6'),
  ] } as never;

  it('said once, then remembered', async () => {
    const first = await computePositionFacts({ boardComputers: 'surface', posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: [] });
    expect(first.clauses.find((c) => c.kind === 'deliberation')?.text).toMatch(/Nxe5\?/);
    expect(first.remember).toContain('rule-out:e5');
    const again = await computePositionFacts({ boardComputers: 'surface', posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: [], alreadySaid: new Set(first.remember) });
    expect(again.clauses.some((c) => /Nxe5\?/.test(c.text))).toBe(false);
  });

  // Learn prod audit after batch 1 (2026-10-21): "you found it" credits fell
  // from three a game to none. Whether the board poses a decision is a fact
  // about the board; what was already said decides only which sentences of
  // the weighing are spoken. A rule-out said earlier must not un-hold the move.
  it('the move stays held when its rule-out was said before', async () => {
    const first = await computePositionFacts({ boardComputers: 'surface', posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: [] });
    expect(first.heldVerdict).not.toBeNull();
    const again = await computePositionFacts({ boardComputers: 'surface', posture: 'interrupt', fen, moverColor: 'w', studentColor: 'w', analysis, teachingBeat: true, studentWeaknesses: [], alreadySaid: new Set(first.remember) });
    expect(again.heldVerdict).toEqual(first.heldVerdict);
  });
});

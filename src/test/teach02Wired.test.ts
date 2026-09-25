// WO-TEACH-02 — A WIRE THAT DOES NOT FIRE IS NOT A WIRE. The four teaching facts
// (the refuted alternative, the principle kept, the stopped threat, the phase
// verdict) must reach the ONE door from BOTH producers: review's facets
// (`computeMoveFacets`) and the live composer's clauses (`computePositionFacts`,
// which Learn, phase narration and "read this position" all call). Every case
// carries a negative control, so a test cannot pass by the fact always firing.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeMoveFacets, NO_TEACHING_CONTEXT, type MoveTeachingContext } from '../services/reviewFullData';
import { computePositionFacts } from '../services/positionFacts';
import type { RefutedAlternative } from '../services/refutedAlternativeCore';

function fens(moves: string[]): string[] {
  const c = new Chess();
  const out = [c.fen()];
  for (const m of moves) { c.move(m); out.push(c.fen()); }
  return out;
}
const flat = { topLines: [{ rank: 1, evaluation: 20, moves: [], mate: null }, { rank: 2, evaluation: 15, moves: [], mate: null }], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

// 1.e4 e5 2.Bc4 Nc6 3.Qh5 (threatens Qxf7#) g6 (stops it)
const SCH = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'g6'];
const S = fens(SCH);

const facetsAt = (ply: number, sans: string[], f: string[], player: 'white' | 'black', teaching: MoveTeachingContext, evaluation = 20, classification: string | null = 'book'): string[] =>
  computeMoveFacets({
    seenFundamentals: new Set(), teaching,
    fenBefore: f[ply - 1], fenAfter: f[ply], san: sans[ply - 1], ply,
    moverColor: ply % 2 === 1 ? 'white' : 'black', playerColor: player, studentColorWB: player === 'white' ? 'w' : 'b',
    evaluation, preMoveEval: 20, classification, bestMoveSan: null,
    prevCap: { square: null, capturedValue: 0 }, allSans: sans, forcedRunStartPly: null, bestLineUci: [], replyBestSan: null,
  });

describe('review — the four facts are facets, so they go through the door', () => {
  it('[stopped] names the threat the opponent\'s reply took off the board', () => {
    const f = facetsAt(6, SCH, S, 'white', { ...NO_TEACHING_CONTEXT, prevFenBefore: S[4] });
    expect(f.find((x) => x.startsWith('[stopped]'))).toMatch(/g6 has a point: it stops the mate with Qxf7\./);
  });
  it('NEGATIVE: with no previous board there is no [stopped]', () => {
    const f = facetsAt(6, SCH, S, 'white', NO_TEACHING_CONTEXT);
    expect(f.some((x) => x.startsWith('[stopped]'))).toBe(false);
  });

  it('[rule] teaches the principle in full once, then a short stem about the move (re-walk 1380)', () => {
    const f = facetsAt(4, SCH, S, 'black', NO_TEACHING_CONTEXT);
    expect(f.find((x) => x.startsWith('[rule]'))).toMatch(/^\[rule\] Nc6 follows a principle worth keeping: /);
    const taught = facetsAt(4, SCH, S, 'black', { ...NO_TEACHING_CONTEXT, principlesTaught: new Set(['development', 'center']) });
    // Taught already: the rule is not restated — the move gets its own stem.
    expect(taught.some((x) => /principle worth keeping|the principle behind|rule behind|what the opening asks/i.test(x))).toBe(false);
    expect(taught.find((x) => x.startsWith('[rule]'))).toMatch(/^\[rule\] Nc6 develops into the game/);
  });

  it('[refuted] speaks the engine-computed alternative on the student\'s ply', () => {
    const alt: RefutedAlternative = { alt: 'Qh4', games: 40, pct: 40, costCp: 700, line: null, concept: null, lineSans: [], proofResult: null, source: 'amateur', text: '40% of players at your level play Qh4 here, and it costs about 7.0 points.' };
    const f = facetsAt(4, SCH, S, 'black', { ...NO_TEACHING_CONTEXT, refutedAlt: alt });
    expect(f).toContain(`[refuted] ${alt.text}`);
    // NEGATIVE: never on the opponent's ply.
    const opp = facetsAt(4, SCH, S, 'white', { ...NO_TEACHING_CONTEXT, refutedAlt: alt });
    expect(opp.some((x) => x.startsWith('[refuted] 40% of players'))).toBe(false);
  });

  it('[stock] takes stock at the turn of the game, and only there', () => {
    // White castles a piece up; Black's king is still on e8 with queens on.
    const before = 'rnbqk2r/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 8';
    const after = 'rnbqk2r/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 1 8';
    const at = (teaching: MoveTeachingContext): string[] => computeMoveFacets({
      seenFundamentals: new Set(), teaching, fenBefore: before, fenAfter: after, san: 'O-O', ply: 15,
      moverColor: 'white', playerColor: 'white', studentColorWB: 'w', evaluation: 300, preMoveEval: 300,
      classification: 'good', bestMoveSan: null, prevCap: { square: null, capturedValue: 0 }, allSans: [], forcedRunStartPly: null, bestLineUci: [], replyBestSan: null,
    });
    expect(at({ ...NO_TEACHING_CONTEXT, phaseTurn: 'middlegame' }).find((x) => x.startsWith('[stock]')))
      .toMatch(/^\[stock\] .*middlegame.*: you're clearly better — you're up a piece/);
    expect(at(NO_TEACHING_CONTEXT).some((x) => x.startsWith('[stock]'))).toBe(false);
  });

  it('NEGATIVE: a verdict with no reason is not a lesson — the level Scholar\'s board stays silent', () => {
    const turn = facetsAt(6, SCH, S, 'white', { ...NO_TEACHING_CONTEXT, phaseTurn: 'middlegame' }, 300);
    expect(turn.some((x) => x.startsWith('[stock]'))).toBe(false);
  });
});

describe('live — the same four facts are clauses of the composer', () => {
  it('stopped: the reply that took the student\'s threat off the board', async () => {
    const r = await computePositionFacts({
      posture: 'walk', fen: S[6], moverColor: 'w', studentColor: 'w', analysis: flat,
      lastMove: { fenBefore: S[4], san: 'Qh5', cpLoss: 0, historySans: null, reads: null },
      opponentLastMove: { fenBefore: S[5], san: 'g6' },
    });
    expect(r.clauses.find((c) => c.kind === 'stopped')?.text).toMatch(/g6 has a point: it stops the mate with Qxf7\./);
  });
  it('NEGATIVE: a reply that leaves the threat on stops nothing', async () => {
    const f2 = fens(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'a6']);
    const r = await computePositionFacts({
      posture: 'walk', fen: f2[6], moverColor: 'w', studentColor: 'w', analysis: flat,
      lastMove: { fenBefore: f2[4], san: 'Qh5', cpLoss: 0, historySans: null, reads: null },
      opponentLastMove: { fenBefore: f2[5], san: 'a6' },
    });
    expect(r.clauses.some((c) => c.kind === 'stopped')).toBe(false);
  });

  it('refuted: costed off the fan already read, proven by its own line', async () => {
    // Black (the student) played 3…Nf6; players at their level also try 3…Qh4??
    const f3 = fens(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3']);
    const fan = [{ evaluation: 20, mate: null, moves: ['g8f6'] }, { evaluation: 700, mate: null, moves: ['d8h4', 'f3h4'] }];
    const popular = [{ san: 'Nf6', games: 60, pct: 60 }, { san: 'Qh4', games: 40, pct: 40 }];
    const base = { posture: 'walk' as const, fen: f3[7], moverColor: 'b' as const, studentColor: 'b' as const, analysis: flat };
    const r = await computePositionFacts({ ...base, lastMove: { fenBefore: f3[5], san: 'Nf6', cpLoss: 0, historySans: null, reads: null, popular, fanBefore: fan } });
    // The claim, whichever wrapper the board draws: the share, the move, the
    // proven line and its result.
    const refuted = r.clauses.find((c) => c.kind === 'refuted')?.text ?? '';
    expect(refuted).toMatch(/40% of players at your level/);
    expect(refuted).toMatch(/Qh4 and Nxh4 — they win a queen/);
    // NEGATIVE: the engine never read the popular move → no cost to state.
    const none = await computePositionFacts({ ...base, lastMove: { fenBefore: f3[5], san: 'Nf6', cpLoss: 0, historySans: null, reads: null, popular, fanBefore: [fan[0]] } });
    expect(none.clauses.some((c) => c.kind === 'refuted')).toBe(false);
  });

  it('rule: the principle is taught once, and the surface is told which', async () => {
    const own = await computePositionFacts({
      posture: 'walk', fen: fens(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])[5], moverColor: 'b', studentColor: 'b', analysis: flat,
      lastMove: { fenBefore: fens(['e4', 'e5', 'Nf3'])[3], san: 'Nc6', cpLoss: 0, historySans: null, reads: null }, taughtPrinciples: new Set(),
    });
    expect(own.clauses.find((c) => c.kind === 'rule')?.text).toMatch(/Nc6/);
    expect(own.principleSpoken).not.toBeNull();
    // NEGATIVE: a surface that does not track principles gets none.
    const untracked = await computePositionFacts({
      posture: 'walk', fen: fens(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])[5], moverColor: 'b', studentColor: 'b', analysis: flat,
      lastMove: { fenBefore: fens(['e4', 'e5', 'Nf3'])[3], san: 'Nc6', cpLoss: 0, historySans: null, reads: null },
    });
    expect(untracked.clauses.some((c) => c.kind === 'rule')).toBe(false);
  });

  it('stock: the turn of the game takes stock; any other board does not', async () => {
    const FEN = 'rnbqk2r/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 8';
    const up = { ...flat, evaluation: 300 };
    const turn = await computePositionFacts({ posture: 'interrupt', fen: FEN, moverColor: 'w', studentColor: 'w', analysis: up, phaseTurn: 'middlegame' });
    expect(turn.clauses.find((c) => c.kind === 'stock')?.text).toMatch(/middlegame.*: you're clearly better — you're up a piece/);
    const not = await computePositionFacts({ posture: 'interrupt', fen: FEN, moverColor: 'w', studentColor: 'w', analysis: up });
    expect(not.clauses.some((c) => c.kind === 'stock')).toBe(false);
  });
});

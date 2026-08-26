import { describe, it, expect, vi } from 'vitest';
import { computePositionFacts, clauseText } from './positionFacts';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: [420, 400, 180] as [number, number, number] };

describe('computePositionFacts — the composer', () => {
  it('stays SILENT in a quiet position (no clause earns voice)', async () => {
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat });
    expect(r.importance.speak).toBe(false);
    expect(r.clauses).toHaveLength(0);
  });

  it('names the standing must-defend, board-true', async () => {
    // White Ne5 hangs to …dxe5; inject a balanced analysis so the position reads contested.
    const r = await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    expect(r.mustDefend.net).toBe(3);
    expect(r.importance.speak).toBe(true);
    expect(r.clauses[0].text).toMatch(/threatening to win the knight on e5/);
  });

  it('frames the decision as the OPPONENT’s intent when the opponent is on move', async () => {
    // Opponent (White) is to move in a sharp position; the student is Black.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: [500, 400, 100] as [number, number, number] };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moverColor: 'w', studentColor: 'b', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    // No "your critical moment" — it's the opponent's decision, framed as theirs.
    expect(r.clauses.some((c) => c.kind === 'opponent-intent')).toBe(true);
    expect(r.clauses.some((c) => /this is the moment to slow down/i.test(c.text))).toBe(false);
  });

  it('calls a critical moment when one move stands far ahead (mover-POV)', async () => {
    // White to move, best line +300 vs the field at +20/+10 → gap 280 → only-move.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: [500, 400, 100] as [number, number, number] };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moverColor: 'w', studentColor: 'w', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    expect(r.clauses.some((c) => /critical moment|only one move/i.test(c.text))).toBe(true);
  });

  it('runs the expensive perturbation ONLY when the moment matters', async () => {
    const evalBoard = vi.fn().mockResolvedValue('');
    // Quiet → not called.
    await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat, evalBoard });
    expect(evalBoard).not.toHaveBeenCalled();
    // Must-defend (important) → called.
    await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat, evalBoard });
    expect(evalBoard).toHaveBeenCalled();
  });

  it('goes quiet in a DECIDED game — a swing there is not important', async () => {
    const decided = { ...flat, topLines: [line(1, 800), line(2, 780), line(3, 760)], evaluation: 800, wdl: [980, 18, 2] as [number, number, number] };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: decided, cpLossCp: 300 });
    expect(r.importance.contested).toBe(false);
    expect(r.clauses).toHaveLength(0); // the swing is silenced by the contested gate
  });
});

describe('clauseText', () => {
  it('drops kinds a surface already covers (no walk-over)', async () => {
    const r = await computePositionFacts({ fen: 'rnbqkb1r/ppp2ppp/3p1n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 0 5', moverColor: 'w', studentColor: 'w', analysis: flat });
    const withMd = clauseText(r.clauses);
    const withoutMd = clauseText(r.clauses, ['must-defend']);
    expect(withMd.some((t) => /threatening to win/.test(t))).toBe(true);
    expect(withoutMd.some((t) => /threatening to win/.test(t))).toBe(false);
  });
});

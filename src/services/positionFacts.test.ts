import { describe, it, expect, vi } from 'vitest';
import { computePositionFacts, clauseText } from './positionFacts';

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const flat = { topLines: [line(1, 20), line(2, 15), line(3, 10)], evaluation: 20, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 420, draw: 400, loss: 180 } };

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
    // Opponent (White) is to move in a sharp MIDDLEGAME position; student is Black.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    // No "your critical moment" — it's the opponent's decision, framed as theirs.
    expect(r.clauses.some((c) => c.kind === 'opponent-intent')).toBe(true);
    expect(r.clauses.some((c) => /this is the moment to slow down/i.test(c.text))).toBe(false);
  });

  it('calls a critical moment when one move stands far ahead (mover-POV)', async () => {
    // White to move in a MIDDLEGAME, best line +300 vs the field at +20/+10 → only-move.
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: sharp });
    expect(r.importance.speak).toBe(true);
    expect(r.clauses.some((c) => /critical moment|only one move/i.test(c.text))).toBe(true);
  });

  it('stays quiet of campaign/decision talk in the OPENING — only a real hanging piece speaks (David 2026-08-26 regression)', async () => {
    // A sharp analysis on a MOVE-2 board must NOT produce "critical moment" /
    // "knife-edge" / "best piece, trade it off" — that flooded move one.
    const evalBoard = vi.fn().mockResolvedValue('');
    const sharp = { ...flat, topLines: [line(1, 300), line(2, 20), line(3, 10)], evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 } };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moverColor: 'w', studentColor: 'w', analysis: sharp, evalBoard });
    expect(r.clauses.some((c) => c.kind === 'key-moment' || c.kind === 'opponent-intent')).toBe(false);
    expect(r.clauses.some((c) => c.kind === 'student-leans' || c.kind === 'opponent-leans')).toBe(false);
    expect(evalBoard).not.toHaveBeenCalled(); // no perturbation probe in the opening
  });

  it('runs the expensive perturbation ONLY when the moment matters (and out of the opening)', async () => {
    const evalBoard = vi.fn().mockResolvedValue('');
    // Quiet → not called.
    await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: flat, evalBoard });
    expect(evalBoard).not.toHaveBeenCalled();
    // Must-defend (important) in a MIDDLEGAME → called. (Ne5 hangs to …dxe5.)
    await computePositionFacts({ fen: 'r1bqk2r/ppp2ppp/3p1n2/4N3/1bB1P3/2N5/PPPP1PPP/R1BQ1RK1 w kq - 0 12', moverColor: 'w', studentColor: 'w', analysis: flat, evalBoard });
    expect(evalBoard).toHaveBeenCalled();
  });

  it('goes quiet in a DECIDED game — a swing there is not important', async () => {
    const decided = { ...flat, topLines: [line(1, 800), line(2, 780), line(3, 760)], evaluation: 800, wdl: { win: 980, draw: 18, loss: 2 } };
    const r = await computePositionFacts({ fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moverColor: 'b', studentColor: 'b', analysis: decided, cpLossCp: 300 });
    expect(r.importance.contested).toBe(false);
    expect(r.clauses).toHaveLength(0); // the swing is silenced by the contested gate
  });
});

describe('the concrete opponent-intent clause (fires through positionFacts)', () => {
  const lineM = (rank: number, evaluation: number, moves: string[]) => ({ rank, evaluation, moves, mate: null });
  it('names the opponent\'s move (guide-don\'t-tell: withholds your reply) when they\'re on move', async () => {
    // White (the opponent) to move, sharp (only-move) so importance speaks; the
    // fan names Re1 with ...a6, Bg5 with ...h6. Student is Black.
    const sharp = {
      ...flat,
      topLines: [lineM(1, 300, ['f1e1', 'a7a6']), lineM(2, 20, ['c1g5', 'h7h6'])],
      evaluation: 300, wdl: { win: 500, draw: 400, loss: 100 },
    };
    const r = await computePositionFacts({
      fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/1bB1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 14',
      moverColor: 'w', studentColor: 'b', analysis: sharp,
    });
    expect(r.opponentIntent).not.toBeNull();
    expect(r.opponentIntent!.plans[0]).toMatchObject({ opponentMove: 'Re1', studentReply: 'a6' });
    const oi = r.clauses.find((c) => c.kind === 'opponent-intent')!;
    expect(oi.text).toMatch(/opponent's Re1/);
    expect(oi.text).not.toMatch(/\ba6\b/); // reply withheld on your own game
  });
});

describe('the latent-danger prevention clause (fires through positionFacts)', () => {
  it('warns when the student\'s own bishop is pinned to the king — even in a quiet spot', async () => {
    // White (student) to move, move 14. Bishop e5 lined in front of Ke1 down the
    // e-file, Black rook on e8. Flat/quiet analysis — the warning fires anyway.
    const r = await computePositionFacts({
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'w', analysis: flat,
    });
    expect(r.latentDanger).not.toBeNull();
    const texts = clauseText(r.clauses);
    expect(texts.some((t) => /bishop on e5.*king.*file|share that file/i.test(t))).toBe(true);
    expect(r.clauses.some((c) => c.kind === 'latent-danger')).toBe(true);
  });

  it('does not warn when it is the opponent\'s move (not the student\'s concern)', async () => {
    const r = await computePositionFacts({
      fen: '4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 14', moverColor: 'w', studentColor: 'b', analysis: flat,
    });
    expect(r.latentDanger).toBeNull();
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

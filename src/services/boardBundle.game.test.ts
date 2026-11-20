// THE RUNNING GAME (`BoardBundle.game`, `playMove`): a caller that keeps the
// game as it goes hands it over, and the bundle reads it instead of replaying
// the history from move 1 on every read. Fischer–Spassky 1972 g6, 81 plies.
import { describe, it, expect } from 'vitest';
import { BUNDLE_ADAPTERS, baseFactsOf, playMove, type BoardBundle, type PlayedMove } from './boardBundle';

const SANS = 'c4 e6 Nf3 d5 d4 Nf6 Nc3 Be7 Bg5 O-O e3 h6 Bh4 b6 cxd5 Nxd5 Bxe7 Qxe7 Nxd5 exd5 Rc1 Be6 Qa4 c5 Qa3 Rc8 Bb5 a6 dxc5 bxc5 O-O Ra7 Be2 Nd7 Nd4 Qf8 Nxe6 fxe6 e4 d4 f4 Qe7 e5 Rb8 Bc4 Kh8 Qh3 Nf8 b3 a5 f5 exf5 Rxf5 Nh7 Rcf1 Qd8 Qg3 Re7 h4 Rbb7 e6 Rbc7 Qe5 Qe8 a4 Qd8 R1f2 Qe8 R2f3 Qd8 Bd3 Qe8 Qe4 Nf6 Rxf6 gxf6 Rxf6 Kg8 Bc4 Kh8 Qf4'.split(' ');

function runningGame(): PlayedMove[] {
  let g: PlayedMove[] = [];
  for (const san of SANS) {
    const next = playMove(g, san);
    if (!next) throw new Error(`illegal ${san}`);
    g = next;
  }
  return g;
}
const bundleAt = (game: readonly PlayedMove[], n: number, withGame: boolean): BoardBundle => {
  const last = game[n - 1];
  return {
    fen: last.fenAfter, student: 'w', lines: [{ moves: [], cp: 0, mate: null }], rating: 1800, history: SANS.slice(0, n),
    priorMove: { fenBefore: last.fenBefore, san: last.san }, priorMoveSeat: last.mover, priorLines: null,
    ...(withGame ? { game: game.slice(0, n) } : {}),
  };
};

describe('the bundle reads the running game instead of replaying it', { timeout: 120_000 }, () => {
  const game = runningGame();

  it('every adapter that reads the game answers the same, at every ply', () => {
    for (let n = 1; n <= SANS.length; n += 1) {
      const a = bundleAt(game, n, true);
      const b = bundleAt(game, n, false);
      for (const id of ['opponentDevelopment', 'causalChain', 'forcedRun', 'pieceItinerary', 'exchangeIdeas', 'theirOpeningChoice'] as const) {
        const f = BUNDLE_ADAPTERS[id] as (x: BoardBundle) => unknown;
        expect(f(a)).toEqual(f(b));
      }
    }
  });

  it('every computer reads the same facts with the running game as with the replay (move 41)', () => {
    const n = SANS.length;
    expect(baseFactsOf(bundleAt(game, n, true))).toEqual(baseFactsOf(bundleAt(game, n, false)));
  });

  it('a running game that does not match the history is not taken (the replay answers)', () => {
    const n = 40;
    const wrong = { ...bundleAt(game, n, false), game: game.slice(0, n - 1) };
    const f = BUNDLE_ADAPTERS.opponentDevelopment as (x: BoardBundle) => unknown;
    expect(f(wrong)).toEqual(f(bundleAt(game, n, false)));
    expect(f(bundleAt(game, n, false))).not.toBeNull();
  });

  it('MEASURED: the game behind a 40-move board, read with the running game vs replayed', () => {
    const f = BUNDLE_ADAPTERS.opponentDevelopment as (x: BoardBundle) => unknown;
    const n = 80;
    const reps = 300;
    const time = (withGame: boolean): number => {
      const t0 = performance.now();
      for (let k = 0; k < reps; k += 1) f(bundleAt(game, n, withGame));
      return (performance.now() - t0) / reps;
    };
    time(true); time(false);
    const given = time(true);
    const replay = time(false);
    console.log(`[bundle game] 80 plies: replay ${replay.toFixed(3)} ms a read, running game ${given.toFixed(3)} ms a read`);
    expect(given).toBeLessThan(replay);
  });
});

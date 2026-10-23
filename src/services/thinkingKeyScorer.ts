// thinkingKeyScorer — the app's scorer for the lesson's engine check
// (`thinkingKeyCheck`): the one Stockfish singleton, one bounded read per
// question asked of it. Kept apart from the checks so the step kits stay
// chess.js-only; only the lesson door imports this.
import { stockfishEngine } from './stockfishEngine';
import type { KeyScorer } from './thinkingKeyCheck';

const CHECK_DEPTH = 12;
const CHECK_BUDGET_MS = 1500;

const sideToMovePov = (fen: string, whiteCp: number): number => (fen.split(' ')[1] === 'b' ? -whiteCp : whiteCp);

export const ENGINE_KEY_SCORER: KeyScorer = {
  async best(fen) {
    try {
      const r = await stockfishEngine.analyzeBounded(fen, CHECK_DEPTH, undefined, CHECK_BUDGET_MS);
      return r.bestMove && r.bestMove !== '(none)' ? { cp: sideToMovePov(fen, r.evaluation), uci: r.bestMove } : null;
    } catch {
      return null;
    }
  },
  async bestOf(fen, ucis) {
    if (ucis.length === 0) return null;
    try {
      const r = await stockfishEngine.analyzeBounded(fen, CHECK_DEPTH, { searchmoves: ucis.join(' ') }, CHECK_BUDGET_MS);
      const top = r.topLines[0]?.evaluation ?? r.evaluation;
      return sideToMovePov(fen, top);
    } catch {
      return null;
    }
  },
};

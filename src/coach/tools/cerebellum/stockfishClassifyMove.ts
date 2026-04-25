/**
 * stockfish_classify_move — classify a single move as
 * blunder/mistake/inaccuracy/great given the position before and the
 * move played. Wraps the existing `classifyEvalSwing` from
 * coachMoveCommentary.
 *
 * The tool does its own Stockfish analysis on both positions so the
 * caller doesn't have to pre-compute evals. Two queueAnalysis calls
 * (queue-based so we don't cancel anything else in flight).
 */
import { Chess } from 'chess.js';
import { stockfishEngine } from '../../../services/stockfishEngine';
import { classifyEvalSwing } from '../../../services/coachMoveCommentary';
import type { Tool } from '../../types';

export const stockfishClassifyMoveTool: Tool = {
  name: 'stockfish_classify_move',
  category: 'cerebellum',
  description: 'Classify a single move as blunder/mistake/inaccuracy/good/excellent/book. Provide FEN before the move and the move in SAN or UCI.',
  parameters: {
    type: 'object',
    properties: {
      fenBefore: { type: 'string', description: 'Position FEN before the move was played.' },
      move: { type: 'string', description: 'Move in SAN (e.g. "Nf3") or UCI (e.g. "g1f3").' },
    },
    required: ['fenBefore', 'move'],
  },
  async execute(args) {
    const fenBefore = typeof args.fenBefore === 'string' ? args.fenBefore : '';
    const moveInput = typeof args.move === 'string' ? args.move : '';
    if (!fenBefore.trim() || !moveInput.trim()) {
      return { ok: false, error: 'fenBefore and move are required' };
    }
    let fenAfter: string;
    let mover: 'w' | 'b';
    try {
      const board = new Chess(fenBefore);
      mover = board.turn();
      // Try SAN first, fall back to UCI from/to.
      let moveResult: ReturnType<Chess['move']> | null = null;
      try {
        moveResult = board.move(moveInput);
      } catch {
        moveResult = null;
      }
      if (!moveResult && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(moveInput)) {
        try {
          moveResult = board.move({
            from: moveInput.slice(0, 2),
            to: moveInput.slice(2, 4),
            promotion: moveInput.length > 4 ? moveInput[4] : undefined,
          });
        } catch {
          moveResult = null;
        }
      }
      if (!moveResult) {
        return { ok: false, error: `move ${moveInput} not legal in given FEN` };
      }
      fenAfter = board.fen();
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    try {
      const [analysisBefore, analysisAfter] = await Promise.all([
        stockfishEngine.queueAnalysis(fenBefore, 12),
        stockfishEngine.queueAnalysis(fenAfter, 12),
      ]);
      const verdict = classifyEvalSwing(
        analysisBefore.evaluation,
        analysisAfter.evaluation,
        mover,
      );
      return {
        ok: true,
        result: {
          verdict,
          evalBefore: analysisBefore.evaluation,
          evalAfter: analysisAfter.evaluation,
          mover,
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

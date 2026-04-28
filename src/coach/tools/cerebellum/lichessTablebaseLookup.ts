/**
 * lichess_tablebase_lookup — query the Lichess Syzygy tablebase for
 * perfect-play data on positions with ≤7 pieces.
 *
 * Why this tool exists: endgame teaching is currently a hallucination
 * minefield — the LLM confidently plays losing moves in K+P endings,
 * misjudges Lucena/Philidor, and invents drawing lines for lost
 * positions. Tablebases give exact ground truth for any ≤7-piece
 * position: who wins, by how many moves, and the optimal move list.
 *
 * Behavior:
 *   - countPieces(fen) > 7 → returns ok:true with `inTablebase: false`
 *     so the LLM knows to fall back to engine analysis without a
 *     wasted network round-trip.
 *   - ≤7 pieces, network call → returns the tablebase verdict +
 *     ranked move list.
 *   - Endpoint failure → ok:false with the upstream error.
 *
 * No auth required.
 */
import {
  countPieces,
  fetchTablebase,
  formatTablebaseVerdict,
} from '../../../services/tablebases';
import type { Tool } from '../../types';

const PIECE_LIMIT = 7;

export const lichessTablebaseLookupTool: Tool = {
  name: 'lichess_tablebase_lookup',
  category: 'cerebellum',
  kind: 'read',
  description:
    "Query the Lichess Syzygy tablebase for perfect-play data on endgames with ≤7 pieces. Returns a definitive win/draw/loss verdict, distance-to-mate, distance-to-zeroing (50-move-rule clock), and the ranked optimal moves. Use this BEFORE making endgame claims — it eliminates K+P / R+P / minor-piece hallucinations. Returns inTablebase:false for positions with more than 7 pieces (caller should use stockfish_eval / lichess_cloud_eval instead).",
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN. Must have 7 or fewer pieces total to land in the tablebase.' },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    if (!fen.trim()) return { ok: false, error: 'fen is required' };

    const pieces = countPieces(fen);
    if (pieces > PIECE_LIMIT) {
      return {
        ok: true,
        result: {
          inTablebase: false,
          pieceCount: pieces,
          note: `Position has ${pieces} pieces — Syzygy covers ≤${PIECE_LIMIT}. Use stockfish_eval or lichess_cloud_eval.`,
        },
      };
    }

    try {
      const result = await fetchTablebase(fen);
      // Side to move from FEN's second field — fetchTablebase doesn't
      // echo it back, but we need it to render the verdict from the
      // mover's perspective.
      const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      const verdict = formatTablebaseVerdict(result, sideToMove);
      return {
        ok: true,
        result: {
          inTablebase: true,
          pieceCount: pieces,
          category: result.category,
          verdict,
          checkmate: result.checkmate,
          stalemate: result.stalemate,
          insufficientMaterial: result.insufficient_material,
          dtz: result.dtz,
          dtm: result.dtm,
          // Top 5 optimal moves; the LLM rarely needs the full list.
          // Each move carries san, uci, dtz, dtm, category so the
          // brain can pick the cleanest line for teaching.
          moves: result.moves.slice(0, 5).map((m) => ({
            san: m.san,
            uci: m.uci,
            dtz: m.dtz,
            dtm: m.dtm,
            category: m.category,
            zeroing: m.zeroing,
            checkmate: m.checkmate,
            stalemate: m.stalemate,
          })),
        },
      };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};

/**
 * legal_moves_for_piece — read-only deterministic accessor for the
 * complete legal-move list of a single piece on a given FEN.
 *
 * Why this tool exists: the LLM frequently hallucinates moves
 * ("the knight on f3 can go to e5") when the destination is
 * actually attacked or blocked. Forcing the brain to query a
 * deterministic accessor BEFORE making piece-specific claims
 * eliminates a whole class of factual errors. chess.js owns
 * legality, so this tool is a thin wrapper around its move
 * generator.
 *
 * The tool accepts EITHER a square ("from": "f3") or a piece +
 * color ("piece": "knight", "color": "white") — square is more
 * specific (only one piece per square), piece+color is more
 * natural for voice ("what can my knights do?") and returns an
 * aggregated list across all matching pieces.
 */
import { Chess, type PieceSymbol, type Color } from 'chess.js';
import type { Tool } from '../../types';

const PIECE_LETTER: Record<string, PieceSymbol> = {
  pawn: 'p',
  knight: 'n',
  bishop: 'b',
  rook: 'r',
  queen: 'q',
  king: 'k',
};

export const legalMovesForPieceTool: Tool = {
  name: 'legal_moves_for_piece',
  category: 'cerebellum',
  kind: 'read',
  description:
    "List ALL legal moves for a single piece. Pass either `from` (square like 'f3' for the piece on that square) OR `piece` + `color` (aggregate moves across every matching piece). Returns SAN + UCI for each legal move, plus blocked/attacked metadata. Call this before making claims like 'the knight can go to X' to eliminate hallucinations.",
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN.' },
      from: {
        type: 'string',
        description:
          "Optional. Square the piece is on (e.g. 'f3'). When provided, returns moves only for the piece on that square.",
      },
      piece: {
        type: 'string',
        description:
          "Optional. Piece type: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'. Use with `color` to aggregate across all matching pieces.",
        enum: ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'],
      },
      color: {
        type: 'string',
        description: "Optional. 'white' | 'black'. Required when `piece` is set.",
        enum: ['white', 'black'],
      },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    if (!fen.trim()) return { ok: false, error: 'fen is required' };

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch (err) {
      return { ok: false, error: `invalid fen: ${err instanceof Error ? err.message : String(err)}` };
    }

    const fromArg = typeof args.from === 'string' ? args.from.toLowerCase().trim() : '';
    const pieceArg = typeof args.piece === 'string' ? args.piece.toLowerCase().trim() : '';
    const colorArg = typeof args.color === 'string' ? args.color.toLowerCase().trim() : '';

    if (fromArg) {
      // Square-anchored lookup — one piece, one move list.
      if (!/^[a-h][1-8]$/.test(fromArg)) {
        return { ok: false, error: `invalid square "${fromArg}"; expected algebraic like 'f3'` };
      }
      const piece = chess.get(fromArg as Parameters<Chess['get']>[0]);
      if (!piece) {
        return {
          ok: true,
          result: { from: fromArg, piece: null, color: null, moves: [], note: 'square is empty' },
        };
      }
      const moves = chess.moves({ square: fromArg as Parameters<Chess['moves']>[0]['square'], verbose: true });
      return {
        ok: true,
        result: {
          from: fromArg,
          piece: pieceLongName(piece.type),
          color: piece.color === 'w' ? 'white' : 'black',
          moves: moves.map(formatMove),
        },
      };
    }

    if (pieceArg) {
      const pieceSymbol = PIECE_LETTER[pieceArg];
      if (!pieceSymbol) {
        return { ok: false, error: `invalid piece "${pieceArg}"; expected one of pawn|knight|bishop|rook|queen|king` };
      }
      if (colorArg !== 'white' && colorArg !== 'black') {
        return { ok: false, error: 'color is required when piece is set; use "white" or "black"' };
      }
      const targetColor: Color = colorArg === 'white' ? 'w' : 'b';
      // Walk the board, collect every square holding the matching
      // piece+color, then collect their legal moves. chess.js doesn't
      // expose a single-call query for "all moves of all knights".
      const matches: { from: string; moves: ReturnType<Chess['moves']> }[] = [];
      for (const file of 'abcdefgh') {
        for (const rank of '12345678') {
          const sq = `${file}${rank}` as Parameters<Chess['get']>[0];
          const p = chess.get(sq);
          if (p && p.type === pieceSymbol && p.color === targetColor) {
            const m = chess.moves({ square: sq as Parameters<Chess['moves']>[0]['square'], verbose: true });
            matches.push({ from: sq, moves: m });
          }
        }
      }
      return {
        ok: true,
        result: {
          piece: pieceArg,
          color: colorArg,
          pieces: matches.map((m) => ({
            from: m.from,
            moves: m.moves.map(formatMove),
          })),
        },
      };
    }

    return {
      ok: false,
      error: 'pass either `from` (square) or `piece` + `color`',
    };
  },
};

function pieceLongName(symbol: PieceSymbol): string {
  switch (symbol) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return String(symbol);
  }
}

interface VerboseMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  captured?: string;
  flags?: string;
}

function formatMove(m: VerboseMove): {
  san: string;
  uci: string;
  to: string;
  captures: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  promotion: string | null;
} {
  const uci = `${m.from}${m.to}${m.promotion ?? ''}`;
  return {
    san: m.san,
    uci,
    to: m.to,
    captures: !!m.captured,
    isCheck: m.san.includes('+'),
    isCheckmate: m.san.includes('#'),
    promotion: m.promotion ?? null,
  };
}

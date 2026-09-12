// Grounded-"why" inputs for a solved tactics puzzle (David 2026-09-12: "When
// coach is training drills/weaknesses I want the why spoken! Why was that the
// best move.").
//
// A Lichess puzzle's `moves` UCI line is [opponent-setup, student-key,
// opponent-reply, student, …]: the board is set to `fen`, the opponent plays
// the first move to create the puzzle, then the student solves. So the
// DECISION position the student actually reasoned from is the one AFTER the
// opponent's setup move, and the key move to explain is the student's first
// move. The full remaining line (student-key onward) is the play-out the
// grounded reasoning walks — never invented (G3), always chess.js-validated.
import { Chess } from 'chess.js';

export interface TacticWhyInputs {
  /** The position the student made the key decision from (after opponent setup). */
  decisionFen: string;
  /** The student's key solving move, UCI. */
  keyMoveUci: string;
  /** …and its SAN, for the studentMessage headline. */
  keyMoveSan: string;
  /** The solution line from the decision position onward (student, opp, …) —
   *  the play-out the grounded reasoning walks. */
  pvUci: string[];
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4) : undefined,
  };
}

/**
 * Derive the grounded-"why" inputs for a Lichess-shaped tactics puzzle whose
 * FIRST move is the opponent's setup (the shape PuzzleBoard auto-plays). Returns
 * null when there is no student move to explain or the line is illegal.
 */
export function buildTacticWhy(fen: string, uciLine: string[]): TacticWhyInputs | null {
  const moves = uciLine.map((m) => m.trim()).filter(Boolean);
  // Need at least the opponent setup move + one student move.
  if (moves.length < 2) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  // Play the opponent's setup move to reach the decision position. chess.js
  // THROWS on an illegal move (it never returns null), so the try/catch is the
  // legality guard.
  const setup = parseUci(moves[0]);
  if (!setup) return null;
  try {
    chess.move({ from: setup.from, to: setup.to, promotion: setup.promotion });
  } catch {
    return null;
  }
  const decisionFen = chess.fen();

  // The student's key move + its SAN (validated from the decision position).
  const key = parseUci(moves[1]);
  if (!key) return null;
  let keyMoveSan = '';
  try {
    const probe = new Chess(decisionFen);
    keyMoveSan = probe.move({ from: key.from, to: key.to, promotion: key.promotion }).san;
  } catch {
    return null;
  }

  return {
    decisionFen,
    keyMoveUci: moves[1],
    keyMoveSan,
    pvUci: moves.slice(1),
  };
}

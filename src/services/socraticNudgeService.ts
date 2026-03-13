import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';

export interface NudgeContext {
  fen: string;
  bestMoveUci: string;
  topLines?: AnalysisLine[];
  puzzleThemes?: string[];
}

const THEME_NUDGES: Record<string, string> = {
  fork: 'Look for a piece that can attack two things at once. What square allows that?',
  pin: "One of your opponent's pieces is stuck defending something important. Can you exploit that alignment?",
  skewer:
    'Think about X-ray attacks. Is there a line where two valuable pieces are aligned?',
  backRankMate:
    "Your opponent's king is boxed in on the back rank. How can you deliver the final blow?",
  discoveredAttack:
    'Moving one piece can reveal an attack from another. What is hiding behind?',
  sacrifice:
    'Sometimes giving up material opens the door to something bigger. What would you sacrifice, and why?',
  deflection:
    'Your opponent has a piece doing an important job. Can you lure it away from its duty?',
  overloading:
    'One of your opponent\'s pieces is stretched thin, defending too many things. How can you take advantage?',
  mateIn1: "The king can't escape. Find the checkmate!",
  mateIn2:
    "Checkmate is near — just two moves away. What sequence forces the king into a corner?",
  hangingPiece:
    'Something is left unprotected on the board. Can you spot the free material?',
  trappedPiece:
    "One of your opponent's pieces has run out of safe squares. How can you win it?",
  zugzwang:
    'Your opponent is in a tough spot — every move makes things worse. What quiet move keeps the pressure on?',
  endgame:
    'In the endgame, king activity and pawn promotion are key. How can you push your advantage?',
  promotion:
    'One of your pawns is close to becoming a queen. How can you clear the way?',
  clearance:
    'Sometimes you need to move a piece out of the way to unleash something more powerful behind it.',
  interference:
    "Can you place a piece between your opponent's pieces to disrupt their coordination?",
  attraction:
    'Can you force an enemy piece to a square where it becomes vulnerable?',
};

const FALLBACK_NUDGE =
  'Take a moment to consider all your candidate moves. What is the most forcing option?';

function classifyByPuzzleTheme(context: NudgeContext): string | null {
  if (!context.puzzleThemes || context.puzzleThemes.length === 0) return null;
  for (const theme of context.puzzleThemes) {
    const nudge = THEME_NUDGES[theme];
    if (nudge) return nudge;
  }
  return null;
}

function classifyByCastling(context: NudgeContext): string | null {
  const from = context.bestMoveUci.slice(0, 2);
  const to = context.bestMoveUci.slice(2, 4);
  // King moving two squares = castling
  if (
    (from === 'e1' || from === 'e8') &&
    Math.abs(to.charCodeAt(0) - from.charCodeAt(0)) === 2
  ) {
    return "Your king isn't safe in the center yet. Think about king safety — how can you tuck it away?";
  }
  return null;
}

function classifyByCheck(context: NudgeContext): string | null {
  try {
    const chess = new Chess(context.fen);
    const from = context.bestMoveUci.slice(0, 2);
    const to = context.bestMoveUci.slice(2, 4);
    const promotion = context.bestMoveUci.length > 4 ? context.bestMoveUci[4] : undefined;
    chess.move({ from, to, promotion });
    if (chess.isCheck()) {
      return 'Consider moves that give check. Forcing moves create opportunities your opponent must respond to.';
    }
  } catch {
    // Invalid move — skip
  }
  return null;
}

function classifyByCapture(context: NudgeContext): string | null {
  try {
    const chess = new Chess(context.fen);
    const from = context.bestMoveUci.slice(0, 2);
    const to = context.bestMoveUci.slice(2, 4);
    const promotion = context.bestMoveUci.length > 4 ? context.bestMoveUci[4] : undefined;
    const result = chess.move({ from, to, promotion });
    if (result.captured) {
      return 'Something on the board is unprotected or underdefended. Can you spot the free material?';
    }
  } catch {
    // Invalid move — skip
  }
  return null;
}

function classifyByPromotion(context: NudgeContext): string | null {
  if (context.bestMoveUci.length > 4) {
    return 'One of your pawns is on the verge of promotion. How can you push it through?';
  }
  // Pawn on 7th (white) or 2nd (black) rank moving forward
  try {
    const chess = new Chess(context.fen);
    const from = context.bestMoveUci.slice(0, 2);
    const piece = chess.get(from as Parameters<typeof chess.get>[0]);
    if (piece?.type === 'p') {
      const fromRank = parseInt(from[1]);
      if (
        (piece.color === 'w' && fromRank >= 6) ||
        (piece.color === 'b' && fromRank <= 3)
      ) {
        return 'One of your pawns is close to the other side of the board. Can you advance it further?';
      }
    }
  } catch {
    // skip
  }
  return null;
}

function classifyByCenterControl(context: NudgeContext): string | null {
  const to = context.bestMoveUci.slice(2, 4);
  const centralSquares = ['e4', 'd4', 'e5', 'd5'];
  if (centralSquares.includes(to)) {
    try {
      const chess = new Chess(context.fen);
      const from = context.bestMoveUci.slice(0, 2);
      const piece = chess.get(from as Parameters<typeof chess.get>[0]);
      if (piece?.type === 'p') {
        return 'Look at the tension in the center. Central pawns are powerful — can you stake your claim?';
      }
    } catch {
      // skip
    }
  }
  return null;
}

function classifyByDevelopment(context: NudgeContext): string | null {
  try {
    const chess = new Chess(context.fen);
    const from = context.bestMoveUci.slice(0, 2);
    const piece = chess.get(from as Parameters<typeof chess.get>[0]);
    if (!piece) return null;

    const fromRank = parseInt(from[1]);
    const isBackRank =
      (piece.color === 'w' && fromRank === 1) ||
      (piece.color === 'b' && fromRank === 8);

    if (isBackRank && (piece.type === 'n' || piece.type === 'b')) {
      return 'One of your pieces is still on its starting square and not contributing to the fight. Where can it be more useful?';
    }
  } catch {
    // skip
  }
  return null;
}

function classifyByKingSafety(context: NudgeContext): string | null {
  try {
    const chess = new Chess(context.fen);
    const turn = chess.turn();
    const opponentColor = turn === 'w' ? 'b' : 'w';

    // Check if opponent king is still in center (hasn't castled)
    const board = chess.board();
    for (const row of board) {
      for (const sq of row) {
        if (sq?.type === 'k' && sq.color === opponentColor) {
          // Find the king's file
          const kingFile = row.indexOf(sq);
          // King on e-file (index 4) suggests hasn't castled
          if (kingFile === 4) {
            return "Your opponent's king hasn't castled yet. Is there a way to take advantage of that exposed position?";
          }
        }
      }
    }
  } catch {
    // skip
  }
  return null;
}

function classifyByMaterialBalance(context: NudgeContext): string | null {
  try {
    const chess = new Chess(context.fen);
    const board = chess.board();
    const turn = chess.turn();

    const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let myMaterial = 0;
    let oppMaterial = 0;

    for (const row of board) {
      for (const sq of row) {
        if (!sq || sq.type === 'k') continue;
        const val = values[sq.type] ?? 0;
        if (sq.color === turn) {
          myMaterial += val;
        } else {
          oppMaterial += val;
        }
      }
    }

    const diff = myMaterial - oppMaterial;
    if (diff >= 3) {
      return "You're ahead in material. Look for ways to simplify and trade pieces — keep your advantage safe.";
    }
    if (diff <= -3) {
      return "You're down material, so you need active play. Look for tactical chances — checks, captures, and threats.";
    }
  } catch {
    // skip
  }
  return null;
}

export function generateSocraticNudge(context: NudgeContext): string {
  return (
    classifyByPuzzleTheme(context) ??
    classifyByCastling(context) ??
    classifyByCheck(context) ??
    classifyByCapture(context) ??
    classifyByPromotion(context) ??
    classifyByCenterControl(context) ??
    classifyByDevelopment(context) ??
    classifyByKingSafety(context) ??
    classifyByMaterialBalance(context) ??
    FALLBACK_NUDGE
  );
}

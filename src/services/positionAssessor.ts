import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PositionAssessment {
  material: MaterialCount;
  materialAdvantage: number;
  pawnStructure: PawnStructureInfo;
  kingSafety: KingSafetyInfo;
  pieceActivity: PieceActivityInfo;
  summary: string;
}

interface MaterialCount {
  white: Record<string, number>;
  black: Record<string, number>;
}

interface PawnStructureInfo {
  white: { isolated: string[]; doubled: string[]; passed: string[] };
  black: { isolated: string[]; doubled: string[]; passed: string[] };
}

interface KingSafetyInfo {
  whiteCastled: boolean;
  blackCastled: boolean;
  whiteKingExposed: boolean;
  blackKingExposed: boolean;
}

interface PieceActivityInfo {
  whiteCentralPieces: number;
  blackCentralPieces: number;
  whiteDeveloped: number;
  blackDeveloped: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set(['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6']);

// Back rank squares where undeveloped minor pieces sit
const WHITE_BACK_RANK = new Set(['b1', 'c1', 'f1', 'g1']);
const BLACK_BACK_RANK = new Set(['b8', 'c8', 'f8', 'g8']);

// ─── Helpers ───────────────────────────────────────────────────────────────

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

// ─── Material ──────────────────────────────────────────────────────────────

function countMaterial(chess: Chess): { material: MaterialCount; advantage: number } {
  const board = chess.board();
  const white: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  const black: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const row of board) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue;
      if (piece.color === 'w') white[piece.type]++;
      else black[piece.type]++;
    }
  }

  let whiteTotal = 0;
  let blackTotal = 0;
  for (const [type, count] of Object.entries(white)) {
    whiteTotal += (PIECE_VALUE[type] ?? 0) * count;
  }
  for (const [type, count] of Object.entries(black)) {
    blackTotal += (PIECE_VALUE[type] ?? 0) * count;
  }

  return { material: { white, black }, advantage: whiteTotal - blackTotal };
}

// ─── Pawn Structure ────────────────────────────────────────────────────────

function analyzePawnStructure(chess: Chess): PawnStructureInfo {
  const board = chess.board();
  const whitePawnFiles: number[][] = Array.from({ length: 8 }, () => []);
  const blackPawnFiles: number[][] = Array.from({ length: 8 }, () => []);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type !== 'p') continue;
      const rank = 7 - r;
      if (piece.color === 'w') whitePawnFiles[c].push(rank);
      else blackPawnFiles[c].push(rank);
    }
  }

  const findIsolated = (pawnFiles: number[][]): string[] => {
    const isolated: string[] = [];
    for (let f = 0; f < 8; f++) {
      if (pawnFiles[f].length === 0) continue;
      const hasNeighbor =
        (f > 0 && pawnFiles[f - 1].length > 0) ||
        (f < 7 && pawnFiles[f + 1].length > 0);
      if (!hasNeighbor) {
        for (const rank of pawnFiles[f]) {
          const sq = coordsToSquare(f, rank);
          if (sq) isolated.push(sq);
        }
      }
    }
    return isolated;
  };

  const findDoubled = (pawnFiles: number[][]): string[] => {
    const doubled: string[] = [];
    for (let f = 0; f < 8; f++) {
      if (pawnFiles[f].length > 1) {
        for (const rank of pawnFiles[f]) {
          const sq = coordsToSquare(f, rank);
          if (sq) doubled.push(sq);
        }
      }
    }
    return doubled;
  };

  const findPassed = (ownFiles: number[][], oppFiles: number[][], color: Color): string[] => {
    const passed: string[] = [];
    for (let f = 0; f < 8; f++) {
      for (const rank of ownFiles[f]) {
        let isPassed = true;
        // Check files f-1, f, f+1 for opponent pawns ahead
        for (let adjF = Math.max(0, f - 1); adjF <= Math.min(7, f + 1); adjF++) {
          for (const oppRank of oppFiles[adjF]) {
            if (color === 'w' && oppRank > rank) { isPassed = false; break; }
            if (color === 'b' && oppRank < rank) { isPassed = false; break; }
          }
          if (!isPassed) break;
        }
        if (isPassed) {
          const sq = coordsToSquare(f, rank);
          if (sq) passed.push(sq);
        }
      }
    }
    return passed;
  };

  return {
    white: {
      isolated: findIsolated(whitePawnFiles),
      doubled: findDoubled(whitePawnFiles),
      passed: findPassed(whitePawnFiles, blackPawnFiles, 'w'),
    },
    black: {
      isolated: findIsolated(blackPawnFiles),
      doubled: findDoubled(blackPawnFiles),
      passed: findPassed(blackPawnFiles, whitePawnFiles, 'b'),
    },
  };
}

// ─── King Safety ───────────────────────────────────────────────────────────

function analyzeKingSafety(chess: Chess): KingSafetyInfo {
  const fen = chess.fen();
  const castlingRights = fen.split(' ')[2] ?? '-';

  // A king is "castled" if castling rights are gone and king is on g1/c1 or g8/c8
  const board = chess.board();
  let whiteKingSq = '';
  let blackKingSq = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.type === 'k') {
        const sq = coordsToSquare(c, 7 - r);
        if (sq) {
          if (piece.color === 'w') whiteKingSq = sq;
          else blackKingSq = sq;
        }
      }
    }
  }

  const whiteCastled = !castlingRights.includes('K') && !castlingRights.includes('Q') &&
    (whiteKingSq === 'g1' || whiteKingSq === 'c1');
  const blackCastled = !castlingRights.includes('k') && !castlingRights.includes('q') &&
    (blackKingSq === 'g8' || blackKingSq === 'c8');

  // King is "exposed" if on center files (d or e) without castling rights
  const whiteKingExposed = !whiteCastled && 'de'.includes(whiteKingSq[0] ?? '') &&
    !castlingRights.includes('K') && !castlingRights.includes('Q');
  const blackKingExposed = !blackCastled && 'de'.includes(blackKingSq[0] ?? '') &&
    !castlingRights.includes('k') && !castlingRights.includes('q');

  return { whiteCastled, blackCastled, whiteKingExposed, blackKingExposed };
}

// ─── Piece Activity ────────────────────────────────────────────────────────

function analyzePieceActivity(chess: Chess): PieceActivityInfo {
  const board = chess.board();
  let whiteCentral = 0;
  let blackCentral = 0;
  let whiteUndeveloped = 0;
  let blackUndeveloped = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type === 'k' || piece.type === 'p') continue;
      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      if (CENTER_SQUARES.has(sq) || EXTENDED_CENTER.has(sq)) {
        if (piece.color === 'w') whiteCentral++;
        else blackCentral++;
      }

      // Minor pieces still on their starting squares = undeveloped
      if (piece.type === 'n' || piece.type === 'b') {
        if (piece.color === 'w' && WHITE_BACK_RANK.has(sq)) whiteUndeveloped++;
        if (piece.color === 'b' && BLACK_BACK_RANK.has(sq)) blackUndeveloped++;
      }
    }
  }

  return {
    whiteCentralPieces: whiteCentral,
    blackCentralPieces: blackCentral,
    whiteDeveloped: 4 - whiteUndeveloped,
    blackDeveloped: 4 - blackUndeveloped,
  };
}

// ─── Summary Builder ───────────────────────────────────────────────────────

function buildSummary(
  material: MaterialCount,
  advantage: number,
  pawnStructure: PawnStructureInfo,
  kingSafety: KingSafetyInfo,
  activity: PieceActivityInfo,
): string {
  const lines: string[] = [];

  // Material
  if (advantage > 0) lines.push(`White is up ${advantage} point${advantage > 1 ? 's' : ''} of material`);
  else if (advantage < 0) lines.push(`Black is up ${-advantage} point${-advantage > 1 ? 's' : ''} of material`);
  else lines.push('Material is equal');

  // Pawn structure issues
  for (const [color, info] of [['White', pawnStructure.white], ['Black', pawnStructure.black]] as const) {
    if (info.isolated.length > 0) lines.push(`${color} has ${info.isolated.length} isolated pawn${info.isolated.length > 1 ? 's' : ''} (${info.isolated.join(', ')})`);
    if (info.doubled.length > 0) lines.push(`${color} has doubled pawns on ${info.doubled.join(', ')}`);
    if (info.passed.length > 0) lines.push(`${color} has ${info.passed.length} passed pawn${info.passed.length > 1 ? 's' : ''} (${info.passed.join(', ')})`);
  }

  // King safety
  if (kingSafety.whiteCastled) lines.push('White king is castled');
  if (kingSafety.blackCastled) lines.push('Black king is castled');
  if (kingSafety.whiteKingExposed) lines.push('White king is exposed in the center');
  if (kingSafety.blackKingExposed) lines.push('Black king is exposed in the center');

  // Piece activity
  if (activity.whiteCentralPieces > activity.blackCentralPieces + 1) lines.push('White has better piece centralization');
  else if (activity.blackCentralPieces > activity.whiteCentralPieces + 1) lines.push('Black has better piece centralization');
  if (activity.whiteDeveloped < 3) lines.push(`White has ${4 - activity.whiteDeveloped} undeveloped minor piece${4 - activity.whiteDeveloped > 1 ? 's' : ''}`);
  if (activity.blackDeveloped < 3) lines.push(`Black has ${4 - activity.blackDeveloped} undeveloped minor piece${4 - activity.blackDeveloped > 1 ? 's' : ''}`);

  return lines.join('. ') + '.';
}

// ─── Main Export ───────────────────────────────────────────────────────────

/**
 * Assess a chess position for pawn structure, king safety, piece activity, and material.
 * Returns structured data + a human-readable summary for the LLM.
 */
export function assessPosition(fen: string): PositionAssessment {
  const chess = new Chess(fen);
  const { material, advantage } = countMaterial(chess);
  const pawnStructure = analyzePawnStructure(chess);
  const kingSafety = analyzeKingSafety(chess);
  const pieceActivity = analyzePieceActivity(chess);
  const summary = buildSummary(material, advantage, pawnStructure, kingSafety, pieceActivity);

  return {
    material,
    materialAdvantage: advantage,
    pawnStructure,
    kingSafety,
    pieceActivity,
    summary,
  };
}

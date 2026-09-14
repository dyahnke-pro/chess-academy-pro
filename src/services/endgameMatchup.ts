/**
 * endgameMatchup — the FINE piece-matchup classifier for the computed-concept
 * engine (docs/plans/2026-09-14-computed-concept-detectors.md, P1).
 *
 * Why this exists: `endgameProfileService.classifyEndgameType` is 6 coarse
 * buckets (king-pawn / rook-pawn / rook / minor-piece / queen / other) and
 * cannot express a MATCHUP — it collapses opposite- vs same-coloured bishops and
 * bishop-vs-knight into one "minor-piece" bucket, and any queen on the board into
 * "queen". Across the two puzzle corpora there are 2,293 distinct raw material
 * signatures, so a matchup ENUM is impossible. The answer (David 2026-09-14,
 * "all variations of piece matchups, leave nothing out") is a GENERAL calculator:
 * a canonical signature for ANY position (100% coverage by construction) reduced
 * to a finite set of TEACHABLE classes.
 *
 * FIX-ROT: the COARSE authority stays `classifyEndgameType` (single source); this
 * module adds the fine dimension (per-side piece lists, bishop square-colours,
 * winning side) that the coarse bucket can't carry. Pure / deterministic / G0 —
 * no engine, no network, no LLM.
 */
import { classifyEndgameType, type EndgameType } from './endgameProfileService';

export type PieceLetter = 'P' | 'N' | 'B' | 'R' | 'Q';
export type BishopColour = 'light' | 'dark';

export interface SideMaterial {
  P: number; N: number; B: number; R: number; Q: number;
  /** Square-colour of each bishop this side holds (order not significant). */
  bishops: BishopColour[];
}

export interface MatchupSignature {
  white: SideMaterial;
  black: SideMaterial;
  /** Non-king pieces on the board (pawns included). */
  totalPieces: number;
}

/**
 * The finite teachable matchup CLASSES. Every position reduces to exactly one.
 * These are the pedagogical buckets a concept hangs on; the NAMED techniques
 * (Lucena / Philidor / opposition / zugzwang) are separate detectors layered on
 * top in P2 — this is the coarse-class-first layer (decided 2026-09-14).
 */
export type MatchupClass =
  | 'kp-vs-k'           // one side lone king, other king + pawn(s)
  | 'pawn-endgame'      // kings + pawns only, both sides have pawns
  | 'rook-endgame'      // rooks (+pawns), no queens, no minors
  | 'queen-endgame'     // queens (+pawns), no rooks, no minors
  | 'queen-vs-rook'     // queen for one side, rook for the other
  | 'rook-vs-minor'     // rook vs minor piece(s), no queens
  | 'opposite-bishops'  // exactly one bishop each, opposite colours (± pawns)
  | 'same-bishops'      // exactly one bishop each, same colour (± pawns)
  | 'bishop-vs-knight'  // one bishop vs one knight (± pawns)
  | 'knight-endgame'    // knights only (± pawns), no bishops
  | 'minor-endgame'     // other pure-minor endings (2+ minors a side, ± pawns)
  | 'rook-and-minor'    // both sides rook + minor(s), no queens — technical MG→EG
  | 'major-piece'       // queens and/or rooks (+pawns), no minors — Q/Q+R endings
  | 'mating-material'   // one side lone king, other has forced-mate material
  | 'complex'           // an ending with mixed heavy material (queens + rooks + minors)
  | 'non-endgame';      // too much material to be an ending — tactics path owns it

export interface MatchupResult {
  cls: MatchupClass;
  /** Coarse authority bucket (reused from endgameProfileService). */
  coarse: EndgameType;
  /** Human label, e.g. "opposite-coloured bishop ending". */
  label: string;
  signature: MatchupSignature;
}

/** 0-indexed file+rank → square colour. a1 (0,0) is dark. */
function squareColour(file: number, rank: number): BishopColour {
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

/** Canonical material signature for ANY position — the general calculator. */
export function matchupSignature(fen: string): MatchupSignature {
  const rows = fen.split(' ')[0].split('/');
  const white: SideMaterial = { P: 0, N: 0, B: 0, R: 0, Q: 0, bishops: [] };
  const black: SideMaterial = { P: 0, N: 0, B: 0, R: 0, Q: 0, bishops: [] };
  let total = 0;
  // FEN ranks are listed 8→1; row index 0 is rank 8. Convert to 0-indexed rank.
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx += 1) {
    const rank = 7 - rowIdx;
    let file = 0;
    for (const ch of rows[rowIdx]) {
      if (ch >= '1' && ch <= '8') { file += Number(ch); continue; }
      const isWhite = ch === ch.toUpperCase();
      const side = isWhite ? white : black;
      const t = ch.toUpperCase();
      switch (t) {
        case 'P': side.P += 1; total += 1; break;
        case 'N': side.N += 1; total += 1; break;
        case 'B': side.B += 1; side.bishops.push(squareColour(file, rank)); total += 1; break;
        case 'R': side.R += 1; total += 1; break;
        case 'Q': side.Q += 1; total += 1; break;
        case 'K': break; // kings not counted in "pieces"
        default: break;
      }
      file += 1;
    }
  }
  return { white, black, totalPieces: total };
}

function minors(s: SideMaterial): number { return s.N + s.B; }
function hasOnlyKing(s: SideMaterial): boolean {
  return s.P + s.N + s.B + s.R + s.Q === 0;
}
/** Enough to force mate vs a lone king: Q, R, two bishops, or B+N (K+B or K+N
 *  alone cannot). A lone extra pawn can promote, so K+P vs K is its own class. */
function hasMatingMaterial(s: SideMaterial): boolean {
  if (s.Q > 0 || s.R > 0) return true;
  if (s.B >= 2) return true;
  if (s.B >= 1 && s.N >= 1) return true;
  return false;
}

const LABELS: Record<MatchupClass, string> = {
  'kp-vs-k': 'king-and-pawn vs lone king',
  'pawn-endgame': 'pawn ending',
  'rook-endgame': 'rook ending',
  'queen-endgame': 'queen ending',
  'queen-vs-rook': 'queen vs rook ending',
  'rook-vs-minor': 'rook vs minor-piece ending',
  'opposite-bishops': 'opposite-coloured bishop ending',
  'same-bishops': 'same-coloured bishop ending',
  'bishop-vs-knight': 'bishop vs knight ending',
  'knight-endgame': 'knight ending',
  'minor-endgame': 'minor-piece ending',
  'rook-and-minor': 'rook-and-minor ending',
  'major-piece': 'major-piece ending',
  'mating-material': 'forced-mate material vs lone king',
  complex: 'complex ending',
  'non-endgame': 'not an ending',
};

/** Material cutoff separating an ENDING from a middlegame the tactic path owns.
 *  Lichess tags positions "endgame" fairly late; a clean ending is few pieces.
 *  A position over this many non-king pieces, OR with 4+ minors still on, is a
 *  middlegame regardless of what heavy pieces remain. */
const ENDGAME_PIECE_CAP = 12;

/**
 * Reduce any position to one teachable matchup class. Order is most-specific
 * first. `non-endgame` is returned when there is too much material to be an
 * ending (the tactic/positional path owns those); the endgame technique
 * detectors only run when this is NOT `non-endgame`/`complex`.
 */
export function classifyMatchup(fen: string): MatchupResult {
  const signature = matchupSignature(fen);
  const coarse = classifyEndgameType(fen);
  const { white: w, black: b, totalPieces } = signature;

  const cls = reduce(w, b, totalPieces);
  return { cls, coarse, label: LABELS[cls], signature };
}

function reduce(w: SideMaterial, b: SideMaterial, total: number): MatchupClass {
  const qs = w.Q + b.Q;
  const rs = w.R + b.R;
  const ms = minors(w) + minors(b);
  const ps = w.P + b.P;

  // Lone king on one side — always an ending regardless of piece count.
  const wLone = hasOnlyKing(w);
  const bLone = hasOnlyKing(b);
  if (wLone || bLone) {
    const armed = wLone ? b : w;
    // King + a single pawn (or only pawns) vs lone king — the KP technique class.
    if (armed.Q === 0 && armed.R === 0 && minors(armed) === 0 && armed.P > 0) return 'kp-vs-k';
    if (hasMatingMaterial(armed)) return 'mating-material';
    // Lone king vs king + lone minor (no pawns) — a dead draw, still nameable.
    return 'minor-endgame';
  }

  // Middlegame gate: too much material on the board is a middlegame the
  // tactic/positional path owns — not a teachable ENDING type. Piece count is
  // the honest signal; a light board of minors is still a minor-piece ending.
  if (total > ENDGAME_PIECE_CAP) return 'non-endgame';

  // Queens on the board.
  if (qs > 0) {
    // Queen vs rook imbalance (no other heavy pieces muddying it).
    const wIsQ = w.Q > 0 && w.R === 0 && minors(w) === 0;
    const bIsQ = b.Q > 0 && b.R === 0 && minors(b) === 0;
    const wIsR = w.Q === 0 && w.R > 0 && minors(w) === 0;
    const bIsR = b.Q === 0 && b.R > 0 && minors(b) === 0;
    if ((wIsQ && bIsR) || (bIsQ && wIsR)) return 'queen-vs-rook';
    // Pure queen ending: queens (+ pawns) only, no rooks or minors.
    if (rs === 0 && ms === 0) return 'queen-endgame';
    // Queens (± rooks) with no minors = a major-piece ending (Q, or Q+R).
    if (ms === 0) return 'major-piece';
    // Queens plus minors, still under the cap = a complex (but teachable) ending.
    return 'complex';
  }

  // No queens. Rooks present?
  if (rs > 0) {
    if (ms === 0) return 'rook-endgame'; // rooks (+pawns) only
    // Rook(s) vs minor(s) with no rook on the other side = R-vs-minor imbalance.
    const wHasR = w.R > 0, bHasR = b.R > 0;
    if (wHasR !== bHasR) return 'rook-vs-minor';
    // Both sides have a rook plus minors — a technical rook-and-minor ending.
    return 'rook-and-minor';
  }

  // Pure minor-piece territory (no queens, no rooks).
  if (ms > 0) {
    const oneBishopEach = w.B === 1 && b.B === 1 && w.N === 0 && b.N === 0;
    if (oneBishopEach) {
      return w.bishops[0] === b.bishops[0] ? 'same-bishops' : 'opposite-bishops';
    }
    const bishopVsKnight =
      (w.B === 1 && w.N === 0 && b.N === 1 && b.B === 0) ||
      (b.B === 1 && b.N === 0 && w.N === 1 && w.B === 0);
    if (bishopVsKnight) return 'bishop-vs-knight';
    if (w.B === 0 && b.B === 0) return 'knight-endgame'; // knights only
    return 'minor-endgame';
  }

  // No pieces at all beyond pawns.
  if (ps > 0) return 'pawn-endgame';

  // Bare kings.
  return 'non-endgame';
}

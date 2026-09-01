/**
 * endgameProfileService — ties the weakness read to the endgame trainer (David
 * 2026-09-01: "the coach can see which endgame the user is weakest at / which
 * patterns/concepts they need help identifying within the endgame and can make
 * custom endgame training for the user").
 *
 * Two jobs, both pure + G0:
 *   1. classifyEndgameType(fen) — from a board, name the ENDING TYPE (rook-pawn,
 *      king-pawn, minor-piece, queen, rook, other) by material. This is the
 *      "which endgame" dimension the coarse phase:endgame bucket was missing.
 *   2. endgameTypeInfo(type) — the human label + the teachable CONCEPT + the
 *      matching hand-authored lesson id, so a typed weakness routes straight to
 *      the tablebase trainer on the right technique.
 *
 * The trainer itself takes ANY ≤7-piece FEN (tablebase-driven), so "train my
 * endgame weakness" can drill the student's OWN flubbed position — truly custom —
 * and fall back to the named lesson when the position is out of tablebase range.
 */

import { Chess } from 'chess.js';

export type EndgameType = 'king-pawn' | 'rook-pawn' | 'rook' | 'minor-piece' | 'queen' | 'other';

interface Material { P: number; N: number; B: number; R: number; Q: number; }

function material(fen: string): { white: Material; black: Material } {
  const board = fen.split(' ')[0];
  const white: Material = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
  const black: Material = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
  for (const ch of board) {
    switch (ch) {
      case 'P': white.P++; break; case 'N': white.N++; break; case 'B': white.B++; break; case 'R': white.R++; break; case 'Q': white.Q++; break;
      case 'p': black.P++; break; case 'n': black.N++; break; case 'b': black.B++; break; case 'r': black.R++; break; case 'q': black.Q++; break;
      default: break;
    }
  }
  return { white, black };
}

/** Classify the ending TYPE from a FEN by its non-king material. Coarse on
 *  purpose — these are the buckets the trainer + lessons map onto. Returns
 *  'other' for positions that aren't a recognizable clean ending (still lots of
 *  mixed pieces), which the caller can skip. */
export function classifyEndgameType(fen: string): EndgameType {
  const { white, black } = material(fen);
  const q = white.Q + black.Q;
  const r = white.R + black.R;
  const minors = white.N + white.B + black.N + black.B;
  const pawns = white.P + black.P;

  if (q > 0) return 'queen';
  if (r > 0 && minors === 0) return pawns > 0 ? 'rook-pawn' : 'rook';
  if (r === 0 && minors > 0) return 'minor-piece';
  if (r === 0 && minors === 0 && pawns > 0) return 'king-pawn';
  return 'other';
}

export interface EndgameTypeInfo {
  /** Human label for the coach ("rook-and-pawn endings"). */
  label: string;
  /** The teachable concept/theme — corpus query for the WHY. */
  conceptQuery: string;
  /** The matching hand-authored lesson id (endgameLessonsService), or null when
   *  we have no lesson for the type yet (then the trainer uses the student's own
   *  position only). */
  lessonId: string | null;
}

const TYPE_INFO: Record<EndgameType, EndgameTypeInfo> = {
  'king-pawn': { label: 'king-and-pawn endings', conceptQuery: 'king and pawn endgame opposition key squares', lessonId: 'opposition' },
  'rook-pawn': { label: 'rook-and-pawn endings', conceptQuery: 'rook endgame Lucena building a bridge active rook', lessonId: 'lucena-position' },
  rook: { label: 'rook endings', conceptQuery: 'rook endgame active rook cut off the king', lessonId: 'active-rook' },
  'minor-piece': { label: 'minor-piece endings', conceptQuery: 'bishop knight endgame opposite colored bishops', lessonId: 'opposite-color-bishops' },
  queen: { label: 'queen endings', conceptQuery: 'queen endgame checks perpetual defense', lessonId: 'queen-vs-rook-fortress' },
  other: { label: 'endings', conceptQuery: 'endgame technique king activity passed pawn', lessonId: 'activate-the-king' },
};

export function endgameTypeInfo(type: EndgameType): EndgameTypeInfo {
  return TYPE_INFO[type];
}

/** Piece count — the trainer needs ≤7 to drill the student's OWN position. */
export function endgameTablebaseReady(fen: string): boolean {
  return fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length <= 7;
}

// ── CONCEPT NAMING (David 2026-09-01: "which patterns/concepts they need help
// identifying within the endgame") — the trainer names the TECHNIQUE the best
// move demonstrates when the student errs, so a correction teaches the concept,
// not just "you threw the win". Pure chess.js geometry (G0): opposition for
// king-and-pawn, rook-activity for rook endings, else the type's core idea. */

/** Both kings in DIRECT opposition (same file or rank, exactly one empty square
 *  between) in the given position — the side NOT to move holds it. */
function kingsInDirectOpposition(fen: string): boolean {
  let c: Chess;
  try { c = new Chess(fen); } catch { return false; }
  let wk: { f: number; r: number } | null = null;
  let bk: { f: number; r: number } | null = null;
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'k') continue;
      const f = cell.square.charCodeAt(0) - 97;
      const r = Number(cell.square[1]);
      if (cell.color === 'w') wk = { f, r }; else bk = { f, r };
    }
  }
  if (!wk || !bk) return false;
  const df = Math.abs(wk.f - bk.f);
  const dr = Math.abs(wk.r - bk.r);
  // Direct opposition: 2 squares apart on a file OR a rank (one empty between).
  return (df === 0 && dr === 2) || (dr === 0 && df === 2);
}

/**
 * endgameMistakeConcept — name the technique the BEST move demonstrates, so the
 * trainer's correction identifies the concept the student missed. Returns null
 * when nothing clean applies (then the trainer speaks the WDL why alone). G0:
 * computed from the best move + board, never invented.
 */
export function endgameMistakeConcept(fenBefore: string, bestUci: string): string | null {
  // Only fire on a real ending — the material classifier alone would call a full
  // board with queens a "queen ending". A plausible endgame is few pieces.
  if (fenBefore.split(' ')[0].replace(/[^a-zA-Z]/g, '').length > 10) return null;
  const type = classifyEndgameType(fenBefore);
  let c: Chess;
  let mv;
  try {
    c = new Chess(fenBefore);
    mv = c.move({ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4), promotion: bestUci.length > 4 ? bestUci[4] : undefined });
  } catch { return null; }
  if (!mv) return null;

  if (type === 'king-pawn') {
    if (mv.piece === 'k' && kingsInDirectOpposition(c.fen())) {
      return 'The key is the opposition — the best move takes it, so their king can\'t make progress.';
    }
    return 'King-and-pawn endings come down to the opposition and the key squares in front of the pawn.';
  }
  if (type === 'rook' || type === 'rook-pawn') {
    if (mv.piece === 'r') {
      return 'In rook endings activity is everything — the rook belongs behind the passed pawn, keeping it active.';
    }
    return 'Rook endings are about activity — get the rook behind the passed pawn and keep the king in the fight.';
  }
  if (type === 'minor-piece') {
    return 'Watch the drawing tricks — wrong-corner rook pawns and opposite-coloured bishops hold more than they look.';
  }
  if (type === 'queen') {
    return 'Queen endings hinge on checks and the safety of your own king — cover the perpetual before you push.';
  }
  return null;
}

// ── ENDGAME WEAKNESS PROFILE — "which endgame am I weakest at" (loop tie-in) ──
import { db } from '../db/schema';

export interface EndgameTypeWeakness {
  type: EndgameType;
  label: string;
  conceptQuery: string;
  lessonId: string | null;
  /** How many of the student's endgame slips fall in this type. */
  count: number;
  worstCpLoss: number;
  /** The student's own worst flubbed position in this type — the CUSTOM drill
   *  seed when it's tablebase-ready (≤7 pieces); else null. */
  ownFen: string | null;
}

export interface EndgameWeaknessProfile {
  /** The most-pressing endgame type (highest count × cp), or null when there's
   *  no real endgame-mistake sample yet. */
  weakest: EndgameTypeWeakness | null;
  /** All types with ≥1 endgame slip, ranked. */
  all: EndgameTypeWeakness[];
  /** Endgame mistakes considered. */
  sample: number;
}

/** Read the student's endgame-phase mistakes, classify each by ending TYPE, and
 *  rank — so the coach can name the exact ending they're weakest at and drill it.
 *  G0/G3: every field computed from the board-verified mistake records; the
 *  classifier is pure material. Empty when the student has no endgame mistakes. */
export async function getEndgameWeaknessProfile(): Promise<EndgameWeaknessProfile> {
  let mistakes;
  try { mistakes = await db.mistakePuzzles.toArray(); } catch { return { weakest: null, all: [], sample: 0 }; }
  const endgame = mistakes.filter((m) => m.gamePhase === 'endgame' && m.classification !== 'inaccuracy');
  if (endgame.length === 0) return { weakest: null, all: [], sample: 0 };

  const groups = new Map<EndgameType, { count: number; worstCpLoss: number; ownFen: string | null }>();
  for (const m of endgame) {
    const type = classifyEndgameType(m.fen);
    if (type === 'other') continue; // don't name a bucket we can't teach cleanly
    const g = groups.get(type) ?? { count: 0, worstCpLoss: 0, ownFen: null };
    g.count += 1;
    if (m.cpLoss > g.worstCpLoss) {
      g.worstCpLoss = m.cpLoss;
      // Keep the worst position as the custom-drill seed when it's ≤7 pieces.
      if (endgameTablebaseReady(m.fen)) g.ownFen = m.fen;
    }
    groups.set(type, g);
  }

  const all: EndgameTypeWeakness[] = [];
  for (const [type, g] of groups) {
    const info = endgameTypeInfo(type);
    all.push({ type, label: info.label, conceptQuery: info.conceptQuery, lessonId: info.lessonId, count: g.count, worstCpLoss: g.worstCpLoss, ownFen: g.ownFen });
  }
  all.sort((a, b) => (b.count * b.worstCpLoss) - (a.count * a.worstCpLoss) || b.count - a.count);
  return { weakest: all[0] ?? null, all, sample: endgame.length };
}

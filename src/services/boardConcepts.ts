// boardConcepts — what a position IS, computed from the board.
//
// The concept tier holds teaching that belongs to no opening: king activity in
// endgames, when a trade helps, how to punish a structural weakness. To reach
// it, something has to say which ideas the position in front of the student is
// actually about — and that something must be CODE (G0). The model never picks
// the tags; it only phrases the note the tags selected.
//
// Deliberately conservative. A tag is emitted only when the board plainly shows
// it, because the cost of a wrong tag is a generic principle delivered as if it
// were about this position — the same failure that put endgame platitudes under
// a Caro-Kann label. Silence is a valid answer here (the narration rules say so
// outright), so an unremarkable middlegame yields few tags or none, and the
// caller falls through rather than reaching for filler.

import { Chess } from 'chess.js';

export type Phase = 'opening' | 'middlegame' | 'endgame';

export interface BoardConcepts {
  phase: Phase;
  concepts: string[];
}

type Sq = { type: string; color: 'w' | 'b'; square: string };

const pieces = (chess: Chess): Sq[] => {
  const out: Sq[] = [];
  for (const row of chess.board()) {
    for (const p of row) if (p) out.push({ type: p.type, color: p.color, square: p.square });
  }
  return out;
};

const fileOf = (sq: string): number => sq.charCodeAt(0) - 97;
const rankOf = (sq: string): number => Number(sq[1]);

/** Phase by material, not move number — a queenless position ten moves in is an
 *  endgame whatever the clock says, and that is what decides which teaching
 *  applies. */
function phaseOf(all: Sq[]): Phase {
  const heavy = all.filter((p) => p.type !== 'p' && p.type !== 'k');
  const queens = all.filter((p) => p.type === 'q').length;
  if (heavy.length <= 6 && queens === 0) return 'endgame';
  if (heavy.length >= 13) return 'opening';
  return 'middlegame';
}

/** A pawn with no enemy pawn ahead of it on its own or an adjacent file. */
function hasPassedPawn(all: Sq[], color: 'w' | 'b'): boolean {
  const mine = all.filter((p) => p.type === 'p' && p.color === color);
  const theirs = all.filter((p) => p.type === 'p' && p.color !== color);
  return mine.some((p) => {
    const f = fileOf(p.square);
    const r = rankOf(p.square);
    return !theirs.some((o) => {
      const of = fileOf(o.square);
      const or = rankOf(o.square);
      if (Math.abs(of - f) > 1) return false;
      return color === 'w' ? or > r : or < r;
    });
  });
}

/**
 * Which phase a position is in, on its own. `boardConcepts` returns null when a
 * position has no notable ideas, so a caller that needs only the phase — to
 * scope teaching by phase, or to split a coverage measurement — cannot get it
 * from there without conflating "unremarkable" with "unknown".
 */
export function phaseOfFen(fen: string): Phase | null {
  try {
    const all = pieces(new Chess(fen));
    return all.length === 0 ? null : phaseOf(all);
  } catch {
    return null;
  }
}

/**
 * The ideas this position is about, for selecting teaching that is not tied to
 * any opening. Returns few tags by design — see the note at the top of the file.
 */
export function boardConcepts(fen: string): BoardConcepts | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const all = pieces(chess);
  if (all.length === 0) return null;
  const phase = phaseOf(all);
  const concepts = new Set<string>();

  const minorsAndMajors = all.filter((p) => p.type !== 'p' && p.type !== 'k');
  const rooks = minorsAndMajors.filter((p) => p.type === 'r');

  if (phase === 'endgame') {
    // Named endgame types the corpus teaches by name. Only when the board is
    // exactly that ending — "rook endgame" means rooks and pawns, nothing else.
    if (rooks.length > 0 && rooks.length === minorsAndMajors.length) concepts.add('rook-endgame');
    if (minorsAndMajors.length === 0) concepts.add('pawn-endgame');
    // King activity is THE endgame idea, but only worth teaching once a king
    // has actually left its back rank — otherwise it is a platitude.
    const kings = all.filter((p) => p.type === 'k');
    if (kings.some((k) => rankOf(k.square) >= 3 && rankOf(k.square) <= 6)) concepts.add('king-activity');
  }

  if (hasPassedPawn(all, 'w') || hasPassedPawn(all, 'b')) concepts.add('passed-pawn');

  // The bishop pair is only a theme while both bishops survive AND the opponent
  // has broken up — two bishops against two bishops is not an imbalance.
  for (const c of ['w', 'b'] as const) {
    const mine = all.filter((p) => p.type === 'b' && p.color === c).length;
    const theirs = all.filter((p) => p.type === 'b' && p.color !== c).length;
    if (mine === 2 && theirs < 2 && phase !== 'endgame') concepts.add('bishop-pair');
  }

  if (concepts.size === 0) return null;
  return { phase, concepts: [...concepts] };
}

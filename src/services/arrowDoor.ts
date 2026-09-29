// arrowDoor — THE ONE DOOR EVERY BOARD ARROW PASSES THROUGH (David 2026-09-29:
// "Can we reduce to one source for arrows?").
//
// Learn alone had thirteen producers each drawing straight to the board, each
// with its own check: some legality, some "a piece stands there", one safety.
// The weakest let through a green f3→d3 with the black queen on c4 — a move
// from DEEPER in the engine line, legal now and losing the queen now.
//
// Producers still decide WHAT is worth pointing at (the threat computer, the
// plan, the engine each know different moves). They hand the door CLAIMS; the
// door alone decides whether a claim may be drawn, and in what colour:
//
//   play    — a move for the STUDENT to play. Green (rank shades for a ranked
//             candidate list). Their piece, legal on the board, and SAFE: it
//             does not lose the moving piece by exchange — unless the engine
//             or the opening book chose that very move on that very board
//             (`vouchedBy`), since a sound sacrifice fails an exchange count.
//   theirs  — the OPPONENT's intended move (a plan route: "they want the
//             bishop on b2"). Red, from THEIR piece; legal and safe for them.
//   threat  — the OPPONENT's move coming at the student. Red, always from
//             THEIR piece, so it can never be read as the student's move. Must
//             win something (a capture that nets material, or check) — a threat
//             that wins nothing is a bluff and is not drawn.
//   line    — one ply of a line being walked. Validated on its OWN board (the
//             position before that ply), coloured by whose move it is.
//   vision  — a sight line ("the bishop eyes h7"), not a move: a piece on the
//             start square that sees the end square along a clear path.
//   played  — the trail of the move just made (orange): the start square is
//             now empty and the moved piece stands on the end square.
//
// A move the coach rules out ("Qd3? drops the queen") has NO role — it is said
// and highlighted, never arrowed (David 2026-09-29: "Never"). An arrow always
// reads as "play this" or "this is coming at you".
import { Chess, type Square } from 'chess.js';
import type { BoardArrow } from '../types';
import { MATERIAL_VALUE } from './pieceValues';
import { legalSeeGainFor } from './positionReadingService';

export type ArrowRole = 'play' | 'theirs' | 'threat' | 'line' | 'vision' | 'played';

export interface ArrowClaim {
  from: string;
  to: string;
  role: ArrowRole;
  /** The board the claim is about. Defaults to the door's board. A `line` ply
   *  MUST carry the position before that ply. */
  fen?: string;
  /** A trusted source chose this exact move on this exact board: the ENGINE
   *  (best move, a PV's first ply, a ranked candidate) or the opening BOOK (a
   *  DB theory move — a gambit is theory). Lifts the static-exchange safety
   *  check — a sound sacrifice loses material by count. */
  vouchedBy?: 'engine' | 'book';
  /** Candidate rank (1 = best) for a ranked list; shades a `play` arrow. */
  rank?: number | null;
  /** Who produced it — for the refusal log only. */
  source: string;
}

export interface ArrowDoorContext {
  /** The board the student is looking at. */
  fen: string;
  studentColor: 'white' | 'black';
}

export type ArrowRefusal = 'not-played' | 'bad-square' | 'no-piece' | 'wrong-side' | 'illegal' | 'unsafe' | 'wins-nothing' | 'no-sight' | 'duplicate' | 'bad-fen';

export interface ArrowDoorResult {
  arrows: BoardArrow[];
  refused: Array<{ claim: ArrowClaim; reason: ArrowRefusal }>;
}

/** ONE colour per role — the colour language the student learns once. */
export const ARROW_COLOR = {
  mine: '#22c55e',
  theirs: '#ef4444',
  vision: '#22c55e',
  played: 'rgba(255,170,60,0.6)',
} as const;

/** Ranked candidates (G6: coloured by engine rank) — the best move green, any
 *  runner-up blue. Chat drew runners-up YELLOW while fork talk drew them BLUE;
 *  yellow already means "key square", so one shade wins everywhere. */
const RANK_SHADE: Readonly<Record<number, string>> = { 1: '#22c55e', 2: '#3b82f6', 3: '#3b82f6' };

const SQ = /^[a-h][1-8]$/;

function boardAs(fen: string, turn: 'w' | 'b'): Chess | null {
  try {
    const parts = fen.split(' ');
    if (parts.length < 4) return null;
    parts[1] = turn;
    parts[3] = '-'; // an en-passant square belongs to the side that just moved
    return new Chess(parts.join(' '));
  } catch {
    return null;
  }
}

/** The piece on `from` sees `to` along its movement geometry, path clear. */
function sees(board: Chess, from: string, to: string): boolean {
  const piece = board.get(from as Square);
  if (!piece || from === to) return false;
  const f0 = from.charCodeAt(0) - 97; const r0 = Number(from[1]) - 1;
  const f1 = to.charCodeAt(0) - 97; const r1 = Number(to[1]) - 1;
  const df = f1 - f0; const dr = r1 - r0;
  const adf = Math.abs(df); const adr = Math.abs(dr);
  const clear = (): boolean => {
    const sf = Math.sign(df); const sr = Math.sign(dr);
    for (let f = f0 + sf, r = r0 + sr; f !== f1 || r !== r1; f += sf, r += sr) {
      if (board.get(`${String.fromCharCode(97 + f)}${r + 1}` as Square)) return false;
    }
    return true;
  };
  switch (piece.type) {
    case 'n': return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'k': return adf <= 1 && adr <= 1;
    case 'b': return adf === adr && clear();
    case 'r': return (df === 0 || dr === 0) && clear();
    case 'q': return (adf === adr || df === 0 || dr === 0) && clear();
    case 'p': return adf === 1 && dr === (piece.color === 'w' ? 1 : -1);
    default: return false;
  }
}

/** Why a single claim may not be drawn, or null when it may. */
export function refusalFor(claim: ArrowClaim, ctx: ArrowDoorContext): ArrowRefusal | null {
  const { from, to, role } = claim;
  if (!SQ.test(from) || !SQ.test(to) || from === to) return 'bad-square';
  const fen = claim.fen ?? ctx.fen;
  let base: Chess;
  try { base = new Chess(fen); } catch { return 'bad-fen'; }
  if (role === 'played') return base.get(to as Square) && !base.get(from as Square) ? null : 'not-played';
  const piece = base.get(from as Square);
  if (!piece) return 'no-piece';
  if (role === 'vision') return sees(base, from, to) ? null : 'no-sight';

  const student: 'w' | 'b' = ctx.studentColor === 'white' ? 'w' : 'b';
  if (role === 'play' && piece.color !== student) return 'wrong-side';
  if ((role === 'threat' || role === 'theirs') && piece.color === student) return 'wrong-side';

  // Legal from the mover's side of THIS board — a plan move can be about the
  // side not on move, so the turn is set to the piece's colour.
  const b = boardAs(fen, piece.color);
  if (!b) return 'bad-fen';
  let moved;
  try { moved = b.move({ from, to, promotion: 'q' }); } catch { return 'illegal'; }
  if (!moved) return 'illegal';
  if (role === 'line') return null;

  const gained = moved.captured ? MATERIAL_VALUE[moved.captured] ?? 0 : 0;
  const lost = legalSeeGainFor(b.fen(), to as Square, piece.color === 'w' ? 'b' : 'w');
  if (role === 'play' || role === 'theirs') {
    if (claim.vouchedBy) return null;
    return gained - lost >= 0 ? null : 'unsafe';
  }
  // threat: it has to win something, or be check.
  if (b.inCheck()) return null;
  return gained > 0 && gained - lost > 0 ? null : 'wins-nothing';
}

function colourFor(claim: ArrowClaim, ctx: ArrowDoorContext): string {
  if (claim.role === 'threat' || claim.role === 'theirs') return ARROW_COLOR.theirs;
  if (claim.role === 'vision') return ARROW_COLOR.vision;
  if (claim.role === 'played') return ARROW_COLOR.played;
  if (claim.role === 'play') return (claim.rank && RANK_SHADE[claim.rank]) || ARROW_COLOR.mine;
  // line: by whose move it is on its own board.
  try {
    const piece = new Chess(claim.fen ?? ctx.fen).get(claim.from as Square);
    const student = ctx.studentColor === 'white' ? 'w' : 'b';
    return piece && piece.color === student ? ARROW_COLOR.mine : ARROW_COLOR.theirs;
  } catch {
    return ARROW_COLOR.mine;
  }
}

/** THE DOOR. Every arrow on every coach board is the output of this call. */
export function admitArrows(claims: readonly ArrowClaim[], ctx: ArrowDoorContext): ArrowDoorResult {
  const arrows: BoardArrow[] = [];
  const refused: ArrowDoorResult['refused'] = [];
  for (const claim of claims) {
    const why = refusalFor(claim, ctx);
    if (why) { refused.push({ claim, reason: why }); continue; }
    if (arrows.some((a) => a.startSquare === claim.from && a.endSquare === claim.to)) {
      refused.push({ claim, reason: 'duplicate' });
      continue;
    }
    arrows.push({ startSquare: claim.from, endSquare: claim.to, color: colourFor(claim, ctx) });
  }
  return { arrows, refused };
}

/** Adding admitted arrows to what the board already shows — unique by square
 *  pair, since the board keys arrows by it (a repeat pair drops an arrow). */
export function withAdmitted(prev: readonly BoardArrow[], admitted: readonly BoardArrow[]): BoardArrow[] {
  const byPair = new Map<string, BoardArrow>();
  for (const a of [...prev, ...admitted]) byPair.set(`${a.startSquare}-${a.endSquare}`, a);
  return [...byPair.values()];
}

/** One claim through the door — the arrow, or null when it is refused. */
export function admitArrow(claim: ArrowClaim, ctx: ArrowDoorContext): BoardArrow | null {
  return admitArrows([claim], ctx).arrows[0] ?? null;
}

/** A line as `line` claims, each ply on the board BEFORE it. */
export function lineClaims(startFen: string, plies: ReadonlyArray<{ uci: string; fenAfter: string }>, source: string): ArrowClaim[] {
  return plies.map((p, i) => ({
    from: p.uci.slice(0, 2),
    to: p.uci.slice(2, 4),
    role: 'line' as const,
    fen: i === 0 ? startFen : plies[i - 1].fenAfter,
    source,
  }));
}

/** The door's colour as the marker vocabulary (`[BOARD: arrow:e2-e4:green]`). */
export function arrowColorName(color: string): 'green' | 'blue' | 'red' {
  if (color === ARROW_COLOR.theirs) return 'red';
  if (color === '#3b82f6') return 'blue';
  return 'green';
}

/** A move NAMED by a narration: if the piece on `from` can legally go to `to`
 *  it is that side's move (yours green, theirs red); otherwise it is a sight
 *  line. `vouchedBy` is the source the narration stands on. */
export function namedMoveClaim(
  from: string,
  to: string,
  ctx: ArrowDoorContext,
  vouchedBy: 'engine' | 'book',
  source: string,
): ArrowClaim {
  try {
    const piece = new Chess(ctx.fen).get(from as Square);
    const b = piece ? boardAs(ctx.fen, piece.color) : null;
    const legal = !!b && b.moves({ square: from as Square, verbose: true }).some((m) => m.to === to);
    if (piece && legal) {
      const mine = piece.color === (ctx.studentColor === 'white' ? 'w' : 'b');
      return { from, to, role: mine ? 'play' : 'theirs', vouchedBy, source };
    }
  } catch { /* fall through to a sight line */ }
  return { from, to, role: 'vision', source };
}

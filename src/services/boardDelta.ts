import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';

/**
 * THE BOARD-DELTA COMPUTER (David 2026-07-22: "We need the package to contain
 * every relevant change that took place on the board so there are no silent
 * moves... Even the most quiet move can have important implications and
 * ramifications... Those need to be identified and stated.")
 *
 * A move's footprint is bigger than what the moved piece now does ([does]):
 *   - UNCOVERS  — sliders (either side) whose lines OPENED through the vacated
 *                 square: new reach, new targets. Future-plan fuel.
 *   - BLOCKS    — own sliders the landing square now shuts in (the classic
 *                 "Ne2 buries your f1 bishop" teaching point).
 *   - ABANDONS  — own pieces the mover defended from its old square that are
 *                 now defended by NOBODY (an undefended piece is a standing
 *                 invitation — before it is even attacked).
 *   - WEAKENS   — pawn moves only: the squares the pawn gives up FOR GOOD
 *                 (pawns don't move back), reported near the own king or in
 *                 the centre. Permanent, so always teachable.
 *   - RIGHTS    — castling rights surrendered by a king/rook move.
 *
 * Everything is pure chess.js (attackers()) — computed, never inferred. Each
 * clause is compact prose ready for the facet package; ownership words are
 * stamped later by seatPieceReferences.
 */

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const CENTRAL = new Set(['d4', 'e4', 'd5', 'e5']);
const FILES = 'abcdefgh';

function allSquares(): Square[] {
  const out: Square[] = [];
  for (const f of FILES) for (let r = 1; r <= 8; r++) out.push(`${f}${r}` as Square);
  return out;
}
const SQUARES = allSquares();

/** Every square the piece on `sq` attacks — attackers() inverted. */
function attackSet(c: Chess, sq: Square, color: Color): Set<string> {
  const out = new Set<string>();
  for (const target of SQUARES) {
    if (target === sq) continue;
    if (c.attackers(target, color).includes(sq)) out.add(target);
  }
  return out;
}

function chebyshev(a: string, b: string): number {
  return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
}

function kingZone(c: Chess, color: Color): Set<string> {
  for (const sq of SQUARES) {
    const p = c.get(sq);
    if (p && p.type === 'k' && p.color === color) {
      return new Set(SQUARES.filter((s) => chebyshev(s, sq) <= 2));
    }
  }
  return new Set();
}

export function computeBoardDelta(fenBefore: string, san: string): string[] {
  try {
    const before = new Chess(fenBefore);
    const after = new Chess(fenBefore);
    const mv = after.move(san.replace(/[?!]+$/, ''));
    if (!mv) return [];
    const clauses: string[] = [];
    const moverColor: Color = mv.color;
    const from = mv.from;
    const to = mv.to;

    // ── UNCOVERS + BLOCKS — sliders whose reach changed because of this move ──
    const uncovered: string[] = [];
    const blocked: string[] = [];
    for (const sq of SQUARES) {
      if (sq === from || sq === to) continue;
      const pb = before.get(sq);
      const pa = after.get(sq);
      if (!pb || !pa || pb.type !== pa.type || pb.color !== pa.color) continue;
      if (pb.type !== 'b' && pb.type !== 'r' && pb.type !== 'q') continue; // only sliders gain/lose reach by blocking
      const sb = attackSet(before, sq, pb.color);
      const sa = attackSet(after, sq, pb.color);
      const gained = [...sa].filter((x) => !sb.has(x));
      const lost = [...sb].filter((x) => !sa.has(x));
      // The slider was UNBLOCKED by this move when it bore on the vacated
      // square before (a slider "attacks" its own blocker, so `from` lives in
      // the before-set, not the gained-set) and its reach actually grew.
      // Meaningful growth only: an ENEMY piece newly hit, a central square, or
      // real reach (≥3 new squares). A one-square extension onto an own piece
      // (the a1 rook "reaching" the c1 bishop after Nc3) is noise.
      const meaningfulGain = gained.some((g) => {
        const occ = after.get(g as Square);
        return (occ && occ.color !== pb.color) || CENTRAL.has(g);
      }) || gained.length >= 3;
      if (sb.has(from) && gained.length > 0 && meaningfulGain) {
        const far = gained.reduce((m, g) => (chebyshev(g, sq) > chebyshev(m, sq) ? g : m), gained[0]);
        const hits = gained
          .map((g) => ({ g, p: after.get(g as Square) }))
          .filter((x) => x.p && x.p.color !== pb.color)
          .map((x) => `the ${PIECE_WORD[(x.p as { type: PieceSymbol }).type]} on ${x.g}`);
        uncovered.push(`the ${PIECE_WORD[pb.type]} on ${sq}'s line just opened — it now reaches ${far}${hits.length ? `, hitting ${hits.slice(0, 2).join(' and ')}` : ''}`);
      }
      if (lost.length > 0 && !lost.includes(to) && sa.has(to) && pb.color === moverColor) {
        // The landing square sits on this OWN slider's former line — the move
        // shut it in (losses beyond `to` are the blocked tail).
        const tail = lost.filter((x) => chebyshev(x, sq) > chebyshev(to, sq));
        if (tail.length >= 2) {
          blocked.push(`the move shuts in the ${PIECE_WORD[pb.type]} on ${sq} — its line past ${to} is closed`);
        }
      }
    }
    clauses.push(...uncovered.slice(0, 2));
    clauses.push(...blocked.slice(0, 2));

    // ── ABANDONS — own pieces the mover guarded from `from`, now guarded by nobody ──
    const dutiesBefore = attackSet(before, from, moverColor);
    const abandoned: string[] = [];
    for (const sq of dutiesBefore) {
      const p = after.get(sq as Square);
      if (!p || p.color !== moverColor || p.type === 'k') continue;
      if (after.attackers(sq as Square, moverColor).length === 0) {
        abandoned.push(`the ${PIECE_WORD[p.type]} on ${sq}`);
      }
    }
    if (abandoned.length) {
      clauses.push(`the move walks away from ${abandoned.slice(0, 2).join(' and ')} — no defender left, and an undefended piece is a standing invitation`);
    }

    // ── WEAKENS — pawn moves give up squares FOR GOOD ──
    if (mv.piece === 'p' && !mv.captured) {
      const file = from.charCodeAt(0) - 97;
      const rank = Number(from[1]);
      const dir = moverColor === 'w' ? 1 : -1;
      const gaveUp: string[] = [];
      for (const df of [-1, 1]) {
        const f = file + df;
        const r = rank + dir;
        if (f < 0 || f > 7 || r < 1 || r > 8) continue;
        gaveUp.push(`${FILES[f]}${r}`);
      }
      const zone = kingZone(after, moverColor);
      const meaningful = gaveUp.filter((s) => zone.has(s) || CENTRAL.has(s));
      if (meaningful.length) {
        clauses.push(`the pawn gives up ${meaningful.join(' and ')} for good — pawns don't move back, so ${meaningful.length > 1 ? 'those squares' : 'that square'} now need${meaningful.length > 1 ? '' : 's'} piece cover`);
      }
    }

    // ── RIGHTS — castling surrendered by a non-castling king/rook move ──
    const cbBefore = fenBefore.split(' ')[2] ?? '-';
    const cbAfter = after.fen().split(' ')[2] ?? '-';
    if (cbBefore !== cbAfter && !/^O-O/.test(mv.san)) {
      const short = moverColor === 'w' ? 'K' : 'k';
      const long = moverColor === 'w' ? 'Q' : 'q';
      const lostShort = cbBefore.includes(short) && !cbAfter.includes(short);
      const lostLong = cbBefore.includes(long) && !cbAfter.includes(long);
      if (lostShort && lostLong) {
        clauses.push('that move gives up castling for good — the king settles for the middle');
      } else if (lostShort || lostLong) {
        clauses.push(`that move gives up castling ${lostShort ? 'short' : 'long'}`);
      }
    }

    return clauses;
  } catch {
    return [];
  }
}

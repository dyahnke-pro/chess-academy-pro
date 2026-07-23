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
    const uncovered: Array<{ type: PieceSymbol; sq: string; color: Color; text: string }> = [];
    const blocked: string[] = [];
    // Every mover slider this move UNBLOCKED, ungated — used to spot the
    // free-both-pieces IDEA below even when the diagonals open onto empty space.
    const unblockedMover: Array<{ type: PieceSymbol; sq: string }> = [];
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
      const wasUnblocked = sb.has(from) && gained.length > 0;
      if (wasUnblocked && pb.color === moverColor) unblockedMover.push({ type: pb.type, sq });
      // A newly-opened line is only WORTH SAYING when it reaches an ENEMY piece
      // or a central square — "it now reaches h5" onto empty space is mechanics,
      // not teaching (David 2026-07-23: voice the idea, cut the readout). The
      // long-empty-diagonal case (≥3 squares) used to fire here and produced the
      // 1.e4 "queen's line reaches h5 / bishop's line reaches a6" firehose; the
      // freeing-of-pieces IDEA is voiced once, below, instead.
      const worthSaying = gained.some((g) => {
        const occ = after.get(g as Square);
        // Reaching a PIECE is news only if it's an enemy (a fresh target);
        // reaching your OWN piece — even the pawn you just pushed to d4 — is not.
        // Reaching an EMPTY central square is real control worth a word.
        if (occ) return occ.color !== pb.color;
        return CENTRAL.has(g);
      });
      if (wasUnblocked && worthSaying) {
        const far = gained.reduce((m, g) => (chebyshev(g, sq) > chebyshev(m, sq) ? g : m), gained[0]);
        const hits = gained
          .map((g) => ({ g, p: after.get(g as Square) }))
          .filter((x) => x.p && x.p.color !== pb.color)
          .map((x) => `the ${PIECE_WORD[(x.p as { type: PieceSymbol }).type]} on ${x.g}`);
        uncovered.push({ type: pb.type, sq, color: pb.color, text: `the ${PIECE_WORD[pb.type]} on ${sq}'s line just opened — it now reaches ${far}${hits.length ? `, hitting ${hits.slice(0, 2).join(' and ')}` : ''}` });
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
    // A pawn advance that swings open BOTH the queen's and a bishop's diagonal
    // at once (the 1.e4 / 1...e5 idea) is ONE teaching point — voice the idea,
    // not two mechanical "line opened" clauses (David 2026-07-23: "the most
    // aggressive opening because it opens up both the diagonals for the queen
    // and bishop").
    const onDiagonal = (a: string, bSq: string): boolean => {
      const df = Math.abs(a.charCodeAt(0) - bSq.charCodeAt(0));
      const dr = Math.abs(Number(a[1]) - Number(bSq[1]));
      return df > 0 && df === dr;
    };
    // The bishop always opened along a diagonal; the queen only qualifies for
    // "opens the DIAGONALS for both" when the vacated square sits on the queen's
    // DIAGONAL — not its file (…d6 frees the queen down the d-FILE, so "diagonals"
    // would be a chess falsity there). This narrows the idea to the true e-pawn
    // double-diagonal case (1.e4 / 1…e5).
    const openQ = unblockedMover.find((u) => u.type === 'q' && onDiagonal(from, u.sq));
    const openB = unblockedMover.find((u) => u.type === 'b');
    if (mv.piece === 'p' && openQ && openB) {
      // Seat-neutral ending — seatPieceReferences stamps the named pieces
      // (your/their queen…); the tail must NOT hard-code "your" or it mis-seats
      // the opponent's move ("free your pieces" on …e5).
      clauses.push(`it opens the diagonals for both the ${PIECE_WORD.q} on ${openQ.sq} and the ${PIECE_WORD.b} on ${openB.sq} at once — the most aggressive way to open the position`);
      // Any OTHER slider that opened onto a real target still reports normally.
      const rest = uncovered.filter((u) => !(u.color === moverColor && (u.type === 'q' || u.type === 'b')));
      clauses.push(...rest.slice(0, 2).map((u) => u.text));
    } else {
      clauses.push(...uncovered.slice(0, 2).map((u) => u.text));
    }
    clauses.push(...blocked.slice(0, 2));

    // ── ABANDONS — own pieces the mover guarded from `from`, now guarded by nobody ──
    const dutiesBefore = attackSet(before, from, moverColor);
    const abandoned: string[] = [];
    for (const sq of dutiesBefore) {
      // The landing square is the MOVER itself after the move — "walks away
      // from the knight on d5" when d5 is where it just arrived is incoherent
      // (board-awareness sweep, 2026-07-22). The mover's own safety is the
      // [loose]/hanging detector's job, not an abandonment.
      if (sq === to) continue;
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
      // A square another OWN pawn still covers is not weakened — "needs piece
      // cover" was false for 1.e4's d3/f3 while c2/g2 still guarded them
      // (board-awareness sweep, 2026-07-22). Only squares with ZERO remaining
      // own-pawn cover are genuinely given up to piece duty.
      const meaningful = gaveUp.filter((s) => (zone.has(s) || CENTRAL.has(s))
        && !after.attackers(s as Square, moverColor).some((att) => after.get(att)?.type === 'p'));
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

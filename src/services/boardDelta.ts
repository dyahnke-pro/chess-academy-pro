import { Chess } from 'chess.js';
import type { Square, Color, PieceSymbol } from 'chess.js';
import { snapshot, relationKey, type Relation, type RelationSnapshot } from './relations';
import { andList } from '../utils/andList';

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
 * Everything is read off the RELATION SNAPSHOT of the two boards
 * (`relations.ts`, WO-STORY-MATRIX-01 P1-7) — computed, never inferred: this
 * file renders the diff. Each clause is compact prose ready for the facet
 * package; ownership words are stamped later by seatPieceReferences.
 */

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const CENTRAL = new Set(['d4', 'e4', 'd5', 'e5']);
const FILES = 'abcdefgh';

/** File-major board order (a1, a2 … a8, b1 …) — the order this computer has
 *  always listed squares in, kept so its sentences do not move. */
function fileMajor(sq: string): number {
  return (sq.charCodeAt(0) - 97) * 8 + Number(sq[1]) - 1;
}
const byFile = (a: string, b: string): number => fileMajor(a) - fileMajor(b);

function chebyshev(a: string, b: string): number {
  return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
}

/** Every square each slider on the board sees — the snapshot's `reach`
 *  relations, grouped by the slider (its square + piece), file-major. */
function reachBySlider(s: RelationSnapshot): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const r of s.relations) {
    if (r.kind !== 'reach') continue;
    const k = `${r.by}${r.byPiece}`;
    let set = out.get(k);
    if (!set) { set = new Set(); out.set(k, set); }
    set.add(r.square);
  }
  for (const [k, set] of out) out.set(k, new Set([...set].sort(byFile)));
  return out;
}

/** Is `relation` held by board `s`? */
const holds = (s: RelationSnapshot, r: Relation): boolean => s.byKey.has(relationKey(r));

export function computeBoardDelta(
  fenBefore: string,
  san: string,
  /** Optional: clause text → the squares that clause NAMED, coupled here at the
   *  point the squares are known. Without it a `[delta]` fact is geometry-blind,
   *  so two clauses describing ONE diagonal opening from both ends cannot be
   *  recognised as one claim and both speak (David 2026-09-16, reading ply 23).
   *  Same out-map pattern as `computeMoveFacets`'s `recSquares` — optional, so
   *  every existing caller is untouched. NEVER scrape these back out of prose. */
  outSquares?: Map<string, readonly string[]>,
): string[] {
  try {
    const after = new Chess(fenBefore);
    const mv = after.move(san.replace(/[?!]+$/, ''));
    if (!mv) return [];
    // THE RELATION SNAPSHOT (WO-STORY-MATRIX-01 P1-7, 2026-10-30): this file
    // used to re-derive every slider's reach by asking `attackers()` of all 64
    // squares, twice a slider — the relations a move changed, kept only as
    // prose. It now reads the one snapshot of each board and renders the diff.
    const before = snapshot(fenBefore);
    const afterSnap = snapshot(after.fen());
    if (!before || !afterSnap) return [];
    const clauses: string[] = [];
    const rec = (text: string, squares: ReadonlyArray<string | null | undefined>): string => {
      if (outSquares) {
        const clean = squares.filter((x): x is string => typeof x === 'string' && /^[a-h][1-8]$/.test(x));
        if (clean.length) outSquares.set(text, [...new Set(clean)]);
      }
      return text;
    };
    const moverColor: Color = mv.color;
    const from = mv.from;
    const to = mv.to;
    const occupant = (sq: string): { type: PieceSymbol; color: Color } | undefined => after.get(sq as Square);

    // ── UNCOVERS + BLOCKS — sliders whose reach changed because of this move ──
    const uncovered: Array<{ type: PieceSymbol; sq: string; color: Color; text: string; squares: readonly string[] }> = [];
    const blocked: string[] = [];
    // Every mover slider this move UNBLOCKED, ungated — used to spot the
    // free-both-pieces IDEA below even when the diagonals open onto empty space.
    const unblockedMover: Array<{ type: PieceSymbol; sq: string }> = [];
    const reachBefore = reachBySlider(before);
    const reachAfter = reachBySlider(afterSnap);
    const sliders = [...reachBefore.keys()]
      .map((k) => ({ k, sq: k.slice(0, 2), color: k[2] as Color, type: k[3] as PieceSymbol }))
      .filter((x) => x.sq !== from && x.sq !== to && reachAfter.has(x.k))
      .sort((a, b) => byFile(a.sq, b.sq));
    for (const { k, sq, color, type } of sliders) {
      const sb = reachBefore.get(k) ?? new Set<string>();
      const sa = reachAfter.get(k) ?? new Set<string>();
      const gained = [...sa].filter((x) => !sb.has(x));
      const lost = [...sb].filter((x) => !sa.has(x));
      // The slider was UNBLOCKED by this move when it bore on the vacated
      // square before (a slider "attacks" its own blocker, so `from` lives in
      // the before-set, not the gained-set) and its reach actually grew.
      const wasUnblocked = sb.has(from) && gained.length > 0;
      if (wasUnblocked && color === moverColor) unblockedMover.push({ type, sq });
      // A newly-opened line is only WORTH SAYING when it reaches an ENEMY piece
      // or a central square — "it now reaches h5" onto empty space is mechanics,
      // not teaching (David 2026-07-23: voice the idea, cut the readout). The
      // long-empty-diagonal case (≥3 squares) used to fire here and produced the
      // 1.e4 "queen's line reaches h5 / bishop's line reaches a6" firehose; the
      // freeing-of-pieces IDEA is voiced once, below, instead.
      const worthSaying = gained.some((g) => {
        const occ = occupant(g);
        // Reaching a PIECE is news only if it's an enemy (a fresh target);
        // reaching your OWN piece — even the pawn you just pushed to d4 — is not.
        // Reaching an EMPTY central square is real control worth a word.
        if (occ) return occ.color !== color;
        return CENTRAL.has(g);
      });
      if (wasUnblocked && worthSaying) {
        const far = gained.reduce((m, g) => (chebyshev(g, sq) > chebyshev(m, sq) ? g : m), gained[0]);
        const hitTargets = gained
          .map((g) => ({ g, p: occupant(g) }))
          .filter((x) => x.p && x.p.color !== color);
        const hits = hitTargets.map((x) => `the ${PIECE_WORD[(x.p as { type: PieceSymbol }).type]} on ${x.g}`);
        // No `.slice(0, 2)` — a cap on computed facts is banned (G4.5); a long
        // list is a PHRASING problem, so it reads as "a, b and c".
        const hitList = andList(hits);
        uncovered.push({
          type, sq, color,
          // THE CLAUSE'S OWN GEOMETRY: the slider and what it now bears on.
          // Deliberately NOT the move's from/to — including those diluted the
          // overlap between "their bishop on e2 now reaches g4" and "your bishop
          // on g4 now reaches e2" from 1.0 to 0.5, so the two halves of ONE
          // opened diagonal stopped reading as one claim (David 2026-09-16).
          squares: [sq, far, ...hitTargets.map((x) => x.g)],
          text: `the ${PIECE_WORD[type]} on ${sq}'s line just opened — it now reaches ${far}${hits.length ? `, hitting ${hitList}` : ''}`,
        });
      }
      if (lost.length > 0 && !lost.includes(to) && sa.has(to) && color === moverColor) {
        // The landing square sits on this OWN slider's former line — the move
        // shut it in (losses beyond `to` are the blocked tail).
        const tail = lost.filter((x) => chebyshev(x, sq) > chebyshev(to, sq));
        if (tail.length >= 2) {
          blocked.push(`the move shuts in the ${PIECE_WORD[type]} on ${sq} — its line past ${to} is closed`);
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
      clauses.push(rec(`it opens the diagonals for both the ${PIECE_WORD.q} on ${openQ.sq} and the ${PIECE_WORD.b} on ${openB.sq} at once — the most aggressive way to open the position`,
        // ONLY the squares this clause NAMES. Recording the move's own from/to
        // here would light a yellow highlight on squares the narration never
        // mentions — the opposite of lead-the-eye, and a phantom-highlight bug
        // that `reviewFullData.test.ts` catches by construction.
        [openQ.sq, openB.sq]));
      // Any OTHER slider that opened onto a real target still reports normally.
      const rest = uncovered.filter((u) => !(u.color === moverColor && (u.type === 'q' || u.type === 'b')));
      clauses.push(...rest.map((u) => rec(u.text, u.squares)));
    } else {
      clauses.push(...uncovered.map((u) => rec(u.text, u.squares)));
    }
    clauses.push(...blocked);

    // ── ABANDONS — own pieces the mover guarded from `from`, now guarded by nobody ──
    // The guards the moved piece held on the board before (a pinned one too —
    // it still stood watch), and the pieces left loose after.
    const enemyColor: Color = moverColor === 'w' ? 'b' : 'w';
    const homeRank = moverColor === 'w' ? '2' : '7';
    const abandoned: string[] = [];
    const duties = before.relations
      .filter((r): r is Extract<Relation, { kind: 'guard' | 'guard-pinned' }> => (r.kind === 'guard' || r.kind === 'guard-pinned') && r.by === from)
      .sort((a, b) => byFile(a.square, b.square));
    for (const d of duties) {
      // The landing square is the MOVER itself after the move — "walks away
      // from the knight on d5" when d5 is where it just arrived is incoherent
      // (board-awareness sweep, 2026-07-22). The mover's own safety is the
      // [loose]/hanging detector's job, not an abandonment.
      if (d.square === to) continue;
      if (!holds(afterSnap, { kind: 'loose', square: d.square, piece: d.piece })) continue;
      // NOT EVERY UNDEFENDED PAWN IS NEWS (David 2026-09-15, reading a real
      // review: "the move walks away from your pawn on h7 — no defender left"
      // fired on a dozen plies, most about a home-rank pawn nothing was near).
      // A pawn still on its starting rank with no enemy attacker is not a
      // standing invitation; it is filler, and the Narration Voice Rules ban
      // filler. Every other abandoned piece — any minor/rook/queen, and any
      // pawn an enemy piece actually eyes — still speaks.
      const type = d.piece[1] as PieceSymbol;
      const eyed = afterSnap.relations.some((r) => r.kind === 'attack' && r.square === d.square && r.byPiece[0] === enemyColor);
      if (type === 'p' && d.square[1] === homeRank && !eyed) continue;
      abandoned.push(`the ${PIECE_WORD[type]} on ${d.square}`);
    }
    if (abandoned.length) {
      // Every abandoned piece is named (G4.5: this list was cut to two).
      clauses.push(`the move walks away from ${andList(abandoned)} — no defender left, and an undefended piece is a standing invitation`);
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
      // A square another OWN pawn still covers is not weakened — "needs piece
      // cover" was false for 1.e4's d3/f3 while c2/g2 still guarded them
      // (board-awareness sweep, 2026-07-22). Only squares near the own king or
      // in the centre with ZERO remaining own-pawn cover are genuinely given up
      // to piece duty — the snapshot's `uncovered` relation.
      const meaningful = gaveUp.filter((s) => holds(afterSnap, { kind: 'uncovered', color: moverColor, square: s as Square }));
      if (meaningful.length) {
        clauses.push(`the pawn gives up ${meaningful.join(' and ')} for good — pawns don't move back, so ${meaningful.length > 1 ? 'those squares' : 'that square'} now need${meaningful.length > 1 ? '' : 's'} piece cover`);
      }
    }

    // ── RIGHTS — castling surrendered by a non-castling king/rook move ──
    if (!/^O-O/.test(mv.san)) {
      const lostSide = (side: 'short' | 'long'): boolean => {
        const r: Relation = { kind: 'castling', color: moverColor, side };
        return holds(before, r) && !holds(afterSnap, r);
      };
      const lostShort = lostSide('short');
      const lostLong = lostSide('long');
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

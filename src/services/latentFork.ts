// latentFork — the fork that is TWO moves away, not one (David 2026-09-16: "A
// good detector to have is pieces on forkable squares").
//
// THE GAP IT FILLS, and the boundary that stops it duplicating anything.
// `detectNewThreat` is MOVE-TRIGGERED: it sees a fork the move just created,
// N = 1. Nothing in the app sees a fork one PREPARATORY move away — the knight
// that wants d5, two quiet hops from here, where it would hit the queen and the
// rook at once. That foresight IS the teaching (G4.5.16: "Future moves, how to
// think, threat identification, that is teaching"). So this detector's domain
// is N >= 2 and ONLY N >= 2; at N = 1 it stands down and lets the live threat
// lane speak, which is both louder and already correct.
//
// 🚨 WHY THE NAIVE VERSION IS USELESS. "Pieces on forkable squares" fires
// constantly: in nearly every pre-castling position the black queen on d8 and
// rook on h8 are knight-forkable from f7, and saying so every move is noise
// that teaches nothing. All four gates below are load-bearing — remove any one
// and the detector becomes a metronome.
//
//   (a) >= 2 enemy pieces worth MORE than the forker are hit from S (or the
//       king plus one major — mirroring detectNewThreat's own definition);
//   (b) the mover ACTUALLY OWNS a piece whose geometry makes S a fork square —
//       a fork nobody can deliver is not a fact about this game;
//   (c) that piece can REACH S in N >= 2 quiet moves (`movesToReach`);
//   (d) S is SAFE on arrival (`landingIsSafe`) — walking into a defended square
//       is a blunder, not a plan.
//
// SCOPE: KNIGHTS. Stated plainly rather than implied. The knight is the
// canonical fork and the only piece whose reach is blocker-free, so the hop BFS
// is exact. A slider "fork" is a double attack that any blocker dissolves, and
// at N >= 2 a queen reaches most squares anyway, which collapses the whole
// latent framing. Extending to sliders needs blocker handling in `bfsRoute`
// first; until then this says knight and means it (empty > generic).
//
// TWO SEATS, EXPLICIT. Same shape as `latentDanger`: the student's own
// OPPORTUNITY and the opponent's coming DANGER are the same geometry read from
// opposite chairs, and the caller says which — never a default (the
// `describeThreatRecognition` inversion, fixed the same week).
import { Chess, type Square } from 'chess.js';
import { landingIsSafe } from './positionReadingService';
import { movesToReach } from './forwardTeaching';

/**
 * 🔒 EXACTLY TWO QUIET MOVES — the domain, found by READING the output.
 *
 * The first cut allowed up to four, and all four gates passed on lines like
 * "your knight has a fork waiting on c7" spoken to White in the CARO-KANN
 * STARTING POSITION, three hops away, before Black has castled. That is the
 * noise the naive detector was supposed to avoid, arriving through the door
 * marked "foresight": at N >= 3 the opponent gets three moves to castle, block
 * the square, or move the target, so the claim is not false — it is unfounded.
 *
 * At N = 2 the opponent gets exactly ONE move, which makes it a plan a student
 * can actually check. And the two cases that survive are the canonical ones the
 * app should have been teaching all along: Nf3→g6 hitting queen and rook, and
 * the Sicilian's Nd4–b5–c7 hitting king and rook.
 *
 * This is NOT a G4.5 cap. A cap truncates a list of computed FACTS; this
 * defines which positions contain a latent fork AT ALL — the same class as
 * `MIN_BEAT_PLIES` or the criticality bar. Nothing computed is withheld.
 *
 * OWED: a stability gate would justify going deeper. In a locked structure or a
 * sparse endgame the board survives three moves, so N = 3 is a real plan there
 * and silence costs teaching. That needs a computer (pawn locks, piece count),
 * and guessing at it is what produced the Caro line above.
 */
const MAX_TEMPO = 2;

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const FILES = 'abcdefgh';
const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
];

export interface LatentFork {
  /** The square the knight wants. */
  square: string;
  /** Where the knight stands now. */
  from: string;
  /** Quiet moves to get there — always >= 2 by contract. */
  moves: number;
  /** The enemy pieces it would hit from there, richest first. */
  targets: Array<{ square: string; piece: string }>;
  /** Whose opportunity this is. */
  forker: 'white' | 'black';
  /** The safe first hop on the way (N = 2) — the route, named on Learn. */
  via: string;
}

function squaresHitFrom(sq: string): string[] {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  const out: string[] = [];
  for (const [df, dr] of KNIGHT_DELTAS) {
    const nf = f + df;
    const nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
    out.push(`${FILES[nf]}${nr}`);
  }
  return out;
}

/** The board with the knight teleported to `target` — what gate (d) must judge,
 *  since safety on arrival is a property of the position AFTER the journey, not
 *  of the one the student is looking at. */
function boardWithKnightOn(chess: Chess, from: string, target: string, colour: 'w' | 'b'): string | null {
  try {
    const probe = new Chess(chess.fen());
    probe.remove(from as Square);
    probe.put({ type: 'n', color: colour }, target as Square);
    return probe.fen();
  } catch {
    return null;
  }
}

/** `landingIsSafe` asks whether the SIDE TO MOVE can win the square, so a
 *  safety check must hand it the opponent on move — with the forker on move it
 *  asked whether White could take White's own knight, and always said yes-safe. */
function withMover(fen: string, mover: 'w' | 'b'): string {
  const parts = fen.split(' ');
  parts[1] = mover;
  parts[3] = '-';
  return parts.join(' ');
}

/** Can this knight move at all? A knight pinned to its own king has no legal
 *  move, so no route starts from it (hand walk 2340: "your knight has a fork
 *  waiting on c7" with Nc3 pinned by …Bb4). Judged with the knight's side to
 *  move; a board that will not load answers false. */
function knightCanMove(fen: string, from: string, me: 'w' | 'b'): boolean {
  try {
    return new Chess(withMover(fen, me)).moves({ square: from as Square }).length > 0;
  } catch {
    return false;
  }
}

/** A one-hop waypoint from `from` that reaches `target` next, and on which
 *  the knight is not simply lost. */
function safeWaypoint(chess: Chess, from: string, target: string, me: 'w' | 'b', them: 'w' | 'b'): string | null {
  const next = new Set(squaresHitFrom(target));
  for (const w of squaresHitFrom(from)) {
    if (!next.has(w)) continue;
    const occ = chess.get(w as Square);
    if (occ && occ.color === me) continue;
    const at = boardWithKnightOn(chess, from, w, me);
    if (!at) continue;
    // The opponent moves next: judge the waypoint with them on move.
    if (landingIsSafe(withMover(at, them), w as Square)) return w;
  }
  return null;
}

/**
 * The best latent knight fork for `forker`, or null.
 *
 * `forker` is REQUIRED — the student's opportunity and the opponent's threat
 * are the same geometry from opposite seats, and a silent default would hand
 * one of them the wrong chair.
 */
export function detectLatentFork(fen: string, forker: 'white' | 'black'): LatentFork | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }
  const me = forker === 'white' ? 'w' : 'b';
  const them = forker === 'white' ? 'b' : 'w';

  // Gate (b), hoisted: no knight, no fork. Doing this FIRST is also the cost
  // pre-filter — most positions past the middlegame exit here for free.
  const knights: string[] = [];
  const enemies: Array<{ sq: string; type: string }> = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === me && cell.type === 'n') knights.push(cell.square);
      else if (cell.color === them) enemies.push({ sq: cell.square, type: cell.type });
    }
  }
  if (knights.length === 0) return null;
  const mobileKnights = knights.filter((k) => knightCanMove(fen, k, me));
  if (mobileKnights.length === 0) return null;

  // Gate (a) as a CHEAP PRE-FILTER. Rather than scanning 64 squares against the
  // whole board, walk OUT from each valuable enemy piece: only a square that
  // already sees one of them can possibly see two. `detectNewThreat` is ~13ms
  // and `scanBestMoveShot` ~21ms, so a detector that dwarfed them would be
  // unshippable on a live surface whatever it found.
  const worthForking = enemies.filter((e) => VAL[e.type] > VAL.n || e.type === 'k');
  if (worthForking.length < 2) return null;
  const candidates = new Set<string>();
  for (const e of worthForking) {
    for (const s of squaresHitFrom(e.sq)) {
      if (!chess.get(s as Square)) candidates.add(s); // must land on an empty square
    }
  }

  let best: LatentFork | null = null;
  for (const square of candidates) {
    // Gate (a) proper.
    const hit: Array<{ square: string; piece: string }> = [];
    for (const s of squaresHitFrom(square)) {
      const p = chess.get(s as Square);
      if (!p || p.color !== them) continue;
      if (VAL[p.type] > VAL.n || p.type === 'k') hit.push({ square: s, piece: p.type });
    }
    // Two of them, and the king already counts as one via `worthForking` — so
    // "king plus a major" (detectNewThreat's own bar) needs no special case.
    if (hit.length < 2) continue;

    for (const from of mobileKnights) {
      // Gate (c). N >= 2 is the whole domain: at N = 1 this is a live threat and
      // the threat lane owns it.
      const moves = movesToReach(chess.fen(), from as Square, square as Square, MAX_TEMPO);
      if (moves == null || moves < 2 || moves > MAX_TEMPO) continue;
      // Gate (d) — safe ON ARRIVAL, judged on the arrived-at board.
      const after = boardWithKnightOn(chess, from, square, me);
      if (!after || !landingIsSafe(withMover(after, them), square as Square)) continue;
      // Gate (e) — a ROUTE that survives the first hop (walk 6, L3: "your
      // knight has a fork waiting on f7" when the only way there, g5, hangs
      // to the queen). At N = 2 the route is one intermediate square; at least
      // one must be a square the knight can stand on without being lost.
      const via = safeWaypoint(chess, from, square, me, them);
      if (!via) continue;

      hit.sort((a, b) => (VAL[b.piece] ?? 0) - (VAL[a.piece] ?? 0));
      const found: LatentFork = { square, from, moves, targets: hit, forker, via };
      // Nearest first, then richest — two moves away teaches more urgently than
      // four, and this is foresight, not a catalogue.
      if (!best
        || found.moves < best.moves
        || (found.moves === best.moves
          && found.targets.reduce((n, t) => n + (VAL[t.piece] ?? 0), 0)
             > best.targets.reduce((n, t) => n + (VAL[t.piece] ?? 0), 0))) {
        best = found;
      }
    }
  }
  return best;
}

const PIECE_WORD: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * The spoken clause, in the app's one perspective (student = "you/your",
 * opponent = "they/their"). `studentSide` is REQUIRED for the same reason the
 * detector's `forker` is.
 *
 * GUIDE, DON'T TELL — the same posture as `latentDanger`. For the student's own
 * opportunity it names the SQUARE and the targets but not the route: finding
 * the path is the calculation the student should do. For the opponent's it
 * names the danger so they can prevent it.
 */
export function latentForkClause(fork: LatentFork, studentSide: 'white' | 'black'): string {
  const names = fork.targets.map((t) => `${PIECE_WORD[t.piece]} on ${t.square}`);
  const list = names.length === 2
    ? `${names[0]} and ${names[1]}`
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return fork.forker === studentSide
    // THE ROUTE IS NAMED (David 2026-09-24: Learn names the move; "the route
    // is yours to find" belonged to the old question cards — walk 1500, 38.Ne3).
    ? `Your knight has a fork waiting on ${fork.square} — via ${fork.via}, then ${fork.square}, it hits their ${list}.`
    : `Watch ${fork.square} — a knight lands there in ${fork.moves} and forks your ${list}. Take the square away before it arrives.`;
}

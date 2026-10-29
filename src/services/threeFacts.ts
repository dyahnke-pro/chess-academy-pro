// threeFacts — WHAT A MOVE SETS UP, WHAT THEY ARE AIMING AT, AND HOW THE TWO
// MEET (WO-DECIDER-02, David 2026-10-28: "Deep, same length: 'g6 — your bishop
// goes to g7, where b4 just opened the diagonal to their rook on a1.' Putting
// pressure on the weak f7 pawn, white's main target for now" → "Three facts and
// adding the deeper engine work").
//
// Same length, more profound: these replace the shallow "it bears down on f5",
// never add to it. All three are read off the board and the line that follows
// (the game's own continuation in Review, the taught line in a lesson):
//
//   1. THE DEEP FACT — the mover's next move or the one after it in the line
//      (two moves, both sides), when THIS move made it
//      possible (it vacated the square that piece lands on, or a square on its
//      path), and what that piece hits from there: "making room for your
//      bishop on g7, where it hits their rook on a1 once their b4 opens the
//      diagonal".
//   2. THEIR TARGET — what the other side's last move newly aims at: "their b4
//      is aimed at your c5 pawn". Read off the board, never a remembered pattern
//      (David's f7 example was the remembered one; on that board it is c5).
//   3. THE BINDING — how the move answers it: it covers the target, or it hits
//      back on the same side of the board.
//
// Pure chess.js. Every claim is a square a piece of the board stands on.
import { Chess, type Square, type Move } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { lineIsForcing } from './lineTrust';
import { proofCut } from './exchangeLedger';

const PIECE: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface DeepFact {
  /** "making room for your bishop on g7, where it hits their rook on a1 once their b4 opens the diagonal" */
  text: string;
  /** The square the deep fact's hit lands on (the rook's a1). */
  target: string;
  squares: string[];
  /** THE MOVE IT SETS UP — the mover's own later move in the line (Learn holds
   *  a student's, since it names their next move, and credits it when played). */
  follow: { piece: string; from: string; to: string; san: string; uci: string };
  /** What the follow-up hits from there: the unit and the words ("hits their
   *  rook on a1"), so a credit is checked on the board it is said on. */
  hit: { square: string; type: string; words: string };
  /** The other side's move in the line that opens the way, when the text names
   *  one ("once their b4 opens the diagonal") — a move the surface may hold. */
  opener: { san: string; from: string; to: string } | null;
  /** Where the follow-up sits in `line` (the line it was read from). */
  lineIndex: number;
}

export interface TheirTarget {
  /** "their b4 is aimed at your c5 pawn" (seat words from the MOVER's side). */
  text: string;
  square: string;
  /** Where the attacker stands (their move's landing square). */
  by: string;
}

const FILES = 'abcdefgh';
function wing(square: string): 'queenside' | 'centre' | 'kingside' {
  const f = FILES.indexOf(square[0]);
  return f <= 2 ? 'queenside' : f >= 5 ? 'kingside' : 'centre';
}

/** The squares strictly between `a` and `b` on a shared rank, file or
 *  diagonal, and the kind of line; null when they share none. */
function between(a: string, b: string): { squares: string[]; kind: 'file' | 'rank' | 'diagonal' } | null {
  const fa = FILES.indexOf(a[0]); const ra = Number(a[1]);
  const fb = FILES.indexOf(b[0]); const rb = Number(b[1]);
  const df = Math.sign(fb - fa); const dr = Math.sign(rb - ra);
  const kind = df === 0 ? 'file' : dr === 0 ? 'rank' : Math.abs(fb - fa) === Math.abs(rb - ra) ? 'diagonal' : null;
  if (!kind) return null;
  const out: string[] = [];
  for (let f = fa + df, r = ra + dr; f !== fb || r !== rb; f += df, r += dr) out.push(`${FILES[f]}${r}`);
  return { squares: out, kind };
}

function play(fen: string, san: string): { board: Chess; move: Move } | null {
  try {
    const board = new Chess(fen);
    const move = board.move(san);
    return { board, move };
  } catch {
    return null;
  }
}

/** The enemy units the piece on `sq` THREATENS on `board`, most valuable
 *  first: the king (check), a piece nothing guards or one worth more than the
 *  hitter, a pawn nothing guards. A queen "hitting" a rook its partner guards
 *  threatens nothing (v4: …Qe5 was said to hit back on a guarded b8 rook). */
function hits(board: Chess, sq: string, mover: 'w' | 'b'): Array<{ square: string; type: string }> {
  const out: Array<{ square: string; type: string }> = [];
  const enemy = mover === 'w' ? 'b' : 'w';
  const worth = (t: string): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);
  const hitter = board.get(sq as Square);
  if (!hitter) return out;
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue;
      if (!board.attackers(cell.square, mover).includes(sq as Square)) continue;
      const guarded = board.attackers(cell.square, enemy).length > 0;
      if (cell.type !== 'k' && guarded && worth(cell.type) <= worth(hitter.type)) continue;
      out.push({ square: cell.square, type: cell.type });
    }
  }
  return out.sort((x, y) => worth(y.type) - worth(x.type));
}

/** How many of the mover's own moves ahead the deep fact looks on its own
 *  (WO-DECIDER-02, David 2026-10-28: two moves, both sides). Measured on 2,573
 *  of his moves: one move ahead finds a set-up on 8% of them, two on 13%; past
 *  two the new links were mostly the piece moving again later — a purpose
 *  nothing proves. */
const DEEP_FACT_MOVES = 2;
/** …and how far it looks when the link IS proven (David 2026-10-28: "why only
 *  2 moves deep … unless it's a quiet move?"): the mover's moves in between
 *  were all forcing — the other side had no choice, so the follow-up was the
 *  plan — or the piece the move freed stood still the whole time and then
 *  struck (Bc4 … Bxf7+) — and the strike wins. Same rule as naming a far line
 *  (`lineTrust`). Measured on 2,573 moves of his 34 games: 37 more moves get a
 *  set-up (1.4%), every one a strike that wins material or mates; without the
 *  win test it was 99, and two-thirds were trades or idle checks. */
const DEEP_FACT_PROVEN_MOVES = 5;
const LATER = ['', '', ' a move later', ' two moves later', ' three moves later', ' four moves later'];

/**
 * FACT 1. `san` played from `fenBefore`; `line` is what follows it (the other
 * side's reply first, then the mover's next move, …). Null unless one of the
 * mover's next two moves in the line — or up to five, when the link is proven
 * (`DEEP_FACT_PROVEN_MOVES`) — was made possible by this one and lands where
 * it hits something worth naming. The nearer one wins.
 */
export function deepFact(fenBefore: string, san: string, line: readonly string[] | null, moverIsStudent: boolean): DeepFact | null {
  if (!line || line.length < 2) return null;
  const now = play(fenBefore, san);
  if (!now) return null;
  const m = now.move;
  /** Squares the mover's pieces moved FROM or TO since this move — a piece on
   *  none of them has stood still. */
  const stirred = new Set<string>([m.from, m.to]);
  /** Every move of the mover's since this one was a check, a capture, a
   *  promotion or a threat. */
  let forcedSoFar = true;
  const own = moverIsStudent ? 'your' : 'their';
  const other = moverIsStudent ? 'their' : 'your';
  // Where the moved piece stands as the line goes on (null once it is taken).
  let pieceSq: string | null = m.to;
  // The square it left (room / path) must stay empty until the later move.
  let board = now.board;
  let via: string | null = null;
  for (let k = 1; k <= DEEP_FACT_PROVEN_MOVES; k += 1) {
    const replySan = line[2 * k - 2];
    const nextSan = line[2 * k - 1];
    if (!replySan || !nextSan) return null;
    const reply = play(board.fen(), replySan);
    if (!reply) return null;
    // They took the piece that just moved: what follows is a trade, told by
    // the exchange computers — never "opening the way" for the recapture
    // (v4: …Bf6 Bxf6 Qxf6 said as "opening the way for your queen to f6").
    if (reply.move.captured && reply.move.to === pieceSq) {
      if (k === 1) return null;
      pieceSq = null;
    }
    const roomStillEmpty = !reply.board.get(m.from);
    const next = play(reply.board.fen(), nextSan);
    if (!next) return null;
    const n = next.move;
    board = next.board;
    if (n.color !== m.color) return null;
    // This move's own history for the far rule, read BEFORE it is recorded.
    const stoodStill = !stirred.has(n.from) || (pieceSq !== null && n.from === pieceSq && pieceSq === m.to);
    const struck = !!n.captured || next.board.inCheck();
    const forcedBefore = forcedSoFar;
    stirred.add(n.from); stirred.add(n.to);
    forcedSoFar = forcedSoFar && lineIsForcing(reply.board.fen(), [`${n.from}${n.to}${n.promotion ?? ''}`], 1, n.color);
    const samePiece = pieceSq !== null && n.from === pieceSq;
    if (samePiece) {
      const wasOn = pieceSq;
      pieceSq = n.to;
      if (n.piece === 'p' || n.piece === 'k') continue;
      if (k > 1 && wasOn !== m.to) via = wasOn;
    } else if (n.piece === 'p' || n.piece === 'k') {
      continue;
    }
    // PAST TWO MOVES the link must be proven: everything before it forced, or
    // the piece stood still — and the strike WINS, by the one ledger over the
    // game's own moves that follow (mate, or a pawn or more settled). Read on
    // his 34 games: a strike that only traded ("d4 … Qxd8+" four moves on) or
    // checked for nothing ("Nf3 … Ne5+") is no move's purpose.
    if (k > DEEP_FACT_MOVES) {
      if (!(forcedBefore || stoodStill) || !struck) continue;
      const proof = proofCut(reply.board.fen(), [nextSan, ...line.slice(2 * k, 2 * k + 3)], n.color);
      const wins = !!proof && (proof.mate || (!!proof.ledger?.settled && proof.ledger.netPawns >= 1));
      if (!wins) continue;
    }
    // MADE POSSIBLE BY THIS MOVE: it lands on the square this move left, or
    // passes through it (a slider's path), or it is the same piece going on.
    const path = between(n.from, n.to)?.squares ?? [];
    const enabled = samePiece || (roomStillEmpty && (n.to === m.from || path.includes(m.from)));
    if (!enabled) continue;
    const hit = hits(next.board, n.to, n.color).at(0);
    if (!hit) continue;
    // Was the line to the target opened by the other side — by the move before
    // this one, or by their reply in the line?
    const ray = between(n.to, hit.square);
    // Not the target itself stepping into the line (v4: "hits their pawn on a4
    // once their a4 opens the file").
    const openerMove = ray && ray.squares.includes(reply.move.from) && reply.move.to !== hit.square ? reply.move : null;
    const opener = openerMove ? openerMove.san : null;
    const piece = PIECE[n.piece];
    const victim = hit.type === 'k' ? `${other} king` : `${other} ${PIECE[hit.type]} on ${hit.square}`;
    const verb = hit.type === 'k' ? 'gives check to' : 'hits';
    const later = LATER[k] ?? '';
    // Said as a clause of the move ("You play g6, making room for …"), so it
    // sits in the briefing's list like every other consequence.
    const goes = samePiece
      ? (via ? `heading on to ${n.to} by way of ${via}` : `heading on to ${n.to}${later}`)
      : n.to === m.from ? `making room for ${own} ${piece} on ${n.to}${later}`
        : `opening the way for ${own} ${piece} to ${n.to}${later}`;
    const text = opener && ray
      ? `${goes}, where it ${verb} ${victim} once ${other} ${opener} opens the ${ray.kind}`
      : `${goes}, where it ${verb} ${victim}`;
    return {
      text, target: hit.square, squares: [n.from, n.to, hit.square],
      follow: { piece: n.piece, from: n.from, to: n.to, san: n.san, uci: `${n.from}${n.to}${n.promotion ?? ''}` },
      hit: { square: hit.square, type: hit.type, words: `${verb} ${victim}` },
      opener: openerMove ? { san: openerMove.san, from: openerMove.from, to: openerMove.to } : null,
      lineIndex: 2 * k - 1,
    };
  }
  return null;
}

/** The most valuable enemy unit the moved piece itself attacks after `san`
 *  (the king, a piece, or a pawn nothing guards), or null — the move's own
 *  point when it threatens nothing concrete ("Bg7 trains on the rook on a1"). */
export function moveHit(fenBefore: string, san: string): string | null {
  const r = play(fenBefore, san);
  if (!r) return null;
  return hits(r.board, r.move.to, r.move.color).at(0)?.square ?? null;
}

/**
 * FACT 2. What the other side's last move (`theirLast`, played from its own
 * board) newly aims at among the mover's units — most valuable first, a pawn
 * only when it is short of guards. Seat words are the mover's.
 */
export function theirTarget(theirLast: { fenBefore: string; san: string } | null, moverIsStudent: boolean): TheirTarget | null {
  if (!theirLast) return null;
  const before = (() => { try { return new Chess(theirLast.fenBefore); } catch { return null; } })();
  const r = play(theirLast.fenBefore, theirLast.san);
  if (!before || !r) return null;
  const them = r.move.color;
  const mover = them === 'w' ? 'b' : 'w';
  // A check is answered as a check: what else the checking piece eyes is not
  // what the reply is about.
  if (r.board.inCheck()) return null;
  let best: { square: string; type: string } | null = null;
  for (const row of r.board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== mover || cell.type === 'k') continue;
      // NEWLY aimed at by the move that just landed.
      if (!r.board.attackers(cell.square, them).includes(r.move.to)) continue;
      if (before.attackers(cell.square, them).length >= r.board.attackers(cell.square, them).length) continue;
      const guards = r.board.attackers(cell.square, mover).length;
      const attackers = r.board.attackers(cell.square, them).length;
      if (cell.type === 'p' && guards >= attackers) continue;
      if (!best || (MATERIAL_VALUE[cell.type] ?? 0) > (MATERIAL_VALUE[best.type] ?? 0)) best = { square: cell.square, type: cell.type };
    }
  }
  if (!best) return null;
  const own = moverIsStudent ? 'your' : 'their';
  const other = moverIsStudent ? 'their' : 'your';
  return { text: `${other} ${r.move.san} is aimed at ${own} ${PIECE[best.type]} on ${best.square}`, square: best.square, by: r.move.to };
}

/**
 * FACT 3. How the move answers their target: it covers it (one more guard
 * than before), or its own point lands on the same side of the board. Null
 * when it does neither — then their target is not said either: a target the
 * move does not answer is a different lesson.
 */
export function binding(fenBefore: string, san: string, target: TheirTarget, ownPointSquare: string | null, moverIsStudent: boolean): string | null {
  const before = (() => { try { return new Chess(fenBefore); } catch { return null; } })();
  const r = play(fenBefore, san);
  if (!before || !r) return null;
  const mover = r.move.color;
  // A move that takes the attacker, or moves the target away, answers it in
  // its own words (the capture, the retreat) — the binding is not the point.
  if (r.move.to === target.by || r.move.from === target.square) return null;
  if (r.board.attackers(target.square as Square, mover).length > before.attackers(target.square as Square, mover).length) {
    return 'and this covers it';
  }
  // GOING AFTER THE ATTACKER: the moved piece now hits the piece doing it
  // (…h6 against Bg5) — read off the board, whatever else the move does.
  if (!r.move.captured && hits(r.board, r.move.to, mover).some((h) => h.square === target.by)) {
    const attacker = r.board.get(target.by as Square);
    // A check on their king says itself; "goes after the king" is not a line.
    if (attacker && attacker.type !== 'k') return `and this goes after the ${PIECE[attacker.type]} doing it`;
  }
  // HITTING BACK is only a counter when it is one: the move captured nothing
  // (a capture's point is the capture) and what it hits is worth at least
  // what they aim at — a pawn poked while a bishop hangs is not an answer
  // (2026-10-28, v4 read: "…Qe5 … so this hits back" in a lost position).
  const own = ownPointSquare ? r.board.get(ownPointSquare as Square) : null;
  const theirs = r.board.get(target.square as Square);
  if (!own || !theirs || own.color === mover || r.move.captured) return null;
  const worth = (t: string): number => (t === 'k' ? 100 : MATERIAL_VALUE[t] ?? 0);
  if (worth(own.type) < worth(theirs.type)) return null;
  if (wing(ownPointSquare as string) === wing(target.square) && wing(target.square) !== 'centre') {
    return `so this hits back on the side ${moverIsStudent ? 'they\'re' : 'you\'re'} attacking`;
  }
  return null;
}

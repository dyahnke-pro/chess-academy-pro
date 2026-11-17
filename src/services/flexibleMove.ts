// flexibleMove — THE FLEXIBLE MOVE (the option principle: Weaver Adams 1939;
// Hans Berliner, The System, 1999 — "make the move that does the least to
// reduce your options to make other important moves"). The classic case:
// develop the knight before the bishop, because the bishop has more good
// squares to choose from later; Nimzowitsch called an early central pawn
// advance "committal" for the same reason. Danya says it in his speedruns
// ("Bishop to c4 this early commits the bishop before the setup is decided";
// "play d3 before castling, it keeps the castling decision open").
//
// THE MOVER'S OPTIONS on a board — the important moves still open to them:
//   - each minor still at home and its GOOD squares: a square it can step to
//     now that a player weighs (the eye gives it at least half the share of the
//     piece's most natural square, `SIBLING_SHARE`) and that the board shows no
//     fault on (`squareIsSound`: it hangs nothing, no pawn kicks it, it shuts in
//     no bishop of the mover's) — never a knight's square on the rim;
//   - each pawn break still on (`isPawnBreak`, the one definition), keyed by
//     the square the pawn lands on, so d2-d4 and a later d3-d4 are one break;
//   - each castling side still live (the right kept, at most one piece of the
//     mover's between king and rook) while their king has not shown its side
//     (on its home square with a right of its own).
// A move USES the option it plays (the square its minor goes to, the break it
// makes, the side it castles) and REMOVES the options it takes away: the other
// good squares of the minor it develops, squares it takes from another minor,
// a break it gives up, a castling side it settles.
//
// THE FACT, compared with the moves the engine holds near the best (within
// `FLEX_NEAR_CP`, the played move too): the move kept options a near-equal
// rival would have closed (what the move removed is a strict part of what the
// rival removed), or the move committed early where a near-equal rival kept
// more (the rival's removals a strict part of the move's). Silent when the
// options come out equal or neither contains the other, when no rival is near
// the best, when the move or the rival takes or checks (a different idea), and
// past the opening's moves.
//
// PURE: chess.js, the human model's eye (`eyeRead`) and the engine reads the
// surface hands in.
import { homeSquaresOf } from './development';
import { sideToMoveAs } from './threatOut';
import { sideMaterial } from './pieceValues';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { isPawnBreak } from './pawnBreak';
import { eyeRead, squareIsSound, SIBLING_SHARE, type WeighRead } from './weighedMoves';
import { seatCp } from './winChance';
import { legalSeeGainFor } from './positionReadingService';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { andList, orList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

/** A rival within this many centipawns of the engine's best is as good as the
 *  best for the choice of order: the engine's own noise at its depth. */
const FLEX_NEAR_CP = 30;
/** AN INACCURACY BY COMMITTING TOO EARLY (David 2026-11-17: "Flexible move
 *  should maybe also fire if the less flexible move is made. An inaccuracy"):
 *  a move up to this much worse than the best still gets the fact — as
 *  'committed', the reason it cost — when a near-best rival kept the options it
 *  closed and its own line loses no material (then the material is the reason). */
const FLEX_INACCURACY_CP = 100;
/** The opening's moves (`weighedMoves`' own twelve): past them the options are
 *  the middlegame's plans, not the order of development. */
const FLEX_UNTIL_MOVE = 12;

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A pawn, on the legal exchange's scale (`legalSeeGainFor`). */
const PAWN = 1;
/** A minor's square is a choice worth keeping when it has this many good
 *  squares: settling it gives up at least two (the bishop's b5, c4, e2 — not
 *  a knight's f3 or h3). */
const SETTLE_MIN = 3;
/** On an inaccuracy the move cost something, so a minor with two good squares
 *  had a real choice to keep: settling it early is the reason (Danya's "Bc4
 *  this early commits the bishop", e4 c5 Bc4, 35 points under Nf3). */
const SETTLE_MIN_INACCURACY = 2;
/** Squares taken from a minor that stays at home: a choice narrowed only when
 *  at least this many go (e6 takes e6 and f5 from the c8 bishop). */
const SHUT_MIN = 2;

/** The edge files, where a knight sees half its squares. */
const RIM = new Set(['a', 'h']);

/** One option still open to the mover. */
export type FlexOption =
  | { kind: 'square'; piece: 'n' | 'b'; home: Square; to: Square }
  | { kind: 'break'; to: Square }
  | { kind: 'castle'; side: 'k' | 'q' };

function keyOf(o: FlexOption): string {
  return o.kind === 'square' ? `sq:${o.home}:${o.to}` : o.kind === 'break' ? `br:${o.to}` : `castle:${o.side}`;
}

function boardOf(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function moveOn(fen: string, move: string): Move | null {
  const b = boardOf(fen);
  if (!b) return null;
  try {
    return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)
      ? b.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] })
      : b.move(move);
  } catch { return null; }
}

function uciOf(m: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

/** Is the castling side live for `me`: the right kept, at most one of the
 *  mover's pieces between king and rook. */
function castleRight(b: Chess, me: Color, side: 'k' | 'q'): boolean {
  const rights = b.fen().split(' ')[2] ?? '-';
  return rights.includes(me === 'w' ? (side === 'k' ? 'K' : 'Q') : (side === 'k' ? 'k' : 'q'));
}

function castleLive(b: Chess, me: Color, side: 'k' | 'q'): boolean {
  if (!castleRight(b, me, side)) return false;
  const rank = me === 'w' ? '1' : '8';
  const between = side === 'k' ? ['f', 'g'] : ['b', 'c', 'd'];
  return between.filter((f) => !!b.get(`${f}${rank}` as Square)).length <= 1;
}

/** Has their king not yet shown its side: on its home square with a right. */
function kingUnshown(b: Chess, them: Color): boolean {
  const home = (them === 'w' ? 'e1' : 'e8') as Square;
  const k = b.get(home);
  if (!k || k.type !== 'k' || k.color !== them) return false;
  const rights = b.fen().split(' ')[2] ?? '-';
  return them === 'w' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
}

/** The breaks `me` can make now, by the square the pawn lands on: a pawn
 *  move that starts a fight with a pawn of theirs (`isPawnBreak`) and does not
 *  just drop the pawn, counted to the end of the trades — a break that loses a
 *  pawn is no option kept. */
function breaksOn(fen: string, sound: boolean): Set<Square> {
  const b = boardOf(fen);
  const out = new Set<Square>();
  if (!b) return out;
  const them: Color = b.turn() === 'w' ? 'b' : 'w';
  for (const m of b.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.promotion || !isPawnBreak(fen, m.san, null)) continue;
    if (!sound) { out.add(m.to); continue; }
    const after = boardOf(fen);
    if (!after) continue;
    after.move(m.san);
    const gave = legalSeeGainFor(after.fen(), m.to, them);
    if (gave > (m.captured ? PAWN : 0)) continue;
    out.add(m.to);
  }
  return out;
}

/**
 * THE OPTIONS of the side to move on `fen` (it must be that side's move):
 * the good squares of each minor at home, the breaks, the live castling sides.
 */
export function flexOptions(fen: string): FlexOption[] {
  const b = boardOf(fen);
  if (!b) return [];
  const me = b.turn();
  const them: Color = me === 'w' ? 'b' : 'w';
  const out: FlexOption[] = [];
  const eye = new Map(eyeRead(fen, DEFAULT_STUDENT_RATING).map((r) => [r.uci, r.p]));
  for (const piece of ['n', 'b'] as const) {
    for (const home of homeSquaresOf(piece, me)) {
      const at = b.get(home);
      if (!at || at.type !== piece || at.color !== me) continue;
      const steps = b.moves({ square: home, verbose: true }).filter((m) => !m.captured);
      const top = Math.max(0, ...steps.map((m) => eye.get(uciOf(m)) ?? 0));
      if (top <= 0) continue;
      for (const m of steps) {
        if ((eye.get(uciOf(m)) ?? 0) < SIBLING_SHARE * top) continue;
        // A knight on the rim is dim: the edge file is never a good square.
        if (piece === 'n' && RIM.has(m.to[0])) continue;
        if (!squareIsSound(fen, m.san)) continue;
        out.push({ kind: 'square', piece, home, to: m.to });
      }
    }
  }
  for (const to of breaksOn(fen, true)) out.push({ kind: 'break', to });
  if (kingUnshown(b, them)) {
    for (const side of ['k', 'q'] as const) if (castleLive(b, me, side)) out.push({ kind: 'castle', side });
  }
  return out;
}

/** Is the option still open on `fenAfterMe` (the board after the mover's
 *  move, the mover to move again)? A minor's square is checked on the board
 *  alone — still at home, the step still legal and sound — never re-weighed by
 *  the eye, whose shares move with every board. */
function stillOpen(o: FlexOption, after: Chess, fen: string, me: Color, breaks: Set<Square>): boolean {
  if (o.kind === 'square') {
    const at = after.get(o.home);
    if (!at || at.type !== o.piece || at.color !== me) return false;
    // Still legal, and the minor not lost there by the legal exchange — a
    // square the move took the guard from is a square taken. The pawn kick and
    // the shut-in bishop are read once, on the board before (`flexOptions`).
    const step = after.moves({ square: o.home, verbose: true }).find((m) => m.to === o.to && !m.captured);
    if (!step) return false;
    const there = boardOf(fen);
    if (!there) return false;
    there.move(step.san);
    return legalSeeGainFor(there.fen(), o.to, me === 'w' ? 'b' : 'w') === 0;
  }
  // A break is given up when no pawn can make it any more — the pawns fixed
  // or a piece in the pawn's way — never because a piece changed its count.
  if (o.kind === 'break') return breaks.has(o.to);
  // A side is settled when the right is gone (the king or that rook moved, or
  // the king castled), never because a piece stepped back into the path.
  return castleRight(after, me, o.side);
}

/** The option the move itself plays, by its key, or null. */
function usedBy(m: Move): string | null {
  if (m.isKingsideCastle()) return 'castle:k';
  if (m.isQueensideCastle()) return 'castle:q';
  if (m.piece === 'p') return `br:${m.to}`;
  if (m.piece === 'n' || m.piece === 'b') return `sq:${m.from}:${m.to}`;
  return null;
}

/** The options `move` removes from `options` (read on `fenBefore`). Null when
 *  the move does not play, takes, checks or promotes — a different idea. */
function removedBy(fenBefore: string, options: readonly FlexOption[], move: string, settleMin = SETTLE_MIN): { move: Move; removed: Map<string, FlexOption> } | null {
  const m = moveOn(fenBefore, move);
  if (!m || m.captured || m.promotion) return null;
  const b = boardOf(fenBefore);
  if (!b) return null;
  b.move(m.san);
  if (b.inCheck()) return null;
  const fenAfter = sideToMoveAs(b.fen(), m.color);
  if (!fenAfter) return null;
  const after = boardOf(fenAfter);
  if (!after) return null;
  const breaks = breaksOn(fenAfter, false);
  const used = usedBy(m);
  const raw = new Map<string, FlexOption>();
  for (const o of options) {
    const k = keyOf(o);
    if (k === used) continue;
    if (!stillOpen(o, after, fenAfter, m.color, breaks)) raw.set(k, o);
  }
  // Only a choice worth keeping counts as one removed: the minor the move
  // settles had at least `SETTLE_MIN` good squares, and a minor left at home
  // lost at least `SHUT_MIN` of them. A knight's one other square is no choice.
  const removed = new Map<string, FlexOption>();
  for (const [k, o] of raw) {
    if (o.kind === 'square') {
      const settled = o.home === m.from;
      const had = options.filter((x) => x.kind === 'square' && x.home === o.home).length;
      const lost = [...raw.values()].filter((x) => x.kind === 'square' && x.home === o.home).length;
      if (settled ? had < settleMin : lost < SHUT_MIN) continue;
    }
    removed.set(k, o);
  }
  return { move: m, removed };
}

export interface FlexibleMove {
  /** 'kept': the move kept what the rival would have closed; 'committed':
   *  the move closed what the rival kept. */
  verdict: 'kept' | 'committed';
  played: { san: string; piece: PieceSymbol; from: Square; to: Square; castle: 'k' | 'q' | null };
  rival: { san: string; uci: string; piece: PieceSymbol; castle: 'k' | 'q' | null };
  /** The options one of them removed and the other kept — the difference. */
  differ: FlexOption[];
  /** Every good square still open to the minor the difference is about, after
   *  the move that kept it (the full choice, the rival's square included). */
  choice: Square[];
  /** The move cost more than a near-equal move would (an inaccuracy): the
   *  committing is the reason it cost, and the rival is said as better. */
  inaccuracy: boolean;
  key: string;
}

/** Does the mover come out a pawn or more down along this line (its first
 *  four plies), against the board before it? */
function lineLosesMaterial(fenBefore: string, uci: readonly string[], me: Color): boolean {
  const them: Color = me === 'w' ? 'b' : 'w';
  const balance = (c: Chess): number => sideMaterial(c.fen(), me) - sideMaterial(c.fen(), them);
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return false; }
  const start = balance(c);
  for (const u of uci.slice(0, 4)) {
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
  }
  return balance(c) <= start - 1;
}

/**
 * THE FLEXIBLE MOVE `san` on `fenBefore`, against the moves the engine holds
 * near the best. `reads`: the engine's lines from the board before the move,
 * one per candidate (the candidate first, White-POV score) — the played move
 * among them; without its read the move's worth is unknown and nothing is said.
 */
export function flexibleMove(fenBefore: string, san: string, reads: readonly WeighRead[] | null): FlexibleMove | null {
  if (!reads || reads.length < 2) return null;
  const b = boardOf(fenBefore);
  if (!b || b.inCheck()) return null;
  if (Number(fenBefore.split(' ')[5] ?? '1') > FLEX_UNTIL_MOVE) return null;
  const me = b.turn();
  const played = moveOn(fenBefore, san);
  if (!played) return null;
  const playedUci = uciOf(played);
  const scored = reads.filter((r) => !!r.moves[0]).map((r) => ({ uci: r.moves[0], cp: seatCp(r, me), moves: r.moves }));
  if (scored.length < 2) return null;
  const best = Math.max(...scored.map((s) => s.cp));
  const mine = scored.find((s) => s.uci === playedUci);
  if (!mine || best - mine.cp > FLEX_INACCURACY_CP) return null;
  const inaccuracy = best - mine.cp > FLEX_NEAR_CP;
  // An inaccuracy that loses material along its own line has that for its
  // reason, not the options it closed.
  if (inaccuracy && lineLosesMaterial(fenBefore, mine.moves, me)) return null;
  // Read nothing on the board until there is a comparison to make: the move a
  // quiet one, and a quiet rival of another piece near the best.
  const quiet = (m: Move | null): m is Move => !!m && !m.captured && !m.promotion && !/[+#]/.test(m.san);
  if (!quiet(played)) return null;
  const rivals = scored.filter((s) => s.uci !== playedUci && best - s.cp <= FLEX_NEAR_CP)
    .filter((s) => { const m = moveOn(fenBefore, s.uci); return quiet(m) && m.from !== played.from; });
  if (rivals.length === 0) return null;
  const options = flexOptions(fenBefore);
  if (options.length === 0) return null;
  const settleMin = inaccuracy ? SETTLE_MIN_INACCURACY : SETTLE_MIN;
  const p = removedBy(fenBefore, options, san, settleMin);
  if (!p) return null;
  type Cand = { verdict: 'kept' | 'committed'; rival: Move; differ: FlexOption[]; order: number };
  const cands: Cand[] = [];
  scored.forEach((s, order) => {
    if (s.uci === playedUci || best - s.cp > FLEX_NEAR_CP) return;
    const r = removedBy(fenBefore, options, s.uci, settleMin);
    // The same piece to another square is the square choice (`squareChoice`).
    if (!r || r.move.from === played.from) return;
    // What either move plays itself is a choice made, not one taken away:
    // neither side of the comparison counts it.
    const usedEither = new Set([usedBy(p.move), usedBy(r.move)]);
    const pSet = new Map([...p.removed].filter(([k]) => !usedEither.has(k)));
    const rSet = new Map([...r.removed].filter(([k]) => !usedEither.has(k)));
    const pIn = [...pSet.keys()].every((k) => rSet.has(k));
    const rIn = [...rSet.keys()].every((k) => pSet.has(k));
    if (pIn && rSet.size > pSet.size && !inaccuracy) {
      cands.push({ verdict: 'kept', rival: r.move, differ: [...rSet].filter(([k]) => !pSet.has(k)).map(([, o]) => o), order });
    } else if (rIn && pSet.size > rSet.size) {
      cands.push({ verdict: 'committed', rival: r.move, differ: [...pSet].filter(([k]) => !rSet.has(k)).map(([, o]) => o), order });
    }
  });
  if (cands.length === 0) return null;
  // The rival the difference is widest against, the engine's order breaking a tie.
  cands.sort((x, y) => y.differ.length - x.differ.length || x.order - y.order);
  const c = cands[0];
  const castleOf = (m: Move): 'k' | 'q' | null => (m.isKingsideCastle() ? 'k' : m.isQueensideCastle() ? 'q' : null);
  const lead = mainGroup(c.differ);
  // The full choice of the minor the difference is about, after the move
  // that kept it.
  let choice: Square[] = [];
  if (lead[0]?.kind === 'square') {
    const home = lead[0].home;
    const kept = c.verdict === 'kept' ? p.removed : removedBy(fenBefore, options, uciOf(c.rival), settleMin)?.removed ?? new Map();
    choice = options.filter((o): o is Extract<FlexOption, { kind: 'square' }> => o.kind === 'square' && o.home === home && !kept.has(keyOf(o))).map((o) => o.to);
  }
  return {
    verdict: c.verdict,
    played: { san: played.san, piece: played.piece, from: played.from, to: played.to, castle: castleOf(played) },
    rival: { san: c.rival.san, uci: uciOf(c.rival), piece: c.rival.piece, castle: castleOf(c.rival) },
    differ: c.differ,
    choice,
    inaccuracy,
    key: `flexible:${c.verdict}:${playedUci}:${uciOf(c.rival)}`,
  };
}

/** The one group of the difference said (one idea a sentence): one minor's
 *  squares, else the breaks, else the castling sides — the whole group, no cap. */
function mainGroup(differ: readonly FlexOption[]): FlexOption[] {
  const sq = differ.filter((o): o is Extract<FlexOption, { kind: 'square' }> => o.kind === 'square');
  if (sq.length) {
    const byHome = new Map<Square, FlexOption[]>();
    for (const o of sq) byHome.set(o.home, [...(byHome.get(o.home) ?? []), o]);
    return [...byHome.values()].sort((x, y) => y.length - x.length)[0];
  }
  const br = differ.filter((o) => o.kind === 'break');
  if (br.length) return br;
  return differ.filter((o) => o.kind === 'castle');
}

/** The rival as a player says it: castling by its side, else its move. */
function rivalWords(r: FlexibleMove['rival']): string {
  return r.castle === 'k' ? 'castling short' : r.castle === 'q' ? 'castling long' : r.san;
}

/** Said from the mover's seat (`own`: your / their). It names the piece and
 *  the squares; the rival is named, a move as good as the one played. Rotated
 *  on the board after the move. */
export function flexibleMoveLine(f: FlexibleMove, own: 'your' | 'their', fenAfter: string): string {
  const said = flexibleMoveWords(f, own, fenAfter);
  // An inaccuracy: the rival was not just as good, it was better.
  return f.inaccuracy ? said.replace(/ was just as good\b/g, ' was the better move') : said;
}

/** A minor by what it is: the bishop by its colour, the knight by its wing. */
function minorName(piece: PieceSymbol, home: Square): string {
  if (piece === 'b') return `${(home.charCodeAt(0) + Number(home[1])) % 2 === 0 ? 'dark' : 'light'}-squared bishop`;
  if (piece === 'n') return home[0] === 'b' ? "queen's knight" : "king's knight";
  return NAME[piece];
}

function flexibleMoveWords(f: FlexibleMove, own: 'your' | 'their', fenAfter: string): string {
  const who = own === 'your' ? 'you' : 'they';
  const other = own === 'your' ? 'they' : 'you';
  const theirs = other === 'they' ? 'theirs' : 'yours';
  // The move was just named by the turn ("You go e3, …"): the line never
  // names it again — a third "e5" in one turn is a square read back.
  const Moved = 'That move';
  const rival = rivalWords(f.rival);
  const Rival = openSentence(rival);
  const g = mainGroup(f.differ);
  const key = stemKeyOf(fenAfter);
  const first = g.at(0);
  if (!first) return '';
  if (first.kind === 'square') {
    // The minor by what it is ("your dark-squared bishop", "your king's
    // knight"), never by its square: the squares it keeps or loses are the
    // ones said, and a sentence names at most two (humanSquares). "Other"
    // when the move just said moved one of the same kind.
    const minor = `${own} ${f.played.piece === first.piece && f.played.from !== first.home ? 'other ' : ''}${minorName(first.piece, first.home)}`;
    const sqs = g.map((o) => (o as Extract<FlexOption, { kind: 'square' }>).to);
    // It leaves out the square the taking move lands on: "e6 and f5 are no
    // longer open" says e6 a second time, where "f5 is no longer open" is what
    // the bishop lost.
    const taker = f.verdict === 'kept' ? f.rival.uci.slice(2, 4) : f.played.to;
    const shown = sqs.filter((q) => q !== taker);
    const Shown = openSentence(andList(shown));
    // After a sentence about the move, "it" would be the moved piece: the
    // minor is named again ("The bishop can still go to e6 or f5").
    const The = `The ${NAME[first.piece]}`;
    const the = `the ${NAME[first.piece]}`;
    const are = shown.length > 1 ? 'are' : 'is';
    const were = shown.length > 1 ? 'were' : 'was';
    // The rival (kept) or the move (committed) developed this same minor:
    // it settled the piece's square. Else it took squares from the piece.
    const settler = f.verdict === 'kept' ? f.rival.uci.slice(0, 2) : f.played.from;
    if (settler === first.home) {
      const all = f.choice.length ? f.choice : sqs;
      if (f.verdict === 'kept') {
        return rotateStem([
          `${Moved} keeps ${minor}'s choice open. ${The} can still go to ${orList(all)}. ${Rival} first would have settled it before ${who} know where it belongs.`,
          `${Rival} was just as good, but it would have settled ${minor} before ${who} know where it belongs. ${Moved} leaves it the choice. ${The} can still go to ${orList(all)}.`,
          `Make the move that keeps the most choices. ${Moved} still leaves ${minor} its choice, where ${rival} would have settled it already. ${The} can go to ${orList(all)}.`,
        ], key);
      }
      return rotateStem([
        shown.length ? `${Moved} settles ${minor} early. ${Rival} was just as good and kept that choice for later. ${Shown} ${were} still open to ${the}.` : `${Moved} settles ${minor} early. ${Rival} was just as good and kept that choice for later.`,
        `${Rival} was just as good and kept ${minor}'s choice open. ${Moved} settles it before ${who} know where it belongs.`,
      ], key);
    }
    const those = shown.length > 1 ? 'those squares' : 'that square';
    if (f.verdict === 'kept') {
      if (!shown.length) return `${Moved} keeps ${minor} free, where ${rival} would have shut it in.`;
      return rotateStem([
        `${Moved} keeps ${minor}'s squares open. ${The} can still go to ${orList(shown)}. ${Rival} would have taken ${those} from it.`,
        `${Rival} was just as good, but it would have boxed in ${minor}. ${Moved} keeps ${the}'s squares open. It can still go to ${orList(shown)}.`,
      ], key);
    }
    if (!shown.length) return `${Moved} shuts ${minor} in. ${Rival} was just as good and left it free.`;
    return rotateStem([
      `${Moved} takes squares from ${minor}. ${Shown} ${are} no longer open to ${the}. ${Rival} was just as good and left ${those} open.`,
      `${Rival} was just as good and kept ${minor}'s squares open. ${Moved} takes them away. ${Shown} ${are} no longer open to ${the}.`,
    ], key);
  }
  if (first.kind === 'break') {
    const sqs = g.map((o) => (o as Extract<FlexOption, { kind: 'break' }>).to);
    const many = sqs.length > 1;
    const brk = `the ${andList(sqs)} break${many ? 's' : ''}`;
    const it = many ? 'them' : 'it';
    // A pawn move fixes the pawns; a piece stands in the pawn's way.
    const remover = f.verdict === 'kept' ? { piece: f.rival.piece, to: f.rival.uci.slice(2, 4) } : { piece: f.played.piece, to: f.played.to };
    const byPawn = remover.piece === 'p';
    // A piece blocks a break by standing on the pawn's file in front of it.
    const blocker = NAME[remover.piece];
    const pawn = `${own} ${remover.to[0]}-pawn`;
    if (f.verdict === 'kept') {
      return byPawn
        ? rotateStem([
          `${Moved} keeps ${brk} for later. ${Rival} would have fixed the pawns and given ${it} up.`,
          `${Rival} was just as good, but it would have fixed the pawns and given up ${brk}. ${Moved} keeps that choice open.`,
        ], key)
        : rotateStem([
          `${Moved} keeps ${brk} open. ${Rival} would have put the ${blocker} in front of ${pawn}.`,
          `${Rival} was just as good, but the ${blocker} would have stood in front of ${pawn} and blocked ${brk}. ${Moved} keeps ${it} open.`,
        ], key);
    }
    return byPawn
      ? rotateStem([
        `${Moved} fixes the pawns: ${brk} ${many ? 'are' : 'is'} gone for now. ${Rival} was just as good and kept that choice open.`,
        `${Rival} was just as good and kept ${brk} for later. ${Moved} gives ${it} up early.`,
      ], key)
      : rotateStem([
        `${Moved} blocks ${brk}: it stands in front of ${pawn}. ${Rival} was just as good and kept ${it} open.`,
        `${Rival} was just as good and kept ${brk} open. ${Moved} puts the ${blocker} in front of ${pawn}.`,
      ], key);
  }
  // Castling settles the king's side; a king or rook move gives a side up.
  const castled = (f.verdict === 'kept' ? f.rival.castle : f.played.castle) !== null;
  const lost = g.map((o) => ((o as Extract<FlexOption, { kind: 'castle' }>).side === 'k' ? 'castling short' : 'castling long'));
  if (f.verdict === 'kept') {
    return castled
      ? rotateStem([
        `${Moved} keeps ${own} king free to castle on either side. ${Rival} would have settled its side before ${other} showed where ${theirs} goes.`,
        `${Rival} was just as good, but it would have settled ${own} king's side early. ${Moved} keeps both sides open until ${other} show ${theirs}.`,
      ], key)
      : rotateStem([
        `${Moved} keeps ${own} king free to castle on either side. ${Rival} would have given up ${orList(lost)} before ${other} showed where ${theirs} goes.`,
        `${Rival} was just as good, but it would have given up ${orList(lost)}. ${Moved} keeps both sides open until ${other} show ${theirs}.`,
      ], key);
  }
  return castled
    ? rotateStem([
      `${Moved} settles ${own} king's side before ${other} have shown where ${theirs} goes. ${Rival} was just as good and kept both sides open.`,
      `${Rival} was just as good and kept ${own} king free to castle on either side. ${Moved} settles it before ${other} have shown ${theirs}.`,
    ], key)
    : rotateStem([
      `${Moved} gives up ${orList(lost)} before ${other} have shown where ${theirs} goes. ${Rival} was just as good and kept both sides open.`,
      `${Rival} was just as good and kept ${own} king free to castle on either side. ${Moved} gives up ${orList(lost)}.`,
    ], key);
}

/** The squares the fact names: the move, the rival, the options between them. */
export function flexibleMoveSquares(f: FlexibleMove): string[] {
  const s = new Set<string>([f.played.from, f.played.to, f.rival.uci.slice(0, 2), f.rival.uci.slice(2, 4)]);
  for (const o of mainGroup(f.differ)) if (o.kind !== 'castle') s.add(o.to);
  for (const sq of f.choice) s.add(sq);
  return [...s];
}

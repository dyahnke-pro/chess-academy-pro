// kingWalk — THE KING THAT CANNOT CASTLE, AND HOW A STRONG PLAYER WALKS IT
// (David 2026-11-04, the Danya side-by-side on his Scotch Gambit game: "We will
// build those computers" → "Add the missing computers first").
//
// Naroditsky, after 6.Bxf7+ Kxf7 7.Qd5+: "the first order of business is where
// to put the king: obviously not g6 or f6 — you'd get mated … the king to f8 is
// the correct one" · "always be aware of the eventual plan of castling by hand:
// the king back up to f7, the rook swung to f8 or e8, and the king tucked back
// to g8" · "h6 first" · "another point of not developing the bishop is that if
// your opponent gives you a queen check, you can cover it with the bishop" ·
// "the further the king is from the centre, the safer it is, as a rule of
// thumb". No computer said any of it. Each read here is pure board geometry
// (chess.js) and a checks-only mate search; an engine line is used only where a
// surface hands one in, and nothing is claimed without it.
import { Chess, type Color, type Move, type Square } from 'chess.js';
import { isMinorAtHome } from './development';

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function boardOf(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function kingOf(b: Chess, side: Color): Square | null {
  for (const row of b.board()) for (const c of row) if (c && c.type === 'k' && c.color === side) return c.square;
  return null;
}

function at(b: Chess, sq: string): { type: string; color: Color } | null {
  return (b.get(sq as Square) as { type: string; color: Color } | undefined) ?? null;
}

/** The rank number a side's pieces start on, and the one in front of it. */
function homeRank(side: Color): number { return side === 'w' ? 1 : 8; }
function secondRank(side: Color): number { return side === 'w' ? 2 : 7; }
const sq = (file: string, rank: number): string => `${file}${rank}`;

/** The board with the other side to move — for "what could they play here". */
function withTurn(fen: string, side: Color): string {
  const p = fen.split(' ');
  p[1] = side;
  p[3] = '-';
  return p.join(' ');
}

// ── CASTLING BY HAND ─────────────────────────────────────────────────────────

/** The plan for a king that has lost the right to castle: the route to the
 *  kingside shelter, as the steps still to play. */
export interface CastleByHandPlan {
  /** Where the king stands, and the square the walk ends on. */
  king: Square;
  target: string;
  /** The steps still to play, in order, in words ("the king to f7"). */
  steps: string[];
  /** The king's next square on the route, when its next step is a king move. */
  nextKingSquare: string | null;
  /** The hint line ("Your king has lost the right to castle — …"). */
  text: string;
  squares: string[];
}

/**
 * CASTLING BY HAND (catalogue B2 — "…Kf7, …Re8, …Kg8"): the king has lost the
 * right to castle and still stands in the centre with the enemy queen on — walk
 * it to the kingside shelter a step at a time, a rook coming across behind it.
 * Two routes, read off the f-pawn: with f7 empty the king goes f7 → g8 and a
 * rook comes out through f8/e8 (his Scotch Gambit game); with the f-pawn at
 * home the king goes f8, the g-pawn steps to g6, the king to g7. Null when the
 * king can still castle, is not in the centre, the queens are off, or the
 * shelter's pawns are gone.
 */
export function castleByHand(fen: string, me: Color): CastleByHandPlan | null {
  const b = boardOf(fen);
  if (!b) return null;
  const rights = b.getCastlingRights(me);
  if (rights.k || rights.q) return null;
  const them: Color = me === 'w' ? 'b' : 'w';
  const theirQueen = b.board().flat().some((c) => c && c.type === 'q' && c.color === them);
  if (!theirQueen) return null;
  const king = kingOf(b, me);
  if (!king) return null;
  const home = homeRank(me);
  const second = secondRank(me);
  const third = me === 'w' ? 3 : 6;
  const kFile = king[0];
  const kRank = Number(king[1]);
  if (!'def'.includes(kFile) || (kRank !== home && kRank !== second)) return null;
  const ownPawn = (s: string): boolean => { const p = at(b, s); return !!p && p.type === 'p' && p.color === me; };
  const ownPiece = (s: string, t: string): boolean => { const p = at(b, s); return !!p && p.type === t && p.color === me; };
  // The shelter: a g-pawn and an h-pawn, at home or one step up.
  const gPawn = ownPawn(sq('g', second)) ? 'home' : ownPawn(sq('g', third)) ? 'up' : null;
  const hPawn = ownPawn(sq('h', second)) || ownPawn(sq('h', third));
  if (!gPawn || !hPawn) return null;
  const fPawnHome = ownPawn(sq('f', second));
  const rookHome = ownPiece(sq('h', home), 'r');
  const knightOnG = ownPiece(sq('g', home), 'n');
  const rookStep = rookHome ? ['a rook to ' + sq('e', home) + ' or ' + sq('f', home)] : [];
  const knightStep = knightOnG ? [`the knight off ${sq('g', home)}`] : [];
  let steps: string[];
  let target: string;
  let nextKingSquare: string | null;
  if (!fPawnHome) {
    // Route A: the king through f7 (f2) to g8 (g1).
    target = sq('g', home);
    const f2 = sq('f', second);
    if (at(b, f2) && king !== f2) return null;
    const toF2 = king === f2 ? [] : [`the king to ${f2}`];
    steps = [...knightStep, ...toF2, ...rookStep, `the king to ${target}`];
    nextKingSquare = toF2.length ? f2 : target;
  } else {
    // Route B: the king to f8 (f1), the g-pawn up, the king to g7 (g2).
    target = sq('g', second);
    const f1 = sq('f', home);
    if (kRank !== home) return null;
    const toF1 = king === f1 ? [] : [`the king to ${f1}`];
    const pawnUp = gPawn === 'home' ? [`the pawn to ${sq('g', third)}`] : [];
    steps = [...toF1, ...pawnUp, `the king to ${target}`, ...knightStep, ...rookStep];
    nextKingSquare = toF1.length ? f1 : pawnUp.length ? null : target;
  }
  const route = steps.length > 1 ? `${steps.slice(0, -1).join(', ')}, then ${steps[steps.length - 1]}` : steps[0];
  return {
    king, target, steps, nextKingSquare,
    text: `Your king has lost the right to castle — castle it by hand: ${route}.`,
    squares: [king, target],
  };
}

function routeWords(steps: readonly string[]): string {
  return steps.length > 1 ? `${steps.slice(0, -1).join(', ')}, then ${steps[steps.length - 1]}` : steps[0] ?? '';
}

/** What one move did for its side's castling-by-hand plan. */
export interface KingWalkStep {
  /** `plan` — the plan stated (a quiet move while it is live); `prep` — the
   *  move took away a square an enemy piece would check the king's next square
   *  from; `step` — a step of the route played; `done` — the king is home. */
  kind: 'plan' | 'prep' | 'step' | 'done';
  key: string;
  text: string;
  squares: string[];
}

/** The squares from which a piece of type `t` attacks `target`. */
function checkSquares(t: string, target: string): string[] {
  const f = target.charCodeAt(0) - 97;
  const r = Number(target[1]);
  const on = (df: number, dr: number): string | null => {
    const nf = f + df; const nr = r + dr;
    return nf >= 0 && nf < 8 && nr >= 1 && nr <= 8 ? `${String.fromCharCode(97 + nf)}${nr}` : null;
  };
  if (t === 'n') return [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].map(([a, c]) => on(a, c)).filter((s): s is string => !!s);
  return [];
}

/** The squares `side`'s pawns attack. */
function pawnCover(b: Chess, side: Color): Set<string> {
  const out = new Set<string>();
  const dir = side === 'w' ? 1 : -1;
  for (const row of b.board()) for (const c of row) {
    if (!c || c.type !== 'p' || c.color !== side) continue;
    const f = c.square.charCodeAt(0) - 97;
    const r = Number(c.square[1]) + dir;
    for (const df of [-1, 1]) {
      const nf = f + df;
      if (nf >= 0 && nf < 8 && r >= 1 && r <= 8) out.add(`${String.fromCharCode(97 + nf)}${r}`);
    }
  }
  return out;
}

/**
 * THE MOVE'S PART IN CASTLING BY HAND, from the mover's seat. `who` is the
 * mover as the student hears it ('your' for the student's own move, 'their'
 * for the opponent's). Null when the move does nothing for a live plan.
 */
export function castleByHandMove(fenBefore: string, san: string, who: 'your' | 'their'): KingWalkStep | null {
  const b = boardOf(fenBefore);
  if (!b) return null;
  const side = b.turn();
  const inCheck = b.inCheck();
  let m: Move;
  try { m = b.move(san); } catch { return null; }
  const fenAfter = b.fen();
  const before = castleByHand(fenBefore, side);
  const after = castleByHand(fenAfter, side);
  const s = san.replace(/[+#!?]+$/, '');
  const king = who === 'your' ? 'your king' : 'their king';
  const Subject = who === 'your' ? 'Your' : 'Their';
  const home = homeRank(side);
  const rookOut = !(at(b, sq('h', home))?.type === 'r' && at(b, sq('h', home))?.color === side);
  const key = (k: string): string => `castle-by-hand:${side}:${k}`;
  // DONE: the king reached the shelter with the rook already out.
  if (before && m.piece === 'k' && m.to === before.target && rookOut) {
    return { kind: 'done', key: key('done'), text: `${s} finishes castling by hand: ${king} is tucked away on ${m.to}, and the rook is in play.`, squares: [m.to] };
  }
  if (before && after) {
    const rest = routeWords(after.steps);
    if (m.piece === 'k' && after.steps.length < before.steps.length) {
      const first = before.steps.length >= 3 && before.steps[0].startsWith('the king');
      return { kind: 'step', key: key(`step:${m.to}`), text: `${s} ${first ? 'starts' : 'is the next step of'} castling by hand — next, ${rest}.`, squares: [m.to] };
    }
    if (m.piece === 'r' && m.from === sq('h', home)) {
      const last = after.steps.length === 1;
      return { kind: 'step', key: key('rook'), text: `${s} brings the rook out from behind the king — ${last ? `${after.steps[0]} next, and castling by hand is done` : `next, ${rest}`}.`, squares: [m.to] };
    }
    if (m.piece === 'p' && m.from[0] === 'g' && after.steps.length < before.steps.length) {
      return { kind: 'step', key: key('g-pawn'), text: `${s} makes room for the king on ${after.target} — next, ${rest}.`, squares: [m.to, after.target] };
    }
  }
  if (!after) return null;
  // PREP: the move took away a square an enemy knight would check the king's
  // next square from ("h6 first … Kf7 runs into Ng5"): the square is now
  // covered by a pawn, and a knight of theirs can land there this move.
  if (after.nextKingSquare && m.piece === 'p' && !inCheck) {
    const them: Color = side === 'w' ? 'b' : 'w';
    const coverBefore = pawnCover(new Chess(withTurn(fenBefore, side)), side);
    const coverAfter = pawnCover(b, side);
    const theirMoves = new Chess(withTurn(fenAfter, them)).moves({ verbose: true });
    for (const x of checkSquares('n', after.nextKingSquare)) {
      if (!coverAfter.has(x) || coverBefore.has(x)) continue;
      const knight = theirMoves.find((mv) => mv.piece === 'n' && mv.to === x);
      if (!knight) continue;
      return {
        kind: 'prep', key: key(`prep:${x}`),
        text: `${s} takes ${x} away from their knight, so ${king} can step to ${after.nextKingSquare} without a check from ${x} — castling by hand: ${routeWords(after.steps)}.`,
        squares: [m.to, x, after.nextKingSquare],
      };
    }
  }
  // THE PLAN, stated on a quiet move while it is live (never on a check, a
  // capture or a move out of check — he says it once the fire is out).
  if (!inCheck && !m.captured && !/[+#]/.test(san)) {
    return { kind: 'plan', key: key('plan'), text: `${Subject} king can't castle any more, so the plan is to castle by hand: ${routeWords(after.steps)}.`, squares: [after.king, after.target] };
  }
  return null;
}

// ── THE KING FAR FROM THE CENTRE ─────────────────────────────────────────────

/**
 * THE RULE OF THUMB, on a king walked out of the centre (not castling) with the
 * enemy queen on: "the further the king is from the centre, the safer it is"
 * (Danya, on …Kg8). Null otherwise.
 */
export function kingFromCentre(fenBefore: string, san: string): { key: string; text: string; squares: string[] } | null {
  if (/^O-O/.test(san)) return null;
  const b = boardOf(fenBefore);
  if (!b) return null;
  const side = b.turn();
  let m: Move;
  try { m = b.move(san); } catch { return null; }
  if (m.piece !== 'k') return null;
  const them: Color = side === 'w' ? 'b' : 'w';
  if (!b.board().flat().some((c) => c && c.type === 'q' && c.color === them)) return null;
  if (!'def'.includes(m.from[0]) || !'abcgh'.includes(m.to[0])) return null;
  return {
    key: 'rule:king-from-centre',
    text: 'Rule of thumb: the further the king is from the centre, the safer it is — the centre is where the lines open first, and the corner is harder for their pieces to reach.',
    squares: [m.to],
  };
}

// ── THE PIECE KEPT AT HOME ON PURPOSE ────────────────────────────────────────

/**
 * A MINOR PIECE LEFT HOME ON PURPOSE: after `san`, a check the other side can
 * give right away is blocked by a minor piece still on its home square (his
 * …Kf7: "if your opponent gives you a queen check, you can cover it with the
 * bishop"). Said for the mover's uncastled king, on a move that left that
 * piece at home. Null when no home piece blocks a check they have.
 */
export function keptHome(fenBefore: string, san: string, who: 'your' | 'their'): { key: string; text: string; squares: string[] } | null {
  const b = boardOf(fenBefore);
  if (!b) return null;
  const side = b.turn();
  let m: Move;
  try { m = b.move(san); } catch { return null; }
  // A king that has lost castling, walked by hand: the piece left home is a
  // choice then, not a piece not yet developed.
  const rights = b.getCastlingRights(side);
  if (m.piece !== 'k' || rights.k || rights.q) return null;
  const king = kingOf(b, side);
  if (!king || !'def'.includes(king[0])) return null;
  const fenAfter = b.fen();
  for (const check of b.moves({ verbose: true })) {
    if (!/\+/.test(check.san) || !'qrb'.includes(check.piece) || check.captured) continue;
    const c = new Chess(fenAfter);
    c.move(check.san);
    for (const reply of c.moves({ verbose: true })) {
      if (reply.piece !== 'b') continue;
      if (reply.from === m.from || !isMinorAtHome(reply.piece, side, reply.from)) continue;
      if (reply.to === check.to) continue;
      const whose = who === 'your' ? 'Your' : 'Their';
      const theirs = who === 'your' ? 'their' : 'your';
      return {
        key: `kept-home:${reply.from}`,
        text: `${whose} ${NAME[reply.piece]} on ${reply.from} stays home for now, and it has a job there: if ${theirs} ${NAME[check.piece]} checks on ${check.to}, it blocks on ${reply.to}.`,
        squares: [reply.from, check.to, reply.to],
      };
    }
  }
  return null;
}

// ── WHERE TO PUT THE KING ────────────────────────────────────────────────────

/** A forced mate by checks alone, attacker to move, within `moves` of its
 *  moves: the line (SAN) against the defender's longest resistance, or null.
 *  Every defender reply is answered; a node budget keeps it bounded, and an
 *  exhausted budget claims nothing. */
export function mateByChecks(fen: string, moves: number, budget: { n: number } = { n: 600 }): string[] | null {
  const b = boardOf(fen);
  return b ? mateSearch(b, moves, budget) : null;
}

/** The search on one board, played and taken back in place. */
function mateSearch(b: Chess, moves: number, budget: { n: number }): string[] | null {
  for (const mv of b.moves({ verbose: true })) {
    if (!/[+#]/.test(mv.san)) continue;
    if (--budget.n < 0) return null;
    b.move(mv.san);
    if (b.isCheckmate()) { b.undo(); return [mv.san]; }
    if (moves > 1) {
      const replies = b.moves();
      let longest: string[] | null = replies.length > 0 ? [] : null;
      for (const r of replies) {
        b.move(r);
        const sub = mateSearch(b, moves - 1, budget);
        b.undo();
        if (!sub) { longest = null; break; }
        if (longest && sub.length + 1 > longest.length) longest = [r, ...sub];
      }
      if (longest && longest.length > 0) { b.undo(); return [mv.san, ...longest]; }
    }
    b.undo();
  }
  return null;
}

/** One king square weighed: mated (with its line), or the engine's line. */
export interface KingSquareRead {
  square: string;
  mate: string[] | null;
}

/**
 * WHERE TO PUT THE KING — the mover is in check and every legal move is a king
 * move: each square weighed. A square that walks into a forced mate by checks
 * (within three moves) is named with its line; an engine line handed in for
 * another square (`lines`, mover's fan before the move, from the mover's seat)
 * names a square that is driven back to the played one anyway. The played
 * square is named last. Null when no square is mated and nothing else can be
 * said, or when the played square itself is mated.
 */
export function kingSquares(
  fenBefore: string,
  san: string,
  who: 'your' | 'their',
  /** The fan before the move (UCI lines), when the surface has one. */
  lines: ReadonlyArray<{ moves: readonly string[] }> | null,
  /** The engine's best move here (UCI), when the surface knows it. */
  bestUci: string | null,
): { key: string; text: string; squares: string[] } | null {
  const b = boardOf(fenBefore);
  if (!b || !b.inCheck()) return null;
  const legal = b.moves({ verbose: true });
  if (legal.length < 3 || legal.some((mv) => mv.piece !== 'k')) return null;
  let played: Move;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  const reads: KingSquareRead[] = legal.map((mv) => {
    const c = new Chess(fenBefore);
    c.move(mv.san);
    return { square: mv.to, mate: mateByChecks(c.fen(), 3) };
  });
  if (reads.find((r) => r.square === played.to)?.mate) return null;
  const mated = reads.flatMap((r) => (r.mate ? [{ square: r.square, line: r.mate }] : []));
  const kingName = who === 'your' ? 'your king' : 'their king';
  // A square the engine's own line drives straight back to the played one.
  const drivenBack: string[] = [];
  for (const r of reads) {
    if (r.mate || r.square === played.to) continue;
    const line = lines?.find((l) => l.moves[0]?.slice(2, 4) === r.square);
    if (!line || line.moves.length < 3) continue;
    // The mover's next move in the line (moves[2]) puts the king on the played square.
    if (line.moves[2].slice(0, 2) === r.square && line.moves[2].slice(2, 4) === played.to) {
      const c = new Chess(fenBefore);
      try {
        c.move({ from: line.moves[0].slice(0, 2), to: line.moves[0].slice(2, 4) });
        const check = c.move({ from: line.moves[1].slice(0, 2), to: line.moves[1].slice(2, 4), promotion: line.moves[1][4] as 'q' | undefined });
        if (/\+/.test(check.san)) drivenBack.push(`On ${r.square}, ${check.san} drives it to ${played.to} anyway.`);
      } catch { /* a line that does not play claims nothing */ }
    }
  }
  if (mated.length === 0 && drivenBack.length === 0) return null;
  const COUNT = ['', 'one', 'two', 'three'];
  const mateWords = mated.map((r) => (r.line.length === 1
    ? `On ${r.square} it's mated at once: ${r.line[0]}.`
    : `On ${r.square} it's mated in ${COUNT[Math.ceil(r.line.length / 2)]}: ${r.line.join(' ')}.`));
  const bestNote = bestUci && bestUci.slice(2, 4) === played.to && bestUci.slice(0, 2) === played.from;
  const playedWords = who === 'your'
    ? `You chose ${played.to}${bestNote ? ', the best of them' : mated.length ? ', out of the mating net' : ''}`
    : `They chose ${played.to}${bestNote ? ', the best of them' : mated.length ? ', out of the mating net' : ''}`;
  return {
    key: `king-squares:${played.from}`,
    text: `Where does ${kingName} go? ${[...mateWords, ...drivenBack].join(' ')} ${playedWords}.`,
    squares: [played.to, ...mated.map((r) => r.square)],
  };
}

/**
 * THE KING-SQUARE QUESTION, for the record (dual-use): the mover was in check
 * with only king moves and at least one square walks into a forced mate. Held
 * when the square chosen is not mated, broken when it is; null when the board
 * did not ask.
 */
export function kingSquareOutcome(fenBefore: string, san: string): 'held' | 'broken' | null {
  const b = boardOf(fenBefore);
  if (!b || !b.inCheck()) return null;
  const legal = b.moves({ verbose: true });
  if (legal.length < 3 || legal.some((mv) => mv.piece !== 'k')) return null;
  let played: Move;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  const budget = { n: 1500 };
  let anyMated = false;
  let playedMated = false;
  for (const mv of legal) {
    const c = new Chess(fenBefore);
    c.move(mv.san);
    if (mateByChecks(c.fen(), 3, budget)) {
      anyMated = true;
      if (mv.to === played.to) playedMated = true;
    }
  }
  return anyMated ? (playedMated ? 'broken' : 'held') : null;
}

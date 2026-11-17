// intoTheirCamp — GETTING INTO THEIR CAMP (Danya's speedruns: "you infiltrate
// with the rook to d7", "the rook to f7 reaches the seventh", "you double on
// the seventh", "you lift the rook to e3, swinging it toward the king", "the
// queen to d2, connecting the rooks"). One computer for the move that brings a
// piece in, or gets the rooks ready to come in:
//
//  - INFILTRATION: a rook, queen, knight (or the king, once it is an ending)
//    steps from its own side to a square deep in theirs (the sixth rank or
//    beyond, from the mover's seat), by an open or half-open file or into a
//    hole, and from there attacks pawns or pieces they cannot keep: each target
//    is won by the legal exchange right now. A rook on the seventh that also
//    shuts their king on the back rank counts too.
//  - BOTH ROOKS ON THE SEVENTH: read by the existing `rooksOnSeventh`
//    (endgameMoveReads), which this calls; its sentence is the student's.
//  - THE ROOK LIFT: read by the existing `findRookLift` (positionReadingService,
//    which only chat used): the move is exactly the lift it finds.
//  - CONNECTING THE ROOKS: the move takes the last piece from between the two
//    rooks on the back rank (`rooksSeeEachOther`, openingEnd), and the
//    opposite: late in the opening, the rooks still cut off, named with the
//    pieces in the way, said on a move that left them there.
//
// Silent on a check or a mate (a sharper fact speaks), on a capture (the trade
// or the win says it), and when the piece that came in can simply be taken for
// nothing. Both seats: the line is said from the mover's seat (your / their).
// PURE: chess.js and the board readers; no engine.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor, findRookLift } from './positionReadingService';
import { rooksOnSeventh } from './endgameMoveReads';
import { rooksSeeEachOther } from './openingEnd';
import { isEndgameByMaterial } from './gamePhaseService';
import { PIECE_NAMES } from '../types/tacticTypes';
import { andList } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import type { IdeaKind } from './ideaKind';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

export type CampKind = 'infiltration' | 'seventh-doubled' | 'lift' | 'swing' | 'connect' | 'cut-off';

export interface CampTarget {
  piece: PieceSymbol;
  square: Square;
  /** Won by the legal exchange as the board stands (a rook on the seventh
   *  also names what it presses along the rank that is still guarded). */
  won?: boolean;
}

export interface IntoTheirCamp {
  kind: CampKind;
  /** The piece that moved, from and to (for `cut-off`, the move played). */
  moved: { piece: PieceSymbol; from: Square; to: Square };
  /** How it got in: an open or half-open file, or a hole (infiltration only). */
  route: { kind: 'open-file' | 'half-open-file'; file: string } | { kind: 'hole' } | null;
  /** What it hits from there that they cannot keep (infiltration). */
  targets: CampTarget[];
  /** Their king shut on the back rank by a rook on the seventh. */
  boxedKing: Square | null;
  /** The two rooks (connect, cut-off, the doubled seventh). */
  rooks: Square[];
  /** The pieces still between the rooks (cut-off). */
  between: CampTarget[];
  /** The squares the sentence names, for the board. */
  squares: Square[];
  /** The doubled-seventh read's own sentence (the student's seat). */
  seventhText: string | null;
  key: string;
}

/** The idea each camp fact carries in the one composer, read off its key
 *  (the fact's first claim). Every kind answers: a new kind fails to compile. */
const IDEA_OF: Record<CampKind, IdeaKind> = {
  infiltration: 'pressure', 'seventh-doubled': 'pressure', lift: 'attack-king', swing: 'attack-king', connect: 'develop', 'cut-off': 'develop',
};
const KIND_OF_KEY: ReadonlyArray<readonly [string, CampKind]> = [
  ['camp-in:', 'infiltration'], ['rooks-on-seventh', 'seventh-doubled'], ['camp-lift:', 'lift'], ['camp-swing:', 'swing'],
  ['camp-connect:', 'connect'], ['camp-cut-off:', 'cut-off'],
];
export function campIdea(key: string): IdeaKind {
  const k = KIND_OF_KEY.find(([prefix]) => key.startsWith(prefix));
  return IDEA_OF[k ? k[1] : 'infiltration'];
}

/** The move by which the rooks should be connected: said there, once. */
const CUT_OFF_MOVE = 12;

/** The files a piece starts on (its home square on the back rank). */
const HOME: Partial<Record<PieceSymbol, string>> = { n: 'bg', b: 'cf', q: 'd', k: 'e' };

/** How deep a square is from `side`'s seat: 1 its back rank, 8 theirs. */
const relRank = (sq: string, side: Color): number => (side === 'w' ? Number(sq[1]) : 9 - Number(sq[1]));
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fileIdx = (sq: string): number => sq.charCodeAt(0) - 97;
const sqOf = (f: number, r: number): Square => `${String.fromCharCode(97 + f)}${r}` as Square;
const wb = (c: Color): 'white' | 'black' => (c === 'w' ? 'white' : 'black');

function cellsOf(c: Chess, color: Color, type?: PieceSymbol): Square[] {
  const out: Square[] = [];
  for (const row of c.board()) for (const cell of row) if (cell && cell.color === color && (!type || cell.type === type)) out.push(cell.square);
  return out;
}

/** The two rooks on `side`'s back rank, or null. */
function backRankRooks(c: Chess, side: Color): Square[] | null {
  const back = side === 'w' ? '1' : '8';
  const rooks = cellsOf(c, side, 'r').filter((s) => s[1] === back).sort();
  return rooks.length === 2 ? rooks : null;
}

/** No pawn of `them` can ever attack `sq`: none stands on a neighbouring file
 *  still behind it from their side (a pawn only moves forward). */
function isHole(c: Chess, sq: Square, mover: Color): boolean {
  const them = other(mover);
  const f = fileIdx(sq);
  return !cellsOf(c, them, 'p').some((p) => Math.abs(fileIdx(p) - f) === 1 && relRank(p, mover) > relRank(sq, mover));
}

/** Their king, shut on its back rank by `mover`'s rook on the seventh: every
 *  square of the seventh in front of it is taken by their own piece or hit. */
function boxedBy(c: Chess, mover: Color): Square | null {
  const them = other(mover);
  const king = cellsOf(c, them, 'k')[0];
  if (!king || relRank(king, mover) !== 8) return null;
  const seventh = mover === 'w' ? 7 : 2;
  const kf = fileIdx(king);
  for (let f = kf - 1; f <= kf + 1; f++) {
    if (f < 0 || f > 7) continue;
    const s = sqOf(f, seventh);
    const pc = c.get(s);
    if (pc && pc.color === them) continue;
    if (!c.attackers(s, mover).length) return null;
  }
  return king;
}

/** Up the file from the rook on `from`, the first piece is theirs and stands
 *  within a rank of their king: the rook looks into the king's cover. */
function kingCoverSeen(c: Chess, from: Square, mover: Color, king: Square): CampTarget | null {
  const up = mover === 'w' ? 1 : -1;
  for (let r = Number(from[1]) + up; r >= 1 && r <= 8; r += up) {
    const s = sqOf(fileIdx(from), r);
    const pc = c.get(s);
    if (!pc) continue;
    return pc.color !== mover && pc.type !== 'k' && Math.abs(r - Number(king[1])) <= 1 ? { piece: pc.type, square: s } : null;
  }
  return null;
}

function infiltration(c: Chess, before: Chess, mv: { piece: PieceSymbol; from: Square; to: Square }, me: Color, fenAfter: string): IntoTheirCamp | null {
  const them = other(me);
  const kindOk = mv.piece === 'r' || mv.piece === 'q' || mv.piece === 'n' || (mv.piece === 'k' && isEndgameByMaterial(fenAfter));
  if (!kindOk || relRank(mv.to, me) < 6 || relRank(mv.from, me) >= 6) return null;
  // What the piece hits from the entry square that they cannot keep: each won
  // by the legal exchange as the board stands.
  // A rook on the seventh also presses what stands on the rank, guarded or
  // not ("the rook on the seventh hits the pawns from the side").
  const seventh = mv.piece === 'r' && relRank(mv.to, me) === 7;
  const targets: CampTarget[] = [];
  for (const s of cellsOf(c, them)) {
    const p = c.get(s);
    if (!p || p.type === 'k') continue;
    if (!c.attackers(s, me).includes(mv.to)) continue;
    const won = legalSeeGainFor(fenAfter, s, me) > 0;
    if (won || (seventh && s[1] === mv.to[1])) targets.push({ piece: p.type, square: s, won });
  }
  const boxedKing = seventh ? boxedBy(c, me) : null;
  if (!targets.some((t) => t.won) && !boxedKing && !seventh) return null;
  if (targets.length === 0 && !boxedKing) return null;
  let route: IntoTheirCamp['route'] = null;
  if ((mv.piece === 'r' || mv.piece === 'q') && mv.from[0] === mv.to[0]) {
    const file = mv.to[0];
    const pawnsOn = (side: Color): boolean => cellsOf(before, side, 'p').some((p) => p[0] === file);
    if (!pawnsOn(me)) route = { kind: pawnsOn(them) ? 'half-open-file' : 'open-file', file };
  } else if (mv.piece === 'n' && isHole(c, mv.to, me)) {
    route = { kind: 'hole' };
  }
  return {
    kind: 'infiltration', moved: mv, route, targets, boxedKing, rooks: [], between: [],
    squares: [mv.from, mv.to, ...targets.map((t) => t.square), ...(boxedKing ? [boxedKing] : [])],
    seventhText: null, key: `camp-in:${mv.from}${mv.to}`,
  };
}

/** The camp idea `san` carries on `fenBefore`, or null. Both seats: the
 *  mover is whoever is to move. */
export function intoTheirCamp(fenBefore: string, san: string): IntoTheirCamp | null {
  let before: Chess;
  let c: Chess;
  try { before = new Chess(fenBefore); c = new Chess(fenBefore); } catch { return null; }
  const me = c.turn();
  const them = other(me);
  let mv;
  try { mv = c.move(san); } catch { return null; }
  // A check or a mate: the sharper fact speaks.
  if (c.inCheck() || c.isGameOver()) return null;
  const fenAfter = c.fen();
  const castled = mv.isKingsideCastle() || mv.isQueensideCastle();
  const moved = { piece: mv.piece, from: mv.from, to: mv.to };
  // A piece that hangs where it lands is not getting in.
  const safeLanding = castled || legalSeeGainFor(fenAfter, mv.to, them) === 0;

  if (!mv.captured && safeLanding) {
    // Both rooks on the seventh: the existing read, called as it stands.
    if (mv.piece === 'r' && relRank(mv.to, me) === 7) {
      const d = rooksOnSeventh(fenBefore, san, me, 0, null);
      if (d) {
        const rooks = cellsOf(c, me, 'r').filter((s) => relRank(s, me) === 7).sort();
        return {
          kind: 'seventh-doubled', moved, route: null,
          targets: d.squares.filter((s) => c.get(s as Square)?.type === 'p' && c.get(s as Square)?.color === them).map((s) => ({ piece: 'p' as PieceSymbol, square: s as Square })),
          boxedKing: (d.squares.find((s) => c.get(s as Square)?.type === 'k') as Square | undefined) ?? null,
          rooks, between: [], squares: d.squares as Square[], seventhText: d.text, key: d.key,
        };
      }
    }
    const inf = infiltration(c, before, moved, me, fenAfter);
    if (inf) return inf;
    // The rook lift: the move is exactly the lift the board read finds.
    if (mv.piece === 'r') {
      const lift = findRookLift(fenBefore, me);
      const king = cellsOf(c, them, 'k')[0];
      if (lift && lift.rook === mv.from && lift.to === mv.to && king) {
        return { kind: 'lift', moved, route: null, targets: [], boxedKing: null, rooks: [], between: [], squares: [mv.from, mv.to, king], seventhText: null, key: `camp-lift:${mv.from}${mv.to}` };
      }
      // …and its second half, the SWING: a rook already up on its third rank
      // slides along it to the file beside their king, and looks up that file
      // into the king's cover (his "the rook swings over to h6").
      const cover = king && relRank(mv.from, me) === 3 && mv.from[1] === mv.to[1] && Math.abs(fileIdx(mv.to) - fileIdx(king)) <= 1
        && Math.abs(fileIdx(mv.to) - fileIdx(king)) < Math.abs(fileIdx(mv.from) - fileIdx(king)) ? kingCoverSeen(c, mv.to, me, king) : null;
      if (king && cover) {
        return { kind: 'swing', moved, route: null, targets: [cover], boxedKing: null, rooks: [], between: [], squares: [mv.from, mv.to, cover.square, king], seventhText: null, key: `camp-swing:${mv.from}${mv.to}` };
      }
    }
  }

  // Connecting the rooks: the last piece between them leaves (castling is the
  // castling read's to say).
  const rooksBefore = backRankRooks(before, me);
  const rooksAfter = backRankRooks(c, me);
  if (!castled && safeLanding && rooksBefore && rooksAfter && rooksBefore.join() === rooksAfter.join()
    && !rooksSeeEachOther(fenBefore, wb(me)) && rooksSeeEachOther(fenAfter, wb(me))
    && mv.from[1] === rooksBefore[0][1] && fileIdx(mv.from) > fileIdx(rooksBefore[0]) && fileIdx(mv.from) < fileIdx(rooksBefore[1])
    // A piece leaving its HOME square, the development that finishes the job
    // (a queen back on the rank and out again is not connecting them).
    && HOME[mv.piece]?.includes(mv.from[0])) {
    return { kind: 'connect', moved, route: null, targets: [], boxedKing: null, rooks: rooksAfter, between: [], squares: [mv.from, ...rooksAfter], seventhText: null, key: `camp-connect:${me}` };
  }

  // The rooks still cut off late in the opening: said once a game, on each
  // side's move 12 (CUT_OFF_MOVE), on a move made elsewhere (not a piece off
  // the back rank, not a capture): the pieces in the way.
  const move = Number(fenBefore.split(' ')[5] ?? '0');
  if (move === CUT_OFF_MOVE && !castled && !mv.captured && rooksAfter && !rooksSeeEachOther(fenAfter, wb(me)) && mv.from[1] !== rooksAfter[0][1]) {
    const between: CampTarget[] = [];
    for (let f = fileIdx(rooksAfter[0]) + 1; f < fileIdx(rooksAfter[1]); f++) {
      const s = sqOf(f, Number(rooksAfter[0][1]));
      const p = c.get(s);
      if (p && p.color === me) between.push({ piece: p.type, square: s });
    }
    // The king still between them is the uncastled king, the castling watch's.
    if (between.length && !between.some((b) => b.piece === 'k')) {
      return { kind: 'cut-off', moved, route: null, targets: [], boxedKing: null, rooks: rooksAfter, between, squares: [...rooksAfter, ...between.map((b) => b.square)], seventhText: null, key: `camp-cut-off:${me}:${between.map((b) => b.square).join('')}` };
    }
  }
  return null;
}

const named = (t: CampTarget): string => `the ${NAME[t.piece]} on ${t.square}`;
function targetList(ts: readonly CampTarget[]): string {
  if (ts.length > 1 && ts.every((t) => t.piece === ts[0].piece)) return `the ${NAME[ts[0].piece]}s on ${andList(ts.map((t) => t.square))}`;
  return andList(ts.map(named));
}

/** Said from the mover's seat (`own`: your / their; `foe`: their / your).
 *  Names the piece and the squares, never the move. Rotated on the board
 *  after the move. */
export function intoTheirCampLine(x: IntoTheirCamp, own: 'your' | 'their', fenAfter: string): string {
  const foe = own === 'your' ? 'their' : 'your';
  const p = NAME[x.moved.piece];
  const key = stemKeyOf(fenAfter);
  switch (x.kind) {
    case 'infiltration': {
      const file = x.route && x.route.kind !== 'hole' ? ` through the ${x.route.kind === 'open-file' ? 'open' : 'half-open'} ${x.route.file}-file` : '';
      const hole = x.route?.kind === 'hole' ? `, a hole no pawn of ${foe === 'their' ? 'theirs' : 'yours'} can attack,` : '';
      const hits = x.targets.length ? targetList(x.targets) : '';
      const box = x.boxedKing ? ` ${cap(foe)} king is shut in on ${x.boxedKing}.` : '';
      if (x.moved.piece === 'r' && relRank(x.moved.to, colorOf(fenAfter, true)) === 7 && !x.targets.some((t) => t.won)) {
        // On the seventh, pressing what is still guarded: a seat, not a win.
        const press = hits ? ` It presses ${hits} from the side.` : '';
        return rotateStem([
          `${cap(own)} rook reaches the seventh on ${x.moved.to}${file}.${press}${box}`,
          `${cap(own)} rook gets onto the seventh at ${x.moved.to}${file}.${press}${box}`,
        ], key);
      }
      return rotateStem([
        `${cap(own)} ${p} gets in on ${x.moved.to}${file}${hole} and hits ${hits}.${box}`,
        `${cap(own)} ${p} comes into ${foe} camp on ${x.moved.to}${file}${hole ? hole.replace(/,$/, '') : ''}. From there it hits ${hits}.${box}`,
        `${cap(own)} ${p} lands on ${x.moved.to}${file}, deep in ${foe} half${hole ? hole.replace(/,$/, '') : ''}. It hits ${hits}.${box}`,
      ], key);
    }
    case 'seventh-doubled': {
      if (own === 'your' && x.seventhText) return x.seventhText;
      const pawns = x.targets.length ? ` They hit ${targetList(x.targets)} from the side.` : '';
      const box = x.boxedKing ? ` ${cap(foe)} king is boxed on the back rank.` : '';
      return `Both ${own} rooks are on the seventh now, on ${andList(x.rooks)}.${pawns}${box}`;
    }
    case 'lift': {
      const king = x.squares[2];
      return rotateStem([
        `${cap(own)} rook lifts to ${x.moved.to}. From there it can swing along the rank toward ${foe} king on ${king}.`,
        `The rook on ${x.moved.from} comes up to ${x.moved.to}, a rook lift. Next it swings across to attack ${foe} king on ${king}.`,
        `${cap(own)} rook leaves the back rank for ${x.moved.to}. It can now swing over toward ${foe} king on ${king}.`,
      ], key);
    }
    case 'swing': {
      const king = x.squares[3];
      const cover = named(x.targets[0]).replace(/^the /, '');
      return rotateStem([
        `${cap(own)} rook swings across from ${x.moved.from} to ${x.moved.to}. From there it looks up the ${x.moved.to[0]}-file at the ${cover} in front of ${foe} king on ${king}.`,
        `The rook on ${x.moved.from} slides over to ${x.moved.to}, toward ${foe} king on ${king}. Up the ${x.moved.to[0]}-file it hits the ${cover}, part of the king's cover.`,
      ], key);
    }
    case 'connect': {
      const [a, b] = x.rooks;
      return rotateStem([
        `${cap(own)} ${p} leaves ${x.moved.from}, the last piece between ${own} rooks. Now the rooks on ${a} and ${b} guard each other.`,
        `With the ${p} off ${x.moved.from}, ${own} rooks on ${a} and ${b} are connected. Each one guards the other.`,
        `That clears the back rank: ${own} rooks on ${a} and ${b} see each other now, and each one guards the other.`,
      ], key);
    }
    case 'cut-off': {
      const [a, b] = x.rooks;
      const way = targetList(x.between);
      const verb = x.between.length > 1 ? 'stand' : 'stands';
      return rotateStem([
        `${cap(own)} rooks are still cut off from each other: ${way} ${verb} between them.`,
        `${cap(way)} still ${verb} between ${own} rooks on ${a} and ${b}. Until ${x.between.length > 1 ? 'they move' : 'it moves'}, the rooks cannot guard each other.`,
        `${cap(own)} rooks on ${a} and ${b} do not see each other yet. ${cap(way)} ${verb} in the way.`,
      ], key);
    }
  }
}

/** The mover: the side NOT to move on the board after the move. */
function colorOf(fenAfter: string, mover: boolean): Color {
  const turn = (fenAfter.split(' ')[1] ?? 'w') as Color;
  return mover ? other(turn) : turn;
}

function cap(s: string): string {
  return openSentence(s);
}

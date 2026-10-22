/**
 * EXACT KING-AND-PAWN VERDICTS — the shared judge of the Campaign's pawn-
 * ending cards (intermediate track, lane KP: Level 19 Outflanking, Level 21
 * Triangulation). PURE: chess.js plus precomputed verdicts, no engine.
 *
 * The verdicts were solved OFFLINE by retrograde analysis
 * (`scripts/scenarios/kp-tablebase.mjs`) and packed into `kpTables.json`
 * (layout: `scripts/scenarios/kp-encode.mjs`); `kpEndings.test.ts` rebuilds
 * the tables and checks the shipped bits against them, and the scenario
 * builders cross-checked them against Syzygy (the Lichess tablebase) and
 * Stockfish. Families read:
 *   - K+P vs K, every position (either side owning the pawn);
 *   - a SLICE where one ships: a fixed set of pawns with the kings anywhere —
 *     the blocked pawn pairs and the pawn structures the scenario libraries
 *     use (read directly or through the colour mirror; a placement the build
 *     did not solve reads null);
 *   - bare kings, K+B or K+N vs K (draws), and K+Q or K+R vs K: the piece
 *     wins unless, with the lone king to move, the king can take it or is
 *     stalemated — a rule PROVED against the exact K+Q and K+R tables on every
 *     position (`scripts/scenarios/kp-selfcheck.mjs`), so a promotion is
 *     judged exactly at the moment it is played.
 * Anything else reads null — not judged, never guessed.
 */
import { Chess, type Color, type Move } from 'chess.js';
import type { MissReason, MissionGame, MissionStatus, ShownMove } from '../missionCard';
import tables from './kpTables.json';

declare module '../missionCard' {
  interface MissReasonMap {
    /** The student's move let a won king-and-pawn ending slip to a draw or a loss. */
    'kp-win-slipped': true;
  }
}

/** Who wins with best play: a colour, or a draw. */
export type KpWinner = Color | 'draw';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

let kpkBits: Uint8Array | null = null;
const sliceBits = new Map<string, Uint8Array | null>();

const sqIndex = (sq: string): number => (Number(sq[1]) - 1) * 8 + (sq.charCodeAt(0) - 97);
const sqName = (s: number): string => `${String.fromCharCode(97 + (s & 7))}${(s >> 3) + 1}`;
const flipRank = (s: number): number => s ^ 56;

/** K+P vs K with WHITE owning the pawn: does White win? (`stm` 0 = White to move.) */
export function kpkWhiteWins(pawn: number, wk: number, bk: number, stm: 0 | 1): boolean {
  if (!kpkBits) kpkBits = fromBase64(tables.kpk);
  let p = pawn; let w = wk; let b = bk;
  if ((p & 7) > 3) { p ^= 7; w ^= 7; b ^= 7; }
  const i = ((((p >> 3) - 1) * 4 + (p & 7)) * 64 * 64 + w * 64 + b) * 2 + stm;
  return ((kpkBits[i >> 3] >> (i & 7)) & 1) === 1;
}

/** A slice's key: White's pawn squares, '/', Black's, each sorted. */
const sliceKey = (white: readonly number[], black: readonly number[]): string =>
  `${white.map(sqName).sort().join(',')}/${black.map(sqName).sort().join(',')}`;

function sliceTable(key: string, side: Color): Uint8Array | null {
  const id = `${key} ${side}`;
  if (!sliceBits.has(id)) {
    const packed = (tables.slices as Record<string, Partial<Record<Color, string>> | undefined>)[key]?.[side];
    sliceBits.set(id, packed ? fromBase64(packed) : null);
  }
  return sliceBits.get(id) ?? null;
}

const readCode = (bits: Uint8Array, wk: number, bk: number): number => {
  const bit = (wk * 64 + bk) * 2;
  return (bits[bit >> 3] >> (bit & 7)) & 3;
};

/** A shipped slice (a fixed pawn set, the kings anywhere): 'w' | 'b' | 'draw',
 *  or null when neither it nor its colour mirror ships, or the placement is
 *  not known (code 3). */
function sliceWinner(white: readonly number[], black: readonly number[], wk: number, bk: number, turn: Color): KpWinner | null {
  const direct = sliceTable(sliceKey(white, black), turn);
  if (direct) {
    const code = readCode(direct, wk, bk);
    return code === 1 ? 'w' : code === 2 ? 'b' : code === 0 ? 'draw' : null;
  }
  // The colour mirror: ranks flipped, colours swapped.
  const mirror = sliceTable(sliceKey(black.map(flipRank), white.map(flipRank)), turn === 'w' ? 'b' : 'w');
  if (!mirror) return null;
  const code = readCode(mirror, flipRank(bk), flipRank(wk));
  return code === 1 ? 'b' : code === 2 ? 'w' : code === 0 ? 'draw' : null;
}

/**
 * The exact result of the board with best play from here, or null when the
 * board is in none of the solved families. Ignores repetition and the
 * fifty-move rule (the game ending on those is read by `isGameOver`).
 */
export function exactWinner(board: Chess): KpWinner | null {
  const pieces = board.board().flat().filter((c): c is NonNullable<typeof c> => c !== null);
  const kings = pieces.filter((p) => p.type === 'k');
  if (kings.length !== 2) return null;
  const wk = sqIndex(kings.find((k) => k.color === 'w')?.square ?? 'a1');
  const bk = sqIndex(kings.find((k) => k.color === 'b')?.square ?? 'a1');
  const others = pieces.filter((p) => p.type !== 'k');
  const stm: 0 | 1 = board.turn() === 'w' ? 0 : 1;
  if (others.length === 0) return 'draw';
  if (others.length === 1) {
    const o = others[0];
    if (o.type === 'b' || o.type === 'n') return 'draw';
    if (o.type === 'p') {
      if (o.color === 'w') return kpkWhiteWins(sqIndex(o.square), wk, bk, stm) ? 'w' : 'draw';
      return kpkWhiteWins(flipRank(sqIndex(o.square)), flipRank(bk), flipRank(wk), stm === 1 ? 0 : 1) ? 'b' : 'draw';
    }
    // A queen or a rook against a lone king.
    if (board.turn() === o.color) return o.color;
    if (board.isStalemate()) return 'draw';
    const taken = board.moves({ verbose: true }).some((m) => m.to === o.square);
    return taken ? 'draw' : o.color;
  }
  if (!others.every((p) => p.type === 'p')) return null;
  return sliceWinner(
    others.filter((p) => p.color === 'w').map((p) => sqIndex(p.square)),
    others.filter((p) => p.color === 'b').map((p) => sqIndex(p.square)),
    wk, bk, board.turn(),
  );
}

const uciOf = (m: { from: string; to: string; promotion?: string }): string => `${m.from}${m.to}${m.promotion ?? ''}`;

/** The exact result after `uci` from `fen`, or null (illegal, or unsolved). */
export function winnerAfter(fen: string, uci: string): KpWinner | null {
  try {
    const b = new Chess(fen);
    b.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return exactWinner(b);
  } catch { return null; }
}

/** The student's moves from `fen` that keep a win (the student to move),
 *  promotions first, then chess.js order. Empty when none, or unsolved. */
export function winningMovesUci(fen: string, me: Color): string[] {
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  if (board.turn() !== me) return [];
  const out: string[] = [];
  const promos: string[] = [];
  for (const m of board.moves({ verbose: true })) {
    const uci = uciOf(m);
    if (winnerAfter(fen, uci) === me) (m.promotion ? promos : out).push(uci);
  }
  return [...promos, ...out];
}

/** The move a second miss shows: the engine's first candidate that keeps the
 *  win; else `fallback` when it keeps the win; else the first winning move. */
export function kpShowMove(fenBefore: string, me: Color, candidatesUci: readonly string[], fallback: string | null): ShownMove | null {
  const wins = winningMovesUci(fenBefore, me);
  const ok = new Set(wins);
  const pick = candidatesUci.find((u) => ok.has(u)) ?? (fallback && ok.has(fallback) ? fallback : null) ?? (wins.length > 0 ? wins[0] : null);
  return pick ? { from: pick.slice(0, 2), to: pick.slice(2, 4) } : null;
}

/** A curated scenario board as a card's library stores it. */
export interface KpLibraryBoard {
  fen: string;
  /** The moves that keep the win, fastest first (the exact tables). */
  key: readonly string[];
  /** The natural wrong move — verified a draw by the tables, Syzygy and Stockfish. */
  trap: string;
}

/** The position part of a FEN (placement and side to move). */
export const boardKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

/** What a card tells the shared walk. */
export interface KpCardSpec {
  /** The card's decision board: the student to move at the moment the card's
   *  technique decides the game. A won board for the student. */
  decision: (board: Chess, me: Color) => boolean;
  /** The reason a decision board's wrong answer is recorded with. */
  decisionReason: MissReason;
  /** The library board with this position, if any (scenario mode). */
  libraryBoard: (fen: string) => KpLibraryBoard | null;
  /** The move that passes the card: a winning promotion, or (the
   *  triangulation card) any move that changes the pawns and keeps the win. */
  passes: (move: Move, after: KpWinner | null, me: Color) => boolean;
}

export interface KpWalk {
  status: MissionStatus;
  board: Chess;
  /** The first ply the student answered a decision board with a winning move. */
  foundPly: number | null;
}

/**
 * Walk a game for a pawn-ending card. POSED: from a library board (the
 * scenario's curated start) every student move from a WON board is judged;
 * on any other start (a live game, a silent watcher) the card is posed only
 * from its first decision board on. Once posed:
 *   PASS — `spec.passes` (the card's own target).
 *   MISS — from a won board, the student's move leaves the board drawn or lost
 *          by the exact verdict: the decision reason on a decision board,
 *          `kp-win-slipped` elsewhere. On a library board the miss shows the
 *          board's key move.
 *   EXEMPT — a forgiven ply; a board the tables do not solve; the coach's moves;
 *          plies before `startPly`. A won board always has a winning move, so
 *          no miss is ever forced.
 *   OVER — the game ends on the student's move any other way (repetition,
 *          fifty moves, bare kings): `incomplete`.
 */
export function walkKpEnding(game: MissionGame, spec: KpCardSpec): KpWalk {
  const me = game.studentColor;
  let board: Chess;
  try { board = new Chess(game.startFen ?? START); } catch { return { status: { state: 'pending' }, board: new Chess(), foundPly: null }; }
  const scenario = game.startFen ? spec.libraryBoard(game.startFen) !== null : false;
  let posed = false;
  let foundPly: number | null = null;
  for (let ply = 0; ply < game.sans.length; ply++) {
    const fenBefore = board.fen();
    const judged = ply >= game.startPly && board.turn() === me;
    let wonBefore = false;
    let decision = false;
    if (judged) {
      wonBefore = exactWinner(board) === me;
      decision = wonBefore && spec.decision(board, me);
      if (!posed && wonBefore && (scenario || decision)) posed = true;
    }
    let move: Move;
    try { move = board.move(game.sans[ply]); } catch { break; }
    if (!judged) continue;
    if (!posed) {
      if (board.isGameOver()) return { status: { state: 'incomplete', ply }, board, foundPly };
      continue;
    }
    const after = exactWinner(board);
    if (spec.passes(move, after, me)) return { status: { state: 'pass', ply }, board, foundPly: foundPly ?? (decision ? ply : null) };
    if (decision && after === me && foundPly === null) foundPly = ply;
    if (wonBefore && after !== null && after !== me && !game.forgiven.has(ply)) {
      const lib = spec.libraryBoard(fenBefore);
      const key = lib?.key[0];
      return {
        status: {
          state: 'miss', ply, reason: decision ? spec.decisionReason : 'kp-win-slipped',
          ...(key ? { showMove: { from: key.slice(0, 2), to: key.slice(2, 4) } } : {}),
        },
        board, foundPly,
      };
    }
    if (board.isGameOver()) return { status: { state: 'incomplete', ply }, board, foundPly };
  }
  return { status: { state: 'pending' }, board, foundPly };
}

/** A library indexed by position, both colours. */
export function indexLibrary(lib: { w: readonly KpLibraryBoard[]; b: readonly KpLibraryBoard[] }): (fen: string) => KpLibraryBoard | null {
  const byKey = new Map<string, KpLibraryBoard>();
  for (const row of [...lib.w, ...lib.b]) byKey.set(boardKey(row.fen), row);
  return (fen) => byKey.get(boardKey(fen)) ?? null;
}

/** The banner's read of a king-and-pawn board — never a move. */
export function kpProgressLine(board: Chess, me: Color, idle: string): string {
  const pieces = board.board().flat().filter((c): c is NonNullable<typeof c> => c !== null);
  const mine = pieces.filter((p) => p.type === 'p' && p.color === me);
  const theirs = pieces.filter((p) => p.type === 'p' && p.color !== me);
  if (theirs.length > 0) return `Win their pawn on ${theirs[0].square}`;
  if (mine.length === 1) {
    const rank = Number(mine[0].square[1]);
    const steps = me === 'w' ? 8 - rank : rank - 1;
    return `Your pawn: ${steps} ${steps === 1 ? 'step' : 'steps'} to queen`;
  }
  return idle;
}

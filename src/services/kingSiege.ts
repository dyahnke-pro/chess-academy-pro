// kingSiege — THE KING ATTACK AND THREATS TO YOUR OWN KING (WO-DANYA-READS-01
// group 1, 2026-11-18: about 90 of his ideas on 202 article boards, most of
// them missed). Four board reads a strong player runs around each king, both
// seats, every one computed on the board (chess.js) or out of the engine's
// own line — nothing here decides (G0):
//
//   kingSiege       — the pieces that aim at a king against the pieces that
//                     defend it, batteries counted, and which of the
//                     defender's pieces are too far away to help (moves to
//                     reach a defending square, counted on the board).
//   backRankWeakness — a king on its back rank with no luft, where one piece
//                     is all that stops a rook or queen check there from
//                     being mate (the check is played; the guard is taken off
//                     and the same check is mate).
//   loadedDiscovery — a piece that is all that stands between its own rook,
//                     bishop or queen and the enemy king: it moves with check,
//                     and what it can take on the way.
//   kingSacrifice   — a move that gives up material at the king and is taken,
//                     what it opens (the king dragged out, a shelter pawn
//                     gone, a defender pulled away) and the forced follow-up
//                     in the engine's line that proves it (mate, the material
//                     back, or the attack the engine scores).
//
// Phrasing rotates on the board (`stemKeyOf` of the FEN), never at random.
import { Chess, type Color, type PieceSymbol, type Square, type Move } from 'chess.js';
import { kingRing, kingNeighbourhood, bearsOnSquare, kingCover } from './kingSafety';
import { sideToMoveAs, hasMateThreat } from './threatOut';
import { MATERIAL_VALUE, sideMaterial } from './pieceValues';
import { andList, countWord } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { unmarked } from '../utils/sanMark';
import { piecesSaid } from './pieceRef';

export interface SiegePiece { square: Square; piece: PieceSymbol }

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const fileOf = (s: string): number => s.charCodeAt(0) - 97;
const rankOf = (s: string): number => Number(s[1]);
const sq = (f: number, r: number): Square => `${String.fromCharCode(97 + f)}${r}` as Square;
const onBoard = (f: number, r: number): boolean => f >= 0 && f < 8 && r >= 1 && r <= 8;

function load(fen: string): Chess | null {
  try { return new Chess(fen); } catch { return null; }
}

function kingOf(c: Chess, color: Color): Square | null {
  for (const row of c.board()) for (const x of row) if (x && x.type === 'k' && x.color === color) return x.square;
  return null;
}

function piecesOf(c: Chess, color: Color, types: readonly PieceSymbol[]): SiegePiece[] {
  const out: SiegePiece[] = [];
  for (const row of c.board()) for (const x of row) if (x && x.color === color && types.includes(x.type)) out.push({ square: x.square, piece: x.type });
  return out;
}

const pieceWord = (p: SiegePiece): string => `${NAME[p.piece]} on ${p.square}`;
const hasQueen = (c: Chess, color: Color): boolean => piecesOf(c, color, ['q']).length > 0;

// ── ATTACKERS AGAINST DEFENDERS ─────────────────────────────────────────────

export interface KingSiege {
  /** Whose king is under fire. */
  defender: Color;
  king: Square;
  /** The other side's knights, bishops, rooks and queens bearing on the king
   *  or a square next to it (pin-aware), and the sliders lined up behind them
   *  (a battery bears through the piece in front). */
  attackers: SiegePiece[];
  /** The attacking side's other pieces that one move (the board standing
   *  still) brings to bear on the king or a square next to it. */
  coming: SiegePiece[];
  /** The defender's knights, bishops, rooks and queens bearing on a square
   *  next to its king. */
  defenders: SiegePiece[];
  /** The defender's other pieces and the fewest moves each needs, on this
   *  board, to bear on a square next to its king — null when three moves do
   *  not get it there. */
  away: Array<SiegePiece & { moves: number | null }>;
  key: string;
}

const PIECES: readonly PieceSymbol[] = ['n', 'b', 'r', 'q'];
const ORTHO: ReadonlyArray<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: ReadonlyArray<[number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT: ReadonlyArray<[number, number]> = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const dirsOf = (p: PieceSymbol): ReadonlyArray<[number, number]> => (p === 'r' ? ORTHO : p === 'b' ? DIAG : p === 'q' ? [...ORTHO, ...DIAG] : []);

/** The sliders of `color` lined up behind `from` along the line away from
 *  `target` — the battery that bears through the piece in front. */
function batteryBehind(c: Chess, from: Square, target: Square, color: Color): SiegePiece[] {
  const df = Math.sign(fileOf(target) - fileOf(from));
  const dr = Math.sign(rankOf(target) - rankOf(from));
  const diagonal = df !== 0 && dr !== 0;
  const straight = (df === 0) !== (dr === 0);
  if (!diagonal && !straight) return [];
  // Only along a true line (not a knight's hop).
  const ddf = fileOf(target) - fileOf(from);
  const ddr = rankOf(target) - rankOf(from);
  if (diagonal && Math.abs(ddf) !== Math.abs(ddr)) return [];
  const out: SiegePiece[] = [];
  let f = fileOf(from) - df;
  let r = rankOf(from) - dr;
  while (onBoard(f, r)) {
    const at = sq(f, r);
    const x = c.get(at);
    if (x) {
      const fits = x.color === color && (x.type === 'q' || (diagonal ? x.type === 'b' : x.type === 'r'));
      if (!fits) break;
      out.push({ square: at, piece: x.type });
    }
    f -= df; r -= dr;
  }
  return out;
}

/** Does a `piece` of `color` standing on `at` bear on `target` on board `c`,
 *  with the square `vacated` treated as empty (the piece's own home)? */
function bearsFrom(c: Chess, piece: PieceSymbol, at: Square, target: Square, vacated: Square): boolean {
  const ddf = fileOf(target) - fileOf(at);
  const ddr = rankOf(target) - rankOf(at);
  if (ddf === 0 && ddr === 0) return false;
  if (piece === 'n') return (Math.abs(ddf) === 1 && Math.abs(ddr) === 2) || (Math.abs(ddf) === 2 && Math.abs(ddr) === 1);
  const diagonal = Math.abs(ddf) === Math.abs(ddr);
  const straight = ddf === 0 || ddr === 0;
  if (!(piece === 'q' ? diagonal || straight : piece === 'b' ? diagonal : straight)) return false;
  const df = Math.sign(ddf); const dr = Math.sign(ddr);
  let f = fileOf(at) + df; let r = rankOf(at) + dr;
  while (sq(f, r) !== target) {
    const s = sq(f, r);
    if (s !== vacated && c.get(s)) return false;
    f += df; r += dr;
  }
  return true;
}

/** The squares a `piece` of `color` reaches in one move from `at` (the board
 *  standing still, `vacated` empty): through empty squares, landing on an
 *  empty square or an enemy piece. */
function hopsFrom(c: Chess, piece: PieceSymbol, color: Color, at: Square, vacated: Square): Square[] {
  const out: Square[] = [];
  const land = (s: Square): 'empty' | 'enemy' | 'own' => {
    if (s === vacated) return 'empty';
    const x = c.get(s);
    return !x ? 'empty' : x.color === color ? 'own' : 'enemy';
  };
  if (piece === 'n') {
    for (const [df, dr] of KNIGHT) {
      const f = fileOf(at) + df; const r = rankOf(at) + dr;
      if (onBoard(f, r) && land(sq(f, r)) !== 'own') out.push(sq(f, r));
    }
    return out;
  }
  for (const [df, dr] of dirsOf(piece)) {
    let f = fileOf(at) + df; let r = rankOf(at) + dr;
    while (onBoard(f, r)) {
      const k = land(sq(f, r));
      if (k === 'own') break;
      out.push(sq(f, r));
      if (k === 'enemy') break;
      f += df; r += dr;
    }
  }
  return out;
}

/** The fewest moves the piece on `from` needs to bear on one of `targets`
 *  (the board standing still), or null past `limit`. */
function movesToBear(c: Chess, p: SiegePiece, color: Color, targets: readonly Square[], limit: number): number | null {
  const bears = (at: Square): boolean => targets.some((t) => t !== at && bearsFrom(c, p.piece, at, t, p.square));
  let frontier: Square[] = [p.square];
  const seen = new Set<string>([p.square]);
  for (let d = 1; d <= limit; d += 1) {
    const next: Square[] = [];
    for (const at of frontier) {
      for (const to of hopsFrom(c, p.piece, color, at, p.square)) {
        if (seen.has(to)) continue;
        seen.add(to);
        if (bears(to)) return d;
        next.push(to);
      }
    }
    frontier = next;
  }
  return null;
}

/** The attacker's engine edge (cp) a massed attack needs to be called one. */
const MASS_CP = 50;

/** How far a defender's piece may be and still count as "coming to help". */
const AWAY_LIMIT = 3;

/** The siege of `defender`'s king on `fen`, read off the board. */
export function kingSiege(fen: string, defender: Color): KingSiege | null {
  const c = load(fen);
  if (!c) return null;
  const king = kingOf(c, defender);
  if (!king) return null;
  const attacker = other(defender);
  const ring = kingRing(king);
  const neighbours = ring.filter((s) => s !== king);
  const atk = new Map<string, SiegePiece>();
  for (const s of ring) {
    let from: Square[] = [];
    try { from = c.attackers(s, attacker); } catch { from = []; }
    for (const a of from) {
      const x = c.get(a);
      if (!x || !PIECES.includes(x.type) || !bearsOnSquare(c, a, s)) continue;
      atk.set(a, { square: a, piece: x.type });
      if (x.type !== 'n') for (const b of batteryBehind(c, a, s, attacker)) atk.set(b.square, b);
    }
  }
  const def = new Map<string, SiegePiece>();
  for (const s of neighbours) {
    let from: Square[] = [];
    try { from = c.attackers(s, defender); } catch { from = []; }
    for (const d of from) {
      const x = c.get(d);
      if (x && PIECES.includes(x.type) && bearsOnSquare(c, d, s)) def.set(d, { square: d, piece: x.type });
    }
  }
  const away = piecesOf(c, defender, PIECES)
    .filter((p) => !def.has(p.square))
    .map((p) => ({ ...p, moves: movesToBear(c, p, defender, neighbours, AWAY_LIMIT) }));
  const coming = piecesOf(c, attacker, PIECES)
    .filter((p) => !atk.has(p.square) && movesToBear(c, p, attacker, ring, 1) === 1);
  const byValue = (a: SiegePiece, b: SiegePiece): number => (MATERIAL_VALUE[b.piece] - MATERIAL_VALUE[a.piece]) || a.square.localeCompare(b.square);
  return {
    defender, king,
    attackers: [...atk.values()].sort(byValue),
    coming: coming.sort(byValue),
    defenders: [...def.values()].sort(byValue),
    away: away.sort(byValue),
    key: `siege:${king}:${atk.size}v${def.size}`,
  };
}

/** The pieces far from home: two moves or more from helping, or out of reach. */
export function farFromHome(s: KingSiege): KingSiege['away'] {
  return s.away.filter((p) => p.moves === null || p.moves >= 2);
}

/**
 * THE SIEGE IS WORTH SAYING when the attack is real on the board: the
 * attacking side still has its queen (no mating force, no attack to count),
 * three pieces or more bear on the king, and they outnumber its defenders —
 * even counting every piece one move from helping — by two. The engine's word
 * (`attackerCp`, the attacking side's own score, or null with no read) keeps
 * it quiet for a side that is losing anyway.
 */
export function siegeSpeaks(fen: string, s: KingSiege, attackerCp: number | null): boolean {
  const c = load(fen);
  if (!c || !hasQueen(c, other(s.defender))) return false;
  if (attackerCp !== null && attackerCp < -50) return false;
  // THE MASSED ATTACK (Danya: "White already has three pieces in the attack",
  // "all aimed at Black's king" — with the pawn cover still whole): three or
  // more pieces on the king or a move from it, outnumbering its defenders,
  // and the engine agreeing the attacker stands better. Measured on his 209
  // boards: speaks on 28, half of them boards where he talks about the king
  // attack (base rate 22%), and on 7 of the 11 where he names the massing.
  // The piece count alone was right a third of the time — the engine's word
  // is what tells massing from pieces that merely stand near a king.
  if (attackerCp !== null && attackerCp >= MASS_CP && s.attackers.length >= 1 && s.attackers.length + s.coming.length >= 3
    && s.attackers.length + s.coming.length > s.defenders.length) return true;
  const near = s.away.filter((p) => p.moves === 1).length;
  const force = s.attackers.length + s.coming.length;
  if (s.attackers.length < 2 || s.attackers.length < s.defenders.length || force < 4 || force < s.defenders.length + near + 1) return false;
  // A king with its cover whole is not under siege yet.
  const cover = kingCover(c, s.defender);
  return !!cover && cover.present < cover.of;
}

/** The sentence, from the student's seat. */
export function siegeLine(s: KingSiege, student: Color, fen: string): string {
  const mine = s.defender !== student; // the student is the attacker
  const n = countWord(s.attackers.length);
  const atkOwner = mine ? 'your' : 'their';
  const defOwner = mine ? 'their' : 'your';
  const kingWord = `${defOwner} king on ${s.king}`;
  const more = s.coming.length === 0 ? '' : `, and ${countWord(s.coming.length)} more ${s.coming.length === 1 ? 'is' : 'are'} a move away`;
  const lead = rotateStem([
    `${openSentence(n)} of ${atkOwner} pieces ${s.attackers.length === 1 ? 'aims' : 'aim'} at ${kingWord}${more}.`,
    `${openSentence(kingWord)} faces ${n} of ${atkOwner} pieces${more}.`,
  ], stemKeyOf(fen));
  // Each piece by what it is, the owner said once (the human voice: a list
  // of squares is read off the board, never out loud — the squares are lit,
  // `siegeSquares`).
  const said = (ps: ReadonlyArray<{ piece: PieceSymbol; square: string }>): string[] => {
    const pieceAt = new Map(ps.map((p) => [p.square, p.piece]));
    return piecesSaid(fen, ps.map((p) => p.square), defOwner, (sq) => `${defOwner} ${NAME[pieceAt.get(sq) ?? 'p']} on ${sq}`);
  };
  const defs = said(s.defenders);
  const ofThem = defOwner === 'your' ? 'yours' : 'theirs';
  const guard = defs.length === 0
    ? `Nothing of ${ofThem} defends it.`
    : defs.length === 1
      ? `Only ${defs[0]} defends it.`
      : `${openSentence(countWord(defs.length))} of ${ofThem} defend it: ${andList(defs)}.`;
  const far = farFromHome(s);
  if (far.length === 0) return `${lead} ${guard}`;
  const named = andList(said(far));
  const tail = far.every((p) => p.moves === null)
    ? `${openSentence(named)} ${far.length === 1 ? 'is' : 'are'} out of play — three moves do not bring ${far.length === 1 ? 'it' : 'them'} back.`
    : `${openSentence(named)} ${far.length === 1 ? 'is' : 'are'} two moves or more from helping.`;
  return `${lead} ${guard} ${tail}`;
}

export function siegeSquares(s: KingSiege): string[] {
  return [...new Set([s.king, ...s.attackers.map((p) => p.square), ...s.coming.map((p) => p.square), ...s.defenders.map((p) => p.square), ...farFromHome(s).map((p) => p.square)])];
}

// ── THE BACK RANK ───────────────────────────────────────────────────────────

export interface BackRank {
  defender: Color;
  king: Square;
  /** The check on the back rank (the attacker's move, given the move). */
  check: { san: string; from: Square; to: Square };
  /** The one piece that answers it — by taking the checker or stepping in. */
  guard: SiegePiece;
  key: string;
}

/** The board with the piece on `s` taken off, or null when no such board. */
function without(fen: string, s: Square): Chess | null {
  const c = load(fen);
  if (!c) return null;
  c.remove(s);
  try { return new Chess(c.fen()); } catch { return null; }
}

/**
 * A BACK-RANK WEAKNESS, proven: `defender`'s king stands on its back rank with
 * no flight square off it, the other side (handed the move) has a rook or
 * queen check on that rank, every answer to the check is one piece taking the
 * checker or stepping in, and with that piece taken off the board the same
 * check is mate. A check that mates already is the mate threat (`mateThreatsAgainst`).
 */
export function backRankWeakness(fen: string, defender: Color): BackRank | null {
  const c = load(fen);
  if (!c) return null;
  const king = kingOf(c, defender);
  if (!king) return null;
  const home = defender === 'w' ? 1 : 8;
  if (rankOf(king) !== home) return null;
  const attacker = other(defender);
  const up = defender === 'w' ? 1 : -1;
  for (const df of [-1, 0, 1]) {
    const f = fileOf(king) + df; const r = home + up;
    if (!onBoard(f, r)) continue;
    const s = sq(f, r);
    const x = c.get(s);
    if (x && x.color === defender) continue;
    let hit: Square[] = [];
    try { hit = c.attackers(s, attacker); } catch { hit = []; }
    if (hit.length === 0) return null; // luft
  }
  // A check along the rank from a piece that comes from afar — a queen
  // already standing by the king is a king attack, not the back rank.
  const close = new Set<string>(kingNeighbourhood(king));
  const heavy = piecesOf(c, attacker, ['r', 'q']).filter((p) => !close.has(p.square));
  if (heavy.length === 0) return null;
  const probeFen = sideToMoveAs(fen, attacker);
  if (!probeFen) return null;
  const probe = new Chess(probeFen);
  const checks = heavy.flatMap((p) => probe.moves({ square: p.square, verbose: true }))
    .filter((m) => rankOf(m.to) === home && m.san.includes('+') && !m.san.includes('#'));
  const found: BackRank[] = [];
  for (const m of checks) {
    const after = new Chess(probeFen);
    after.move({ from: m.from, to: m.to, promotion: m.promotion });
    const replies = after.moves({ verbose: true });
    if (replies.some((r) => r.piece === 'k')) continue;
    const guards = [...new Set(replies.map((r) => r.from))];
    if (guards.length !== 1) continue;
    const g = after.get(guards[0]);
    if (!g) continue;
    // The guard taken off: the same check is mate.
    const bare = without(probeFen, guards[0]);
    if (!bare || bare.turn() !== attacker) continue;
    let mates = false;
    try { const mv = bare.move({ from: m.from, to: m.to, promotion: m.promotion }); mates = !!mv && bare.isCheckmate(); } catch { mates = false; }
    if (!mates) continue;
    found.push({ defender, king, check: { san: m.san, from: m.from, to: m.to }, guard: { square: guards[0], piece: g.type }, key: `back-rank:${king}:${guards[0]}` });
  }
  found.sort((a, b) => a.check.to.localeCompare(b.check.to) || a.check.from.localeCompare(b.check.from));
  return found[0] ?? null;
}

export function backRankLine(b: BackRank, student: Color, fen: string): string {
  const mine = b.defender === student; // the student's own king
  const mate = unmarked(b.check.san);
  return rotateStem(mine ? [
    `Your king on ${b.king} has no luft. Only your ${pieceWord(b.guard)} guards the back rank — if it leaves, ${mate} is mate.`,
    `Your back rank is thin: the king on ${b.king} has no flight square, and only your ${pieceWord(b.guard)} stops ${mate} from being mate.`,
  ] : [
    `Their king on ${b.king} has no luft. Only their ${pieceWord(b.guard)} guards the back rank — pull it away and ${mate} is mate.`,
    `Their back rank is thin: the king on ${b.king} has no flight square, and only their ${pieceWord(b.guard)} stops ${mate} from being mate.`,
  ], stemKeyOf(fen));
}

export function backRankSquares(b: BackRank): string[] {
  return [b.king, b.guard.square, b.check.from, b.check.to];
}

// ── THE LOADED DISCOVERY ────────────────────────────────────────────────────

export interface LoadedDiscovery {
  /** The side with the discovered check. */
  side: Color;
  blocker: SiegePiece;
  slider: SiegePiece;
  king: Square;
  /** Every move of the blocker gives check. */
  everyMove: boolean;
  /** The pieces (not pawns) the blocker can take with the check, biggest first. */
  takes: Array<{ san: string; target: SiegePiece }>;
  key: string;
}

/**
 * A DISCOVERED CHECK, LOADED: `side`'s piece is all that stands between its
 * own rook, bishop or queen and the other king, and (with `side` to move) it
 * can step off the line with check. Read for the side handed the move.
 */
export function loadedDiscovery(fen: string, side: Color): LoadedDiscovery | null {
  const c = load(fen);
  if (!c) return null;
  const foe = other(side);
  const king = kingOf(c, foe);
  if (!king) return null;
  const probeFen = sideToMoveAs(fen, side);
  if (!probeFen) return null;
  const probe = new Chess(probeFen);
  const found: LoadedDiscovery[] = [];
  for (const [df, dr] of [...ORTHO, ...DIAG]) {
    const diagonal = df !== 0 && dr !== 0;
    let f = fileOf(king) + df; let r = rankOf(king) + dr;
    let blocker: SiegePiece | null = null;
    while (onBoard(f, r)) {
      const at = sq(f, r);
      const x = c.get(at);
      if (x) {
        if (!blocker) {
          if (x.color !== side || x.type === 'k') break;
          blocker = { square: at, piece: x.type };
        } else {
          const fits = x.color === side && (x.type === 'q' || (diagonal ? x.type === 'b' : x.type === 'r'));
          if (fits) {
            const line = new Set<string>();
            let ff = fileOf(king) + df; let rr = rankOf(king) + dr;
            while (sq(ff, rr) !== at) { line.add(sq(ff, rr)); ff += df; rr += dr; }
            const moves = probe.moves({ square: blocker.square, verbose: true });
            const off = moves.filter((m) => !line.has(m.to));
            const checking = off.filter((m) => m.san.includes('+') || m.san.includes('#'));
            if (checking.length > 0) {
              const takes = checking
                .filter((m) => m.captured && m.captured !== 'p')
                .map((m) => ({ san: m.san, target: { square: m.to, piece: m.captured as PieceSymbol } }))
                .sort((a, b) => MATERIAL_VALUE[b.target.piece] - MATERIAL_VALUE[a.target.piece] || a.san.localeCompare(b.san));
              found.push({ side, blocker, slider: { square: at, piece: x.type }, king, everyMove: moves.length > 0 && checking.length === moves.length, takes, key: `discovery:${blocker.square}:${at}` });
            }
          }
          break;
        }
      }
      f += df; r += dr;
    }
  }
  found.sort((a, b) => (MATERIAL_VALUE[b.takes[0]?.target.piece ?? 'p'] - MATERIAL_VALUE[a.takes[0]?.target.piece ?? 'p']) || a.key.localeCompare(b.key));
  return found[0] ?? null;
}

/** Worth saying: the blocker can take a piece with the check. */
export function discoverySpeaks(d: LoadedDiscovery): boolean {
  return d.takes.length > 0;
}

export function discoveryLine(d: LoadedDiscovery, student: Color, fen: string): string {
  const mine = d.side === student;
  const own = mine ? 'your' : 'their';
  const victim = mine ? 'their' : 'your';
  const p = NAME[d.blocker.piece];
  const stand = `${openSentence(own)} ${p} on ${d.blocker.square} is all that stands between ${own} ${pieceWord(d.slider)} and ${victim} king`;
  const step = d.everyMove ? `every ${p} move is check` : `it can step aside with check`;
  const t = d.takes[0];
  const take = t ? `, and it can take ${victim} ${pieceWord(t.target)} on the way` : '';
  return rotateStem([
    `${stand} — ${step}${take}.`,
    `${stand}. ${openSentence(step)}${take}.`,
  ], stemKeyOf(fen));
}

export function discoverySquares(d: LoadedDiscovery): string[] {
  return [d.blocker.square, d.slider.square, d.king, ...(d.takes[0] ? [d.takes[0].target.square] : [])];
}

// ── THE SACRIFICE AT THE KING ───────────────────────────────────────────────

export interface KingSacrifice {
  mover: Color;
  san: string;
  /** The piece given up and what it took. */
  given: PieceSymbol;
  took: PieceSymbol | null;
  /** The reply that took it (SAN). */
  accepted: string;
  /** What it opened. */
  opens: { kind: 'king-out'; square: Square } | { kind: 'shelter'; square: Square } | { kind: 'defender'; piece: SiegePiece };
  /** The mover's moves after the acceptance, through the last forcing one. */
  follow: string[];
  /** The whole line from the board before the sacrifice (SAN). */
  line: string[];
  /** Mate; ahead in material at the end of the stretch; the material back;
   *  or behind and the engine scores the attack. */
  outcome: 'mate' | 'ahead' | 'material' | 'attack';
  key: string;
}

/** Points of material for `color` on `c`. */
function material(c: Chess, color: Color): number {
  return sideMaterial(c.fen(), color);
}

/**
 * A SACRIFICE AT THE KING, proven by the line: the move `san` on `fenBefore`
 * lands by the other king (within two squares of it, or with check), the
 * engine's reply (`line[0]`, UCI) takes the piece, and it gave up two points
 * or more. Said only with what it opened and a forced follow-up — the mover's
 * next moves are checks or captures — that ends in mate, wins the material
 * back, or leaves the mover a clear attack by the engine's own score
 * (`moverCp`, the mover's view after the move; null with no read).
 */
export function kingSacrifice(fenBefore: string, san: string, line: readonly string[], moverCp: number | null, moverMate: number | null): KingSacrifice | null {
  const c = load(fenBefore);
  if (!c) return null;
  let mv: Move;
  try { mv = c.move(san); } catch { return null; }
  const mover = mv.color;
  const foe = other(mover);
  const before = load(fenBefore);
  if (!before) return null;
  const king = kingOf(before, foe);
  if (!king || !line[0]) return null;
  const near = kingNeighbourhood(king).includes(mv.to) || c.inCheck();
  if (!near) return null;
  const given = MATERIAL_VALUE[mv.piece] - (mv.captured ? MATERIAL_VALUE[mv.captured] : 0);
  if (given < 2 || mv.piece === 'k') return null;
  const u0 = line[0];
  if (u0.slice(2, 4) !== mv.to) return null;
  let rep: Move;
  try { rep = c.move({ from: u0.slice(0, 2), to: u0.slice(2, 4), promotion: u0[4] }); } catch { return null; }
  if (!rep.captured) return null;
  // Taking straight back on the square is a trade, not a sacrifice (Danya's
  // article boards, 2026-11-18: Rd8+ Rxd8 Rxd8+ was said as "gives up your
  // rook" — rook for rook).
  if (line[1] && line[1].slice(2, 4) === mv.to) return null;
  const sans = [mv.san, rep.san];
  const follow: string[] = [];
  let lastForcing = 1;
  for (let k = 1; k < line.length; k += 1) {
    const u = line[k];
    let m: Move;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    sans.push(m.san);
    if (m.color === mover) {
      const forcing = !!m.captured || c.inCheck();
      // A quiet move that threatens mate is forcing too (the Greek gift's
      // Qh5, threatening Qh7 mate) — and the stretch ends on it.
      const mateThreat = !forcing && hasMateThreat(c.fen(), foe);
      if (!forcing && !mateThreat) break;
      follow.push(m.san);
      lastForcing = sans.length - 1;
      if (mateThreat) break;
    }
    if (c.isCheckmate()) { lastForcing = sans.length - 1; break; }
  }
  if (follow.length === 0) return null;
  const proved = sans.slice(0, lastForcing + 1);
  const end = load(fenBefore);
  if (!end) return null;
  for (const s of proved) end.move(s);
  const balance = (b: Chess): number => material(b, mover) - material(b, foe);
  const outcome: KingSacrifice['outcome'] | null = end.isCheckmate()
    ? 'mate'
    : balance(end) > balance(before)
      ? 'ahead'
      : balance(end) === balance(before)
        ? 'material'
      : (moverMate !== null && moverMate > 0) || (moverCp !== null && moverCp >= 150) ? 'attack' : null;
  if (!outcome) return null;
  // One capture back is a trade, not a sacrifice at the king: the material
  // outcomes need a forcing sequence of two moves or more.
  if ((outcome === 'material' || outcome === 'ahead') && follow.length < 2) return null;
  // What it opened.
  let opens: KingSacrifice['opens'] | null = null;
  if (rep.piece === 'k') opens = { kind: 'king-out', square: rep.to };
  else if (mv.captured === 'p' && Math.abs(fileOf(mv.to) - fileOf(king)) <= 1 && Math.abs(rankOf(mv.to) - rankOf(king)) <= 2) opens = { kind: 'shelter', square: mv.to };
  else {
    const ring = kingRing(king).filter((s) => s !== king);
    const wasDefender = ring.some((s) => bearsFrom(before, rep.piece, rep.from, s, rep.from));
    if (wasDefender && rep.piece !== 'p') opens = { kind: 'defender', piece: { square: rep.from, piece: rep.piece } };
  }
  if (!opens) return null;
  return { mover, san: mv.san, given: mv.piece, took: mv.captured ?? null, accepted: rep.san, opens, follow, line: proved, outcome, key: `king-sac:${mv.from}${mv.to}` };
}

export function kingSacrificeLine(s: KingSacrifice, student: Color): string {
  const mine = s.mover === student;
  const own = mine ? 'your' : 'their';
  const victim = mine ? 'their' : 'your';
  const opens = s.opens.kind === 'king-out'
    ? `to drag ${victim} king out to ${s.opens.square}`
    : s.opens.kind === 'shelter'
      ? `to rip away the pawn on ${s.opens.square} in front of ${victim} king`
      : `to pull ${victim} ${pieceWord(s.opens.piece)} away from the king`;
  // Black's moves carry the dots ("…Rxd6"), so whose move each is stays clear.
  const dot = (san: string, color: Color): string => (color === 'b' ? `…${san}` : san);
  const after = `After ${dot(s.accepted, other(s.mover))}, ${andList(s.follow.map((m) => dot(m, s.mover)))} ${s.follow.length === 1 ? 'follows' : 'follow'}`;
  const ends = s.outcome === 'mate'
    ? 'and it ends in mate'
    : s.outcome === 'ahead'
      ? (mine ? 'and you come out ahead in material' : 'and they come out ahead in material')
      : s.outcome === 'material'
      ? (mine ? 'and you win the material back' : 'and they win the material back')
      : (mine ? 'and the attack is worth more than the piece' : 'and their attack is worth more than the piece');
  return `${dot(s.san, s.mover)} gives up ${own} ${NAME[s.given]} ${opens}. ${after}, ${ends}.`;
}

export function kingSacrificeSquares(s: KingSacrifice): string[] {
  const opened = s.opens.kind === 'defender' ? s.opens.piece.square : s.opens.square;
  return [opened];
}

// ── THE STANDING READ ───────────────────────────────────────────────────────

export interface KingRead { text: string; squares: string[]; key: string }

/**
 * THE KINGS ON A BOARD AS IT STANDS, from the student's seat: the threats to
 * the student's own king first (a siege, a thin back rank, their loaded
 * discovery), then the same reads against theirs. `studentCp`: the engine's
 * score for the student, or null with no read (a siege is not said for a side
 * the engine has losing).
 */
export function kingReadsOn(fen: string, student: Color, studentCp: number | null): KingRead[] {
  const out: KingRead[] = [];
  for (const defender of [student, other(student)]) {
    const attacker = other(defender);
    const attackerCp = studentCp === null ? null : attacker === student ? studentCp : -studentCp;
    const s = kingSiege(fen, defender);
    if (s && siegeSpeaks(fen, s, attackerCp)) out.push({ text: siegeLine(s, student, fen), squares: siegeSquares(s), key: s.key });
    const b = backRankWeakness(fen, defender);
    if (b) out.push({ text: backRankLine(b, student, fen), squares: backRankSquares(b), key: b.key });
    const d = loadedDiscovery(fen, attacker);
    if (d && discoverySpeaks(d)) out.push({ text: discoveryLine(d, student, fen), squares: discoverySquares(d), key: d.key });
  }
  return out;
}

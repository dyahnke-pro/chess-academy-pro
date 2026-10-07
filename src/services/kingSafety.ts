// kingSafety — a board-true single-position king-exposure read (§9 "king-safety"
// signal, David 2026-08-26). Fires ONLY when a castled king has a materially
// broken pawn shelter AND the opponent actually has pieces aimed at that zone —
// both conditions, so a harmlessly-nicked shield (an advanced h-pawn with no
// attacker behind it) stays silent. Pure chess.js geometry, no engine (G0), no
// overstating: every claim (which pawns are gone, which enemy pieces bear on the
// king) is read straight off the board.
import { Chess, type Square } from 'chess.js';

type Sq = string;
const FILES = 'abcdefgh';

export interface KingExposure {
  kingSquare: Sq;
  /** How many of the three shelter pawns in front of the king are gone. */
  missingShield: number;
  /** Enemy heavy/bishop pieces that attack a square in the king zone. */
  attackerSquares: Sq[];
}

function kingSquareOf(game: Chess, color: 'w' | 'b'): Sq | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** The three shelter squares one rank in front of a castled king (king file ±1),
 *  or null when the king isn't on a castled square (so this never fires on a
 *  centralized / uncastled king). */
export function shelterSquares(kingSq: Sq, color: 'w' | 'b'): Sq[] | null {
  const f = FILES.indexOf(kingSq[0]);
  const rank = Number.parseInt(kingSq[1], 10);
  const homeRank = color === 'w' ? 1 : 8;
  if (rank !== homeRank) return null;            // not on the back rank → not castled-safe
  const isKingside = f >= 5;                      // f/g/h
  const isQueenside = f <= 2;                     // a/b/c
  if (!isKingside && !isQueenside) return null;   // still in the centre
  const shelterRank = color === 'w' ? 2 : 7;
  const out: Sq[] = [];
  for (const df of [-1, 0, 1]) {
    const nf = f + df;
    if (nf < 0 || nf > 7) continue;
    out.push(`${FILES[nf]}${shelterRank}`);
  }
  return out;
}

/** How many of the shelter pawns in front of `color`'s king stand guard — a
 *  pawn on its shelter square OR one step ahead of it (g6 / h6 still shelter;
 *  claim check 2026-09-30, item 95). The ONE shield count (one-coach P2,
 *  census group 12): `detectKingExposure` and `kingSafetyRead` both read it.
 *  Null when the king is not on a castled square. */
export function shieldCount(fen: string, color: 'w' | 'b'): { kingSquare: Sq; present: number; of: number } | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, color);
  if (!kingSq) return null;
  const shelter = shelterSquares(kingSq, color);
  if (!shelter) return null;
  const step = color === 'w' ? 1 : -1;
  const own = (sq: string): boolean => {
    const p = game.get(sq as Parameters<Chess['get']>[0]);
    return !!p && p.type === 'p' && p.color === color;
  };
  const present = shelter.filter((s) => own(s) || own(`${s[0]}${Number(s[1]) + step}`)).length;
  return { kingSquare: kingSq, present, of: shelter.length };
}

/** Shelter pawns `color` lost on one move — the ONE count behind "prising
 *  open their king's cover" and "loosening your own king's cover" (census
 *  group 12/6, 2026-10-07: the briefing read raw pawns-in-front, so 1.e4 was
 *  "loosening your own king's cover" with the king on e1). 0 when the king is
 *  in the centre or moved — a king with no shelter has none to lose. */
export function shieldLoss(fenBefore: string, fenAfter: string, color: 'w' | 'b'): number {
  const b0 = shieldCount(fenBefore, color);
  const a0 = shieldCount(fenAfter, color);
  if (!b0 || !a0 || b0.kingSquare !== a0.kingSquare) return 0;
  return Math.max(0, b0.present - a0.present);
}

/**
 * A king-exposure read, or null when the king is safe enough to say nothing.
 * Requires BOTH a broken shelter (≥2 of 3 shield pawns gone) AND ≥1 enemy
 * bishop/rook/queen bearing on the king zone.
 */
export function detectKingExposure(fen: string, studentColor: 'w' | 'b'): KingExposure | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, studentColor);
  if (!kingSq) return null;
  // NO QUEEN, NO SHELTER LECTURE (hand walk 2026-09-27, a rook endgame: "your
  // king's cover is thin — look after the king" while the king was the best
  // piece on the board). Without their queen there is no mating force to hide
  // from; the endgame king belongs in the fight, not behind pawns.
  const foe: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  if (!game.board().flat().some((c) => c?.type === 'q' && c.color === foe)) return null;
  const shelter = shelterSquares(kingSq, studentColor);
  if (!shelter) return null;

  const shield = shieldCount(fen, studentColor);
  const missing = shield ? shield.of - shield.present : 0;
  if (missing < 2) return null; // shelter still largely intact — no alarm

  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  const zone = [kingSq, ...shelter];
  const attackers = new Set<Sq>();
  for (const sq of zone) {
    let from: Sq[] = [];
    try { from = game.attackers(sq as Parameters<Chess['attackers']>[0], enemy); } catch { from = []; }
    for (const a of from) {
      const p = game.get(a as Parameters<Chess['get']>[0]);
      if (p && (p.type === 'q' || p.type === 'r' || p.type === 'b')) attackers.add(a);
    }
  }
  if (attackers.size === 0) return null; // broken but unpressured — stay quiet

  return { kingSquare: kingSq, missingShield: missing, attackerSquares: [...attackers] };
}

export interface CentralKingDanger {
  kingSquare: Sq;
  /** The enemy heavy piece aimed down the king's file. */
  aimedFrom: Sq;
  /** The central pawn contact that, once it opens, unmasks the file. */
  tensionSquare: Sq;
  /** How the king gets castled from here (at most one piece in the way). */
  route: CastleRoute;
}

/** Is there a friendly pawn on files c–f in the centre that is in direct
 *  capturing contact with an enemy pawn (either side can crack it open)? */
function centralTensionSquare(game: Chess, studentColor: 'w' | 'b'): Sq | null {
  const dir = studentColor === 'w' ? 1 : -1;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.type !== 'p' || cell.color !== studentColor) continue;
      const f = FILES.indexOf(cell.square[0]);
      const r = Number.parseInt(cell.square[1], 10) - 1;
      if (f < 2 || f > 5) continue; // c–f only (the centre)
      for (const df of [-1, 1]) {
        const nf = f + df; const nr = r + dir;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const t = `${FILES[nf]}${nr + 1}`;
        const p = game.get(t as Parameters<Chess['get']>[0]);
        if (p && p.type === 'p' && p.color !== studentColor) return cell.square; // mutual pawn contact
      }
    }
  }
  return null;
}

/**
 * The delayed-castling danger (David 2026-08-27): the student's king is still
 * in the CENTRE (d/e/f file, home rank — not castled to g/c), the centre can be
 * cracked open (a live central pawn tension), AND the opponent already has a
 * rook or queen aimed down the king's own file. Opening the centre would unmask
 * that piece onto the king — the "castle NOW" moment. Both the tension and the
 * aligned enemy heavy are required, so it never fires on a safely-locked centre
 * or a calm position where the king will just castle next move.
 */
export function detectCentralKingDanger(fen: string, studentColor: 'w' | 'b'): CentralKingDanger | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, studentColor);
  if (!kingSq) return null;
  const kf = FILES.indexOf(kingSq[0]);
  const homeRank = studentColor === 'w' ? 1 : 8;
  if (Number.parseInt(kingSq[1], 10) !== homeRank) return null; // marched-up king is another story
  if (kf < 3 || kf > 5) return null; // must be central: d/e/f (excludes castled g / c)
  // The remedy is "get castled" — so castling must still exist (walk 900,
  // 27…Ba4+: the king had already walked to f8 and the coach said it anyway).
  const rights = game.getCastlingRights(studentColor);
  if (!rights.k && !rights.q) return null;
  // The remedy has to be REACHABLE: "get castled" with the kingside right gone
  // and the c8-bishop and d8-queen both standing in the long castle's way is
  // advice the student cannot follow for three moves (fresh-game walk
  // 2026-09-27, Carlsen–Topalov, twice).
  const route = castleRoute(fen, studentColor);
  if (!route || route.blockers.length > 1) return null;

  const tension = centralTensionSquare(game, studentColor);
  if (!tension) return null; // centre is locked / no contact → no imminent opening

  // An enemy rook/queen on the king's OWN file (any rank) — the piece a crack
  // would unmask. This is the tight, board-true gate that filters calm lines.
  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  let aimedFrom: Sq | null = null;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== enemy) continue;
      if ((cell.type === 'r' || cell.type === 'q') && FILES.indexOf(cell.square[0]) === kf) { aimedFrom = cell.square; break; }
    }
    if (aimedFrom) break;
  }
  if (!aimedFrom) return null;

  return { kingSquare: kingSq, aimedFrom, tensionSquare: tension, route };
}

export function centralKingDangerClause(d: CentralKingDanger): string {
  return `Your king is still in the centre and the position is about to crack open — they already have a piece aimed down the ${d.kingSquare[0]}-file. ${castleAdvice(d.route)}`;
}

/** "Get castled", or the one piece in the way of it. */
export function castleAdvice(route: CastleRoute): string {
  if (route.blockers.length === 0) return 'Get castled before the centre opens.';
  const b = route.blockers[0];
  return `Move your ${PIECE_WORD[b.piece] ?? 'piece'} on ${b.square}, then castle ${route.side} before the centre opens.`;
}

const PIECE_WORD: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king', p: 'pawn' };

export interface CastleRoute {
  side: 'short' | 'long';
  /** Own pieces standing between king and rook — each is a move to spend. */
  blockers: Array<{ square: string; piece: string }>;
}

/** The castle still on the table with the fewest pieces in its way, or null
 *  when both rights are gone. The ONE answer to "can this king castle soon". */
export function castleRoute(fen: string, color: 'w' | 'b'): CastleRoute | null {
  let b: Chess;
  try { b = new Chess(fen); } catch { return null; }
  const rights = fen.split(' ')[2] ?? '-';
  const r = color === 'w' ? '1' : '8';
  const inWay = (files: readonly string[]): Array<{ square: string; piece: string }> => files
    .map((f) => ({ square: `${f}${r}`, cell: b.get(`${f}${r}` as never) }))
    .filter((x) => !!x.cell)
    .map((x) => ({ square: x.square, piece: (x.cell as { type: string }).type }));
  const routes: CastleRoute[] = [];
  if (rights.includes(color === 'w' ? 'K' : 'k')) routes.push({ side: 'short', blockers: inWay(['f', 'g']) });
  if (rights.includes(color === 'w' ? 'Q' : 'q')) routes.push({ side: 'long', blockers: inWay(['b', 'c', 'd']) });
  if (routes.length === 0) return null;
  return routes.sort((x, y) => x.blockers.length - y.blockers.length)[0];
}

/** The spoken clause for a king exposure, board-true. */
export function kingExposureClause(k: KingExposure): string {
  const n = k.missingShield === 3 ? 'all three' : `${k.missingShield}`;
  return `Your king's cover is thin — ${n} of the pawns in front of it are gone and they already have pieces aimed at it. Look after the king before you throw more forces forward.`;
}

/** The enemy king's square + its on-board neighbours — where an attack lands. */
function kingZoneSquares(kingSq: string): Square[] {
  const f = kingSq.charCodeAt(0) - 97;
  const r = Number(kingSq[1]);
  const out: Square[] = [];
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      const nf = f + df;
      const nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 1 || nr > 8) continue;
      out.push(`${String.fromCharCode(97 + nf)}${nr}` as Square);
    }
  }
  return out;
}

/** The unit direction [df,dr] from a piece's OWN king through the piece, when the
 *  piece is ABSOLUTELY pinned (removing it exposes the king to an enemy slider
 *  along that exact line); null when the piece is not absolutely pinned. Used to
 *  refuse counting a pinned piece as an attacker/defender on a king-zone square
 *  it cannot legally act toward — the pin-blind `attackers()` count would flip
 *  "you have a real attack, press it" on a losing attack (deep-dive A#7). */
function absolutePinRay(c: Chess, sq: Square): [number, number] | null {
  const p = c.get(sq);
  if (!p || p.type === 'k') return null;
  const me = p.color;
  const them = me === 'w' ? 'b' : 'w';
  let king: Square | null = null;
  for (const row of c.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === me) king = cell.square;
  if (!king) return null;
  const kf = king.charCodeAt(0) - 97, kr = Number(king[1]);
  const sf = sq.charCodeAt(0) - 97, sr = Number(sq[1]);
  const df = sf - kf, dr = sr - kr;
  const collinear = (df === 0 && dr !== 0) || (dr === 0 && df !== 0) || (Math.abs(df) === Math.abs(dr) && df !== 0);
  if (!collinear) return null;
  const ud: [number, number] = [Math.sign(df), Math.sign(dr)];
  let test: Chess;
  try { test = new Chess(c.fen()); test.remove(sq); } catch { return null; }
  let f = kf + ud[0], r = kr + ud[1];
  while (f >= 0 && f <= 7 && r >= 1 && r <= 8) {
    const s = `${String.fromCharCode(97 + f)}${r}` as Square;
    const hit = test.get(s);
    if (hit) {
      if (hit.color !== them) return null; // first piece past the pinned one is friendly → no pin
      const diagonal = Math.abs(ud[0]) === 1 && Math.abs(ud[1]) === 1;
      const straight = ud[0] === 0 || ud[1] === 0;
      if ((diagonal && (hit.type === 'b' || hit.type === 'q')) || (straight && (hit.type === 'r' || hit.type === 'q'))) return ud;
      return null; // an enemy piece, but not one that pins along this line
    }
    f += ud[0]; r += ud[1];
  }
  return null;
}

/** Does the piece on `pieceSq` genuinely bear on `targetSq` — i.e. it attacks it
 *  AND, if absolutely pinned, `targetSq` lies on its pin ray (the only squares a
 *  pinned piece can still act toward)? Caller has already confirmed the attack. */
function bearsOnSquare(c: Chess, pieceSq: Square, targetSq: Square): boolean {
  const ray = absolutePinRay(c, pieceSq);
  if (!ray) return true;
  const df = (targetSq.charCodeAt(0) - 97) - (pieceSq.charCodeAt(0) - 97);
  const dr = Number(targetSq[1]) - Number(pieceSq[1]);
  const ud: [number, number] = [Math.sign(df), Math.sign(dr)];
  return (ud[0] === ray[0] && ud[1] === ray[1]) || (ud[0] === -ray[0] && ud[1] === -ray[1]);
}

/**
 * The attack on `me`'s ENEMY king, counted: `me`'s pieces bearing on the king
 * and its neighbours against the enemy pieces defending them, pin-aware (a
 * piece pinned to its own king counts only along its pin ray). Kings are not
 * counted. One counter for chat's "do I have an attack?" and the Learn
 * king-attack computer. Null when there is no enemy king.
 */
export function countKingAttack(c: Chess, me: 'w' | 'b'): { attackers: Set<string>; defenders: Set<string>; king: string } | null {
  const them: 'w' | 'b' = me === 'w' ? 'b' : 'w';
  let ek: Square | null = null;
  for (const row of c.board()) for (const cell of row) if (cell && cell.type === 'k' && cell.color === them) ek = cell.square;
  if (!ek) return null;
  const attackers = new Set<string>();
  const defenders = new Set<string>();
  for (const sq of kingZoneSquares(ek)) {
    try {
      for (const a of c.attackers(sq, me)) { const p = c.get(a); if (p && p.type !== 'k' && bearsOnSquare(c, a, sq)) attackers.add(a); }
      for (const d of c.attackers(sq, them)) { const p = c.get(d); if (p && p.type !== 'k' && bearsOnSquare(c, d, sq)) defenders.add(d); }
    } catch { /* skip a bad square */ }
  }
  return { attackers, defenders, king: ek };
}

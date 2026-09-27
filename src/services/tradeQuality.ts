/**
 * TRADE QUALITY — how well a trade serves the side that makes it (David
 * 2026-09-27: "I want teaching around trades … how well the trade benefits the
 * user", and on "their rook on f3 is well placed": "maybe a phrase about trying
 * to trade off a bad piece for their best one").
 *
 * Points say a knight for a bishop is even. The board says otherwise: the piece
 * you give and the piece you get are not the same piece. This computer reads a
 * roughly-even capture (minor for minor, rook for rook, queen for queen) and
 * judges it from the MOVER's side, from facts already computed elsewhere:
 *  - piece quality (`findPieceQuality`: outpost knight, rook on an open file or
 *    the seventh = good; bad bishop, knight on the rim = bad);
 *  - king defence (the piece covers two or more squares next to its own king);
 *  - the bishop pair (given up for a knight while the other side has lost it);
 *  - material (ahead → every trade helps; behind → trades help them).
 * Good and bad signals on one trade cancel — a mixed trade is not a lesson, so
 * it stays silent. Both seats are read; the clause is worded from the
 * student's side ("you" / "they").
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { findPieceQuality, legalSeeGain, type PieceQualityNote } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';

const VAL: Readonly<Record<string, number>> = MATERIAL_VALUE;
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export type TradeCall = 'good' | 'bad' | 'ahead' | 'behind';

export interface TradeRead {
  /** From the MOVER's side. */
  call: TradeCall;
  /** Spoken clause, worded from the student's seat. */
  text: string;
  squares: string[];
  /** Say-once key: the call and the reason, never the squares' prose. */
  key: string;
  moverIsStudent: boolean;
}

function materialFor(chess: Chess, color: Color): number {
  let own = 0; let theirs = 0;
  for (const cell of chess.board().flat()) {
    if (!cell) continue;
    if (cell.color === color) own += VAL[cell.type]; else theirs += VAL[cell.type];
  }
  return own - theirs;
}

/** Squares next to `color`'s king that the piece on `sq` covers — counted
 *  only while the king is really under fire: the enemy queen is on and at
 *  least one enemy piece already aims at the king's zone. A rook "guarding the
 *  king" in a queenless ending, or a bishop covering an e1 king nobody
 *  attacks, is not a defender worth naming (hand read 2026-09-27). */
function kingGuardCount(chess: Chess, sq: Square, color: Color): number {
  const king = chess.board().flat().find((c) => c && c.type === 'k' && c.color === color);
  if (!king) return 0;
  const enemy: Color = color === 'w' ? 'b' : 'w';
  if (!chess.board().flat().some((c) => c && c.type === 'q' && c.color === enemy)) return 0;
  const kf = king.square.charCodeAt(0); const kr = Number(king.square[1]);
  let n = 0; let pressed = false;
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      if (!df && !dr) continue;
      const f = kf + df; const r = kr + dr;
      if (f < 97 || f > 104 || r < 1 || r > 8) continue;
      const target = `${String.fromCharCode(f)}${r}` as Square;
      if (chess.attackers(target, color).includes(sq)) n += 1;
      if (chess.attackers(target, enemy).length > 0) pressed = true;
    }
  }
  return pressed ? n : 0;
}

/** Does taking back on `sq` cost the recapturer structure — every legal
 *  recapture is a pawn that ends up doubled, or one pulled off the king's
 *  cover? Read on the board after the trade move, recapturer to move. */
function recaptureDamage(after: Chess, sq: Square): 'doubled' | 'isolated' | 'king-cover' | null {
  const caps = after.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (caps.length === 0 || caps.some((m) => m.piece !== 'p')) return null;
  const side = after.turn();
  const other: Color = side === 'w' ? 'b' : 'w';
  const king = after.board().flat().find((c) => c && c.type === 'k' && c.color === side);
  const queensOn = after.board().flat().some((c) => c && c.type === 'q' && c.color === other);
  let kingCover = queensOn; let doubled = true; let isolated = true;
  for (const m of caps) {
    after.move(m);
    const pawns = after.board().flat().flatMap((c) => (c && c.type === 'p' && c.color === side ? [c] : []));
    after.undo();
    const file = m.to.charCodeAt(0);
    if (pawns.filter((p) => p.square.charCodeAt(0) === file).length < 2) doubled = false;
    if (pawns.some((p) => Math.abs(p.square.charCodeAt(0) - file) === 1)) isolated = false;
    if (!king || Math.abs(m.from.charCodeAt(0) - king.square.charCodeAt(0)) > 1) kingCover = false;
  }
  if (doubled) return 'doubled';
  if (isolated) return 'isolated';
  if (kingCover) return 'king-cover';
  return null;
}

function noteAt(notes: readonly PieceQualityNote[], sq: string): PieceQualityNote | null {
  return notes.find((n) => n.square === sq) ?? null;
}

/** Short spoken name for a quality note ("on its outpost", "on the open file"). */
function qualityPhrase(n: PieceQualityNote): string {
  switch (n.kind) {
    case 'outpost': return 'on its outpost';
    case 'open-file': return 'on the open file';
    case 'semi-open-file': return 'on the half-open file';
    case 'seventh-rank': return 'on the seventh rank';
    case 'bad-bishop': return 'hemmed in behind its own pawns';
    case 'rim-knight': return 'stuck on the rim';
    default: return '';
  }
}

function bishopCount(chess: Chess, color: Color): number {
  return chess.board().flat().filter((c) => c && c.type === 'b' && c.color === color).length;
}

/**
 * Judge a capture as a trade. Null when the move is not a roughly-even trade
 * (a pawn capture, a free piece, a sacrifice) or when the trade carries no
 * lesson (neutral, or good and bad signals at once).
 */
export function readTrade(
  fenBefore: string,
  san: string,
  studentColor: Color,
  /** The engine's cost of this move for its mover, in centipawns, when known.
   *  The verdict never contradicts the engine: "poor" needs a real cost (≥30),
   *  "good" needs the move to be sound (<100). Null = no read, board only. */
  cpLoss: number | null = null,
): TradeRead | null {
  let before: Chess;
  try { before = new Chess(fenBefore); } catch { return null; }
  let mv;
  try { mv = before.move(san.replace(/[?!]+$/, '')); } catch { return null; }
  if (!mv || !mv.captured || mv.piece === 'p' || mv.captured === 'p' || mv.piece === 'k') return null;
  // Roughly even: minor for minor, rook for rook, queen for queen.
  if (Math.abs(VAL[mv.piece] - VAL[mv.captured]) > 0) return null;
  const after = before; // already played
  // It is a TRADE only if they can take back — otherwise it simply wins a piece.
  if (legalSeeGain(after.fen(), mv.to) <= 0) return null;

  const mover = mv.color;
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const board0 = new Chess(fenBefore);
  const notes = findPieceQuality(fenBefore);
  const given = noteAt(notes, mv.from);
  const got = noteAt(notes, mv.to);
  const moverIsStudent = mover === studentColor;
  const you = moverIsStudent;
  const yours = (w: string): string => (you ? `your ${w}` : `their ${w}`);
  const theirs = (w: string): string => (you ? `their ${w}` : `your ${w}`);

  const good: Array<{ why: string; key: string; sq: string[] }> = [];
  const bad: Array<{ why: string; key: string; sq: string[] }> = [];

  if (got && got.quality === 'good') {
    good.push({ why: `it takes off ${theirs('best piece')}, the ${NAME[mv.captured]} ${qualityPhrase(got)}`, key: 'best-taken', sq: [mv.to] });
  }
  if (given && given.quality === 'bad') {
    good.push({ why: `it swaps off ${yours(NAME[mv.piece])}, ${qualityPhrase(given)}`, key: 'bad-swapped', sq: [mv.from] });
  }
  if (kingGuardCount(board0, mv.to, enemy) >= 2) {
    good.push({ why: `it removes a defender of ${theirs('king')}`, key: 'guard-removed', sq: [mv.to] });
  }
  if (given && given.quality === 'good') {
    bad.push({ why: `it gives up ${yours('best piece')}, the ${NAME[mv.piece]} ${qualityPhrase(given)}`, key: 'best-given', sq: [mv.from] });
  }
  if (kingGuardCount(board0, mv.from, mover) >= 2) {
    bad.push({ why: `it gives up a defender of ${yours('king')}`, key: 'guard-given', sq: [mv.from] });
  }
  if (mv.piece === 'b' && mv.captured === 'n' && bishopCount(board0, mover) === 2 && bishopCount(board0, enemy) < 2) {
    bad.push({ why: `it gives up the bishop pair`, key: 'pair-given', sq: [mv.from] });
  }
  const damage = recaptureDamage(new Chess(after.fen()), mv.to);
  if (damage === 'doubled') good.push({ why: `taking back doubles ${theirs('pawns')}`, key: 'doubles', sq: [mv.to] });
  if (damage === 'isolated') good.push({ why: `taking back leaves ${theirs('pawn')} on ${mv.to} isolated`, key: 'isolates', sq: [mv.to] });
  if (damage === 'king-cover') good.push({ why: `taking back pulls a pawn off ${theirs("king's cover")}`, key: 'cover', sq: [mv.to] });
  if (got && got.quality === 'bad' && !(given && given.quality === 'bad')) {
    bad.push({ why: `it takes off ${theirs(NAME[mv.captured])}, which was ${qualityPhrase(got)} and doing little`, key: 'bad-taken', sq: [mv.to] });
  }

  // THE MATERIAL COUNT IS PART OF THE VERDICT (hand walk 2026-09-27, the
  // Najdorf: after …Nxe5 won a pawn, "their Nxe5 is a good trade for them —
  // taking back doubles your pawns" — while you stayed a clean pawn up and
  // every trade brought your won ending closer). A structural gain for the
  // side that is behind is weighed against the count, never read alone.
  // Structure is the only thing they got (doubled / isolated / cover), and a
  // bent pawn does not outweigh a pawn more heading into a simpler position.
  // A trade that removes their BEST piece still stands on its own.
  const edge0 = materialFor(board0, mover);
  const STRUCTURAL = new Set(['doubles', 'isolates', 'cover']);
  if (edge0 <= -1 && good.length && !bad.length && good.every((g) => STRUCTURAL.has(g.key))) {
    // Say BOTH halves — the dent and the count — because that weighing is the
    // lesson (Naroditsky at this exact move: "you take, inviting the trade —
    // White can't exploit it").
    const pawns = -edge0 === 1 ? 'a pawn' : `${-edge0} points`;
    const dent = good[0].why.replace(/^taking back /, '');
    return {
      call: 'behind',
      text: you
        // Said while the recapture is still pending, so the count is framed as
        // what holds ONCE it lands — never as a standing fact of this board.
        ? `${mv.san} ${dent}, but once they take back you're still ${pawns} behind — and trades help the side with more material.`
        : `Their ${mv.san} ${dent}, but once you take back you're still ${pawns} ahead — and every trade brings your ending closer.`,
      squares: good[0].sq, key: 'trade:behind-structure', moverIsStudent,
    };
  }

  const subject = you ? mv.san : `Their ${mv.san}`;
  const forWhom = you ? '' : ' for them';
  const sound = cpLoss === null || cpLoss < 100;
  const costly = cpLoss === null || cpLoss >= 30;
  if (good.length && !bad.length && sound) {
    const g = good[0];
    return { call: 'good', text: `${subject} is a good trade${forWhom} — ${g.why}.`, squares: g.sq, key: `trade:good:${g.key}`, moverIsStudent };
  }
  if (bad.length && !good.length && costly) {
    const b = bad[0];
    return { call: 'bad', text: `${subject} is a poor trade${forWhom} — ${b.why}.`, squares: b.sq, key: `trade:bad:${b.key}`, moverIsStudent };
  }
  if (good.length || bad.length) return null; // mixed — not a lesson
  // Neutral pieces: the material count decides who the trade helps.
  const edge = edge0;
  if (edge >= 2) {
    return {
      call: 'ahead',
      text: you
        ? `${mv.san} trades pieces while you're ahead — every trade brings a won ending closer.`
        : `Their ${mv.san} trades pieces while they're ahead — that helps them.`,
      squares: [mv.to], key: 'trade:ahead', moverIsStudent,
    };
  }
  if (edge <= -2) {
    return {
      call: 'behind',
      text: you
        ? `${mv.san} trades pieces while you're behind — trades help the side with more material, so keep pieces on.`
        : `Their ${mv.san} trades pieces while they're behind — that helps you.`,
      squares: [mv.to], key: 'trade:behind', moverIsStudent,
    };
  }
  return null;
}

export interface TradeTarget {
  text: string;
  squares: string[];
  key: string;
}

/**
 * THEIR BEST PIECE, YOUR WORST — the trade worth looking for. Speaks only when
 * the student has a piece the quality read calls bad, the opponent has one it
 * calls good, they are the same value class (minor/minor, rook/rook), and the
 * bad piece can capture the good one now or after one move. A principle with
 * no route to it is not advice.
 */
export function findTradeTarget(fen: string, studentColor: Color): TradeTarget | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const notes = findPieceQuality(fen);
  const worst = notes.filter((n) => n.color === studentColor && n.quality === 'bad');
  const best = notes.filter((n) => n.color !== studentColor && n.quality === 'good');
  for (const w of worst) {
    for (const b of best) {
      if (VAL[w.piece] !== VAL[b.piece]) continue;
      if (!canReach(chess, w.square, b.square, studentColor)) continue;
      return {
        text: `Their ${NAME[b.piece]} on ${b.square} is their best piece, and your ${NAME[w.piece]} on ${w.square} is your worst — look for a way to trade them.`,
        squares: [b.square, w.square],
        key: `trade-target:${w.square}:${b.square}`,
      };
    }
  }
  return null;
}

/** Can the piece on `from` capture on `target` now, or after one quiet move? */
function canReach(chess: Chess, from: Square, target: Square, color: Color): boolean {
  const fenParts = chess.fen().split(' ');
  fenParts[1] = color; fenParts[3] = '-';
  let c: Chess;
  try { c = new Chess(fenParts.join(' ')); } catch { return false; }
  if (c.attackers(target, color).includes(from)) return true;
  for (const m of c.moves({ square: from, verbose: true })) {
    if (m.captured) continue;
    c.move(m);
    const hits = c.attackers(target, color).includes(m.to);
    c.undo();
    if (hits) return true;
  }
  return false;
}

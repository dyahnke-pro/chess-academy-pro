// tradeKept — AN EVEN TRADE ON OFFER, AND THE REASON NOT TO TAKE IT (Danya
// speedruns: kYbh 21.Bf3 "down material, White retreats instead of trading
// bishops, keeping pieces on"; -Am8 23.Qh6 "don't take on e7: don't trade
// without a compelling reason"; QUk 8.Nc3 "don't take on h6 … b2 would be left
// weak"; 4T9 8.Nd4 "Nd4 threatens nothing, so don't take").
//
// The board before a quiet move: the mover could take an enemy piece of the
// same value for an even swap (signed legal SEE 0, a retake on the square).
// The move played is in the engine's lines and sound, and the trade scores no
// better (it is in the lines below the move, or not in them at all). It is
// said only WITH a reason the board proves:
//  · guard — the piece that would trade guards a man of the mover's their
//    piece attacks; after the trade and the retake that man is loose;
//  · pressure — the piece bears on two or more squares next to their king,
//    the piece it would take on none;
//  · behind — the mover is down material, and trades help the side ahead;
//  · no-threat — their last move put the piece there, and it threatens
//    nothing of the mover's.
// No reason, nothing said: "keep the tension" alone is a slogan. PURE: chess.js
// and the position reader.
import { openSentence } from '../utils/openSentence';
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js';
import { signedLegalSeeFor, legalSeeGainFor } from './positionReadingService';
import { settledLeadFor, type LastMove } from './material';
import { computeMustDefend } from './threatOut';
import { readTrade } from './tradeQuality';
import { MATERIAL_VALUE } from './pieceValues';
import type { AnalysisLine } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { other, PIECE_WORD, scoreFor, tradeSeat, uciOf } from './tradeWords';

/** The move played is within this of the engine's best for its mover … */
const SOUND_CP = 50;
/** … or still this far ahead and within `DECIDED_SLACK_CP`. */
const DECIDED_CP = 300;
const DECIDED_SLACK_CP = 100;
/** Lines the engine must show for a trade absent from them to count as worse. */
const MIN_LINES = 3;

export type KeptReason =
  | { kind: 'guard'; guarded: { piece: PieceSymbol; square: Square }; by: { piece: PieceSymbol; square: Square } }
  | { kind: 'pressure'; king: Square; squares: Square[] }
  | { kind: 'behind' }
  | { kind: 'no-threat' };

export interface TradeKept {
  /** The trade not made. */
  trade: { piece: PieceSymbol; from: Square; to: Square; captured: PieceSymbol };
  reason: KeptReason;
  /** The move played took the trading piece itself out of the trade. */
  steppedAway: boolean;
}

export interface TradeKeptInput {
  fenBefore: string;
  san: string;
  /** The engine's lines from `fenBefore` (the mover to move). */
  before: readonly AnalysisLine[];
  /** The move that led to `fenBefore` (for the settled count), or null. */
  priorMove: LastMove | null;
  /** Their last move, when the surface knows it. */
  theirLast: { fenBefore: string; san: string } | null;
}

const minor = (t: PieceSymbol): boolean => t === 'n' || t === 'b';

/** The squares next to `king` (and its own) that the piece on `sq` attacks. */
function kingSquaresHit(c: Chess, sq: Square, king: Square, by: 'w' | 'b'): Square[] {
  const out: Square[] = [];
  const kf = king.charCodeAt(0); const kr = Number(king[1]);
  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      const f = kf + df; const r = kr + dr;
      if (f < 97 || f > 104 || r < 1 || r > 8) continue;
      const t = `${String.fromCharCode(f)}${r}` as Square;
      if (c.attackers(t, by).includes(sq)) out.push(t);
    }
  }
  return out;
}

function kingOf(c: Chess, color: 'w' | 'b'): Square | null {
  return c.board().flat().find((x) => x && x.type === 'k' && x.color === color)?.square ?? null;
}

/** The reason to keep the trade `cap` off the board, or null. */
function reasonFor(input: TradeKeptInput, c: Chess, cap: Move): KeptReason | null {
  const me = cap.color;
  const them = other(me);
  // GUARD: a man of the mover's their piece attacks, held by the trading piece.
  {
    const b = new Chess(input.fenBefore);
    for (const cell of b.board().flat()) {
      if (!cell || cell.color !== me || cell.type === 'k' || cell.square === cap.from) continue;
      if (!b.isAttacked(cell.square, them)) continue;
      if (!b.attackers(cell.square, me).includes(cap.from)) continue;
      if (legalSeeGainFor(input.fenBefore, cell.square, them) > 0) continue;
      const t = new Chess(input.fenBefore);
      t.move(cap);
      const retakes = t.moves({ verbose: true }).filter((m) => m.to === cap.to && m.captured);
      if (retakes.length === 0) continue;
      const retake = [...retakes].sort((x, y) => (MATERIAL_VALUE[x.piece] ?? 0) - (MATERIAL_VALUE[y.piece] ?? 0))[0];
      t.move(retake);
      // Loose after it: attacked, and won by their capture.
      if (!t.isAttacked(cell.square, them)) continue;
      if (legalSeeGainFor(t.fen(), cell.square, them) <= 0) continue;
      const attackers = b.attackers(cell.square, them).map((s) => ({ square: s, piece: b.get(s)?.type as PieceSymbol }))
        .sort((x, y) => (MATERIAL_VALUE[x.piece] ?? 0) - (MATERIAL_VALUE[y.piece] ?? 0));
      if (attackers.length === 0) continue;
      const by = attackers[0];
      return { kind: 'guard', guarded: { piece: cell.type, square: cell.square }, by };
    }
  }
  // PRESSURE: the trading piece bears on their king; the piece it takes does not.
  {
    const king = kingOf(c, them);
    if (king && cap.piece !== 'q') {
      // The square it would take on is not pressure on the king: hitting it is
      // only the attack on the piece there.
      const mine = kingSquaresHit(c, cap.from, king, me).filter((sq) => sq !== cap.to);
      const theirs = kingSquaresHit(c, cap.to, kingOf(c, me) ?? king, them);
      if (mine.length >= 2 && theirs.length === 0) return { kind: 'pressure', king, squares: mine };
    }
  }
  // BEHIND: down material, trades help the side that is ahead.
  if (settledLeadFor(input.fenBefore, me, input.priorMove) <= -1) return { kind: 'behind' };
  // NO-THREAT: their last move put the piece there and threatens nothing —
  // with the count level enough that trading is not the plan (two or more
  // ahead, trades help: `readTrade`'s own bar), and the trade itself carrying
  // no gain of its own (`readTrade`: their best piece, a king's defender…).
  if (input.theirLast && settledLeadFor(input.fenBefore, me, input.priorMove) < 2) {
    try {
      const m = new Chess(input.theirLast.fenBefore).move(input.theirLast.san);
      // A retake is no offer: the piece came there by taking.
      const offered = !m.captured && m.to === cap.to;
      // The trade's cost from the lines: its own line's score, or — when the
      // engine did not list it — at least the gap to its last listed line.
      const capLine = input.before.find((l) => l.moves[0] === uciOf(cap));
      const best = input.before.length ? scoreFor(input.before[0], me) : null;
      const capCost = best === null ? null : Math.max(0, best - scoreFor(capLine ?? input.before[input.before.length - 1], me));
      const gain = readTrade(input.fenBefore, cap.san, me, capCost, input.priorMove, true);
      if (offered && gain?.call !== 'good' && computeMustDefend(input.fenBefore, me).pieces.length === 0) return { kind: 'no-threat' };
    } catch { /* not a move on that board */ }
  }
  return null;
}

/** The even trade the move played kept off the board, with its reason. */
export function tradeKeptAt(input: TradeKeptInput): TradeKept | null {
  const { fenBefore, san, before } = input;
  if (before.length < MIN_LINES) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  if (c.inCheck()) return null;
  const me = c.turn();
  let played: Move;
  try { played = new Chess(fenBefore).move(san); } catch { return null; }
  if (played.captured) return null;
  // A move that itself offers a trade, or hits a piece worth as much, is not
  // keeping the pieces on (S-ZY 12…Bb7 aims at the c6 knight to trade it).
  {
    const a = new Chess(fenBefore);
    a.move(played);
    for (const cell of a.board().flat()) {
      if (!cell || cell.color === me || cell.type === 'p' || cell.type === 'k') continue;
      if (a.attackers(cell.square, me).includes(played.to) && (MATERIAL_VALUE[cell.type] ?? 0) >= (MATERIAL_VALUE[played.piece] ?? 0)) return null;
    }
  }
  const pu = uciOf(played);
  const best = scoreFor(before[0], me);
  const pl = before.find((l) => l.moves[0] === pu);
  if (!pl) return null;
  const ps = scoreFor(pl, me);
  if (!(ps >= best - SOUND_CP || (ps >= DECIDED_CP && ps >= best - DECIDED_SLACK_CP))) return null;
  const caps = c.moves({ verbose: true }).filter((m) => m.captured && m.piece !== 'p' && m.piece !== 'k' && m.captured !== 'p'
    && (m.piece === m.captured || (minor(m.piece) && minor(m.captured))));
  for (const cap of caps) {
    // Even: they can take back, and the exchange nets nothing either way.
    if (signedLegalSeeFor(fenBefore, cap.to, me) !== 0) continue;
    const t = new Chess(fenBefore);
    t.move(cap);
    if (!t.moves({ verbose: true }).some((m) => m.to === cap.to && m.captured)) continue;
    // The engine: the trade scores no better than the move played.
    const cl = before.find((l) => l.moves[0] === uciOf(cap));
    if (cl && scoreFor(cl, me) >= ps) continue;
    const reason = reasonFor(input, c, cap);
    if (!reason) continue;
    // A piece that stepped away is not "kept" for its guard or its pressure,
    // and a trade it walked out of was no offer it ignored.
    const steppedAway = played.from === cap.from;
    if (steppedAway && reason.kind !== 'behind') continue;
    // A guarded man the move itself takes away is guarded no more.
    if (reason.kind === 'guard' && played.from === reason.guarded.square) continue;
    // A move that attacks the offered piece keeps no trade off the board: it
    // kicks it, or piles on so that taking now wins it (colle800 15.Qg4: the
    // queen joins the c1 bishop on g5, and "taking on g5 would trade bishops"
    // was said beside "taking on g5 now wins a piece").
    {
      const a = new Chess(fenBefore);
      a.move(played);
      if (a.attackers(cap.to, me).includes(played.to)) continue;
    }
    return { trade: { piece: cap.piece, from: cap.from, to: cap.to, captured: cap.captured as PieceSymbol }, reason, steppedAway };
  }
  return null;
}

/** Said from the mover's seat, one idea a sentence, rotated on the board. */
export function tradeKeptLine(k: TradeKept, moverIsStudent: boolean, fen: string): string {
  const s = tradeSeat(moverIsStudent);
  const Own = openSentence(s.own);
  const p = PIECE_WORD[k.trade.piece];
  const x = PIECE_WORD[k.trade.captured];
  const what = k.trade.piece === k.trade.captured ? `${p}s` : `${p} for ${x}`;
  const key = stemKeyOf(`${fen}|kept|${k.trade.from}${k.trade.to}`);
  const r = k.reason;
  switch (r.kind) {
    case 'guard': {
      const g = `${PIECE_WORD[r.guarded.piece]} on ${r.guarded.square}`;
      const by = `${s.opp} ${PIECE_WORD[r.by.piece]} on ${r.by.square}`;
      return rotateStem([
        `${Own} ${p} on ${k.trade.from} also guards the ${g} against ${by}. Trade it on ${k.trade.to}, and that ${PIECE_WORD[r.guarded.piece]} is left loose.`,
        `Taking on ${k.trade.to} was there, but the ${p} on ${k.trade.from} is the guard of the ${g}. After the trade, ${by} takes it.`,
      ], key);
    }
    case 'pressure':
      return rotateStem([
        `${Own} ${p} on ${k.trade.from} is pressing ${s.opp} king, hitting ${r.squares.join(' and ')}. Trading it on ${k.trade.to} would let that pressure go, so it stays.`,
        `Taking on ${k.trade.to} was there, but the ${p} on ${k.trade.from} bears down on the king. ${openSentence(s.opp)} ${x} on ${k.trade.to} does nothing like that, so there's no reason to swap.`,
      ], key);
    case 'behind':
      return k.steppedAway
        ? rotateStem([
          `${Own} ${p} steps out of the trade on ${k.trade.to}. Down material, ${s.sub} keep the pieces on, because trades help the side that's ahead.`,
          `The ${p} backs away from the trade on ${k.trade.to}. When ${s.are} behind, every swap helps the other side.`,
        ], key)
        : rotateStem([
          `Down material, ${s.sub} keep the pieces on. Trading ${what} on ${k.trade.to} would only help the side that's ahead.`,
          `Taking on ${k.trade.to} would trade ${what}. Behind on material, ${s.sub} want pieces on the board, not off it.`,
        ], key);
    case 'no-threat':
      return rotateStem([
        `${openSentence(s.opp)} ${x} on ${k.trade.to} offers a trade, but it threatens nothing. There's no need to take it, so the tension stays.`,
        `The ${x} on ${k.trade.to} can be traded, but it isn't threatening anything. Trade only with a reason, and here there isn't one.`,
      ], key);
  }
}

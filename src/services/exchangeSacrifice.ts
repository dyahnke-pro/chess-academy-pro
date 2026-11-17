// exchangeSacrifice — THE EXCHANGE GIVEN ON PURPOSE (Danya: "Now the exchange
// sacrifice: give up the rook, because in return you get a monster"; "take
// with the rook, sacrificing the exchange to keep the light bishop as the main
// attacker"). A rook for a minor piece (or a minor and a pawn), lost on the
// board by the legal exchange, while the engine reads the move as no worse
// than the best — so what the rook bought is worth the material.
//
// THE MOVE, either seat: the mover's rook takes a minor and is taken back, or
// takes a pawn (or steps somewhere) where a minor of theirs takes it and the
// mover takes the minor back. Read by the legal exchange on the rook's square
// (`legalSeeGainFor`): what they net there against what the rook took comes
// to the exchange (two points) or the exchange for a pawn (one). A rook that
// was already lost where it stood is the desperado's, not this.
//
// THE ENGINE has to vouch: the move's own read is within the sacrifice bar of
// the best read (`reviewSacrifice.SAC_COST_BAR_CP`, the review's inaccuracy
// bar). No read of the move — nothing said.
//
// WHAT IT BUYS, read on the board the trade ends on against the board before
// it, the first that is true: the minor it takes stood beside their king (the
// shield, `reviewSacrifice.besideKing`), their king's pawn cover thinner
// (`kingSafety.kingCover`), a passed pawn of the mover's that was not passed
// before, their pawns left doubled or isolated by the recapture
// (`boardStructure.newPawnWeaknesses`), their bishop pair gone, a minor of
// the mover's on an outpost it did not hold, or the mover's pieces now
// outnumbering the guards around their king (`kingSafety.countKingAttack`).
// A line of the engine's that wins the exchange back is a combination, said
// by the tactic that wins it, not this. Nothing true — nothing
// said: the sacrifice is taught by what it buys, never asserted.
//
// PURE: chess.js, the legal exchange, the structure reader and the engine
// reads the surface hands in.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { withArticle } from '../utils/andList';
import { expectedScore, seatCp } from './winChance';
import { GAIN_HOLDS_PLIES, settledNetForLine } from './exchangeLedger';
import { describeStructure, newPawnWeaknesses, pawnsOf } from './boardStructure';
import { kingCover, countKingAttack } from './kingSafety';
import { besideKing, SAC_COST_BAR_CP } from './reviewSacrifice';
import type { WeighRead } from './weighedMoves';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { openSentence } from '../utils/openSentence';
import type { IdeaKind } from './ideaKind';

type Minor = 'n' | 'b';

/** What the exchange bought, the first true reason. */
export type ExchangeSacGain =
  | { kind: 'shield' }
  | { kind: 'passer'; square: Square }
  | { kind: 'doubled'; file: string }
  | { kind: 'isolated'; square: Square }
  | { kind: 'bishop-pair' }
  | { kind: 'outpost'; piece: Minor; square: Square }
  | { kind: 'king-cover' }
  | { kind: 'attack' };

export interface ExchangeSacrifice {
  /** The side that gave the exchange. */
  side: Color;
  /** The minor it gets for the rook, and the square the trade happens on. */
  minor: Minor;
  square: Square;
  /** A pawn came with the minor (the rook took one first). */
  pawn: boolean;
  /** The rook took the minor itself (else their minor took the rook). */
  tookMinor: boolean;
  /** The piece of theirs that takes the rook. */
  retakeBy: PieceSymbol;
  gain: ExchangeSacGain;
  /** The trade played out: the move, their capture, and the take-back. */
  line: string[];
  key: string;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** The winning chances a move may give up and still be "no worse": what the
 *  sacrifice bar costs on a level board. */
const SCORE_BAR = expectedScore(0) - expectedScore(-SAC_COST_BAR_CP);

/** The exchange: a rook for a minor, in pawns. */
const EXCHANGE = MATERIAL_VALUE.r - MATERIAL_VALUE.n;

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

/** A line of UCI moves from `fen` in SAN, as far as it plays legally. */
function sansOf(fen: string, uci: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  } catch { /* the line stops where it stops playing */ }
  return out;
}

function uciOf(m: Pick<Move, 'from' | 'to' | 'promotion'>): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

/** The cheapest legal capture on `sq` for the side to move on `c`. */
function cheapestCapture(c: Chess, sq: Square): Move | null {
  const caps = c.moves({ verbose: true }).filter((m) => m.to === sq && !!m.captured);
  caps.sort((a, b) => MATERIAL_VALUE[a.piece] - MATERIAL_VALUE[b.piece]);
  return caps[0] ?? null;
}

function bishops(c: Chess, color: Color): number {
  return c.findPiece({ type: 'b', color }).length;
}

/** The first true reason, read on the board the trade ends on (`end`)
 *  against the board before the move (`before`). */
function gainOf(before: Chess, end: Chess, mover: Color, minor: Minor, shieldSquare: Square): ExchangeSacGain | null {
  const them = other(mover);
  // The minor taken stood beside their king on the board before the move
  // (where the rook took it, or where it came from to take the rook), and a
  // piece of the mover's is left to use the hole.
  const attackersLeft = end.board().flat().some((x) => !!x && x.color === mover && x.type !== 'k' && x.type !== 'p');
  if (attackersLeft && besideKing(before, shieldSquare, them)) return { kind: 'shield' };
  const coverBefore = kingCover(before, them)?.present;
  const coverEnd = kingCover(end, them)?.present;
  if (coverBefore != null && coverEnd != null && coverEnd < coverBefore) return { kind: 'king-cover' };
  const passedBefore = new Set(pawnsOf(before.fen(), mover).passed);
  const passer = pawnsOf(end.fen(), mover).passed.find((sq) => !passedBefore.has(sq));
  if (passer) return { kind: 'passer', square: passer as Square };
  const sb = describeStructure(before.fen());
  const se = describeStructure(end.fen());
  if (sb && se) {
    for (const w of newPawnWeaknesses(sb.pawns, se.pawns, them)) {
      if (w.kind === 'doubled') return { kind: 'doubled', file: w.file };
      if (w.squares[0]) return { kind: 'isolated', square: w.squares[0] as Square };
    }
  }
  if (minor === 'b' && bishops(before, them) >= 2 && bishops(end, them) < 2) return { kind: 'bishop-pair' };
  if (sb && se) {
    const had = new Set(sb.outposts.filter((o) => o.color === mover).map((o) => o.square));
    const post = se.outposts.find((o) => o.color === mover && !had.has(o.square));
    if (post) return { kind: 'outpost', piece: post.piece, square: post.square as Square };
  }
  const ab = countKingAttack(before, mover);
  const ae = countKingAttack(end, mover);
  if (ab && ae && ae.attackers.size >= 2 && ae.attackers.size > ae.defenders.size
    && ae.attackers.size - ae.defenders.size > ab.attackers.size - ab.defenders.size) return { kind: 'attack' };
  return null;
}

/**
 * The exchange sacrifice `san` on `fenBefore` (either seat), or null.
 * `reads`: the engine's lines from the board before the move, one per
 * candidate with the move played among them (`WeighRead`, the mover's line
 * first move first); null where the surface has none.
 */
export function exchangeSacrifice(fenBefore: string, san: string, reads: readonly WeighRead[] | null): ExchangeSacrifice | null {
  if (!reads || reads.length === 0) return null;
  let c: Chess;
  let m: Move;
  try { c = new Chess(fenBefore); m = c.move(san.replace(/[!?]+$/, '')); } catch { return null; }
  if (m.piece !== 'r' || m.promotion) return null;
  if (m.captured && m.captured !== 'p' && m.captured !== 'n' && m.captured !== 'b') return null;
  if (c.isGameOver()) return null;
  const mover = m.color;
  const them = other(mover);
  // A rook already lost where it stood is sold, not sacrificed (`desperado`).
  if (legalSeeGainFor(fenBefore, m.from, them) >= EXCHANGE) return null;
  // The engine vouches: the move's own read near the best read, measured in
  // winning chances so a sac in a won game is not held to a level game's
  // centipawns (the bar is what the sacrifice bar costs at level).
  const played = reads.find((r) => r.moves[0] === uciOf(m));
  if (!played || played.mate != null) return null;
  const best = Math.max(...reads.filter((r) => !!r.moves[0]).map((r) => seatCp(r, mover)));
  if (expectedScore(best) - expectedScore(seatCp(played, mover)) > SCORE_BAR) return null;
  // Lost on the board: what they net on the rook's square against what it took.
  const fenAfter = c.fen();
  const theirs = legalSeeGainFor(fenAfter, m.to, them);
  const took = m.captured ? MATERIAL_VALUE[m.captured] : 0;
  const net = took - theirs;
  if (theirs < EXCHANGE || net < -EXCHANGE || net > -1) return null;
  const take = cheapestCapture(c, m.to);
  if (!take || (take.piece !== 'p' && take.piece !== 'n' && take.piece !== 'b')) return null;
  const end = new Chess(fenAfter);
  end.move(take);
  const line = [m.san, take.san];
  let minor: Minor;
  const tookMinor = m.captured === 'n' || m.captured === 'b';
  if (tookMinor) {
    minor = m.captured as Minor;
  } else {
    // Their minor takes the rook and the mover takes it back.
    if (take.piece !== 'n' && take.piece !== 'b') return null;
    minor = take.piece;
    const back = cheapestCapture(end, m.to);
    if (!back) return null;
    end.move(back);
    line.push(back.san);
  }
  // A line that wins the exchange back is a combination, not a sacrifice:
  // the engine's own line after the move nets the mover the exchange (two
  // points) more than the rook took.
  const won = settledNetForLine(fenBefore, sansOf(fenBefore, played.moves.slice(0, GAIN_HOLDS_PLIES + 2)), mover);
  if (won !== null && won - took >= EXCHANGE) return null;
  const before = new Chess(fenBefore);
  const gain = gainOf(before, end, mover, minor, tookMinor ? m.to : take.from);
  if (!gain) return null;
  return {
    side: mover, minor, square: m.to, pawn: m.captured === 'p', tookMinor, retakeBy: take.piece, gain, line,
    key: `exchange-sac:${gain.kind}:${m.from}${m.to}`,
  };
}

/** The idea each gain is, for the step a turn says it in. */
const IDEA_OF: Record<ExchangeSacGain['kind'], IdeaKind> = {
  shield: 'attack-king', 'king-cover': 'attack-king', attack: 'attack-king',
  passer: 'passed-pawn', doubled: 'weakness', isolated: 'weakness', 'bishop-pair': 'weakness', outpost: 'outpost',
};

/** The idea of an exchange sacrifice's fact, read off its key
 *  (`exchange-sac:<gain>:<move>`). */
export function exchangeSacIdea(key: string): IdeaKind {
  const kind = key.split(':')[1] as ExchangeSacGain['kind'] | undefined;
  return (kind && IDEA_OF[kind]) || 'attack-king';
}

/** The squares the line names: the trade's square and the reason's. */
export function exchangeSacrificeSquares(x: ExchangeSacrifice): string[] {
  const g = x.gain;
  const extra = g.kind === 'passer' || g.kind === 'isolated' || g.kind === 'outpost' ? [g.square] : [];
  return [...new Set([x.square, ...extra])];
}

/** Said from the student's seat: `mine` when the student gave the exchange.
 *  It never names the move — the turn already did ("That gives up …").
 *  Rotated on the board after the move. */
export function exchangeSacrificeLine(x: ExchangeSacrifice, mine: boolean, fenAfter: string): string {
  const own = mine ? 'your' : 'their';
  const opp = mine ? 'their' : 'your';
  const oppPossessive = mine ? 'theirs' : 'yours';
  const minor = NAME[x.minor];
  const key = stemKeyOf(`${fenAfter}|exchange-sac`);
  const forWhat = x.pawn ? `${withArticle(minor)} and a pawn` : withArticle(minor);
  const lead = x.tookMinor
    ? rotateStem([
      `That gives up the exchange: ${own} rook for ${opp} ${minor} on ${x.square}.`,
      `${openSentence(own)} rook goes for ${opp} ${minor} on ${x.square}, and it will be taken back: the exchange, given on purpose.`,
    ], key)
    : rotateStem([
      `That gives up the exchange${x.pawn ? ' for a pawn' : ''}: if ${opp} ${minor} takes ${own} rook on ${x.square}, ${mine ? 'you take' : 'they take'} back, a rook for ${forWhat}.`,
      `${openSentence(own)} rook can be taken on ${x.square} by ${opp} ${minor}, and ${mine ? 'you take' : 'they take'} back: the exchange${x.pawn ? ' for a pawn' : ''}, given on purpose.`,
    ], key);
  const g = x.gain;
  // Their pawn takes the rook back: the pawn weakness is the recapture's.
  const byPawn = x.tookMinor && x.retakeBy === 'p';
  const reason = ((): string => {
    switch (g.kind) {
      case 'shield': return rotateStem([
        `That ${minor} was guarding ${opp} king, and it is gone.`,
        `The ${minor} stood beside ${opp} king, and the trade takes it away.`,
      ], key);
      case 'passer': return rotateStem([
        `In return ${own} pawn on ${g.square} is passed.`,
        `What the rook buys is a passed pawn: ${own} pawn on ${g.square}.`,
      ], key);
      case 'doubled': return byPawn
        ? `Taking back with the pawn doubles ${opp} pawns on the ${g.file}-file.`
        : `In return ${opp} pawns on the ${g.file}-file are doubled.`;
      case 'isolated': return byPawn
        ? `Taking back with the pawn leaves ${opp} pawn on ${g.square} isolated.`
        : `In return ${opp} pawn on ${g.square} is isolated.`;
      case 'bishop-pair': return `In return ${opp} bishop pair is gone.`;
      case 'outpost': return `In return ${own} ${NAME[g.piece]} on ${g.square} stands on an outpost no pawn of ${oppPossessive} can chase it from.`;
      case 'king-cover': return byPawn
        ? `Taking back with the pawn leaves ${opp} king one pawn fewer in front of it.`
        : `In return ${opp} king has one pawn fewer in front of it.`;
      case 'attack': return `In return ${own} pieces aimed at ${opp} king outnumber the pieces guarding it.`;
      default: return '';
    }
  })();
  const close = mine
    ? rotateStem([`You are down material, but the position pays for it.`, `The rook is worth less than what it bought here.`], key)
    : rotateStem([`They are down material, but the position pays for it.`, `Their rook is worth less than what it bought here.`], key);
  return [lead, reason, close].join(' ');
}

// promotionChoice — WHICH PIECE TO MAKE (WO-DANYA-READS-01 #5; Danya: "there
// are only two circumstances under which it makes sense to underpromote:
// promoting to a queen (or rook!) allows a stalemating combination, or
// promoting to a knight is a better tactical choice based on its unique
// movement"; "69.d8=N# — checkmate, enough said"; "before promoting to a
// queen, make sure that you are not depriving the enemy king of its remaining
// squares").
//
// For one promoting pawn move, every piece is played on the board (chess.js)
// and the queen is held to the same checks:
//   stalemate — the promotion leaves the other side no legal move, not in check;
//   trap      — the promotion walks into a check that offers a piece whose
//               capture stalemates (`stalemateTraps`, the Saavedra trick);
//   mate      — the promotion is checkmate;
//   fork      — a knight promotion that checks and attacks the queen, and every
//               reply leaves the queen to take (no recapture);
//   check     — a knight promotion that gives check where the queen gives
//               none, and the engine's lines on the board (both promotions
//               read) have the knight at least `KNIGHT_CHECK_GAIN_CP` better
//               (Danya's d8=N+ in "A Guide to Underpromotion": the queen only
//               holds level, the knight's check wins). No lines, no claim.
// The choice is an underpromotion only when the queen fails one of these and
// the piece chosen does not: a knight that mates or wins the queen where the
// queen does neither; the strongest piece that dodges the stalemate. When the
// surface hands in the engine's best move and it is a promotion, the choice
// must be the engine's piece — otherwise nothing is said.
//
// PURE: chess.js and the stalemate reader.
import { Chess, type Color, type Move, type PieceSymbol } from 'chess.js';
import { stalemateTraps, type StalemateTrap } from './stalemateWatch';
import { withArticle } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { seatCp } from './winChance';
import type { AnalysisLine } from '../types';

/** The knight's check line beats the queen's by at least this (the mover's
 *  score), or the check is no reason to underpromote. */
export const KNIGHT_CHECK_GAIN_CP = 200;

type Promo = 'q' | 'r' | 'b' | 'n';

export type PromotionReason =
  | { kind: 'queen-stalemates' }
  | { kind: 'queen-trap'; trap: StalemateTrap }
  | { kind: 'knight-mates' }
  | { kind: 'knight-forks'; target: string }
  | { kind: 'knight-checks'; gainCp: number };

export interface PromotionChoice {
  side: Color;
  /** The pawn's move, by square. */
  from: string;
  to: string;
  /** The piece to make and its SAN. */
  piece: Promo;
  san: string;
  /** The queen's SAN on the same square. */
  queenSan: string;
  reason: PromotionReason;
  /** The pieces that fail as the queen does (a rook stalemating too). */
  alsoFails: Promo[];
  key: string;
}

interface PieceRead { san: string; stalemate: boolean; trap: StalemateTrap | null; mate: boolean; fork: string | null; check: boolean }

function readPiece(fen: string, m: Move): PieceRead {
  const b = new Chess(fen); b.move(m);
  const stalemate = b.isStalemate();
  const mate = b.isCheckmate();
  const trap = !stalemate && !mate ? stalemateTraps(fen, [m.san])[0] ?? null : null;
  let fork: string | null = null;
  if (m.promotion === 'n' && b.inCheck() && !mate) {
    const queen = b.board().flat().find((c) => c?.type === 'q' && c.color !== m.color);
    if (queen) {
      const knightSees = (from: string, to: string): boolean => {
        const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0)); const dr = Math.abs(Number(from[1]) - Number(to[1]));
        return (df === 1 && dr === 2) || (df === 2 && dr === 1);
      };
      if (knightSees(m.to, queen.square)) {
        const every = b.moves({ verbose: true }).every((r) => {
          const x = new Chess(b.fen()); x.move(r);
          const q = x.board().flat().find((c) => c?.type === 'q' && c.color !== m.color);
          if (!q) return false;
          const take = x.moves({ verbose: true }).find((t) => t.from === m.to && t.to === q.square);
          if (!take) return false;
          const y = new Chess(x.fen()); y.move(take);
          return !y.moves({ verbose: true }).some((t) => t.to === q.square);
        });
        if (every) fork = queen.square;
      }
    }
  }
  return { san: m.san, stalemate, trap, mate, fork, check: b.inCheck() };
}

const ORDER: Promo[] = ['q', 'r', 'b', 'n'];

/** The mover's score on the line among `lines` that starts with `uci`, or null. */
function lineScore(lines: readonly AnalysisLine[] | null, uci: string, mover: Color): number | null {
  const l = lines?.find((x) => x.moves[0] === uci);
  return l ? seatCp(l, mover) : null;
}

/** THE CHOICE for the pawn move `from`→`to` on `fen` (the side to move's), or
 *  null when the queen is right or nothing proves otherwise. `engineBest`:
 *  the engine's best move (UCI) or null. `lines`: the engine's lines on `fen`
 *  (MultiPV), REQUIRED — null where the surface has none (the knight's check
 *  is then no reason). */
export function promotionChoiceFor(fen: string, from: string, to: string, engineBest: string | null, lines: readonly AnalysisLine[] | null): PromotionChoice | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const moves = c.moves({ verbose: true }).filter((m) => m.from === from && m.to === to && m.promotion);
  if (moves.length === 0) return null;
  const by = new Map<Promo, PieceRead>();
  for (const m of moves) by.set(m.promotion as Promo, readPiece(fen, m));
  const q = by.get('q');
  if (!q) return null;
  const fails = (p: PieceRead): boolean => p.stalemate || !!p.trap;
  let choice: { piece: Promo; reason: PromotionReason } | null = null;
  const n = by.get('n');
  if (n && n.mate && !q.mate) choice = { piece: 'n', reason: { kind: 'knight-mates' } };
  else if (n && n.fork && !q.mate) choice = { piece: 'n', reason: { kind: 'knight-forks', target: n.fork } };
  else if (n && n.check && !q.check && !q.mate && !n.stalemate) {
    const kn = lineScore(lines, `${from}${to}n`, c.turn());
    const qn = lineScore(lines, `${from}${to}q`, c.turn());
    if (kn !== null && qn !== null && kn - qn >= KNIGHT_CHECK_GAIN_CP) choice = { piece: 'n', reason: { kind: 'knight-checks', gainCp: kn - qn } };
  }
  if (!choice && fails(q)) {
    const ok = ORDER.slice(1).find((p) => { const r = by.get(p); return !!r && !fails(r); });
    if (ok) choice = { piece: ok, reason: q.stalemate ? { kind: 'queen-stalemates' } : { kind: 'queen-trap', trap: q.trap as StalemateTrap } };
  }
  if (!choice) return null;
  if (engineBest && engineBest.slice(0, 4) === `${from}${to}` && (engineBest[4] ?? 'q') !== choice.piece) return null;
  const alsoFails = (choice.reason.kind === 'queen-stalemates' || choice.reason.kind === 'queen-trap')
    ? ORDER.filter((p) => p !== 'q' && ORDER.indexOf(p) < ORDER.indexOf(choice.piece) && by.has(p) && fails(by.get(p) as PieceRead))
    : [];
  return { side: c.turn(), from, to, piece: choice.piece, san: (by.get(choice.piece) as PieceRead).san, queenSan: q.san, reason: choice.reason, alsoFails,
    key: `promotion:${fen.split(' ')[0]}:${from}${to}` };
}

/** Every promotion choice the side to move has on `fen` (one per pawn move). */
export function promotionChoicesOn(fen: string, engineBest: string | null, lines: readonly AnalysisLine[] | null): PromotionChoice[] {
  let c: Chess;
  try { c = new Chess(fen); } catch { return []; }
  const seen = new Set<string>();
  const out: PromotionChoice[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (!m.promotion) continue;
    const k = `${m.from}${m.to}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const pc = promotionChoiceFor(fen, m.from, m.to, engineBest, lines);
    if (pc) out.push(pc);
  }
  return out;
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** THE CHOICE IN WORDS, from the student's seat. `played`: the move was just
 *  played (the reason is said of it), else it is the choice ahead. */
export function promotionChoiceLine(pc: PromotionChoice, student: Color, played: boolean): string {
  const mine = pc.side === student;
  const piece = NAME[pc.piece];
  const lead = played
    ? (mine ? `You make ${withArticle(piece)}, not a queen.` : `They make ${withArticle(piece)}, not a queen.`)
    : (mine ? `When the pawn on ${pc.from} promotes, make ${withArticle(piece)}, not a queen.` : `When their pawn on ${pc.from} promotes, it should become ${withArticle(piece)}, not a queen.`);
  const also = pc.alsoFails.length ? ` ${openSentence(pc.alsoFails.map((p) => withArticle(NAME[p])).join(' or '))} fails the same way.` : '';
  switch (pc.reason.kind) {
    case 'knight-mates':
      return `${lead} The knight on ${pc.to} gives checkmate, and a queen there does not.`;
    case 'knight-forks':
      return `${lead} The knight on ${pc.to} gives check and hits the queen on ${pc.reason.target}, so the queen falls next move.`;
    case 'knight-checks':
      return `${lead} The knight on ${pc.to} comes with check, and a queen there gives none. That check is the tempo that wins: with a queen, ${mine ? 'they hold' : 'you hold'} the balance.`;
    case 'queen-stalemates':
      return `${lead} A queen on ${pc.to} would leave ${mine ? 'their' : 'your'} king no move and nothing else to move: stalemate.${also} The ${piece} does the job and leaves ${mine ? 'them' : 'you'} a move.`;
    case 'queen-trap': {
      const t = pc.reason.trap;
      return `${lead} A queen on ${pc.to} walks into ${t.check}, and taking the ${t.bait} with ${t.capture} is stalemate.${also} The ${piece} does the same work without that trick.`;
    }
    default:
      return lead;
  }
}

/** THE MOVE THAT PROMOTED (either seat): the underpromotion played and its
 *  reason, or the queen played where the board needed a lesser piece. */
export function promotionPlayed(fenBefore: string, san: string, lines: readonly AnalysisLine[] | null): { choice: PromotionChoice; queenMissed: boolean } | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let m: Move;
  try { m = c.move(san); } catch { return null; }
  if (!m.promotion) return null;
  const pc = promotionChoiceFor(fenBefore, m.from, m.to, null, lines);
  if (!pc) return null;
  if (m.promotion === pc.piece) return { choice: pc, queenMissed: false };
  if (m.promotion === 'q') return { choice: pc, queenMissed: true };
  return null;
}

/** The queen played where a lesser piece was needed, in words. */
export function queenMissedLine(pc: PromotionChoice, student: Color): string {
  const mine = pc.side === student;
  const piece = NAME[pc.piece];
  switch (pc.reason.kind) {
    case 'knight-mates': return mine ? `A knight on ${pc.to} would have given checkmate. The queen does not.` : `A knight on ${pc.to} would have given them checkmate. The queen does not.`;
    case 'knight-forks': return mine ? `A knight on ${pc.to} would have checked and won the queen on ${pc.reason.target}.` : `A knight on ${pc.to} would have checked and won your queen on ${pc.reason.target}.`;
    case 'knight-checks': return mine ? `A knight on ${pc.to} would have come with check. The queen gives none, and lets them hold.` : `A knight on ${pc.to} would have come with check. Their queen gives none, and lets you hold.`;
    case 'queen-stalemates': return mine ? `The queen is stalemate. ${openSentence(withArticle(piece))} would have kept the win.` : `The queen stalemates you. ${openSentence(withArticle(piece))} would have kept their win.`;
    case 'queen-trap': {
      const t = pc.reason.trap;
      return mine
        ? `The queen walks into ${t.check}, and taking the ${t.bait} is stalemate. ${openSentence(withArticle(piece))} on ${pc.to} would have kept the win.`
        : `Their queen walks into ${t.check}, and taking the ${t.bait} is stalemate — your chance to save it. ${openSentence(withArticle(piece))} would have kept their win.`;
    }
    default: return '';
  }
}

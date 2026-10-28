// positionalReason — WHY A MOVE COST WHAT IT COST WHEN NOTHING IS WON OR LOST
// (WO-DECIDER-02, David 2026-10-28: "Go" on the positional reason).
//
// A third of costly moves win nothing either way in the engine's line: the
// cost is the position. The readings that say which part of it were already
// computed — by the record's slip filer (`slipCause`), which compared the board
// after the move with the board after the better move and filed the largest
// real difference. Its note went to the record and never to the voice, so the
// student was told "it cost about a pawn" while the record knew "the king is
// less sheltered after this than after the better move". This is that reading,
// one computer, read by the record AND by the error computer every surface
// speaks (`errorWhy`): the reason filed is the reason said.
//
//   concession — what the move gave up against the better one (`findStudentDrawback`);
//   board      — the largest gap between the two boards: development, king
//                shelter, the endgame king, a passed pawn, rooks on open
//                files, space, activity (each past its own bar);
//   best job   — what the better move was for; it NAMES the better move, so
//                only where the surface names it.
//
// Pure: chess.js and the position readers.
import { Chess, type Color, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { findStudentDrawback, type DrawbackKind } from './concessionBeat';
import { bestMoveReason } from './deliberation';
import { homeMinorCount } from './development';
import { findPassedPawns, findOpenFiles, computeTerritory, kingSafetyRead } from './positionReadingService';
import { centreDistance } from '../utils/centreDistance';
import { phaseOfFen, type Phase } from './boardConcepts';

export interface PositionalReason { tag: Exclude<MisconceptionTagId, 'other'>; note: string }

/** What each concession is a lapse in — one row per kind, so a new kind fails
 *  to compile until someone files it. */
const CONCESSION_TAG: Record<DrawbackKind, Exclude<MisconceptionTagId, 'other'>> = {
  'defender-left': 'missed-opponents-threat',
  'file-opened': 'weakened-king-safety',
  'piece-offside': 'misplaced-piece',
  'pawn-weakened': 'created-pawn-weakness',
  'outpost-conceded': 'created-pawn-weakness',
};

const PIECE: Record<string, string> = { n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

function boardAfter(fen: string, san: string): Chess | null {
  try { const c = new Chess(fen); return c.move(san) ? c : null; } catch { return null; }
}

function kingOf(c: Chess, color: Color): Square | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

/** How many squares the side's pieces (not pawns, not the king) reach. */
function activity(c: Chess, side: Color): number {
  const parts = c.fen().split(' ');
  parts[1] = side; parts[3] = '-';
  try {
    return new Chess(parts.join(' ')).moves({ verbose: true }).filter((m) => m.piece !== 'p' && m.piece !== 'k').length;
  } catch { return 0; }
}

function rooksOnOpenFiles(c: Chess, color: Color): number {
  const files = findOpenFiles(c.fen());
  const semi = color === 'w' ? files.whiteSemiOpen : files.blackSemiOpen;
  let n = 0;
  for (const row of c.board()) for (const p of row) {
    if (p && p.type === 'r' && p.color === color && (files.open.includes(p.square[0]) || semi.includes(p.square[0]))) n += 1;
  }
  return n;
}

/** The squares a pawn of `color` on `sq` attacks. */
function pawnHits(sq: Square, color: Color): Square[] {
  const f = sq.charCodeAt(0); const r = Number(sq[1]) + (color === 'w' ? 1 : -1);
  if (r < 1 || r > 8) return [];
  return [f - 1, f + 1].filter((x) => x >= 97 && x <= 104).map((x) => `${String.fromCharCode(x)}${r}` as Square);
}

/** THE CONCESSION — what the played move gave up against the better one. */
export function concessionReason(fen: string, playedSan: string, bestSan: string | null): PositionalReason | null {
  if (!bestSan) return null;
  try {
    const mover = new Chess(fen).turn();
    const c = findStudentDrawback({ fen, playedSan, bestSan, studentColor: mover === 'w' ? 'white' : 'black' });
    return c ? { tag: CONCESSION_TAG[c.kind], note: c.said } : null;
  } catch { return null; }
}

/** THE BOARD after the two moves. Each reading is a count where more is worse
 *  for the mover; the largest gap past its bar decides. */
export function boardReason(fen: string, playedSan: string, bestSan: string | null, phase: Phase): PositionalReason | null {
  if (!bestSan) return null;
  const played = boardAfter(fen, playedSan);
  const bestBoard = boardAfter(fen, bestSan);
  if (!played || !bestBoard) return null;
  const mover = new Chess(fen).turn();
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const bestMove = new Chess(fen).move(bestSan);
  const gaps: Array<{ gap: number; reason: PositionalReason }> = [];
  const push = (gap: number, bar: number, reason: PositionalReason): void => { if (gap >= bar) gaps.push({ gap: gap / bar, reason }); };
  if (phase === 'opening') {
    push(homeMinorCount(played, mover) - homeMinorCount(bestBoard, mover), 1,
      { tag: 'neglected-development', note: 'A minor piece is still at home that the better move would have brought out.' });
  }
  if (phase !== 'endgame') {
    const ks = (c: Chess): number => {
      const k = kingSafetyRead(c.fen(), mover);
      return k ? (3 - k.shieldPawns) + k.openFilesNearKing.length + (k.inCenter ? 1 : 0) : 0;
    };
    push(ks(played) - ks(bestBoard), 1,
      { tag: bestMove && /^O-O/.test(bestMove.san) ? 'king-stuck-center' : 'weakened-king-safety',
        note: 'The king is less sheltered after this than after the better move.' });
  }
  if (phase === 'endgame') {
    const kp = kingOf(played, mover); const kb = kingOf(bestBoard, mover);
    if (kp && kb) push(centreDistance(kp) - centreDistance(kb), 1,
      { tag: 'passive-king-endgame', note: `In the endgame the king belongs nearer the centre than ${kp}.` });
    push(findPassedPawns(bestBoard.fen(), mover).length - findPassedPawns(played.fen(), mover).length, 1,
      { tag: 'passed-pawn-neglected', note: 'The better move makes a passed pawn.' });
  }
  push(rooksOnOpenFiles(bestBoard, mover) - rooksOnOpenFiles(played, mover), 1,
    { tag: 'passive-rook', note: 'The better move puts a rook on an open file.' });
  const space = (c: Chess): number => { const t = computeTerritory(c.fen()); return mover === 'w' ? t.white - t.black : t.black - t.white; };
  push(space(bestBoard) - space(played), 2,
    { tag: 'space-conceded', note: 'That gives up space in the centre the better move kept.' });
  push(activity(bestBoard, mover) - activity(played, mover), 4,
    { tag: 'misplaced-piece', note: 'Your pieces reach fewer squares after this than after the better move.' });
  push(activity(played, enemy) - activity(bestBoard, enemy), 4,
    { tag: 'tempo-handed', note: 'That frees their pieces; the better move kept them tied up.' });
  return gaps.length > 0 ? gaps.sort((a, b) => b.gap - a.gap)[0].reason : null;
}

/** THE BETTER MOVE'S JOB — it names the better move, so only a surface that
 *  names it reads this one. */
export function bestJobReason(fen: string, bestSan: string | null): PositionalReason | null {
  if (!bestSan) return null;
  const bestBoard = boardAfter(fen, bestSan);
  if (!bestBoard) return null;
  const mover = new Chess(fen).turn();
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const bestMove = new Chess(fen).move(bestSan);
  const why = bestMoveReason(fen, bestSan, mover, { mateIn: null, opponentLastSan: null });
  const said = (fallback: string): string => (why ? `${bestSan} ${why}.` : fallback);
  if (/^O-O/.test(bestMove.san)) return { tag: 'king-stuck-center', note: said('Castling was the move here.') };
  if (/[+#]/.test(bestMove.san)) return { tag: 'missed-tactic', note: said(`${bestMove.san} was the forcing move.`) };
  if (bestMove.piece === 'p') {
    if (findPassedPawns(fen, mover).includes(bestMove.from)) {
      return { tag: 'passed-pawn-neglected', note: said(`The passed pawn on ${bestMove.from} wanted to move.`) };
    }
    // A LEVER takes or attacks an enemy pawn; any other pawn move is the plan
    // the played move missed, not a break.
    const lever = !!bestMove.captured || pawnHits(bestMove.to, mover).some((sq) => { const q = bestBoard.get(sq); return !!q && q.type === 'p' && q.color === enemy; });
    if (lever) return { tag: 'mistimed-pawn-break', note: said(`The pawn break ${bestMove.san} was the timely one.`) };
    return { tag: 'no-plan', note: said(`${bestMove.san} was the move the position asked for.`) };
  }
  if (bestMove.piece === 'k') return { tag: 'passive-king-endgame', note: said(`The king belonged on ${bestMove.to}.`) };
  return { tag: 'misplaced-piece', note: said(`The ${PIECE[bestMove.piece] ?? 'piece'} belonged on ${bestMove.to}.`) };
}

/**
 * THE POSITIONAL REASON a surface says for a costly move that wins nothing
 * either way: the concession, else the largest gap between the two boards,
 * else — only where the better move may be named — its job.
 */
export function positionalReason(args: {
  fen: string;
  playedSan: string;
  bestSan: string | null;
  /** REQUIRED — the surface's answer (LEARN NAMES NO MOVE UNASKED). */
  namesBetterMove: boolean;
}): PositionalReason | null {
  const phase = phaseOfFen(args.fen) ?? 'middlegame';
  return concessionReason(args.fen, args.playedSan, args.bestSan)
    ?? boardReason(args.fen, args.playedSan, args.bestSan, phase)
    ?? (args.namesBetterMove ? bestJobReason(args.fen, args.bestSan) : null);
}

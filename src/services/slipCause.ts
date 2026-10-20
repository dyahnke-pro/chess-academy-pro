/**
 * slipCause — the LAST word on what a slip did wrong, so no slip is filed as
 * `other` (David 2026-10-18: "There really shouldn't be any mistakes in the
 * other category. All mistakes can be deterministically identified.").
 *
 * It owns no chess where a computer already exists (David: "we already have
 * similar computer for best narration and best move. Reuse if you can"):
 *
 *   1. THE REASON — `decisiveReason`, the computer that says why the best move
 *      beats the next one, handed the best move and the PLAYED move as the two
 *      lines. A material or mate reason files the slip: the played move fails
 *      → it hung (taken on the next move) or walked into their line; the best
 *      move wins → the tactic missed.
 *   2. THE CONCESSION — `findStudentDrawback`, the computer that says what the
 *      move gave up against the best one.
 *   3. THE BOARD — the readings neither computer makes: development, king
 *      shelter, the endgame king, a passed pawn, rooks on open files, space,
 *      activity; the largest gap between the two boards decides.
 *   4. THE BEST MOVE'S JOB — castling, a passed pawn, a pawn break, the king,
 *      a piece's square; its words come from `bestMoveReason`.
 *
 * PURE: chess.js and the engine lines the caller already has.
 */
import { Chess, type Color, type Square } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnalysisLine } from '../types';
import { decisiveReason } from './decisiveReason';
import { findStudentDrawback, type DrawbackKind } from './concessionBeat';
import { bestMoveReason } from './deliberation';
import { homeMinorCount } from './development';
import { findPassedPawns, findOpenFiles, computeTerritory, kingSafetyRead } from './positionReadingService';
import { centreDistance } from '../utils/centreDistance';

interface SlipCauseInput {
  fen: string;
  playedSan: string;
  bestSan?: string;
  /** The opponent's best line after the played move (SAN). */
  pvAfterPlayed?: readonly string[];
  /** The line after the best move, its first move excluded (SAN). */
  pvAfterBest?: readonly string[];
  /** Mover's-view evals (cp) before the move and after the played move. */
  evalBefore?: number;
  evalAfterPlayed?: number;
  phase: 'opening' | 'middlegame' | 'endgame';
}

interface SlipCause { tag: Exclude<MisconceptionTagId, 'other'>; coachNote: string }

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

function toUci(fen: string, sans: readonly string[]): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const s of sans) { const m = c.move(s); out.push(`${m.from}${m.to}${m.promotion ?? ''}`); }
  } catch { /* the playable prefix */ }
  return out;
}

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

/** 1. The reason computer, read on the best move against the played one. */
function reasonCause(input: SlipCauseInput, mover: Color): SlipCause | null {
  if (!input.bestSan || typeof input.evalBefore !== 'number' || typeof input.evalAfterPlayed !== 'number') return null;
  const white = (moverCp: number): number => (mover === 'w' ? moverCp : -moverCp);
  const best = toUci(input.fen, [input.bestSan, ...(input.pvAfterBest ?? [])]);
  const played = toUci(input.fen, [input.playedSan, ...(input.pvAfterPlayed ?? [])]);
  if (!best.length || !played.length) return null;
  const before: AnalysisLine[] = [
    { rank: 1, evaluation: white(input.evalBefore), mate: null, moves: best },
    { rank: 2, evaluation: white(input.evalAfterPlayed), mate: null, moves: played },
  ];
  const r = decisiveReason({
    // Only a material reason files the slip; the prepared move stays held.
    namesPreparedMove: false,
    fenBefore: input.fen, san: input.bestSan, seat: 'student', opponentLastSan: null,
    reads: { before, passBefore: [], after: [], passAfter: [] },
  });
  // A material reason files the slip whether or not it accounts for the whole
  // gap: the line it shows is a real loss or a real win either way.
  if (!r || r.source !== 'material' || !r.line || !(r.kind === 'the' || (r.stakeCp ?? 0) >= 100)) return null;
  const bare = (x: string): string => x.replace(/^…/, '').replace(/[+#]/g, '');
  const playedFails = r.about === 'alternative' || bare(r.line.sans[0] ?? '') === bare(input.playedSan);
  // The note is the reason itself, without the "no single reason" preface.
  const note = r.text.replace(/^No single reason[^.]*\.\s*/, '') || r.text;
  if (playedFails) {
    // The played move fails. Material taken on the very next move hung;
    // anything longer is their line, walked into.
    const board = boardAfter(input.fen, input.playedSan);
    const reply = input.pvAfterPlayed?.[0];
    let hung = false;
    if (board && reply) {
      try { const m = board.move(reply); hung = !!m.captured; } catch { /* no reply */ }
    }
    return { tag: hung ? 'hung-material' : 'missed-opponents-threat', coachNote: note };
  }
  return { tag: 'missed-tactic', coachNote: note };
}

/** The deterministic cause of a slip no named detector caught. Null only when
 *  nothing can be read (an illegal move, or no best move to compare), or when the played move IS the
 *  engine's best — two searches disagreeing about one move is not a slip. */
export function slipCause(input: SlipCauseInput): SlipCause | null {
  const before = (() => { try { return new Chess(input.fen); } catch { return null; } })();
  if (!before) return null;
  const mover = before.turn();
  const enemy: Color = mover === 'w' ? 'b' : 'w';
  const played = boardAfter(input.fen, input.playedSan);
  if (!played) return null;
  const playedMove = new Chess(input.fen).move(input.playedSan);
  if (input.bestSan && input.bestSan.replace(/[+#]/g, '') === playedMove.san.replace(/[+#]/g, '')) return null;
  const bestBoard = input.bestSan ? boardAfter(input.fen, input.bestSan) : null;
  const bestMove = bestBoard && input.bestSan ? new Chess(input.fen).move(input.bestSan) : null;

  // 1. THE REASON.
  const reason = reasonCause(input, mover);
  if (reason) return reason;

  // 2. THE CONCESSION.
  if (input.bestSan) {
    try {
      const c = findStudentDrawback({ fen: input.fen, playedSan: input.playedSan, bestSan: input.bestSan, studentColor: mover === 'w' ? 'white' : 'black' });
      if (c) return { tag: CONCESSION_TAG[c.kind], coachNote: c.said };
    } catch { /* fall through */ }
  }

  // 3. THE BOARD after the two moves. Each reading is a count where more is
  //    worse for the mover; the largest gap past its bar decides.
  if (bestBoard) {
    const gaps: Array<{ gap: number; cause: SlipCause }> = [];
    const push = (gap: number, bar: number, cause: SlipCause): void => { if (gap >= bar) gaps.push({ gap: gap / bar, cause }); };
    if (input.phase === 'opening') {
      push(homeMinorCount(played, mover) - homeMinorCount(bestBoard, mover), 1,
        { tag: 'neglected-development', coachNote: 'A minor piece is still at home that the better move would have brought out.' });
    }
    if (input.phase !== 'endgame') {
      const ks = (c: Chess): number => {
        const k = kingSafetyRead(c.fen(), mover);
        return k ? (3 - k.shieldPawns) + k.openFilesNearKing.length + (k.inCenter ? 1 : 0) : 0;
      };
      push(ks(played) - ks(bestBoard), 1,
        { tag: bestMove && /^O-O/.test(bestMove.san) ? 'king-stuck-center' : 'weakened-king-safety',
          coachNote: 'The king is less sheltered after this than after the better move.' });
    }
    if (input.phase === 'endgame') {
      const kp = kingOf(played, mover); const kb = kingOf(bestBoard, mover);
      if (kp && kb) push(centreDistance(kp) - centreDistance(kb), 1,
        { tag: 'passive-king-endgame', coachNote: `In the endgame the king belongs nearer the centre than ${kp}.` });
      push(findPassedPawns(bestBoard.fen(), mover).length - findPassedPawns(played.fen(), mover).length, 1,
        { tag: 'passed-pawn-neglected', coachNote: 'The better move makes a passed pawn.' });
    }
    push(rooksOnOpenFiles(bestBoard, mover) - rooksOnOpenFiles(played, mover), 1,
      { tag: 'passive-rook', coachNote: 'The better move puts a rook on an open file.' });
    const space = (c: Chess): number => { const t = computeTerritory(c.fen()); return mover === 'w' ? t.white - t.black : t.black - t.white; };
    push(space(bestBoard) - space(played), 2,
      { tag: 'space-conceded', coachNote: 'That gives up space in the centre the better move kept.' });
    push(activity(bestBoard, mover) - activity(played, mover), 4,
      { tag: 'misplaced-piece', coachNote: 'Your pieces reach fewer squares after this than after the better move.' });
    push(activity(played, enemy) - activity(bestBoard, enemy), 4,
      { tag: 'tempo-handed', coachNote: 'That frees their pieces; the better move kept them tied up.' });
    if (gaps.length > 0) return gaps.sort((a, b) => b.gap - a.gap)[0].cause;
  }

  // 4. THE BEST MOVE'S JOB.
  if (bestMove && input.bestSan) {
    const why = bestMoveReason(input.fen, input.bestSan, mover, { mateIn: null, opponentLastSan: null });
    const said = (fallback: string): string => (why ? `${input.bestSan} ${why}.` : fallback);
    if (/^O-O/.test(bestMove.san)) return { tag: 'king-stuck-center', coachNote: said('Castling was the move here.') };
    if (/[+#]/.test(bestMove.san)) return { tag: 'missed-tactic', coachNote: said(`${bestMove.san} was the forcing move.`) };
    if (bestMove.piece === 'p') {
      if (findPassedPawns(input.fen, mover).includes(bestMove.from)) {
        return { tag: 'passed-pawn-neglected', coachNote: said(`The passed pawn on ${bestMove.from} wanted to move.`) };
      }
      // A LEVER takes or attacks an enemy pawn; any other pawn move is the
      // plan the played move missed, not a break.
      const lever = !!bestMove.captured || pawnHits(bestMove.to, mover).some((sq) => { const q = bestBoard?.get(sq); return !!q && q.type === 'p' && q.color === enemy; });
      if (lever) return { tag: 'mistimed-pawn-break', coachNote: said(`The pawn break ${bestMove.san} was the timely one.`) };
      return { tag: 'no-plan', coachNote: said(`${bestMove.san} was the move the position asked for.`) };
    }
    if (bestMove.piece === 'k') return { tag: 'passive-king-endgame', coachNote: said(`The king belonged on ${bestMove.to}.`) };
    return { tag: 'misplaced-piece', coachNote: said(`The ${PIECE[bestMove.piece] ?? 'piece'} belonged on ${bestMove.to}.`) };
  }
  // No best move to compare against: nothing can be named honestly.
  return null;
}

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
import { Chess, type Color } from 'chess.js';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnalysisLine } from '../types';
import { decisiveReason } from './decisiveReason';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';
import { concessionReason, boardReason, bestJobReason } from './positionalReason';

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
  const played = boardAfter(input.fen, input.playedSan);
  if (!played) return null;
  const playedMove = new Chess(input.fen).move(input.playedSan);
  if (input.bestSan && input.bestSan.replace(/[+#]/g, '') === playedMove.san.replace(/[+#]/g, '')) return null;

  // 1. THE REASON.
  const reason = reasonCause(input, mover);
  if (reason) return reason;

  // 2. THE CONCESSION — the one positional computer (`positionalReason`), the
  //    same reading the error computer speaks.
  const concession = concessionReason(input.fen, input.playedSan, input.bestSan ?? null);
  if (concession) return { tag: concession.tag, coachNote: concession.note };

  // 2b. THE GUARD IT LEFT — the one error computer's mechanism (`errorWhy`): the
  //     moved piece was guarding a square their knight now forks from, or a
  //     piece they now win (David's 13.Bc3, 2026-10-20, filed as "your pieces
  //     reach fewer squares" while the bishop had left e3 to a knight fork).
  //     The same reader Learn speaks the mistake with, so the record and the
  //     voice name one lesson.
  if (input.pvAfterPlayed?.length) {
    try {
      const uci: string[] = [];
      const c = new Chess(played.fen());
      for (const s of input.pvAfterPlayed.slice(0, 2)) { const m = c.move(s); uci.push(`${m.from}${m.to}${m.promotion ?? ''}`); }
      const ew = errorWhy({
        // Their two-move answer only — inside two moves, one read names it.
        secondReads: NO_SECOND_READ, costCp: null,
        fenBefore: input.fen, playedSan: input.playedSan, moverColor: mover === 'w' ? 'white' : 'black',
        bestSan: input.bestSan ?? null, bestLineUci: null, replyLineUci: uci,
        missedMate: null, allowedMate: null, bestMate: null, quality: 'inaccuracy', priorMove: null,
        replySan: null, namesBetterMove: false,
      });
      if (ew.guardLeft && ew.failed) return { tag: 'missed-opponents-threat', coachNote: ew.failed };
    } catch { /* fall through */ }
  }

  // 3. THE BOARD after the two moves, then 4. THE BEST MOVE'S JOB — the one
  //    positional computer; the record names the better move (it is filed).
  const board = boardReason(input.fen, input.playedSan, input.bestSan ?? null, input.phase) ?? bestJobReason(input.fen, input.bestSan ?? null);
  if (board) return { tag: board.tag, coachNote: board.note };
  // No best move to compare against: nothing can be named honestly.
  return null;
}

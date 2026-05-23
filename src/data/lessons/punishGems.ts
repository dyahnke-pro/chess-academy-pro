// Punish-the-inaccuracy gems → WLPP-ready lines (WO: docs/plans/2026-05-23-punish-gems-wo.md).
//
// The weapon section's SPINE: the common move the opponent actually plays at
// your level that scores badly for them, and the punish played out to its
// resolution. Mined from the amateur DB (the mistake) + masters (the crush)
// by scripts/mine-punish-gems.mjs. Every move comes from the DB; every claim
// from explorer numbers / the engine — nothing invented (G3).
import { Chess } from 'chess.js';
import gemsData from '../punish-gems.json';
import type { PlayableMiddlegameLine, AnnotationArrow } from '../../types';

export interface PunishGem {
  openingId: string;
  lineMoves: string;
  inaccuracy: string;
  freqPct: number;
  games: number;
  practicalScore: number;
  mainMove: string;
  punish: string;
  punishSeq: string[];
  playLine: string;
  engineCp: number | null;
  tier: 'practical' | 'confirmed' | 'weak';
  why: string;
}

const GEMS = gemsData as PunishGem[];

/** A stable id for state/keys — opening + the inaccuracy's position + the slip. */
export function gemId(gem: PunishGem): string {
  return `${gem.openingId}:${gem.lineMoves.replace(/\s+/g, '_')}:${gem.inaccuracy}`;
}

export function getPunishGemsForOpening(openingId: string | undefined | null): PunishGem[] {
  if (!openingId) return [];
  return GEMS.filter((g) => g.openingId === openingId);
}

/** Gems whose opening spine starts with the given tab spine (SAN PGN). When
 *  `tabSpinePgn` is empty/undefined (main line), every gem for the opening
 *  surfaces. So each variation tab shows only the gems that live on its line. */
export function getPunishGemsForTab(
  openingId: string | undefined | null,
  tabSpinePgn?: string | null,
): PunishGem[] {
  const all = getPunishGemsForOpening(openingId);
  const spine = (tabSpinePgn ?? '').trim();
  if (!spine) return all;
  const prefix = spine.split(/\s+/).filter(Boolean);
  return all.filter((g) => {
    const line = g.lineMoves.split(/\s+/).filter(Boolean);
    return prefix.every((m, i) => line[i] === m);
  });
}

export function getPunishGemById(id: string): PunishGem | null {
  return GEMS.find((g) => gemId(g) === id) ?? null;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** FEN of the position the opponent faces just before they play the
 *  inaccuracy — the still the gem tile shows. */
export function gemInaccuracyFen(gem: PunishGem): string {
  const chess = new Chess();
  for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) {
    try { chess.move(san); } catch { break; }
  }
  return chess.fen();
}

/** Convert a gem into a WLPP-ready PlayableMiddlegameLine: the full line from
 *  move 1, each move carrying its lead-the-eye move-arrow (ORANGE = the move's
 *  two squares, per the locked colour language). Voice is grounded and
 *  lead-the-eye-clean: silent through the book setup, the inaccuracy beat
 *  names ONLY the inaccuracy (its move-arrow points there), the punish beat
 *  names ONLY the punish. No square is named without an arrow on it. */
export function gemToPlayableLine(gem: PunishGem): PlayableMiddlegameLine | null {
  const moves = gem.playLine.split(/\s+/).filter(Boolean);
  if (moves.length === 0) return null;

  const setup = gem.lineMoves.split(/\s+/).filter(Boolean);
  const inaccuracyPly = setup.length; // the inaccuracy is the first move after the spine
  const punishPly = inaccuracyPly + 1;

  const chess = new Chess(START_FEN);
  const arrows: AnnotationArrow[][] = [];
  const annotations: string[] = [];

  for (let i = 0; i < moves.length; i++) {
    let from = '';
    let to = '';
    try {
      const mv = chess.move(moves[i]);
      from = mv.from;
      to = mv.to;
    } catch {
      // playLine is gate-proven legal, but stay defensive.
      break;
    }
    arrows.push(from && to ? [{ from, to, color: 'orange' }] : []);

    if (i === inaccuracyPly) {
      annotations.push(
        `${gem.inaccuracy} is a common try here — at your level it scores worse for your opponent than the main move.`,
      );
    } else if (i === punishPly) {
      annotations.push(`Punish with ${gem.punish}.`);
    } else {
      annotations.push('');
    }
  }

  const title = `Punish ${gem.inaccuracy} with ${gem.punish}`;
  return { fen: START_FEN, moves, annotations, arrows, title };
}

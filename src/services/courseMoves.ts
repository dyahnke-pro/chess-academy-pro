import { Chess } from 'chess.js';
import type { OpeningRecord, SrsOpeningCard } from '../types';
import { sublinesForOpening } from './openingCourse';
import { normalizeSan } from './srsOpeningService';
import { positionOf } from '../utils/samePosition';

/**
 * Every move the course teaches the STUDENT at each position of an opening —
 * the main line, every variation and every subline — and every move of a line
 * the student LEARNED (`learned`: their review cards for the opening).
 *
 * A review card holds one answer, but the course can teach two at the same
 * board: the Italian main line plays d3 where its Nc3 line plays d4 (208 such
 * positions across main lines and variations, 1,657 more with the sublines,
 * measured 2026-10-27). Grading only the card's answer marked the other line's
 * move wrong. This is computed from the course itself at review time, so a
 * card written before it existed is graded right too. The replies built from
 * the games and the club replies live in no course file; once learned, their
 * cards say they are taught to this student (WO-COURSE-01 D — a reply line
 * learned is never a miss in another line's review).
 */
export function taughtMovesByPosition(
  opening: OpeningRecord,
  learned: ReadonlyArray<Pick<SrsOpeningCard, 'fenBefore' | 'expectedSan'>>,
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const studentTurn = opening.color === 'white' ? 'w' : 'b';
  const add = (sans: string[]): void => {
    const chess = new Chess();
    for (const san of sans) {
      const before = chess.fen();
      let move;
      try {
        move = chess.move(san);
      } catch {
        return;
      }
      if (before.split(' ')[1] === studentTurn) {
        const key = positionOf(before);
        const set = out.get(key) ?? new Set<string>();
        set.add(normalizeSan(move.san));
        out.set(key, set);
      }
    }
  };
  add(pgnTokens(opening.pgn));
  for (const v of opening.variations ?? []) add(pgnTokens(v.pgn));
  for (const list of Object.values(sublinesForOpening(opening.id))) {
    for (const s of list) add(s.moves);
  }
  for (const card of learned) {
    const key = positionOf(card.fenBefore);
    const set = out.get(key) ?? new Set<string>();
    set.add(normalizeSan(card.expectedSan));
    out.set(key, set);
  }
  return out;
}

function pgnTokens(pgn: string | null | undefined): string[] {
  return (pgn ?? '')
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^\d+\.(\.\.)?/, ''))
    .filter((t) => t.length > 0 && !/^\d+\.?$/.test(t));
}

/** How a move played in review reads against the course. `other-line` is a
 *  move the course teaches at this position for a different line — never a
 *  miss, but not this line's move either. */
export type ReviewAnswer = 'correct' | 'other-line' | 'wrong';

export function judgeReviewAnswer(
  played: string,
  expected: string,
  taughtHere: ReadonlySet<string> | undefined,
): ReviewAnswer {
  const p = normalizeSan(played);
  if (p === normalizeSan(expected)) return 'correct';
  return taughtHere?.has(p) ? 'other-line' : 'wrong';
}

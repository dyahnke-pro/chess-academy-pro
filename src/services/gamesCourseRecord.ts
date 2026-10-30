// gamesCourseRecord — THE OPENING PAGE'S VIEW OF A DATABASE-ONLY OPENING
// (WO-ALL-OPENINGS-01 P3, David 2026-10-28: "Make sure the 'all' section of the
// openings teaches and builds this way"). An opening with no hand-built lesson
// used to leave its page for Learn with Coach. It now stays: `buildGamesCourse`
// runs on the stored trees (the master tree, then the strong-online tree past
// it — `storedTreeAt`, never a live read), the main line runs on to the
// middlegame and every real split is a variation tab, and Stockfish only
// vetoes a main line that leaves the student lost. Every move is a move
// strong players played (G3).
import type { OpeningRecord } from '../types';
import { buildGamesCourse, courseRecord, type GamesCourse } from './gamesCourse';
import { storedTreeAt } from './deepTree';
import { inferStudentSideFromName } from './openingDetectionService';
import { stockfishEngine } from './stockfishEngine';

/** How long the veto waits for one engine read before taking the line as is. */
const VETO_READ_MS = 4000;

/** The engine's read of a board for the student, cp (+ good for them), or
 *  null when it does not answer in `ms`. */
async function studentEval(fen: string, side: 'white' | 'black', ms: number): Promise<number | null> {
  const read = stockfishEngine.analyzePosition(fen, 12).catch(() => null);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), ms));
  const a = await Promise.race([read, timeout]);
  if (!a) return null;
  return side === 'white' ? a.evaluation : -a.evaluation;
}

const built = new Map<string, Promise<GamesCourse | null>>();

/** The course for one opening, built once per session (the page reloads its
 *  record after every rung, and the course does not change between them). */
function courseFor(opening: OpeningRecord, side: 'white' | 'black'): Promise<GamesCourse | null> {
  const hit = built.get(opening.id);
  if (hit) return hit;
  const sans = opening.pgn.trim().split(/\s+/).filter(Boolean);
  const job = buildGamesCourse(sans, side, {
    lookup: storedTreeAt,
    veto: (fen) => studentEval(fen, side, VETO_READ_MS),
  }).catch(() => null);
  built.set(opening.id, job);
  // Nothing built, or a lookup failed (thinner than the data): build again
  // next time rather than keep the thin answer.
  void job.then((c) => { if (!c || c.incomplete) built.delete(opening.id); });
  return job;
}

/** A database-only opening's page view, built from the stored trees: the
 *  record with its main line run on to the middlegame and every real split a
 *  variation, in the seat the name teaches. The record's own progress (rungs,
 *  unlocks) is kept as read. Null when the tree holds nothing past the named
 *  line — the page then hands off to Learn with Coach as before. */
export async function gamesCourseRecord(opening: OpeningRecord): Promise<OpeningRecord | null> {
  const side = inferStudentSideFromName(opening.name);
  const named = opening.pgn.trim().split(/\s+/).filter(Boolean).length;
  const course = await courseFor(opening, side);
  if (!course || (course.main.sans.length <= named && course.variations.length === 0)) return null;
  return { ...courseRecord(opening, course, side), color: side };
}

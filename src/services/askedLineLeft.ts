// askedLineLeft — WHERE THE GAME LEFT THE ASKED LINE, SAID ONLY WHEN IT HURT.
//
// Its own module, not a function of `openingDetectionService` (2026-11-21):
// the lookup module must not import the teaching chain (bookMoveWhy →
// teachingSentence → …), which reaches back into it. With that cycle a test
// that mocks `openingDetectionService` got the real module under its mock in
// every module the cycle loaded first — the analysis tests graded every ply
// "book" because their "nothing is book" mock never applied.
import { Chess } from 'chess.js';
import { resolveOpeningEntry } from './openingDetectionService';
import { askedLineDeparture, type AskedLineDeparture } from './askedLineDeparture';
import { bookMoveWhy } from './bookMoveWhy';
import { renderAskedLineLeft } from './teachingSentence';
import { spokenOpeningLabel } from './openingAnnouncement';
import { MISTAKE_CP } from './engineConstants';

/** WHERE THE GAME LEFT THE LINE THE STUDENT ASKED FOR — the one path Learn's
 *  opening lane and Play's plan tracker both read (David 2026-11-21). It owns
 *  the asked line (the exact PGN the student launched, else the named
 *  opening's canonical entry) and the departure computer; the surface only
 *  says it.
 *
 *  🔒 IT SPEAKS ONLY WHEN LEAVING THE LINE HURT (David 2026-11-21: "It should
 *  only speak if it hurts the user. Like staying on book was better
 *  because…"): the student's own move left it, the move cost at least a
 *  mistake (`MISTAKE_CP`, the surface's one price — REQUIRED, null when the
 *  move is not priced, and then nothing is said), and the board shows what the
 *  line's move does that theirs does not (`bookMoveWhy`; never bare, the
 *  opening-slip rule). The opponent leaving the line costs the student
 *  nothing, so it is never said. Null otherwise. */
export function askedLineLeft(
  asked: { name: string; pgn?: string | null },
  played: readonly string[],
  studentColor: 'w' | 'b',
  sinceIndex: number,
  costCp: number | null,
): { text: string; squares: string[]; departure: AskedLineDeparture; canonicalName: string } | null {
  if (costCp === null || costCp < MISTAKE_CP) return null;
  const pgn = asked.pgn?.trim();
  const entry = pgn ? null : resolveOpeningEntry(asked.name);
  const line = pgn ? pgn.split(/\s+/).filter(Boolean) : entry?.moves ?? [];
  if (line.length === 0) return null;
  const departure = askedLineDeparture(played, line, studentColor, sinceIndex);
  if (!departure || departure.seat !== 'student') return null;
  let fen: string;
  try { const c = new Chess(); for (const san of played.slice(0, departure.ply)) c.move(san); fen = c.fen(); } catch { return null; }
  const why = bookMoveWhy(fen, departure.book, departure.played, studentColor);
  if (!why?.job) return null;
  const canonicalName = entry?.canonicalName ?? asked.name;
  const text = renderAskedLineLeft({ name: spokenOpeningLabel(canonicalName), book: departure.book, job: why.job, left: why.left ?? null, moveNumber: departure.moveNumber, ply: departure.ply });
  return { text, squares: [...why.squares], departure, canonicalName };
}

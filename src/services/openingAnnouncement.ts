// openingAnnouncement — WHEN the live coach names the opening, and what it says
// (WO-TEACH-02 S1, David 2026-09-24: every line teaches).
//
// A live Learn game announced the opening four times in ten plies on prod:
// "This game is now the Scandinavian Defense" → "…sharpened into the Main
// Line" → "…Main Line, Mieses Variation" → "…Lasker Variation". Each is the
// detector refining its guess, not the student learning anything. The rule:
//  1. the FIRST identification is said — naming the opening opens the arc;
//  2. refinements while the game is still in book wait silently;
//  3. the name the game settled on is said ONCE, at the ply the game leaves
//     book — which is itself the teaching: how far their theory went.
//
// One function, so the two Learn lanes that build this sentence cannot drift.

import { bookDeparture, warmBookPosition, type BookDeparture } from './bookDeparture';
import { sayMoveNoun } from './spokenMove';

export interface DetectedName {
  name: string;
}

/**
 * `departure` is REQUIRED and must be `bookDeparture(history)` — the ply that
 * left THEORY (the masters DB), or null while the game is still in book. It
 * used to be `isBookLine(history)`, the NAME database, which is prefix-sparse:
 * its Philidor Exchange entry ends at 3…exd4, so the main-line 4.Nxd4 was told
 * "You've left the book here" (hand walk 2026-09-24). The departure also says
 * WHO left and the usual move there, so the line teaches instead of blaming.
 * `studentColor` is REQUIRED: "you left" and "they left" are different claims.
 */
export function openingAnnouncement(
  det: DetectedName | null,
  departure: BookDeparture | null,
  spokenName: string | null,
  studentColor: 'w' | 'b',
): string | null {
  if (!det || !det.name || det.name === spokenName) return null;
  if (spokenName === null) return `This game is the ${det.name}.`;
  if (!departure) {
    // STILL IN BOOK, BUT THE NAME SHARPENED — "Sicilian Defense" became
    // "Sicilian Defense: Alapin Variation" on c3. That is the variation name,
    // and the student heard only the family (hand walk 2340: his "c3 — the
    // Alapin"). A name that is not a refinement of the one spoken stays quiet:
    // that is a transposition, not news.
    // A FAMILY that sharpens is news too: "Indian Defense: Normal Variation"
    // → "King's Indian Defense" (hand walk 2026-09-25 — his "another King's
    // Indian" was never named). The new family CONTAINS the spoken one.
    const spokenFamily = spokenName.split(':')[0].trim();
    const newFamily = det.name.split(':')[0].trim();
    if (!det.name.startsWith(spokenName)) {
      if (newFamily === spokenFamily || !newFamily.includes(spokenFamily)) return null;
      return `It's the ${det.name.replace(/:\s*(?:Normal Variation|Main Line)\b.*$/i, '')}.`;
    }
    const tail = det.name.slice(spokenName.length).replace(/^[\s:,]+/, '').trim();
    // "Main Line" names nothing the student can look up — the family is enough.
    if (!tail || /^main line\b/i.test(tail)) return null;
    return `It's the ${tail}.`;
  }
  const who = departure.mover === studentColor ? 'You' : 'They';
  const main = departure.mainSan
    ? `; the usual move there was ${sayMoveNoun(departure.mainSan)}`
    : '';
  return `${who} left the book with ${sayMoveNoun(departure.san)}${main}. The line was the ${det.name}.`;
}

/** The same announcement read straight off the game's move history — the
 *  departure is computed here, so a surface composes ONE computer, not two
 *  (the surface-composition ceiling). */
export function openingAnnouncementForGame(
  det: DetectedName | null,
  history: readonly string[],
  spokenName: string | null,
  studentColor: 'w' | 'b',
): string | null {
  return openingAnnouncement(det, bookDeparture(history), spokenName, studentColor);
}

/** Warm the book read for the position now on the board — the surface calls
 *  this once per new position, so the announcement never waits on a fetch. */
export function warmOpeningBook(fen: string, surface: string): void {
  warmBookPosition(fen, surface);
}

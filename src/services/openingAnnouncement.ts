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
import { costWords, MISTAKE_CP } from './engineConstants';
import { transposedOpening } from './openingPositions';
import type { DetectedOpening } from '../types';

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
/** Lichess filler labels that name no line a student can look up. */
// A PLURAL "… Variations" is the DB's grouping label, not a line ("Sicilian
// Defense: Modern Variations" → "It's the Modern Variations", 1200 walk
// 2026-09-27); a singular named variation stays.
const GENERIC_TAIL = /^(?:main line|normal variation|rare (?:defen[cs]es?|variations?|lines?)|other (?:variations?|lines?)|\w+ variations$)/i;

/** The name as it is SAID: a filler tail is dropped ("Indian Defense: Normal
 *  Variation" → "Indian Defense"), a real one kept. */
export function spokenOpeningLabel(name: string): string {
  return spoken(name);
}
function spoken(name: string): string {
  const [family, ...rest] = name.split(':');
  const tail = rest.join(':').trim();
  if (!tail) return name.trim();
  const parts = tail.split(',').map((p) => p.trim()).filter((p) => p && !GENERIC_TAIL.test(p));
  return parts.length ? `${family.trim()}: ${parts.join(', ')}` : family.trim();
}

export function openingAnnouncement(
  det: DetectedName | null,
  departure: BookDeparture | null,
  spokenName: string | null,
  studentColor: 'w' | 'b',
  /** The name was read off the POSITION after a different move order
   *  (`transposedOpening`) — a family change is then news, said as one. */
  transposed = false,
): string | null {
  if (!det || !det.name || det.name === spokenName) return null;
  if (spokenName === null) return `This game is the ${spoken(det.name)}.`;
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
      if (transposed && newFamily !== spokenFamily) return `By a different move order, the game has transposed into the ${spoken(det.name)}.`;
      if (newFamily === spokenFamily || !newFamily.includes(spokenFamily)) return null;
      return `It's the ${newFamily}.`;
    }
    const tail = det.name.slice(spokenName.length).replace(/^[\s:,]+/, '').trim();
    // "Main Line" names nothing the student can look up — the family is enough.
    // (nor do the DB's filler labels — "Normal Variation", "Rare Defenses",
    // hand walk 2026-09-25).
    if (!tail || GENERIC_TAIL.test(tail)) return null;
    return `It's the ${tail}.`;
  }
  const who = departure.mover === studentColor ? 'You' : 'They';
  const main = departure.mainSan
    ? `; the usual move there was ${sayMoveNoun(departure.mainSan)}`
    : '';
  // THE LINE IS THE ONE ALREADY NAMED unless the move-order name sharpens it
  // (Learn walk 2026-10-01: "transposed into the King's Indian Defense" and
  // then, at the departure, "The line was the English Opening: Anglo-Indian
  // Defense" — the move-order name the transposition had replaced). A name the
  // student has just heard is not repeated.
  // A generic family ("King's Pawn Game") still gives way to the real name.
  const spokenIsVariation = spokenName.includes(':');
  const line = det.name.startsWith(spokenName) || !spokenIsVariation ? det.name : spokenName;
  const lineTail = line === spokenName ? '' : ` The line was the ${spoken(line)}.`;
  return `${who} left the book with ${sayMoveNoun(departure.san)}${main}.${lineTail}`;
}

/** The same announcement read straight off the game's move history — the
 *  departure is computed here, so a surface composes ONE computer, not two
 *  (the surface-composition ceiling). */
export function openingAnnouncementForGame(
  det: DetectedName | null,
  history: readonly string[],
  spokenName: string | null,
  studentColor: 'w' | 'b',
  transposed = false,
): string | null {
  const dep = bookDeparture(history);
  // A DEPARTURE IS NEWS ONLY WHEN IT JUST HAPPENED. Found late — a name the
  // detector sharpened forty moves in — it announced "You left the book with
  // the pawn to h5" at move 39 (run C walk 2026-09-30). Stale: say nothing.
  if (spokenName !== null && dep && history.length - dep.ply > 1) return null;
  return openingAnnouncement(det, dep, spokenName, studentColor, transposed);
}

/** Warm the book read for the position now on the board — the surface calls
 *  this once per new position, so the announcement never waits on a fetch. */
export function warmOpeningBook(fen: string, surface: string): void {
  warmBookPosition(fen, surface);
}

/** Did THIS student move leave the book? The opening lane announces such a
 *  departure; a lane that would say it again reads this instead of the book. */
export function studentJustLeftBook(history: readonly string[], studentColor: 'w' | 'b'): boolean {
  const dep = bookDeparture(history);
  return !!dep && dep.mover === studentColor && history.length - dep.ply <= 1;
}

/** The name to announce for this board: the move-order match, or — when the
 *  board is a named DB position the move order never reached — that position's
 *  name, flagged as a transposition (`openingPositions`). */
export function openingNameForBoard(
  byOrder: DetectedOpening | null,
  fen: string,
  historyLength: number,
): { det: DetectedName | null; transposed: boolean } {
  const t = transposedOpening(fen, historyLength, byOrder);
  if (t) return { det: { name: t }, transposed: true };
  return { det: byOrder, transposed: false };
}

/** Below this an opponent's sideline is fair — the announcement already named
 *  the usual move, and a verdict would be noise. */
export const SIDELINE_FAIR_CP = 30;
/** From here their sideline is dubious, said as such. */
export const SIDELINE_DUBIOUS_CP = 80;

/**
 * A VERDICT ON THEIR OPENING CHOICE (pass-2 walk 2026-09-30, his most frequent
 * missing idea: "…Bg4 is dubious", "c3 is already a mediocre move"). Only on
 * the move that just left the masters' book, only the opponent's, and only
 * with the engine's cost of it — the book says what is usual, the engine says
 * whether leaving it costs anything. A fair sideline says nothing.
 */
export function theirOpeningVerdict(
  history: readonly string[], studentColor: 'w' | 'b', cpLoss: number,
  /** The coach chose this move itself — a real slip (>= the mistake floor) is
   *  then the coach-verdict lane's, not this one's. */
  coachChose: boolean,
): string | null {
  if (coachChose && cpLoss >= MISTAKE_CP) return null;
  const dep = bookDeparture(history);
  if (!dep || dep.ply !== history.length || dep.mover === studentColor || !dep.mainSan) return null;
  if (cpLoss < SIDELINE_FAIR_CP) return null;
  const main = sayMoveNoun(dep.mainSan);
  if (cpLoss >= SIDELINE_DUBIOUS_CP) return `That is a dubious choice — ${main} is the move here, and this one costs them ${costWords(cpLoss)}.`;
  return `It is a weaker choice than ${main} — it costs them ${costWords(cpLoss)}.`;
}

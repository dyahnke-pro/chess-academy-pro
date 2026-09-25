// bookDeparture — did the game leave opening theory, on which ply, and who
// left it (hand walk 2026-09-24).
//
// The Learn coach told a student "You've left the book here" after 4.Nxd4 in
// the Philidor — the main-line recapture. The book check was `isBookLine`, the
// NAME database, which is prefix-sparse: its Exchange Variation entry simply
// stops at 3…exd4, so any fourth move "left book". The name DB says what a line
// is CALLED; it was never a record of what is PLAYED.
//
// WHERE THE MASTERS DATA COMES FROM (David 2026-09-24: "live explorer with a
// cache"). Not the 37 MB local file — parsing that on a phone is the memory
// spike iOS kills apps for. Each position is looked up through the live
// explorer as it appears on the board (`warmBookPosition`), saved on the
// device, and read back here synchronously. A position not looked up yet reads
// as unknown, and unknown claims nothing.
//
// Theory is what masters actually play, so the masters DB decides: a move is
// book when masters played it at that position in at least MIN_BOOK_GAMES
// games. Where the masters DB has no entry for a position (not loaded, or past
// its depth), a name-DB MISS is not evidence of anything — it is sparse by
// construction — so no departure is claimed at all. Silence over a false
// "you left the book". A name-DB HIT still counts as in book.
//
// The departure also carries WHO left (the student or the opponent) and the
// usual move there, so the sentence can teach the theory instead of blaming the
// wrong side.
import { Chess } from 'chess.js';
import { masterMovesCachedSync, lookupMasterPlay } from './masterPlayLookup';
import { isBookLine } from './openingDetectionService';

/** Same bar as `theoryDeparture` — book claims need real mass behind them. */
export const MIN_BOOK_GAMES = 20;
/** Nobody is "in book" at move 30. */
const MAX_SCAN_PLIES = 60;

export interface BookDeparture {
  /** 1-based ply of the move that left book. */
  ply: number;
  san: string;
  mover: 'w' | 'b';
  /** Masters' most-played move at the book position, when it has real mass. */
  mainSan: string | null;
}

/** The first ply that left theory, or null while the game is still in book. */
export function bookDeparture(history: readonly string[]): BookDeparture | null {
  const board = new Chess();
  const n = Math.min(history.length, MAX_SCAN_PLIES);
  for (let i = 0; i < n; i += 1) {
    const fen = board.fen();
    const mover = board.turn();
    let played;
    try { played = board.move(history[i]); } catch { return null; }
    const masters = masterMovesCachedSync(fen);
    if (masters) {
      const hit = masters.find((m) => m.san === played.san);
      if (hit && hit.games >= MIN_BOOK_GAMES) continue;
      const top = [...masters].sort((a, b) => b.games - a.games)[0];
      return {
        ply: i + 1,
        san: played.san,
        mover,
        mainSan: top && top.games >= MIN_BOOK_GAMES && top.san !== played.san ? top.san : null,
      };
    }
    if (isBookLine(history.slice(0, i + 1))) continue;
    return null;
  }
  return null;
}

/** Look this position up in the masters explorer ahead of time (memory → saved
 *  on the device → live), so `bookDeparture` can answer synchronously when the
 *  next move lands. Fire-and-forget: offline or a failed fetch just leaves the
 *  position unknown. Skips the 37 MB local file on purpose. */
export function warmBookPosition(fen: string, surface: string): void {
  void lookupMasterPlay(fen, { triggeredBy: 'book-departure', surface, skipLocalDb: true }).catch(() => undefined);
}

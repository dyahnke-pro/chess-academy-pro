// positionalRead — something true to say when nothing is happening.
//
// David 2026-08-08, after seeing the ply-by-ply transcript: "There needs to be
// positional notes then or something at the silent plies."
//
// Measured over the 656 student plies of the repertoire we teach, all lanes
// together speak on 54.3%. The corpus reaches ~14% (only 6,768 of 58,124 notes
// carry a position at all), the tactic and threat detectors reach the sharp
// moments, and `buildPlayCommentary` covers the rest of what is CONCRETE. What
// is left is the quiet middle: legal, balanced, nothing hanging, no alignment —
// and a coach that says nothing there feels absent for half the game.
//
// A quiet position is not an empty one. It has a king that has or has not
// castled, a development count, a weak pawn, an outpost, a lever available. All
// of that is already computed, board-true, in `positionReadingService` — and
// was reachable only through `formatReadingFacts`, a prompt block that opens
// "READING FACTS (GROUND TRUTH …)" and can never be spoken. So the facts
// existed and the voice could not use them.
//
// This turns the same computation into ONE spoken sentence. Ranked, so the
// student hears the most useful observation rather than the first one found,
// and hard-capped at one: filling silence with a paragraph is how a coach gets
// muted.
//
// It is the LOWEST-priority lane by design. It should never displace a tactic,
// a threat, a gem or a taught note — it is what plays when none of them have
// anything, which per the measurement is about half the game.
import type { Color } from 'chess.js';
import {
  kingSafetyRead,
  developmentRead,
  findWeakPawns,
  findPieceQuality,
  findPawnBreaks,
  strongestWeakestPiece,
} from './positionReadingService';

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * One speakable observation about a quiet position, or '' when even this has
 * nothing — which is rare, and when it happens silence is the honest answer.
 *
 * Every branch states a fact a chess.js read established. None of them names a
 * move: this lane exists to teach the student to SEE, and handing over the move
 * is the thing the coach is explicitly not supposed to do.
 */
export function buildPositionalRead(fen: string, studentColor: 'white' | 'black'): string {
  const me: Color = studentColor === 'white' ? 'w' : 'b';
  const them: Color = me === 'w' ? 'b' : 'w';

  // 1. KING SAFETY — the one positional fact that decides games outright, so it
  //    outranks everything else here.
  const king = kingSafetyRead(fen, me);
  if (king) {
    if (king.inCenter && !king.castled) {
      return 'Your king is still in the centre — getting it castled is worth more than another pawn move right now.';
    }
    if (king.exposed && king.openFilesNearKing.length > 0) {
      const files = king.openFilesNearKing.slice(0, 2).join(' and ');
      return `The ${files} file${king.openFilesNearKing.length > 1 ? 's are' : ' is'} open toward your king — that is the road an attack would come down.`;
    }
  }

  // 2. DEVELOPMENT — countable, and the most common thing a student is behind
  //    on without noticing.
  const mine = developmentRead(fen, me);
  const theirs = developmentRead(fen, them);
  if (mine && theirs && mine.totalMinors > 0) {
    const asleep = mine.totalMinors - mine.developedMinors;
    if (asleep >= 2 && theirs.developedMinors > mine.developedMinors) {
      return `You still have ${asleep} minor pieces at home and they are ahead in development — the next move probably belongs to a piece, not a pawn.`;
    }
  }

  // 3. A PIECE DOING REAL WORK, or failing to. Named by its square so the eye
  //    lands on it.
  const quality = findPieceQuality(fen);
  const outpost = quality.find((q) => q.color === me && q.quality === 'good');
  if (outpost) {
    return `Your ${NAME[outpost.piece] ?? 'piece'} on ${outpost.square} is your best-placed piece — ${outpost.reason}.`;
  }
  const bad = quality.find((q) => q.color === me && q.quality === 'bad');
  if (bad) {
    return `Your ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is your problem piece — ${bad.reason}. Improving it is a plan in itself.`;
  }

  // 4. STRUCTURE — a weakness that will still be there in the endgame.
  const weak = findWeakPawns(fen, me);
  if (weak.isolated.length > 0) {
    return `Your pawn on ${weak.isolated[0]} is isolated — no friendly pawn can ever defend it, so a piece has to.`;
  }
  const theirWeak = findWeakPawns(fen, them);
  if (theirWeak.isolated.length > 0) {
    return `Their pawn on ${theirWeak.isolated[0]} is isolated — that is a long-term target worth playing against.`;
  }
  if (weak.doubled.length > 0) {
    return `Your pawns on the ${weak.doubled[0][0]}-file are doubled — they cannot defend each other, so the file matters more than the count.`;
  }

  // 5. A LEVER. Last because it is the least specific, but a pawn break is the
  //    honest answer to "what do I even do here".
  const breaks = findPawnBreaks(fen);
  if (breaks.length > 0) {
    return `A pawn break is available on ${breaks[0]} — in a quiet position the pawn levers are where the play comes from.`;
  }

  // 6. Nothing structural at all. Name the strongest piece so the read is still
  //    concrete, or say nothing.
  const { strongest } = strongestWeakestPiece(fen, me);
  if (strongest) {
    return `Nothing is forcing here. Your ${NAME[strongest.piece] ?? 'piece'} on ${strongest.square} is doing the most work — build around it.`;
  }
  return '';
}

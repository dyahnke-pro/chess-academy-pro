// sourceMeta.shared — the ONE definition of "this note is ABOUT its source
// rather than about chess".
//
// Shared ESM (typed by sourceMeta.shared.d.mts) so the runtime selector and the
// corpus-stripping script cannot disagree. Same shape as
// `narrationQuality.shared.mjs`, for the same reason: two copies of a rule this
// load-bearing drift, and the drift is invisible — a note the script kept and
// the runtime refuses is dead payload; one the script stripped but the runtime
// would have spoken is lost teaching.
//
// WHY (David 2026-09-19, reading real samples): "those we do not need. they
// were messing up the narration for our coach."
//
//   "In the early stages of a theoretical speed run, general concepts are
//    emphasized over specific opening theory…"                    ← the FORMAT
//   "The opponent played with extremely high accuracy… which left the speaker
//    with no chances."                                          ← the NARRATOR
//
// 🚨 IT IS A CONJUNCTION, AND THAT IS THE WHOLE DESIGN. Three cheaper rules
// were tried first and every one deleted real teaching:
//   • medium PHRASES alone killed "In the Italian Game (e4 e5 Nf3 Nc6 Bc4), the
//     speaker recommends …Nf6" — a real recommendation wearing an attribution.
//   • a "format words" list killed "In the Vienna Gambit (e4 e5 Nc3)… at the
//     1500-1700 rating level" on the words `rating level`. 23 hits, samples
//     were all teaching.
//   • "names no square or piece" killed "apply the checks, captures, threats
//     method" and "a piece defended only by one other piece is vulnerable".
// So a note is junk ONLY when it names the medium AND carries no chess of its
// own. That spares every case above, because each one names a move or a piece.
//
// The asymmetry is deliberate: a false NEGATIVE leaves one bad note that three
// selectors already refuse, while a false POSITIVE silently deletes teaching
// nobody can get back. When in doubt this keeps the note.

/** Names the material or the person it came from. */
const MEDIUM =
  /\b(?:the|this)\s+(?:transcript|video|clip|course|lesson|repertoire|series|segment|stream|channel|episode)\b|\bthe (?:speaker|commentator|presenter|author|viewer|audience)\b|\bhe (?:says|explains|mentions|notes)\b|\bin this (?:episode|section)\b|\bspeed\s?runs?\b|\bsubscrib\w*\b|\bpatreon\b/i;

/** Concrete chess: a square, a SAN move, castling, or a piece/board noun. Kept
 *  GENEROUS on purpose — anything here means the note is teaching something,
 *  whatever frame it wears. */
const CHESS =
  /\b[a-h][1-8]\b|\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b|\bO-O(?:-O)?\b|\b(?:pawns?|knights?|bishops?|rooks?|queens?|kings?|files?|ranks?|diagonals?|castl\w*|fork|pin(?:ned|s)?|skewer|checkmate|stalemate|zugzwang|tempo|outpost|passed pawn|isolated|backward|fianchett\w*)\b/i;

function proseOf(note) {
  return `${note?.explains ?? ''} ${note?.teaches ?? ''} ${note?.plans ?? ''}`;
}

/** True when the note teaches CHESS. False ONLY for a note that names the
 *  medium and contains no chess of its own. */
export function noteTeachesChess(note) {
  try {
    const prose = proseOf(note);
    return !MEDIUM.test(prose) || CHESS.test(prose);
  } catch {
    return true;
  }
}

export { MEDIUM, CHESS };

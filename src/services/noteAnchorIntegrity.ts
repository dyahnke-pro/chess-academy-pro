// noteAnchorIntegrity — does a teaching note actually describe the position it
// is filed under?
//
// Selection now guarantees that a note reaches a ply only when its taught line
// PRODUCES that ply's position (`noteSelectionDeterminism.test`). That closes the
// case where the wrong note was picked. It does not close the case where the
// RIGHT note is filed at the wrong place: these corpora are distilled from video
// transcripts, and the anchor comes from the board state on screen while the
// prose comes from whatever the coach was talking about. Usually the same thing.
// Measured across all four corpora, 260 of 6,768 position-keyed notes — 3.8% —
// open by describing a position that is not their own:
//
//   dt-2e   anchored [e4 e6 d4 d5]        opens "After c4 Nf6 Nc3 g6 e4 e5"
//   dt-5u   anchored in a Najdorf          opens "After e4 e5 Nf3 Nc6 Bc4 Nf6 d3"
//
// Handing one of those to the model to phrase produces a confident, fluent lie
// about the board in front of the student — which is how a Caro-Kann lesson came
// to discuss a bishop on d6 at move two. So this is applied at SELECTION: a note
// that does not describe its own position is never chosen, and there is nothing
// downstream for a claim-stripper to catch (CLAUDE.md G0 — compute the answer,
// don't validate a guess).
//
// FREE at the call site. By the time selection runs, the note's anchor has been
// proven to reproduce the live FEN, so "reachable from the note's anchor" and
// "reachable from this board" are the same question — and the board is already
// in hand. No line replay.
//
// DELIBERATELY NARROW — only the note's FIRST sentence, and only when it opens on
// an explicit hypothetical ("After …", "If …", "In the line with …"). That clause
// is the beat's subject: if the position it names cannot arise here, everything
// after it is about somewhere else. Moves named deeper inside a note are
// consequences of a hypothetical and must NOT be judged against this board —
// "after Bg5 Nbd7, White plays Qd2" is correct teaching whose third move is
// legal only two plies later. Silence beats stripping a true claim.
import { Chess } from 'chess.js';
import type { DanyaNote } from './danyaTeachingService';

/** Piece moves, castling, and pawn CAPTURES. A bare square (`d4`) is excluded on
 *  purpose: prose says "the pawn on d4" far more often than it means the move,
 *  and treating those as moves flagged 910 notes where only 260 are real. */
const SAN_TOKEN = /\b(?:O-O(?:-O)?|[NBRQK][a-h1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b/g;

const HYPOTHETICAL_OPENER = /^(?:After|Once|In the line (?:after|with)|If)\s+([^,.]{2,60})/i;

/** Every move legal for EITHER side here. Both, because a note at a
 *  Black-to-move position saying "if White plays d4" is talking about the reply
 *  — legitimate teaching, and judging it against Black's move list alone would
 *  reject it. */
function movesReachableFrom(fen: string): Set<string> {
  const out = new Set<string>();
  const flipped = fen.replace(/ (w|b) /, (_m, side: string) => ` ${side === 'w' ? 'b' : 'w'} `);
  for (const candidate of [fen, flipped]) {
    try {
      for (const san of new Chess(candidate).moves()) out.add(san.replace(/[+#]/g, ''));
    } catch {
      // A flipped FEN can be illegal (side not to move already in check). The
      // other pass still contributes; an empty set simply means "can't judge".
    }
  }
  return out;
}

/**
 * True when the note may be spoken at `fen` — i.e. it does not open by
 * describing a position unreachable from this board.
 *
 * Returns TRUE whenever the question cannot be settled (no hypothetical opener,
 * no parseable moves, unparseable FEN). Only a PROVABLY misplaced note is
 * rejected; the cost of a wrong rejection is real teaching silenced, and empty
 * beats invented only when the alternative is actually invented.
 */
export function noteDescribesPosition(note: DanyaNote, fen: string | undefined): boolean {
  if (!fen) return true;
  try {
    const first = (note.explains ?? '').split(/(?<=[.!?])\s/)[0] ?? '';
    const opener = HYPOTHETICAL_OPENER.exec(first.trim());
    if (!opener) return true;

    const named = (opener[1].match(SAN_TOKEN) ?? []).map((san) => san.replace(/[+#]/g, ''));
    if (named.length === 0) return true;

    // A move the note's own line already played is a RECAP of how the student
    // got here, not a jump elsewhere — "After …Bc5" in a note anchored two plies
    // after …Bc5 is orienting, and correct.
    const played = new Set(note.lineSan.map((san) => san.replace(/[+#]/g, '')));
    const reachable = movesReachableFrom(fen);
    if (reachable.size === 0) return true;

    // Reject only when NOT ONE named move can occur here. A partial miss is
    // usually a continuation two plies deep, which this must not judge.
    return named.some((san) => reachable.has(san) || played.has(san));
  } catch {
    return true; // never let the integrity check itself silence teaching
  }
}

/** "the rook endgame", "in the endgame", "out of the opening" — a note that
 *  says outright which phase it is about. */
const PHASE_WORD = /\b(?:the\s+)?(opening|middlegame|endgame|ending)\b/i;

/**
 * True when the note's own words do not contradict the board's PHASE.
 *
 * A full game (2026-08-09) heard, in a middlegame with both bishops and both
 * rooks on: "The rook endgame turns on removing both white pawns while keeping
 * at least one black pawn." The note is fine teaching and it is filed as a
 * general CONCEPT, which is what let it through — the phase filter exempts
 * concept-tagged notes so they can apply anywhere, and most genuinely can. This
 * one names its phase in its first breath, and that name was wrong for the
 * board.
 *
 * Only a note that NAMES a phase is judged; everything else passes untouched.
 * "Opening" is deliberately not rejected in the middlegame — talking about what
 * came out of the opening is normal middlegame teaching — while an ENDGAME
 * claim on a board full of pieces is not.
 */
export function notePhaseMatchesBoardWords(
  note: DanyaNote,
  boardPhase: 'opening' | 'middlegame' | 'endgame' | null,
): boolean {
  if (!boardPhase || boardPhase === 'endgame') return true;
  try {
    const first = (note.explains ?? '').split(/(?<=[.!?])\s/)[0] ?? '';
    const named = PHASE_WORD.exec(first);
    if (!named) return true;
    const phase = named[1].toLowerCase();
    return phase !== 'endgame' && phase !== 'ending';
  } catch {
    return true;
  }
}

/** "The move Bh4 is a strong choice", "Bh4 is best here" — a note whose first
 *  sentence RECOMMENDS a specific move. */
const RECOMMENDS_MOVE = /^(?:The move\s+)?(O-O(?:-O)?|[NBRQK][a-h1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b(?=[^.]*\b(?:is|works|wins|holds)\b)/;

/**
 * True when a move the note recommends OUTRIGHT is legal on this board.
 *
 * The same game heard "The move Bh4 is a strong choice because it keeps the pin
 * on the knight" at a position where Bh4 was not available and no such pin
 * existed. `noteDescribesPosition` cannot catch it: that check only fires on an
 * explicit hypothetical opener ("After…", "If…"), and this sentence opens with
 * the recommendation itself.
 *
 * A recommendation is the strongest claim a note can make about a board, so it
 * is the one most worth checking — and the check is exact: either the move is
 * legal here or the note is about somewhere else.
 */
export function noteRecommendsALegalMove(note: DanyaNote, fen: string | undefined): boolean {
  if (!fen) return true;
  try {
    const first = ((note.explains ?? '').split(/(?<=[.!?])\s/)[0] ?? '').trim();
    const rec = RECOMMENDS_MOVE.exec(first);
    if (!rec) return true;
    const san = rec[1].replace(/[+#]/g, '');
    const reachable = movesReachableFrom(fen);
    return reachable.size === 0 || reachable.has(san);
  } catch {
    return true;
  }
}

/** Phrases that give away a note describing its own SOURCE rather than a chess
 *  position: the video it was distilled from, the course it belongs to, the
 *  person talking. */
const SOURCE_META = /\b(?:the|this)\s+(?:transcript|video|clip|course|lesson|repertoire|series|segment)\b|\bthe (?:speaker|commentator|presenter|author)\b|\bhe (?:says|explains|mentions|notes)\b|\bin this (?:episode|section)\b/i;

/**
 * True when the note teaches CHESS rather than describing the material it came
 * from.
 *
 * These corpora are distilled from video transcripts, and the distillation
 * sometimes keeps the frame instead of the content: "The transcript discusses a
 * common tactical pattern…", "The repertoire is built on the idea of …g6
 * setups". Measured past book, 8.2% of selected notes — one in twelve — opened
 * like that. Spoken to a student mid-game it is worse than silence: it breaks
 * the fiction that a coach is talking about their board, and it is precisely
 * the "never reference the interface / no meta" rule in the narration voice
 * rules, arriving through the corpus instead of through a template.
 *
 * Dropped at SELECTION for the same reason as everything else here — a note
 * that cannot be spoken should never be chosen (G0).
 */
export function noteTeachesChessNotItsSource(note: DanyaNote): boolean {
  try {
    return !SOURCE_META.test(`${note.explains} ${note.teaches} ${note.plans}`);
  } catch {
    return true;
  }
}

// ── A note may not narrate a DIFFERENT variation than the lesson ────────────
//
// David's 2026-08-05 prod run: a Tartakower/Breyer lesson spoke "In the
// Fantasy, the center is crucial…". Position selection cannot catch this class:
// at a SHARED prefix (e4 c6 d4 d5 is common to the Fantasy, Advance, Exchange,
// Classical and Tartakower) the note IS correctly anchored — its prose just
// teaches a branch the lesson never takes. `noteDescribesPosition` passes it
// because no unreachable move is named. 12.7% of position-keyed notes name a
// variation in their prose, so this is not a corner case.
//
// The check is against the note's PROSE, never its `opening` field — that field
// is unreliable (notes filed "Indian Defense" teach the Caro-Kann Fantasy).
/** "in the Fantasy Variation", "against the Advance", "the Botvinnik-Carls
 *  System" — a capitalised name attached to a variation-class noun. */
//
// `Game` earns its place in the class list: "Italian Game", "Vienna Game",
// "Four Knights Game", "Scotch Game" are how those openings are named, and
// without it a live Vienna heard "In the Italian Game… avoid the Fried Liver".
// It cannot over-fire on ordinary prose — the name before it must be
// capitalised, and the lowercase words that pass that shape are in
// NOT_A_VARIATION.
//
// The third arm catches a BARE name — "in this line of the Petrov", "the
// Bogo-Indian demands deep understanding". Openings are named that way as often
// as not, and without it a live game heard both of those spoken about a board
// that was neither. A capitalised word after "the" is the shape; the common
// words that fit it and are not openings are listed in NOT_A_VARIATION.
const NAMED_VARIATION = /\b([A-Z][a-zA-Z'-]+(?:[ -][A-Z][a-zA-Z'-]+){0,2})\s+(?:Variation|Defense|Defence|Attack|Gambit|System|Opening|Game)\b|\bthe\s+([A-Z][a-zA-Z'-]+)\s+variation\b|\b[Tt]he\s+([A-Z][a-zA-Z'-]+(?:-[A-Z][a-zA-Z'-]+)*)\b/g;

/** Words that pass the capitalised-name shape without naming an opening. */
const NOT_A_VARIATION = new Set([
  'the', 'this', 'that', 'a', 'an', 'his', 'her', 'their', 'in', 'main', 'king', 'queen',
  // Words that follow "the" and pass the capitalised-name shape without naming
  // an opening. Chess prose is full of them, and the bare-name arm above would
  // otherwise read every one as a foreign variation and drop a fine note.
  'white', 'black', 'centre', 'center', 'rook', 'bishop', 'knight', 'pawn',
  'kingside', 'queenside', 'exchange', 'endgame', 'middlegame', 'opening',
  'first', 'second', 'third', 'same', 'other', 'best', 'only', 'idea', 'plan',
  'move', 'position', 'board', 'game', 'line', 'point', 'key', 'both', 'engine',
]);

/**
 * True when every variation the note NAMES belongs to the lesson being taught.
 *
 * "Belongs" is a token test against the lesson's canonical name: a note saying
 * "in the Advance Variation" is in scope for "Caro-Kann Defense: Advance
 * Variation" and out of scope for the Exchange. A lesson named at family level
 * ("Caro-Kann Defense") keeps only notes naming the family itself — a
 * variation-naming note is exactly the risk there, since the family lesson
 * walks one specific spine (empty > generic > invented applies to scope too).
 *
 * A note that names NO variation always passes — this only judges notes that
 * commit to a name, and only drops provable mismatches.
 */
export function noteStaysInScope(
  note: DanyaNote,
  openingName: string | null | undefined,
): boolean {
  if (!openingName?.trim()) return true; // no lesson scope to violate
  try {
    const prose = `${note.explains} ${note.teaches} ${note.plans}`;
    // Hyphens SPLIT on both sides ("Caro-Kann" → caro, kann) so the two
    // tokenizations can never disagree about compound names.
    const lessonTokens = new Set(
      openingName
        .toLowerCase()
        .replace(/defence/g, 'defense')
        .split(/[^a-z']+/)
        .filter((t) => t.length > 2),
    );
    NAMED_VARIATION.lastIndex = 0;
    for (const m of prose.matchAll(NAMED_VARIATION)) {
      const name = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (!name) continue;
      const tokens = name
        .toLowerCase()
        .replace(/defence/g, 'defense')
        .split(/[^a-z']+/)
        .filter((t) => t.length > 2 && !NOT_A_VARIATION.has(t));
      if (tokens.length === 0) continue;
      // Every mentioned name must share a SUBSTANTIVE token with the lesson —
      // class words can't vouch, or "X Defense" would pass in any defense.
      const classWords = new Set(['defense', 'variation', 'attack', 'gambit', 'system', 'opening', 'game']);
      const substantive = tokens.filter((t) => !classWords.has(t));
      if (substantive.length === 0) continue;
      if (!substantive.some((t) => lessonTokens.has(t))) return false;
    }
    return true;
  } catch {
    return true;
  }
}

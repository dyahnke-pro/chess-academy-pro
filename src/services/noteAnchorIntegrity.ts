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

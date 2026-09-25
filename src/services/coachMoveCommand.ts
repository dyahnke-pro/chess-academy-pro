// coachMoveCommand — the deterministic "coach, play this move" channel
// (David 2026-07-12: "Coach can't play d4 when I told it to. It needs to
// play every move I tell it to."). "Play d4" / "you play Nf3" / "castle
// kingside" is a COMMAND, not a question: the move is parsed against
// chess.js's own legal-move list (parseSpokenMove — never invented, G0/G3
// by construction) and the SURFACE executes it in code. The LLM is never
// in this loop.
//
// Two shapes come back:
//   • playableNow=true  — the move is legal for the side to move on `fen`
//     right now (the coach's turn, or the game-start side-swap case).
//   • playableNow=false — the move only parses on the FLIPPED board: a
//     coach-side move dictated while it's the student's turn ("play e5"
//     before the student has moved). The caller arms it as the coach's
//     next reply.

import { Chess } from 'chess.js';
import { parseSpokenMove, type ParsedSpokenMove } from './spokenMoveParser';

export interface CoachMoveCommand extends ParsedSpokenMove {
  /** Legal for the side to move on the given FEN right now. False = parsed
   *  on the flipped board (a coach-side move while it's the student's turn). */
  playableNow: boolean;
  /**
   * The student is CORRECTING the move the coach just played ("no, play Nc3
   * instead"), not queuing the next one (David 2026-09-17).
   *
   * Until now every dictation armed the NEXT reply, so the natural way a person
   * corrects a coach — "play X instead" — was answered with "got it, after your
   * move…", which is not what was asked. The move already on the board stayed
   * there.
   *
   * This flag only says the student MEANT a correction. Whether one is possible
   * is the caller's judgement: it must undo a ply, so it is refused unless the
   * coach's move is genuinely the last one on the board. Taking back further
   * would discard the student's own move too, and silently throwing away
   * something they played is worse than not helping.
   */
  corrects: boolean;
}

/** Leading politeness / address tokens we skip before the command verb. */
const PREFIX_RE = /^(?:(?:ok(?:ay)?|please|now|coach|hey|and|then)[,!\s]+)*/i;

/** The command verb that targets the COACH. Anchored after the prefix; the
 *  move phrase is everything after it. "castle" doubles as verb AND move
 *  ("castle kingside"), so it keeps the whole tail. Deliberately narrow —
 *  "let's play the Italian" (no leading verb) stays an opening request. */
const VERB_RE = /^(?:you\s+)?(?:play|make|open\s+with|start\s+with|go\s+with|respond\s+with|reply\s+with|answer\s+with|move)\b\s*/i;
const CASTLE_RE = /^(?:you\s+)?(castles?|castling)\b/i;

/**
 * The student is replacing the coach's last move rather than queuing the next.
 * Either a leading refusal ("no, play Nc3"), an explicit takeback phrased as one
 * ("take that back and play Nc3"), or a trailing "instead" / "rather".
 */
const CORRECTION_RE = /^(?:no|nope|nah|wait|actually|hold on|undo|take (?:that|it) back)\b|\b(?:instead|rather)\b\s*$/i;

/** A move REPORT ("I played e4") or a question is never a command. */
const REPORT_RE = /\b(?:i|we)\s+(?:just\s+)?(?:played|play|moved|went)\b/i;

/** Flip the side to move so a coach-side move can be parsed while it's the
 *  student's turn. En-passant cleared (it can't survive a null move); the
 *  probe inside parseSpokenMove try/catches any position chess.js rejects. */
function flipTurn(fen: string): string | null {
  const parts = fen.split(' ');
  if (parts.length < 4) return null;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  return parts.join(' ');
}

/**
 * Parse a dictated coach-move command against `fen`. Returns null when the
 * text isn't a command or names no unambiguous legal move — the caller then
 * falls through to normal routing (opening requests, Q&A, etc.).
 */
export function parseCoachMoveCommand(
  text: string,
  fen: string,
  coachColor?: 'white' | 'black',
): CoachMoveCommand | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (REPORT_RE.test(trimmed) || /\?\s*$/.test(trimmed)) return null;

  const corrects = CORRECTION_RE.test(trimmed);
  // The correction words are not part of the move phrase — strip them from both
  // ends before the verb match, or "no, play Nc3 instead" never finds its verb.
  //
  // STRIP REPEATEDLY. People stack these, and the phrasing David actually asked
  // for stacks two: "no, take that back and play Nc3". A single pass removed
  // only "no, ", left "take that back and play Nc3", failed to find the verb,
  // returned null — and the sentence fell through to the brain, whose take_back
  // TOOL undid the coach's move and played nothing. The board ended up exactly
  // as a broken correction would leave it, which is how this hid: the undo was
  // real, so it looked like the correction branch had half-run.
  let cleaned = trimmed;
  for (let i = 0; i < 4; i++) {
    const before = cleaned;
    cleaned = cleaned
      .replace(/^(?:no|nope|nah|wait|actually|hold on|undo|take (?:that|it) back)\b[,!.\s]*/i, '')
      // the connective that joins a stacked correction to its move
      .replace(/^(?:and|then)\b[,\s]*/i, '')
      .replace(/[,\s]*\b(?:instead|rather)\b\s*\.?$/i, '')
      .trim();
    if (cleaned === before) break;
  }
  const afterPrefix = cleaned.replace(PREFIX_RE, '');
  let phrase: string | null = null;
  if (CASTLE_RE.test(afterPrefix)) {
    // "castle kingside" — the verb IS the move; parseSpokenMove handles it.
    phrase = afterPrefix;
  } else {
    const verb = afterPrefix.match(VERB_RE);
    if (!verb) return null;
    phrase = afterPrefix.slice(verb[0].length).trim();
  }
  if (!phrase) return null;

  // ON THE STUDENT'S TURN THE COACH'S SIDE IS READ FIRST (David 2026-09-24
  // match game: "play c6" with White to move parsed as White's Bc6+ — legal,
  // and not the move he was telling the coach to make). The student's side is
  // still tried last, for the game-start hand-over ("you play d4").
  const studentsTurn = coachColor !== undefined
    && (fen.split(' ')[1] === 'w' ? 'white' : 'black') !== coachColor;
  const now = studentsTurn ? null : parseSpokenMove(phrase, fen);
  if (now) return { ...now, playableNow: true, corrects };

  const flipped = flipTurn(fen);
  if (flipped) {
    const later = parseSpokenMove(phrase, flipped);
    if (later) return { ...later, playableNow: false, corrects };
  }
  // A REPLY THAT ONLY EXISTS AFTER THE STUDENT'S MOVE — "play Qxd5" before
  // exd5 has put anything on d5 to take (David 2026-09-24: "tell coach what to
  // play against you through the opening. It should be able to do that"). The
  // flipped board cannot see it, so try the position after each legal student
  // move; it is armed as pending and re-checked for legality when it is due.
  try {
    const board = new Chess(fen);
    for (const m of board.moves()) {
      const probe = new Chess(fen);
      probe.move(m);
      const after = parseSpokenMove(phrase, probe.fen());
      if (after) return { ...after, playableNow: false, corrects };
    }
  } catch { /* an unreadable FEN arms nothing */ }
  if (studentsTurn) {
    const handOver = parseSpokenMove(phrase, fen);
    if (handOver) return { ...handOver, playableNow: true, corrects };
  }
  return null;
}

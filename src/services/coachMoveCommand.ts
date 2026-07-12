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

import { parseSpokenMove, type ParsedSpokenMove } from './spokenMoveParser';

export interface CoachMoveCommand extends ParsedSpokenMove {
  /** Legal for the side to move on the given FEN right now. False = parsed
   *  on the flipped board (a coach-side move while it's the student's turn). */
  playableNow: boolean;
}

/** Leading politeness / address tokens we skip before the command verb. */
const PREFIX_RE = /^(?:(?:ok(?:ay)?|please|now|coach|hey|and|then)[,!\s]+)*/i;

/** The command verb that targets the COACH. Anchored after the prefix; the
 *  move phrase is everything after it. "castle" doubles as verb AND move
 *  ("castle kingside"), so it keeps the whole tail. Deliberately narrow —
 *  "let's play the Italian" (no leading verb) stays an opening request. */
const VERB_RE = /^(?:you\s+)?(?:play|make|open\s+with|start\s+with|go\s+with|respond\s+with|reply\s+with|answer\s+with|move)\b\s*/i;
const CASTLE_RE = /^(?:you\s+)?(castles?|castling)\b/i;

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
export function parseCoachMoveCommand(text: string, fen: string): CoachMoveCommand | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (REPORT_RE.test(trimmed) || /\?\s*$/.test(trimmed)) return null;

  const afterPrefix = trimmed.replace(PREFIX_RE, '');
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

  const now = parseSpokenMove(phrase, fen);
  if (now) return { ...now, playableNow: true };

  const flipped = flipTurn(fen);
  if (flipped) {
    const later = parseSpokenMove(phrase, flipped);
    if (later) return { ...later, playableNow: false };
  }
  return null;
}

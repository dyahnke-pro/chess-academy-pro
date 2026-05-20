/**
 * Book grounding source — pulls classical chess-book passages from
 * `src/data/chess-concepts.json` (664 passages across 7 Gutenberg
 * classics: Capablanca's Chess Fundamentals, Lasker's Strategy and
 * Chess & Checkers, Staunton's Blue Book, Young's Generalship,
 * Edge's Morphy Exploits, Bird's History and Reminiscences) and
 * shapes them into a compact, ready-to-inject block for the envelope.
 *
 * Why this exists separately from the annotation-context loader: the
 * 1893 annotation files in `src/data/annotations/` are AUTHORED per-
 * move opening theory; the chess-concepts passages are CLASSICAL
 * authors' prose on positional/tactical/endgame concepts and named
 * openings, distilled into a tagged corpus. Both should ground
 * coach narration; they answer different questions ("what's the
 * theory of this move?" vs "what would Capablanca say about an
 * isolated queen pawn here?").
 *
 * Match strategy: caller passes the user's ask text + the current
 * opening name (when known). The chessConceptService runs concept
 * detection on the ask text (e.g. "isolated pawn" → pawn-isolated
 * concept → Capablanca's IQP chapter) AND opening-name resolution
 * (e.g. "Italian Game" → the italian-game opening passages). Up to
 * one opening passage + up to three concept passages are folded into
 * a single block per call.
 *
 * Loader returns null when nothing matched so the envelope formatter
 * can omit the block entirely. The brain's prior (ungrounded) prose
 * behavior remains intact for positions/topics outside the corpus.
 */
import type { LiveBookGrounding } from '../types';
import { buildCoachChatContext } from '../../services/chessConceptService';

/** Build the book-grounding block for an in-flight brain call.
 *  Takes the ask text PLUS an optional opening name so we can
 *  augment the ask text with the opening (which the user may not
 *  have mentioned by name) and trigger the opening-passage lookup
 *  reliably.
 *
 *  Returns null when nothing matched. */
export function loadBookGroundingForLive(args: {
  askText: string;
  openingName?: string | null;
}): LiveBookGrounding | null {
  const { askText, openingName } = args;
  // Augment the matching text with the opening name when present —
  // the user often asks "what's the plan here?" without naming the
  // opening; including it lets the opening-passage lookup fire.
  const matchInput = openingName ? `${askText} ${openingName}` : askText;
  const block = buildCoachChatContext(matchInput);
  if (!block) return null;
  // Rough source count from the formatted block — each passage is
  // demarcated by a `[`+source attribution line. Cheap heuristic so
  // the audit can see "shipped N passages" without re-parsing.
  const sourceCount = (block.match(/^\[/gm)?.length ?? 0);
  return { block, sourceCount };
}

/**
 * A FOLLOW-UP RESOLVES AGAINST THE LAST TURN (answers swarm P1).
 *
 * "why?", "why tho", "how so" after the coach named its best move ask why that
 * move is best; "what then?", "and then?" after the coach named a move ask what
 * happens after it. Resolved in code against the coach's own last line, which
 * code wrote — the model never rewrites the question. Returns the ask to route,
 * or the original ask when it is not a follow-up the last line can answer.
 */
import { extractCandidateSan } from './questionIntents';

const WHY_RE = /^\s*(?:and\s+)?(?:why(?:\s+(?:tho|though|so|is\s+that))?|how\s+(?:come|so))[?!.\s]*$/i;
const THEN_RE = /^\s*(?:and\s+)?(?:(?:what|then)\s+(?:then|what|next)|and\s+then|what\s+happens\s+(?:then|next|after\s+that))[?!.\s]*$/i;
const NAMED_BEST_RE = /\bbest\s+move\b|\bbetter\s+move\b|\bstrongest\s+move\b|\bi'?d\s+play\b/i;

export function resolveFollowUp(ask: string, lastCoachLine: string | null): string {
  if (!lastCoachLine) return ask;
  if (WHY_RE.test(ask)) return NAMED_BEST_RE.test(lastCoachLine) ? 'why is that the best move?' : ask;
  if (THEN_RE.test(ask)) {
    const named = extractCandidateSan(lastCoachLine);
    return named ? `what happens if I play ${named}?` : ask;
  }
  return ask;
}

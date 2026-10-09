/**
 * THE HONEST STOCK LINE — what the coach says when nothing answered the turn.
 * A leaf (no imports) so the brain that says it and the door that counts it
 * (`chat-turn` row `outcome: 'stock'`, WO-CHAT-01 P0) read one string.
 */
export const STOCK_GROUNDING_FALLBACK =
  "That can't be verified precisely from grounded data right now. " +
  "Ask for the best move, the plan, or what's hanging for a grounded answer.";

/** Is this the stock line — the turn was not answered. */
export function isStockFallback(text: string): boolean {
  return text.trim() === STOCK_GROUNDING_FALLBACK;
}

/** What the coach says when it cannot reach the model at all. One string, so
 *  the non-answer detector counts the line the app actually speaks (it kept
 *  a hand copy of the old wording, which a rewording would have blinded). */
export const COACH_OFFLINE_LINE = "The coach can't connect right now. Keep playing — it will be back online soon.";

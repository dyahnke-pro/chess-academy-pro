/**
 * THE HONEST STOCK LINE — what the coach says when nothing answered the turn.
 * A leaf (no imports) so the brain that says it and the door that counts it
 * (`chat-turn` row `outcome: 'stock'`, WO-CHAT-01 P0) read one string.
 */
export const STOCK_GROUNDING_FALLBACK =
  "I can't verify that precisely from grounded data right now. " +
  "Ask me for the best move, the plan, or what's hanging, and I'll ground the answer for you.";

/** Is this the stock line — the turn was not answered. */
export function isStockFallback(text: string): boolean {
  return text.trim() === STOCK_GROUNDING_FALLBACK;
}

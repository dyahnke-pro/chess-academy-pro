/** A game's own date in ms — PGN "2025.03.04" or ISO — or undefined when it is
 *  not a date. The ONE parser (two had drifted: one trimmed, one did not). */
export function gameDateMs(date: string | null | undefined): number | undefined {
  if (!date) return undefined;
  const t = Date.parse(date.trim().replace(/^(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3'));
  return Number.isFinite(t) ? t : undefined;
}

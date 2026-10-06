// A STATISTIC SPOKEN WHERE A REASON SHOULD BE (David 2026-10-06: "reason, not
// stats"). Squares ("e4") and move references ("move 4") are not statistics;
// a percentage, a point count or "N of M" is. One pattern for every audit.
const STAT = /\d+(\.\d+)?\s*%|\b\d+\.\d+\s*points?\b|\b\d+\s+points?\b|\b\d+\s+of\s+(the\s+)?\d+\b/i;

/** The spoken lines that carry a statistic. */
export function linesWithStats(lines) {
  return lines.filter((t) => STAT.test(String(t)));
}

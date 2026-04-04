/**
 * Compute edit distance between two strings (case-insensitive).
 * Uses a standard dynamic-programming Levenshtein implementation
 * with a row-optimisation to avoid allocating a full matrix.
 */
function editDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array<number>(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

/**
 * Check if query appears as a subsequence of target (case-insensitive).
 * E.g. "itlin" matches "Italian" because i-t-l-i-n appear in order.
 */
function isSubsequence(query: string, target: string): boolean {
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  return qi === query.length;
}

/**
 * Score how well a query matches a target string (lower = better match).
 * Returns null if the match is too poor to include.
 *
 * Scoring strategy:
 * 1. Exact substring → score 0 (best)
 * 2. Word-start match → score 1
 * 3. Subsequence match → score 2
 * 4. Edit distance per word → score 3-5
 * 5. null → no match
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // Exact substring match
  if (t.includes(q)) return 0;

  // Word-start match: "sic" matches "Sicilian"
  const words = t.split(/[\s\-:,]+/);
  for (const word of words) {
    if (word.startsWith(q)) return 1;
  }

  // Subsequence match
  if (q.length >= 3 && isSubsequence(q, t)) return 2;

  // Fuzzy word match: find best edit-distance against any word
  // Allow up to ~40% error rate
  const maxDist = Math.max(1, Math.floor(q.length * 0.4));
  let bestWordDist = Infinity;
  for (const word of words) {
    const d = editDistance(q, word);
    if (d < bestWordDist) bestWordDist = d;
  }
  if (bestWordDist <= maxDist) return 3 + bestWordDist;

  // Fuzzy against full name (for multi-word queries like "kings indian")
  if (q.length >= 4) {
    const fullDist = editDistance(q, t);
    const fullMaxDist = Math.max(2, Math.floor(q.length * 0.35));
    if (fullDist <= fullMaxDist) return 3 + fullDist;
  }

  return null;
}

/**
 * Normalize a string for fuzzy matching:
 *  - lowercase
 *  - strip diacritics (ü → u, é → e, ñ → n, etc.) so "grünfeld" behaves
 *    the same as "grunfeld". Otherwise typos like "gunfeld" never find
 *    the Grünfeld Defence and get routed to whatever random opening
 *    happens to contain those letters as a subsequence.
 */
function normalizeForFuzzy(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Find the tightest (minimum span) subsequence match of `q` inside `t`.
 * Returns the span (end - start) or null if no match. Used to reject
 * subsequence matches that spray across huge unrelated strings — e.g.
 * "gunfeld" being a subsequence of
 * "english opening: agincourt defense, catalan defense, semi-slav defense"
 * only because the 7 letters happen to appear somewhere in the 60 chars.
 */
function tightestSubsequenceSpan(q: string, t: string): number | null {
  if (q.length === 0) return null;
  let best: number | null = null;
  for (let start = 0; start < t.length; start++) {
    if (t[start] !== q[0]) continue;
    let ti = start + 1;
    let qi = 1;
    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) qi++;
      ti++;
    }
    if (qi === q.length) {
      const span = ti - start;
      if (best === null || span < best) best = span;
    }
  }
  return best;
}

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
 * Score how well a query matches a target string (lower = better match).
 * Returns null if the match is too poor to include.
 *
 * Scoring strategy:
 * 1. Exact substring → score 0 (best)
 * 2. Word-start match → score 1
 * 3. Tight subsequence match → score 2 (only when letters cluster, not
 *    when they're sprayed across an unrelated long string)
 * 4. Edit distance per word → score 3+ (Levenshtein distance added)
 * 5. null → no match
 *
 * Both query and target are normalized (lowercased + stripped of
 * diacritics) before scoring, so "grünfeld" / "gunfeld" / "Grunfeld"
 * all line up.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = normalizeForFuzzy(query);
  const t = normalizeForFuzzy(target);

  // Exact substring match
  if (t.includes(q)) return 0;

  // Word-start match: "sic" matches "Sicilian"
  const words = t.split(/[\s\-:,]+/);
  for (const word of words) {
    if (word.startsWith(q)) return 1;
  }

  // Subsequence match — only when the letters actually cluster. A
  // 7-letter query sprayed across 60 chars is noise ("gunfeld" was
  // matching "english opening: agincourt defense, catalan defense,
  // semi-slav defense" simply because the letters happen to appear
  // somewhere in that order). Require the matched letters to span at
  // most 2× the query length so near-contiguous matches like
  // "itlin" in "italian" still count.
  if (q.length >= 3) {
    const span = tightestSubsequenceSpan(q, t);
    if (span !== null && span <= q.length * 2) {
      return 2;
    }
  }

  // Fuzzy word match: find best edit-distance against any word
  // Allow up to ~40% error rate
  const maxDist = Math.max(1, Math.floor(q.length * 0.4));
  let bestWordDist = Infinity;
  for (const word of words) {
    if (word.length === 0) continue;
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

// A SENTENCE'S FORMULA — its shape with the pieces, squares, files, counts and
// seats blanked, so "Their bishop on c1 is tied down now: you hit the pawn on
// b2 once…" and "Their pawn on d3 is tied down now: you hit the pawn on c4
// once…" read as one reason said twice. The same reduction the walk audits
// measure with (`scripts/audit-lib/why-count.mjs` formulaOf), so the product
// and the instrument agree on what a repeat is.
export function reasonFormula(text: string): string | null {
  const first = text.split(/(?<=[.!?])\s+/)[0] ?? '';
  if (first.split(/\s+/).length < 6) return null;
  return first.toLowerCase()
    .replace(/\b[nbrqk][a-h]?[1-8]?x?[a-h][1-8](?:=[nbrq])?[+#]?/g, 'MV')
    .replace(/\bo-o(?:-o)?[+#]?/g, 'MV')
    .replace(/\b[a-h]-(?:pawn|file)\b/g, 'F')
    .replace(/\b(?:your|their|the)\b/g, 'W')
    .replace(/\b(?:pawn|knight|bishop|rook|queen|king|piece)s?\b/g, 'P')
    .replace(/\b[a-h][1-8]\b/g, 'SQ')
    .replace(/\b(?:once|twice|(?:one|two|three|four|five|six|seven|eight|\d+) times)\b/g, 'NX')
    .replace(/\b(?:one|two|three|four|five|six|seven|eight|\d+)\b/g, 'N')
    .replace(/\s+/g, ' ').trim();
}

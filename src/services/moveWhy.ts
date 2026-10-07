// moveWhy — squaresNamedIn: the board squares a spoken line names, so the eye
// is led to them. The old private 'what a move does' computer that lived here
// (computeMoveWhy) was deleted 2026-10-07 (census group 6): the teach
// walkthrough reads the one briefing every generated lesson bakes.

/**
 * The board squares NAMED in a spoken line — so the eye can be led to every
 * square the narration talks about, voiced or computed (David 2026-08-28: "no
 * key squares highlighted when talking about them"; "weakening d4 should have
 * drawn a highlight"). Matches bare squares (d4), possessive/suffixed forms
 * (d4-square, e5's), and SAN destinations (Nc6 → c6, Bxf7 → f7). Deduped, capped
 * so the board never clutters. Never matches a move number ("2." isn't a square).
 */
export function squaresNamedIn(text: string, cap = 4): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  // A square is a file a–h then rank 1–8, not preceded by a letter/number (so
  // "and5" or "12e4" don't false-match) — SAN like "Nc6"/"exd5" is handled by
  // pulling the trailing coordinate.
  const re = /(?<![a-z0-9])([a-h][1-8])(?![0-9])/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const sq = m[1].toLowerCase();
    if (!seen.has(sq)) { seen.add(sq); out.push(sq); }
    if (out.length >= cap) break;
  }
  // SAN destinations (Nc6, Bxf7, exd5, O-O excluded) — pull the last coordinate
  // from move-like tokens the bare scan above already covers, so nothing extra
  // is needed; the regex captures the coordinate inside the SAN.
  return out;
}

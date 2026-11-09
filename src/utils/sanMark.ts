// sanMark — a leaf. A sentence that SAYS mate in words carries its move
// without the mark: the voice reads "#" as ", checkmate", so a SAN with its
// mark inside "… is mate" was heard twice (OS-11 2026-10-20: "They threaten
// queen takes c7, checkmate, and it is mate").

/** The move with its check/mate mark taken off: "Qxc7#" → "Qxc7". */
export function unmarked(san: string): string {
  return san.replace(/[+#]$/, '');
}

/** The move's own mark already says mate (the voice reads "#" as ",
 *  checkmate"): a line that ends on it needs no "and it's mate" after it
 *  (prod focus audit 2026-11-09: "they play rook to e8, checkmate — and it's
 *  mate"). */
export function markSaysMate(san: string | null | undefined): boolean {
  return !!san && /#$/.test(san);
}

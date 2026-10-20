// sanMark — a leaf. A sentence that SAYS mate in words carries its move
// without the mark: the voice reads "#" as ", checkmate", so a SAN with its
// mark inside "… is mate" was heard twice (OS-11 2026-10-20: "They threaten
// queen takes c7, checkmate, and it is mate").

/** The move with its check/mate mark taken off: "Qxc7#" → "Qxc7". */
export function unmarked(san: string): string {
  return san.replace(/[+#]$/, '');
}

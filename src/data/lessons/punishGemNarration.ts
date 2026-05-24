// HAND-AUTHORED narration for punish gems (David 2026-05-24). Keyed by gemId
// (= `${openingId}:${lineMoves_with_underscores}:${inaccuracy}`). For each gem:
//   watch[i] = the full Watch line spoken as move i plays ('' = stay silent on
//              routine moves; the position is the lesson there).
//   learn[i] = the TRUNCATED Learn cue spoken as the student plays move i,
//              reinforcing the Watch lesson ('' = fall back to move dictation,
//              used for the opponent's auto-played replies).
// EVERY line is hand-written and verified against its own move + position —
// never generated, never a beat-summary dropped on the wrong ply. A gem only
// SURFACES once it has an entry here (no thin-narration gems ship).
//
// Authoring discipline: replay the gem's playLine move-by-move; write each
// line to name what is actually happening on THAT move. Cross-check the idea
// against theory before committing.

export interface GemNarration {
  watch: string[];
  learn: string[];
}

export const GEM_NARRATION: Record<string, GemNarration> = {
  // Vienna — Black grabs e4, then 4...g6?? drops e5 with check and loses a piece.
  // playLine: e4 e5 Nc3 Nf6 Bc4 Nxe4 Qh5 g6 Qxe5+ Qe7 Qxe4 Qxe4+ Nxe4 c6 b3 Bg7
  'vienna-game:e4_e5_Nc3_Nf6_Bc4_Nxe4_Qh5:g6': {
    watch: [
      '', '', '', '',
      'Bc4 takes aim at f7 — the Vienna bishop on its working diagonal.',
      'Black grabs the e4-pawn. Tempting — but it cracks open the king, and the queen is coming.',
      'Qh5! Two threats in one move: mate on f7, and the loose pawn on e5. Black can only answer one.',
      'g6 hits the queen and guards f7 — but it leaves e5 hanging, and with check. This is the slip.',
      'Qxe5 — check! You snatch the pawn AND skewer the knight on e4 down the open file. That is the price of g6.',
      'Black must block. Qe7 is forced.',
      'Qxe4 collects the knight.',
      'Black trades queens off, hoping to blur the damage.',
      'Nxe4 recaptures — and the dust settles with you a clean piece ahead.',
      '', '', '',
    ],
    learn: [
      '', '', '', '',
      'Bc4 — aim at f7.',
      '', // ...Nxe4 (opponent)
      'Qh5 — hit f7 and e5 at once.',
      '', // ...g6 (opponent, the mistake)
      'Qxe5 — check, and fork the e4-knight.',
      '', // ...Qe7
      'Qxe4 — take the knight.',
      '', // ...Qxe4+
      'Nxe4 — recapture, a clean piece up.',
      '', '', '',
    ],
  },
};

export function getGemNarration(gemId: string): GemNarration | null {
  return GEM_NARRATION[gemId] ?? null;
}
export function hasGemNarration(gemId: string): boolean {
  return gemId in GEM_NARRATION;
}

// openingAnnouncement — WHEN the live coach names the opening, and what it says
// (WO-TEACH-02 S1, David 2026-09-24: every line teaches).
//
// A live Learn game announced the opening four times in ten plies on prod:
// "This game is now the Scandinavian Defense" → "…sharpened into the Main
// Line" → "…Main Line, Mieses Variation" → "…Lasker Variation". Each is the
// detector refining its guess, not the student learning anything. The rule:
//  1. the FIRST identification is said — naming the opening opens the arc;
//  2. refinements while the game is still in book wait silently;
//  3. the name the game settled on is said ONCE, at the ply the game leaves
//     book — which is itself the teaching: how far their theory went.
//
// One function, so the two Learn lanes that build this sentence cannot drift.

export interface DetectedName {
  name: string;
  /** Plies of the game the DB line matched. Fewer than the game's length
   *  means the game has left the book. */
  plyCount: number;
}

export function openingAnnouncement(
  det: DetectedName | null,
  historyLength: number,
  spokenName: string | null,
): string | null {
  if (!det || !det.name || det.name === spokenName) return null;
  if (spokenName === null) return `This game is now the ${det.name}.`;
  if (det.plyCount < historyLength) return `You've left the book here — the line was the ${det.name}.`;
  return null;
}

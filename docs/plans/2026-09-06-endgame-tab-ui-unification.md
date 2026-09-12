# PLAN — Endgame tab UI unification (branch `claude/endgame-tab-ui-dz33s8`)

David 2026-09-06: "Need to make these tabs match the standard of the rest of
the app. Board layout, coach narrations, all of it. Going for total
unification here." Sent a screenshot of the Drawn tab with a **clipped board**
(only ranks 1-4, one bishop, rest cut off).

Decisions (David, this session):
- **One unified push** — board + hub shell + narrations land together on `main`.
- **Narration: full house voice, WATCH + PLAY only** (drop Learn/Practice framing).
- **Hub: full standard app shell** — centered title + SmartSearchBar + standard
  card layout; drop the horizontal tab strip.

## Root-cause findings

1. **Board clip (the screenshot).** react-chessboard v5 renders its grid as
   `width:100%; height:100%; overflow:hidden` with `aspect-ratio:1` squares
   (node_modules/react-chessboard/dist/index.esm.js:4741). So the grid is
   WIDTH-driven for square size but its box is HEIGHT-driven by the parent —
   any ancestor that hands it a definite height SHORTER than the board width
   makes it CLIP the bottom ranks instead of shrinking. `ChessLessonLayout`'s
   board slot uses `max-h-[min(60vh,440px)]` on a shrinkable flex item with no
   width lock (src/components/Layout/ChessLessonLayout.tsx:82-87). On David's
   iOS webview the slot resolves shorter than the board width → clip. Repro in
   Chromium shows the board overflowing/short depending on viewport; the fix is
   a **width-driven aspect-locked square** (`width:min(100%,<cap>); aspect-ratio:1`,
   `shrink-0`) that can NEVER clip.
2. **Perspective already clean** — endgame data uses you/your/they, zero
   we/our/us. Voice work is additive (Watch demo + lead-the-eye), not repair.

## Phases (all in the one push)

- [ ] **P1 — Board layout, clip-proof + app-standard.** Make `ChessLessonLayout`'s
  board slot a width-driven aspect-locked square (benefits every lesson surface,
  fixes the live break). Verify square + full pieces across viewport heights.
- [ ] **P2 — Endgame hub → standard shell.** CoachEndgamePage landing: centered
  title + SmartSearchBar + standard card layout matching Tactics/Dashboard.
  Replace the horizontal tab strip. Keep every category reachable.
- [ ] **P3 — Watch + Play (full voice).** EndgameLessonTab lesson view offers
  **Watch** (coach auto-plays the position's existing `solution` line move-by-move,
  house-voice narration per move computed board-true, lead-the-eye arrows/highlights)
  and **Play** (student plays — today's keystone flow). Applied uniformly across
  ALL endgame categories via the shared tab (no half-build). Voice = house
  standard (you/they, concept-first, the position teaches; G0/G3 — code computes,
  never invents moves).
- [ ] **P4 — Gates + audit.** ship-check green; extend/author the endgame audit;
  3-instrument prod audit after the push.

## Notes / guardrails
- G3: solution moves come from the data (chess.js-validated) — Watch never
  invents a move.
- Board primitive stays ConsistentChessboard.
- Deploy: straight to `main` per policy (session is on a branch per harness — land it).

## Next-session pickup
Board fix (P1) first; hub (P2); Watch/Play (P3). Reference maps for the standard
hub shell + WLPP Watch player were pulled via an Explore agent this session.

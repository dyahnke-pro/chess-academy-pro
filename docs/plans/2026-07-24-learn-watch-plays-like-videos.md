# Learn Watch → plays like his videos (David 2026-07-24)

David: **"I want learn to play as close to his videos as possible."** The Watch
walkthrough on `/coach/teach` should teach the opening the way Naroditsky does in
his speedruns — grounded in his transcripts (`data/sources/naroditsky-voice/
transcripts/speedrun-*.txt`).

## The locked mechanism — ARROWS SHOW THE LINES, THE BOARD NEVER MOVES

David, verbatim: *"He uses arrows for this. He can't play them out during a game.
Same for us. Arrows show the lines. Not moves."*

When he's playing a live game he can't shove pieces around his real position — he
**draws the line with arrows** and talks through it. Learn's Watch must do the
same:

- The walkthrough board advances ONLY on the real taught move (as today).
- Every candidate / threat / refutation / crush line the coach mentions is drawn
  as **arrows over the current static position**, synced to the narration, then
  cleared.
- The board position is NEVER disturbed by the illustration. This is the key
  difference from the review's walk-the-line (which stepped a separate
  exploration board) AND from the existing trap-prompt phase (which ANIMATES the
  moves). Here: arrows only.

## His opening-teaching flow (per taught move) — David 2026-07-24

*"This is especially important in the opening. He says why a certain move is
better than another, traces arrows, explains why, states what his move threatens,
how opponent should refute it, and how to crush if they don't."*

For each taught opening move:
1. **Why this move beats the alternative** — arrow on the played move + the
   inferior candidate; voice the why.
2. **What it threatens** — arrow tracing the threat (`describeStudentThreat` /
   `detectNewThreat` give the from/landing squares), present-tense.
3. **How the opponent should refute** — arrow on the correct defense.
4. **How to crush if he doesn't** — **THE GEM LINE.** Arrow-trace the
   engine-verified punishment for the natural-but-losing move.

## THE GEM CONNECTION — step 4 is already built (David: "gem lines would be
extremely beneficial here!!!!")

We do NOT invent the crush. `src/data/punish-gems.json` (344 gems, hand-curated +
engine-verified per the gem doctrine) already carries, per opening + position:
- `lineMoves` — the opening spine to the position (where in the Watch we are)
- `inaccuracy` — the opponent's natural-but-losing move
- `mainMove` — the correct move
- `punish` + `punishSeq` — the crush
- `why` + `GEM_NARRATION[gemId]` (watch/learn) — the voice

API: `getPunishGemsForOpening(id)`, `getPunishGemsForTab(...)`,
`gemInaccuracyFen(gem)`, `isSurfaceableGem(gem)` (`src/data/lessons/punishGems.ts`).
So this build **surfaces curated gem lines as arrow-traced "here's the punish"
beats in the Watch opening teaching** — connecting content we already built to the
moment it belongs in. Nothing invented; G3 intact.

## Register (locked, the two-register law of 2026-07-19)

Present-tense LIVE teaching, NOT the review's retrospective. Side-framed
(White/Black, never "you" — it's a demo game). His house voice (concept-first,
warm-but-rigorous, names the idea). Anti-overstatement: only board-true reasons.
Every clause computed (G0) — the coach voices facts, decides nothing.

## Engines / data to reuse (all exist)

- Gems: `punish-gems.json` + `punishGems.ts` + `punishGemNarration.ts`.
- Threat: `detectNewThreat` / `describeStudentThreat` (`groundedAnswer.ts`) —
  expose `from`/`landing`/`targetSquares` for arrows.
- Line why: `explainBestMoveGrounded`, `buildReviewMoveTeaching`, `computePvLine`.
- Arrows: `NarrationArrow {from,to,color}` + the walkthrough's `narrationArrows`
  channel (`useTeachWalkthrough` → `CoachTeachPage` board overlay) + lead-the-eye.
- Runtime seam: `narrateAndAdvance` in `useTeachWalkthrough.ts` (the single choke
  point where a node's narration + arrows are set before speaking).

## Sliced plan

- **Slice 1 (this session): gem-crush arrows in the opening Watch.** When the
  walkthrough's current position matches a surfaceable gem's `lineMoves` terminus,
  inject an arrow-only aside AFTER the node's narration: draw the opponent's
  natural inaccuracy (one color) then the punish sequence (lead-the-eye colors,
  sequenced), voice the present-tense "if he plays X — natural — watch, we crush
  with Y" from `GEM_NARRATION`/`why`, board STATIC, then clear + continue. Gated
  by `isSurfaceableGem` + position match; opening phase only.
- **Slice 2: threat + correct-refutation arrows** — per taught move, the
  `describeStudentThreat` line as an arrow + voice; the DB/theory correct reply as
  the "should refute" arrow.
- **Slice 3: better-move-than-alternative arrows** — the played move vs the
  inferior candidate, arrowed + why (`explainBestMoveGrounded`).
- **Slice 4: critical-moment + teach-both framing**, register polish.
- Every slice: a real-game audit (`audit-learn-watch-lines.mjs`) — seed a real
  opening, drive the Watch, assert the arrows trace the computed line on a STATIC
  board and the voice matches (3-instrument: Playwright + audit-stream + listener).

## Status: Slice 1 in progress (branch `learn-watch-lines`, off main d762704).

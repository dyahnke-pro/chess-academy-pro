# Causal-Chain Engine — moves do not exist in isolation

**Locked David 2026-09-07, emphatic:** *"fact A caused fact B caused fact C.
THIS IS CHESS! Moves do not exist in isolation. If we cannot link them together
then we are not doing it right! … This belongs in Learn with coach as well. All
coaching surfaces should have access to the same builds. They just use the
surface differently."*

## The problem

The coach computes chess facts richly (`positionFacts.ts`, `principleAttribution.ts`,
`tacticsDetector.ts`) but ships them as a **ranked flat list of independent,
per-move facts**. `voiceFacts` hands the LLM a numbered list with "never merge,
split, reorder." The only "because" lives *inside* one fact about one move
(`reviewMoveTeaching.ts` createdEnemyWeakness). Nothing in the codebase computes
**"fact A caused fact B caused fact C"** — a causal chain across moves.

The driving example (David's real chess.com game, the acceptance test):

```
1.e4 c5 2.Bc4 d6 3.Qh5 e6 4.d3 Nf6 5.Qf3 a6 6.Bg5 Be7 7.Nd2 Qa5 8.Nge2 Nxe4
```

The chain, every edge board-provable:

1. **Qf3** — premature queen (early-queen-sortie).
2. …**occupies the g1-knight's natural square f3** → the knight is displaced.
3. …the knight goes to **e2** (8.Nge2). A knight on **f3 would defend g5**; the
   knight on **e2 does not** → **Bg5 is left loose (LPDO)**.
4. …**8…Nxe4** grabs the pawn AND vacates f6, **unveiling Be7's attack on g5**
   (discovered double attack) → wins the loose bishop.

Verified on-board (chess.js): after 8…Nxe4, g5 attackers(black)=[e7,e4],
defenders(white)=[]; f3=white queen, e2=white knight; a knight on f3 defends g5.

## The rule set (locked with David 2026-09-07)

- **One shared engine, all surfaces.** A causal-chain fact-computer in a LEAF,
  consumed by Review + Learn (+ structurally available to every coaching
  surface). Each surface speaks it in its own REGISTER (§ two-register rule
  2026-07-19): Review retrospective ("his early queen left the bishop loose, so
  your Nxe4 won it"); Learn present-tense as the line plays out.
- **G0 supreme.** Every causal EDGE is a board-proven relation computed in code
  (chess.js counterfactuals). The LLM only VOICES the chain; it never decides an
  edge. No edge → no link.
- **Silent on unprovable links (David's pick).** When the facts are computable
  but a causal edge between two cannot be proven on the board, DO NOT assert a
  "because." Fall back to today's ranked list. **Never fabricate causality** —
  this is the "don't overstate the why" rule (2026-07-19) applied to edges. A
  wrong link is worse than a flat list.
- **Rating-scaled chain depth (David's pick).** Beginners hear the full chain
  spelled link-by-link; advanced players hear the compressed 2–3 highest-leverage
  links. Reuse the rating-scaled importance doctrine.
- **Cross-move AND cross-player.** The cause may be the OPPONENT's move (his
  early queen) enabling the STUDENT's tactic. Detectors must run side-agnostic —
  they cannot reuse `attributePrinciples` (student-only, flagged-move-only).

## The three detection gaps that block THIS chain (from the audit)

1. **Discovery detector excludes minor-piece targets** —
   `tacticsDetector.ts:411` skips b/n/… targets. Nxe4 unveils Be7 onto a
   *bishop*. FIX: a dedicated cross-move discovery-onto-loose-piece detector in
   the engine (does not need to loosen the live tactic detector's own threshold).
2. **No "blocked own developing square" detector** exists anywhere. This is the
   HINGE edge (Qf3 on the knight's f3). FIX: new relation detector
   `occupiesDevelopingSquare`.
3. **Opponent moves get no principle attribution.** FIX: the engine's relation
   detectors are side-agnostic; it attributes the early queen to WHITE while
   explaining BLACK's tactic.

## Architecture

```
src/services/causalChain.ts        (LEAF, pure, G0) — the engine
  buildCausalChain(input) -> CausalChain | null
    relation detectors (each board-proven, side-agnostic):
      exploitLoosePiece(before, move)      -> the tactic won/attacked a loose enemy piece
      discoveryUnveiled(before, move)       -> move vacated a square unveiling a friendly line-attack (incl. minor targets)
      whyUndefended(board, targetSq)        -> the missing natural defender + its ideal square
      whyDisplaced(history, piece, ideal)   -> the friendly piece occupying `ideal` + the ply it arrived
      wasPremature(history, ply)            -> early-queen / early sortie criteria (reuse principleAttribution rules)
  types: CausalNode, CausalEdge, CausalRelation, CausalChain

src/services/causalChainVoice.ts   (LEAF, pure) — the renderer
  renderCausalChain(chain, { register: 'review'|'learn', rating }) -> string[]
    rating-scaled depth; register-specific phrasing; perspective per 2026-08-28
      (you/your, they/their); silent when chain null.

Wiring (consumers, each with a "note comes OUT" test):
  buildReviewSegments (coachFeatureService.ts) — inject chain as the lead
    "because" when a student tactic has a provable cross-move cause.
  Learn walkthrough (openingGenerator / teach path) — present-tense register.
  voiceFacts (coachApi.ts) — the chain is ONE ordered fact block; existing
    "never reorder" contract preserved (the chain is pre-ordered by the engine).
```

## Phases (each a shippable increment)

- **P0 — plan doc.** THIS FILE. ✅ DONE (committed).
- **P1 — the engine leaf + gate.** `causalChain.ts` + `causalChain.test.ts`
  (13) — David's game produces the full 4-node chain; negatives return null.
  ✅ DONE.
- **P2 — the renderer + gate.** `causalChainVoice.ts` + test (6) — rating-scaled
  depth, review vs learn register, perspective rule, silent on null. ✅ DONE.
- **P3 — wire Review.** Injected into `buildReviewSegments` (leads the beat, both
  the capped + uncapped branches); rating threaded from `generateReviewNarration`
  + the explored-move path. `coachFeatureService.causalChain.test.ts` (3) proves
  the chain text comes OUT of the review walk for the fixture. 49 existing review
  tests still green. ✅ DONE.
- **P4 — wire Learn.** ✅ DONE (wired). Present-tense register into the live
  "talk you through the game" commentary in CoachTeachPage, at the coach-reply
  teaching pass (frame = the move just played, so arrows/highlights are true
  there). Leads `facts` with the chain, feeds green attack arrows via
  `setArrows`/`chainArrowsRef` and key-square highlights via `setHighlights`,
  rating from `activeProfile`. Emits a `CoachTeachPage.causalChain` audit event.
  Typecheck + lint clean. **The DOM firing is an interactive-audit concern
  (§G1/G7) — it runs on main/prod, so it is NOT yet audited on this branch.**
  Fundamentals link: each node carries `fundamentalId` + misconception `tag`;
  `causalChainMistakeTags` exposes the drill-spine feed. (Enrolling those tags
  into the My-Mistakes puzzle pipeline is the one remaining follow-on.)
- **P5 — ship-check + 3-instrument audit** (review-real-game standard). ⏳ The
  interactive Learn audit runs once this lands on main. Draft PR opened for
  David's review of the design.
- **P6 (follow-on) — feed `causalChainMistakeTags` into the mistake-puzzle /
  weakness pipeline** so a chained loss becomes a My-Mistakes drill. ⏳

## Decisions log

- 2026-09-07 — chain depth = rating-scaled (David). unprovable link = silent
  fallback to ranked list (David). Surfaces = all coaching surfaces, shared
  engine, per-surface register (David). Build on branch
  `claude/chess-tactic-concepts-hlddua` + draft PR (change is deep to the coach
  brain; David reviews the design before it lands on every surface).

## Next-session pickup

Engine leaf is the correctness core — get `causalChain.test.ts` green on the
fixture FIRST (the whole feature is worthless if the chain is wrong). Then
render, then wire Review, then Learn. Every wire ships with a "note comes OUT"
test (David 2026-08-07: a wire that does not fire is not a wire). Keep edges
board-proven; silence over a fabricated link, always.

# Phase 3 Surface Map — book-departure weakness signal

**The §0 pre-build gate for Phase 3** of `docs/plans/2026-09-08-unified-coach.md`.
Status: **BUILT.** (Map below drove the build; architecture decision recorded.)

## What shipped
- `bookDepartureWeakness.ts` (pure leaf): `BookDepartureRow`, the ADAPTIVE gate
  `bookDepartureIsCostly` (too early for the rating AND cost ≥ rating-scaled
  threshold), `expectedBookDepthPlies` / `bookDepartureCostThresholdCp` tiers,
  and `aggregateBookDepartures` (per-opening UnifiedWeakness, bucket `opening`,
  clusterId `analysis:book-departure[:openingId]`, recurrence floor 2). +11 tests.
- `bookDeparturePrecompute.ts` (async, masters-DB-ONLY via a no-op amateurFetch →
  no per-game Lichess network): `computeBookDepartureRows` (recent ≤40 fully-
  analyzed games; eval cost = the out-of-book move's cpLoss from the game's own
  annotations, student POV), cached in the `meta` KV; `getCachedBookDepartureRows`
  = cheap cache read + fire-and-forget refresh (stale-while-revalidate). +3 tests.
- `weaknessSpine.ts`: `...aggregateBookDepartures(bookRows, rating)` folded into
  the profile; a single `meta` read on the path, never the async scan. 29 existing
  weaknessSpine tests still green.
- `weaknessConceptMap.ts`: `analysis:book-departure*` → the opening-theory concept
  (so the coach teaches the theory behind the main line, not generic principles).
- **Synergy:** because it lands in `getUnifiedWeaknessProfile`, Phase 1's selector
  already re-ranks/teaches it — no new narration wire.

## ⚙️ THE ARCHITECTURE DECISION (recorded)
`findTheoryDeparture` is async + masters-DB-backed; the profile aggregators are
sync + pure on a hot render path. Resolution: **precompute per game once, cache in
`meta`, read the cache on the hot path, refresh in the background.** Masters-only
(no-op amateurFetch) keeps the precompute in-memory (no per-game network). No new
Dexie store / schema bump — the `meta` KV suffices. Book departures do NOT get
lifecycle status/trend (lifecycle is mistakePuzzle-only), so recurrence rides
`openCount` — accepted for v1.

## ⏳ Follow-ons (Phase 3b, optional)
- Trigger the refresh from the analyze pipeline (currently stale-while-revalidate
  off the profile read — first build after new games is one build behind).
- Populate `openingName` (precompute leaves it null; the label falls back to
  "Leaves opening book too early" when the opening isn't named).
- Give book departures lifecycle status by folding them into `getWeaknessLifecycle`
  (would unlock the persistent/worsening boost premium).
- Full integration audit of the precompute (needs the masters DB) — rides the prod
  audit.

## What Phase 3 does (David 2026-09-07)
> "We also need to calculate how often/early a user leaves book. Too soon and they
> fuck up the opening and now fight back from a losing position after move 3. So
> the coach explains the theory behind the opening moves and why to play certain
> ones instead of the mistakes they keep making."

1. **Aggregate `theoryDeparture` across the user's games** → a per-user signal:
   do they leave book too early / too often, and where (which opening, which ply)?
2. **Cost gate** — only a departure that MEASURABLY hurt (eval drop after leaving)
   counts. Leaving book into a fine sideline is NOT a hole. The "too early /
   costly" threshold is an ADAPTIVE algo (rating + the individual's profile + the
   departure's eval cost) — NOT a hardcoded per-band constant (David: "book, algo
   that also").
3. **Fold a new weakness bucket into `getUnifiedWeaknessProfile`** (clusterId like
   `analysis:book-departure` or `…:<openingId>`) so **Phase 1's selector
   auto-teaches it** — no new narration wire needed; the existing re-rank picks it
   up. This is the synergy: Phase 3 produces the signal, Phase 1 already consumes.
4. **Teach the theory** behind the right opening moves (via `conceptForCluster` →
   the book/opening teaching), in place of the repeated early-departure mistake.

## What I already know (from the Phase 1 map + code)
- `theoryDeparture.ts` computes PER-GAME departure: `TheoryDeparture{departurePly,
  bookFen, departedSan, mainMove:{san,games,pct}}` from the masters DB (G3-clean),
  with `walkBookLine` + `ratingBandFor`. Phase 3 AGGREGATES it across games.
- `getUnifiedWeaknessProfile` (weaknessSpine.ts:538) builds analysis rows via
  `mergeByKey([...aggregateMistakePuzzles, ...aggregateClassifiedTactics,
  ...aggregateOpeningWeakSpots, ...aggregateConversionFailures])`. A new
  `aggregateBookDepartures(games)` slots into that array.
- A `WeaknessSignal` with a `book-departure` clusterId flows through Phase 1's
  matchers today: `matchTag`/`matchClauseKind` will match it if I map the cluster
  to a clause kind or the coach references the tag. (May need a small
  `matchClauseKind` case or a dedicated review beat — TBD from the map.)
- `getWeaknessLifecycle` builds from mistakePuzzles only → a book-departure may
  NOT get persistent/worsening lifecycle unless it also lands in mistakePuzzles.
  So its recurrence weight likely rides `openCount` (how many games), not
  lifecycle status — acceptable (openCount IS the recurrence signal here).

## The adaptive "too early / costly" threshold (design)
`bookDepartureIsCostly(departure, rating, evalCost)`:
- Rating-relative "too early": leaving at ply 6 is fine for 2000, a hole for 800.
  Reuse `ratingBandFor` / the plan's rating tiers.
- Costly: the eval must have DROPPED by a rating-scaled margin after leaving book
  (a departure into an equal sideline is not a hole). Needs per-game eval data
  (source TBD — the map's Part C).
- Frequency: a ONE-OFF early departure is not a weakness; it must RECUR (openCount
  ≥ a floor) to surface — same "empty > generic" discipline.
- Single source: fold the threshold into the plan's adaptive scoring, no new curve
  (principle 8).

## PENDING (fill when agent returns)
- [ ] theoryDeparture exact API + is it async + data source + callers.
- [ ] aggregate* function shapes + exactly how to add aggregateBookDepartures +
      the clusterId/bucket convention + is there an 'opening' bucket.
- [ ] games/eval source: does db.games carry per-move evals to compute the cost?
      where is per-game analysis stored? how do other aggregators get eval data?
- [ ] openingWeakSpots vs book-departure — avoid duplication.
- [ ] conceptForCluster mapping shape for the book-departure concept.
- [ ] weakness-spine gates/tests to extend.

## Tests this phase will ship
- `aggregateBookDepartures`: a user with repeated costly early departures surfaces
  the bucket; a disciplined user (or one who leaves into fine sidelines) does not.
- The cost gate: a departure into an equal position is NOT counted.
- The book-departure signal comes OUT of `getUnifiedWeaknessProfile` and (via
  Phase 1) re-ranks/teaches on a coaching surface (a "note comes OUT" proof).

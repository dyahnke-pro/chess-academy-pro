# Narration unification — context and plan (2026-10-04)

Mapped from the code by five read-only passes (graders, material words, routes,
safety reads, threats) on `23443e4f4` + the uncommitted `seeReadsStanding` fix.
Every number below is a count from the code, not a guess.

## Where accuracy is still at risk (do these first — they can speak false lines today)

1. **Piece names from point counts, two survivors.** `reviewMoveBriefing.materialWord`
   (:81) and `tacticalRead.materialLabel` (:88) say "a piece" for any 3+, "a rook" for
   5+, "a queen" for 8+. Exchange + pawn → "up a piece"; two minors → "a rook"; queen
   for rook + minor → "up a pawn". The `countWords` gate missed them (it scans the
   `? :` shape; these use `if`). Fix: name from the board / ledger, widen the gate.
2. **Safety claims on a board in check.** `seeReadsStanding` now covers 5 sites;
   ~25 more turn a zero into "safe / guarded / holds / nothing takes it back"
   on a board where the capturer can be in check. Highest risk:
   `mistakeNarration.ts:572` ("keeps your X protected"), `groundedAnswer.ts:512, 847,
   7196, 7247, 3091`, `playCommentary.ts:984`, `CoachTeachPage.tsx:10466, 8020`,
   `reviewFullData.ts:382`, `threatAnswer.ts:103`, the `landingIsSafe` gates on
   fork/attack claims. Fix: ONE tri-state door — `safe | loses N | not-standing` —
   because `legalSeeGainFor` also returns 0 when it cannot put the capturer on move
   at all (a silent "safe").

### Status
- Step 1 DONE (worktree): `boardEdgeWords(fen, side, edge)` in `utils/countWords.ts`
  is the one board namer; `conversionMethod`, `reviewMoveBriefing.evalWhy` and
  `tacticalRead.summarizeVerdict` (now takes the line's end board) use it. Gate
  widened to the `if (...) return 'a piece'` form.
- Step 2 IN PROGRESS: `captureRead(fen, sq, capturer)` = the door (null = not a
  standing read). `landingIsSafe` goes through it. Migrated: mistakeNarration
  keepsWhatWasDropped, groundedAnswer piece-safety / square-safety / capture-on /
  passer-strong, playCommentary "nothing takes it back", threatAnswer safeThere.

## Unification (no wording should change except where noted)

3. **Graders — nine, not three.** One band table (5/10/20 win%) but different mate
   rules, fallbacks and local thresholds (`slipDetector`/`playedMoveGrade` 200 for
   blunder, importer 150, puzzle fallback never null). Plan: one LEAF grader in
   `accuracyService` (mate rules from `classifyCpLoss`, mover-POV and white-POV
   entry points), the others become wrappers. Behaviour changes to DECIDE: Learn's
   long missed mate (blunder today via cp ladder) and the 200 vs 300 slip threshold.
   Brilliancy stays outside the leaf (it imports `groundedAnswer`).
4. **Material words — 15 namers.** Four board counters (`edgeWords`, `nextPlans`
   surplus, `materialEdgeWords`, groundedAnswer:6268) and four ledger renderers
   disagree ("a queen"/"the queen", "a piece"/"a knight", "the exchange" or not).
   Plan: one board namer + one ledger namer. Keep `settledLeadFor` gating. Parsers
   to update in the same change: `standingRefrains.ts:200/206`,
   `inaccuracyCall.winClauseValue` (:230). Conventions to pick once.
5. **Routes — six producers, string-coupled.** `routePhrase` (noun form) and the
   lookahead clause (verb form) share data; four others (`danyaBehaviors` ×2,
   `pieceValueRead`, `reviewPieceItinerary`) do not. Regexes read the prose back
   (`planArc.ts:121-122`, `inaccuracyCall.ts:420`). Plan: store `{name, path, takes}`
   on the aim, one phraser with verb + noun forms, delete the regexes.
6. **Threats.** Review's deep-threat lines vanish together because both deep loops
   run LAST, after serial 7s singleton calls, inside a 75s cap — when the cap fires
   first none are written; a failed pool lease drops everything onto the singleton.
   Fix (lost teaching, not wording): give the deep passes their own budget/order.
   Parity (Learn has no null-move "left alone" read; Review has no fork-two-out /
   must-defend) is a later step — engine contracts differ (Learn is cache-only).

## Regression guard for every step
- Each step: failing-first test on a real walk position, then the pinning tests the
  maps list (≈15 route, ≈20 material, ≈25 grader, ≈30 safety files) updated only
  where the wording change is the point.
- Full suite + ship-check per step; one walk (Learn + Review, 3 games) at the end of
  each of steps 1–2, one after 3–6.

## Walk 13 result (build 23443e4f4, the OTA build)
Review 3/3 clean. Learn: one false line (G1 31.Rc7+ "guards the knight on f3"),
fixed in the worktree (`seeReadsStanding`); G2 and G3 clean.

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

### Status — ALL SIX STEPS DONE (2026-10-04, one push)
1. **Board namer** — `utils/countWords.boardEdgeWords`; conversionMethod, reviewMoveBriefing, tacticalRead.
2. **Safety door** — `captureRead` / `standsSafe` / `signedCaptureRead` (null = not a standing read);
   `landingIsSafe` through it. Migrated every risky site the census found (27): chat piece/square
   safety, capture-on, hanging scan, passer strength, "nothing takes it back", threatAnswer,
   mistakeNarration, seventh-rank rook, perturbation, bluff, principleAttribution landsSafely/safeExits,
   moveIntent, reviewTeachingPoints escape, causalChain ×5, pvPlayback ×2, opponentMovePurpose,
   conversionMethod rescue, CoachTeachPage gambit + nowLoose. Left on the raw read ON PURPOSE, each
   because it licenses no safety claim and the door cost true teaching: causalChain "already hanging
   before" (licenses "their move caused it") and exchangeLedger `settled` (a line ending on a check
   is not unsettled; the door dropped "Bxd8 takes the queen").
3. **One grader** — `accuracyService.gradeMove` (one mate rule) + `cpBand` (50/100/300). Wrappers:
   moverFault, playedMoveGrade (long missed mate no longer a 99,000cp blunder), slipDetector (blunder
   200→300), detectBlunders (150 floor → full bands), tacticClassifier, coachMoveCommentary,
   endgameRecap, mistakePuzzle fallback, classifyMove (+ "was that good?" now grades on evals + mates),
   chat candidate verdicts. Gate: `oneGrader.test.ts`.
4. **Ledger namer** — `exchangeLedger.netPieceWords`; lineCalc, materialEdgeWords. Refrain regex
   accepts "the exchange" and "N points".
5. **Route phraser** — `utils/routeWords` (noun/verb/via, cut at first arrival); planArc, lookaheadPlan,
   danyaBehaviors ×4, pieceValueRead; the two prose-parsing regexes deleted (route data on the aim).
6. **Deep threats** — singleton-chain waits bounded (`SINGLETON_STAGE_MS`), so the deep passes are
   never starved by the 75s cap. Gate: `deepThreatBudget.test.ts`.

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

# P0c-3 inventory — curriculum demotion, Up next exhaustiveness, Weaknesses analysis (2026-10-04)

## Curriculum (walk rule 5)
- EXTENDED `coachCurriculumService.reconcileCurriculum` (:60): a mastered tag open again in the spine re-enters `queued` + `escalated`, `reopenCount` +1, ahead of the queue behind the active step; WORSENING (per `weaknessLifecycle`) takes the active slot. Old code excluded mastered tags from the top-up (the bug).
- EXTENDED `syncCoachCurriculum` to read `getWeaknessLifecycle` via `worseningClusters` (:154). Spine analysis tags == lifecycle clusterIds (`bucketForMistake(p).clusterId`, weaknessSpine:385).
- EXTENDED `CurriculumItem` (schema.ts) with optional `reopenCount`, `escalated` (no index, no version bump).

## Up next
- `PICK_KINDS` const (upNextPicker:30) → `PickKind` derived; NEW `PICK_FINISH_LINE: Record<PickKind,…>` (:43) naming each kind's finishBite surface; the test proves each named file really calls it.
- `homeSuggestion.TACTICS_IMPORTANCE` now `Record<PickKind, number>` (:71), values unchanged.
- NEW `thinking` kind → `/coach/teach?lesson=think` (hub coach). Ranked from the heat map (`thinkingSignalFromHeatMap`, upNextLoader:91) over tier-1 habits via the EXISTING `habitForCluster` join (coachDecider:466) + `TIER_ONE_HABIT: Record<MethodHabit, boolean>` (upNextLoader:81). Red → after the slip; grey → before warm-ups; green → not offered. Learn family importance: red 78, grey 62, else the plain coached game at 60 (`THINKING_IMPORTANCE`, homeSuggestion:85).
- OFF: `THINKING_LESSON_LIVE = false` (upNextPicker:64) until P1: CoachTeachPage reads `?lesson=think`, calls `finishBite('thinking')`, and `PICK_FINISH_LINE.thinking` is filled (the test fails if LIVE flips without it). When `ThinkingStep` lands, re-key `TIER_ONE_HABIT` through it.

## Weaknesses analysis (walk 15–17)
- 15: NEW `planAnalysisBatch` + `analyzeLabel` (gameAnalysisService:2585/2597) — same filter + `pickAnalysisBatch` as the run; AnalyzeGamesButton reads it. Also fixed: the button counted depth-stale games (`depthUpgrade` default true) the batch never takes.
- 16: NEW `getAnalysisCounts` (gameInsightsService:181) sharing `awaitsAnalysis` with the overview; GameInsightsPage re-reads it on each progress tick and folds it into the overview (header + card stay one count).
- 17: diagnosed from code, not reproduced. Two silent partial-end paths: (a) all pool workers wedged with failed respawn → run resolved "finished" with the package unstarted; (b) any non-wedge throw rejected Promise.all, ending the run with a console line while loops ran on a released pool. NEW `drainGameQueue` (:2532) skips a throwing game, reports where it stopped; the remainder runs on the shared `runSequential` (:2699). New audit kinds: analysis-game-failed / worker-lost / pool-exhausted / run-failed; sweep summary says ENDED SHORT.

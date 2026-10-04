# P0c-1 inventory — set grader, tap hook, widened evidence row (2026-10-04)

## Existed, reused
- `capabilityEvidence.ts` — the row, `capabilityProven` (one bar), `summariseEvidence`, `recordLaneEvidence`. Extended, not copied.
- `misconceptionService.logMisconception` / `recordTagDrillResult` — the spine writer and SRS spacing; called through `answerRecord`.
- `positionReadingService.buildReadingQuestions` — the answer keys (`answerSquares`).
- `weaknessModelEvents.emitWeaknessModelChanged` — refresh signal.
- `utils/andList` — list rendering for the uncapped lists.

## Extended
- `capabilityEvidence.ts`: `EvidenceOrigin` (+`lesson`, `reading`), exhaustive `EVIDENCE_READING` (know/use), `isUseEvidence`, `AnswerDetail` (taps in order, extras, wrongAttempts, firstMissHelp, msToFirst, msBetween, help, spoken, chainDepth, wrongTags, typed, questionId, keySize, surface), unindexed `answer?` on the row (no Dexie bump — schema v36 indexes `id, tag, outcome, recordedAt, origin, [tag+outcome]` only). `summariseEvidence(rows, bar, reading='use')`: KNOW reads lesson/reading rows with distinct POSITIONS (`positionSourceKey`) as the source key; USE unchanged. `getCapabilityProfile(reading)`, `standingFromEvidence`, `capabilityStanding(tag) → {know, use}`. `recordAnswerEvidence` (emits). `recordLaneEvidence` now emits too. `answerEvidenceOutcome` / `helpPrompts` — one outcome rule.
- `positionReadingService.ts`: `ReadingQuestion.answerMode` (required) + `misconceptionTag: MisconceptionTagId`; hanging question keys ALL hanging pieces, mode `all`; `findAttackTargets` and `findForcingCandidates` uncapped (G4.5; `groundedAnswer` caller updated, it passed 64).
- `types/index.ts`: `MisconceptionSource` + `lesson`, `reading`.
- `AnalysisPracticePage.tsx`: tap path on `useSquareAnswer` + set grader (no LLM); typed/moved answers keep the text path (LLM grader) — noted, P0a/P1 territory. Both paths record once via `recordAnswer`.
- `ReviewReadingChallenge.tsx`: write only — `recordAnswer` replaces `recordReadingResult`.
- `trapLearning.ts`, `HeatMapPanel.tsx`: raw-row readers filter `isUseEvidence` so a reading answer never reads as a game.

## New
- `services/squareAnswerGrader.ts` — `gradeSquareSet` + pure question state machine (`newSquareAnswer`, `applySquareTap`, `applySquareSilence`, `applySquareShow`, `applySquareHelp`, `squareAnswerDetail`). To converge with `thinkingLesson.ts` (lead's all-mode machine) at merge.
- `hooks/useSquareAnswer.ts` — thin shell: state ref, nudge timer, square styles, callbacks.
- `services/wrongTapTag.ts` — wrong square → tag (conservative) + `recordWrongTapMisconceptions`.
- `services/answerRecord.ts` — the ONE recorder: evidence row + wrong-tap slips + drill spacing.

## Deleted (G8.5)
- `services/analysisPracticeStats.ts` (+ test): a meta counter with ZERO production readers.

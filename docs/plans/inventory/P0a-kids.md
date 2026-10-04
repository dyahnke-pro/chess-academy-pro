# P0a-kids — context inventory (2026-10-04)

## Existed (reused)
- `src/services/kidGameCoach.ts` — `describeKidMove`, `sanitizeKidCoachText`,
  `voiceKidFacts` (→ `voiceFacts({kidSafe})`), `getKidGroundedResponse` (the
  shared concept / teaching / app-help spine, reused as the `concept` kind).
- `src/utils/andList.ts` (`andList`/`orList`), `src/services/pieceValues.ts`
  (`CAPTURE_VALUE`), chess.js `attackers()` / `moves({square})`.
- `src/coach/surfaceContract.ts` table shape (register / withholds / speaks).
- `scripts/audit-kid-play-coach-loop.mjs` as the audit template; the listener
  sidecar, `muteTtsForAudit`, `stampAuditRunId`, `autoDismissCalibration`.

## Extended
- `answerKidGameQuestion` (kidGameCoach.ts) — free-LLM fallback DELETED; now
  classify → computed facts → `voiceKidFacts` → raw facts fallback. New
  `answerKidGameQuestionWithKind`; input gains REQUIRED `playerColor`,
  `nextTeachingConcept`; `history` / `gameTitle` deleted (only fed the LLM).
- `GuidedGamePage.tsx` — passes the seat + concept; `chatHistoryRef` deleted.
- `CoachSurface` gains `'kid'`; `SURFACE_CONTRACT.kid` row; `coachSurfaceToRoute`.
- `AuditKind` gains `kid-question-answered` (answerKind, fen, kid).

## New
- `src/services/kidBoardAnswers.ts` — hint / is-it-safe / where-can-it-go /
  board line, pure chess.js leaf.
- `src/test/kidIsolation.gate.test.ts` — bans adult symbols in kid files.
- `scripts/audit-kid-llm-hallucination.mjs` — the promised P0 audit.

## Deleted (G8.5)
- `groundCoachAnswerBoardClaims` (boardClaimValidator.ts) — its only
  production caller was the kid free-LLM path; tests removed with it.

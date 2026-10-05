# P0b — ONE engine strength: context inventory (2026-10-04)

## Exists, reused
- `liveStrength.ts` — the one live estimator (damped +60/−35, posed moments only). Unchanged
  maths; `LIVE_MIN` now IS `engineStrength.STRENGTH_FLOOR`.
- `useDiscussionPractice` `liveRating` / `liveFor` — the one per-game holder. Moved above
  `evaluatePlayerMove` and given `advanceLive`, now called from BOTH `recordGradedMove` (Play)
  and `evaluatePlayerMove` (Learn, WLPP Play rung) — no second estimator, no second analysis.
- `coachPlaySession.configFromTargetElo` — still the one Elo→engine-config owner.
- `stockfishEngine.getBestMove(..., targetElo)` — the Elo cap (`UCI_LimitStrength`).
- `coachDecisionEvents` / `searchDepthEvents` leaf pattern → copied for `opponentMoveEvents`.

## Extended
- `coachGameEngine.getAdaptiveMove` — now a thin wrapper over `chooseAdaptiveMove`; optional
  `opts.strength` emits ONE row with the real source layer. Depth-search fallback now sends
  `UCI_LimitStrength`/`UCI_Elo` (was Skill Level only).
- `stockfishEngine.analyzePosition` — normalizes `UCI_LimitStrength false` when not requested
  (same reason it normalizes Skill Level).
- `coachPlaySession.getCoachMove` — optional `strength` param, emits with source
  book / stockfish / fallback-legal.
- `appAuditor` — `coach-opponent-strength` kind + subscriber.
- `scripts/audit-coach-full-games.mjs` — contract "ONE ENGINE STRENGTH every sparring opponent
  reads the one number"; `algoAuditContract.test.ts` row + field join.

## New
- `src/services/engineStrength.ts` — `DIFFICULTY_OFFSET` (the one table, ±200), `STRENGTH_FLOOR`
  (400), `targetStrength`, `OPPONENT_PURPOSE: Record<OpponentSurface, OpponentPurpose>`,
  `opponentStrength`, `emitOpponentStrength`, `studentPlayingRating` (moved from coachGameEngine,
  re-exported there).
- `src/services/opponentMoveEvents.ts` — leaf event.

## Deleted (proven dead)
- `CoachPlaySessionView.tsx` — zero importers (comments only).
- `coachPlaySession.buildOpeningSeed` / `nextSeededMove` / `OpeningSeed` — production callers: none.

## NOT dead (left)
- `useChessGame`'s engine branch — `KidPiecePage` passes `computerColor 'b'` and plays a
  500ms full-strength Stockfish. Live. Not declared in the purpose table (kids surface is a
  later decision).

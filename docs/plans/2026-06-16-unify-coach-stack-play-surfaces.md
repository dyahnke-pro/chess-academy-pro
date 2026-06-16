# Unify the coach/grounding/audit stack across ALL play surfaces (2026-06-16)

David: "make sure every play surface has it… they all need the same coach,
audit tools, grounding tools as play and learn… all playing surfaces should
now be identically coded."

## The stack (what /coach/play + /coach/teach have)
1. Grounded coach chat via `coachService.ask` / `getCoachChatResponse` (liveState)
2. `buildTacticsLiveContext` — live engine tactics
3. `scanPositionForTrap` → `liveState.trapSignal` — trap miner
4. `explainBestMoveGrounded` — best-move facts
5. master-play grounding (Layer B/D in coachApi + `useMasterPlayWatcher`)
6. `groundArrows` — geometry-grounded arrows
7. `generateMoveCommentary` — grounded auto move-narration (silent-on-quiet)
8. `logAppAudit` instrumentation

## Strategy: CENTRALIZE in the chokepoint, don't copy-paste (that drifts)
`coachService.ask` already auto-populates grounding blocks (annotation, plan,
modelGames, playerGames) onto liveState. Put the TRAP SCAN there too → every
chat surface inherits it. That alone brings GameChatPanel (/coach/play chat),
ExplainPositionSessionView, CoachAnalysePage, CoachGameReview-drawer to trap
parity automatically (they already have coachService.ask + tactics).

## Gap matrix (from the 2026-06-16 sweep)
- **Reference (full stack):** CoachGamePage (/coach/play), CoachTeachPage (/coach/teach).
- **GameChatPanel / ExplainPosition / CoachAnalyse:** have coachService.ask +
  tactics; MISSING trap → **fixed by the coachService.ask centralization**.
- **OpeningPlayMode (/openings/:id/play):** 6/8 missing — template
  `voiceService.speak`, no grounded coach. **P1 — David's "opening tab".**
- **MiddlegamePractice:** imports `getCoachChatResponse` but never calls it.
  7/8 missing. **P1.**
- **TrainMode / DrillMode / PracticeMode:** drill surfaces, template by design
  (the WLPP non-curated fallback, CLAUDE.md). LEAVE.
- **SrsTrainerPage:** silent by design (kid/SRS card mode). LEAVE.
- **CoachPlaySessionView / CoachPracticeSessionView:** legacy nested routes.
  LEAVE (verify not user-facing) — modern equivalent is /coach/play.
- **CoachGameReview move-narration:** pre-computed at walk-phase by design; its
  drawer CHAT already uses coachService.ask. LEAVE the narration path.

## Plan (incremental, batch one deploy at the end)
- [x] Commit A — centralize `scanPositionForTrap` in `coachService.ask`
      (gated on trap/tactics question + liveState.fen). Remove the per-surface
      copy from CoachTeachPage (now inherited). Brings GameChatPanel/Explain/
      Analyse to trap parity for free. + envelope carve-out (already shipped).
- [ ] Commit B — OpeningPlayMode: add a grounded coach Q&A path
      (`getCoachChatResponse` + buildTacticsLiveContext + the centralized trap),
      + logAppAudit instrumentation. masterPlayWatcher already mounted.
- [ ] Commit C — MiddlegamePractice: call the already-imported
      `getCoachChatResponse` in the post-move handler with a real liveState.
- [ ] ship-check + prod 3-instrument audit + iOS build.

## Risk
- Commit A: LOW (chokepoint, additive, gated; per-surface copy removed = less code).
- Commit B/C: MEDIUM (additive coach path on template surfaces; no edits to
  the locked walkthrough/WLPP machinery).

# Permanent fix — RIP OUT `groundCoachReply` (the validate-after bandaid)

**David 2026-07-09, LOCKED:** "No bandaids! Root cause fixes only." / "No
question about it. This needs to be a permanent fix." — Full rip of the agentic
answer path's validate-after net.

## The disease

`groundCoachReply` (the runtime board-claim/stat stripper in
`src/services/coachAnswerGates.ts`) is a VALIDATE-AFTER bandaid. Per G0, its
existence is the disease: it only exists because some coach path still lets the
LLM DECIDE chess content, then strips the lies after the fact. It is currently
load-bearing in three places:

1. **The spine itself** — `coachService.ts:442` (`runAnswerGates`) applies it to
   "EVERY coach answer in the spine." So every surface on `dispatchCoachTurn` →
   `coachService.ask` runs the agentic tool loop (LLM free-composes using tool
   results) and strips the output after.
2. **The move-narration exemption** — `coachApi.ts` `getCoachChatResponse`
   fall-through (`/I (just )?played/` / `/your move/`) still calls the free LLM.
3. **Six direct-caller surfaces** — `VoiceChatMic.tsx:512`,
   `MasterclassCoachChat.tsx:76`, `CoachGameReview.tsx:750/844`,
   `gameReviewService.ts:54`, `coachFeatureService.ts:82`,
   `openingSectionNarrator.ts:106`.

## The cure (make the chokepoint never emit ungrounded chess, then delete the net)

The ONE chokepoint is `getCoachChatResponse`. The Phase-1 seal already grounds
most turns (intent → assembler → `voiceFacts`; unmapped chess →
`serveGroundedPositionDefault`; non-chess → chess-forbidden + swept). The gaps
that still free-compose chess are (2) + the agentic tool-composition + the 6
surfaces. Close those, and `groundCoachReply` has nothing left to strip → delete.

### Already done this session (the pattern)
- New primitive `groundedMoveFeedback` (`coachApi.ts`) — compute (eval + best
  move + live tactic) → `assembleMoveEvalAnswer`/`assemblePositionAssessment` →
  `voiceFacts`. LLM decides nothing.
- **MiddlegamePractice** + **useLiveCoach** migrated to it; their free-LLM prompt
  machinery (coaching prompt, plan-context blob, trigger message builder) DELETED.

### Phased cutover (each phase: convert → typecheck/lint → test → verify no
### groundCoachReply dependency remains for that surface)

- **P1 — the 6 direct callers → grounded.**
  - `gameReviewService` / `CoachGameReview` / `coachFeatureService` /
    `CoachPanel` (getCoachCommentary review/report/feedback): convert to grounded
    report assemblers (compute the eval/mistake/phase facts → `voiceFacts`).
  - `openingSectionNarrator`: DB-narration (G3) — already fact-injected; drop the
    `groundCoachReply` wrapper (narration doctrine, not a free chess answer).
  - `VoiceChatMic` / `MasterclassCoachChat`: already on `dispatchCoachTurn`; drop
    the redundant post-`groundCoachReply` (the spine grounds once P3 lands).
- **P2 — move-narration exemption → grounded.** Route the `getCoachChatResponse`
  move-narration fall-through through a grounded narration assembler (the move
  played + the computed continuation) instead of the free LLM.
- **P3 — the spine.** Ensure the agentic tool-composition output is grounded
  (tools return computed data; the compose is voiced through the grounded path,
  not free prose). Then DELETE `runAnswerGates` + its call at `coachService.ts:442`.
- **P4 — delete `groundCoachReply`** (and `applyCandidateArrows`' dependency note)
  once no caller remains; keep `applyCandidateArrows` (arrows = display, not a
  grounding gate). Grep proves zero callers.
- **P5 — verify.** typecheck + lint + the coach test suites + ship-check; the
  adversarial break-it loop proving no ungrounded chess escapes; 3-instrument
  prod audit; then the single push (batched with the surface migrations).

## Non-negotiables
- G0: LLM decides zero chess content. The move/eval/line/reason are computed;
  the LLM only phrases via `voiceFacts`.
- No new validator/gate/regen/claim-stripper (that would re-introduce the
  disease). If a phase tempts one, the fix is to compute the answer instead.
- One batched push at the end (no incremental ship); the surface migrations +
  the spine deletion land together, verified.
- UX tradeoff acknowledged: open-ended / live-coach prose gets more grounded
  (less free-LLM warmth). That IS the G0 trade David locked.

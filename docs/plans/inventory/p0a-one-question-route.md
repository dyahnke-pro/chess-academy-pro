# P0a — the ONE question route (shadow) — context inventory (2026-10-04)

## Existed, reused
- `dispatchCoachTurn` (src/coach/dispatchCoachTurn.ts) — the door; extended, not replaced.
- `callDeepseekWithTool` (coachApi) — forced structured output; wrapped once as `readChatTurnStructured` beside `translateToEnglish`.
- `buildQuestionGrounding` + the questionIntents detectors — ARE the fast path; `fastPathLane` reads them in coachApi's dispatch order (`if (grounding.X)` blocks, retrospective → position-assessment).
- `pieceOptionsRef`, `compareMovesAsk`, `detectBoardQuestion`, `isStopCommand`, `looksLikeConversationalReply`, `isAlternativesQuestion` — lane detectors reused.
- `askSourceFor` — the one classifier; `AskOrigin` widened with `'spoken'`.
- `assembleRetrospectiveAnswer` + `computeMoveRatingAt` — the compare-my-move answerer (defect 11); the rater got a FEN-keyed core `computeMoveRatingFromFen`.
- `evalPhrase` (groundedAnswer) — defect 12, seated phrasing.
- Leaf-event pattern (`coachDecisionEvents`) → `chatTurnEvents`; appAuditor subscriber.
- The `lastCoachActionOffer` scratch pattern → `lastServedIntent` / `consumeServedIntent`.

## New
- `src/coach/chatTurn.ts` — schema, `CHAT_KINDS: Record<ChatKind, KindSpec>`, `fastPathLane`, `readSquareAnswer` (multi-referent answers), `validateChatTurn`, `ConversationState`.
- `src/coach/chatTurnParser.ts` — the read (square fast path → model → validate).
- `src/coach/chatTurnEvents.ts` — `chat-turn` leaf.

## Not moved onto the door in this pass (follow-up)
Learn (CoachTeachPage handleSubmit), Review chat (CoachGameReview), My Mistakes
(MistakePuzzleBoard), SmartSearchBar mic, Play/Analyse internal asks — see the
P0a report for what each needs.

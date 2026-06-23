# PLAN — LLM coach in the kid "Play Game" (parity with Play/Learn with Coach)

**Request (David, 2026-06-23):** "Add the llm to the play game. I want it
identical to play and learn with coach."

**Surface:** `/kid/play-games/:gameId` → `GuidedGamePage.tsx` (the kid
"Guided Games" / play-a-real-game tutorial). Today: scripted moves
(`GUIDED_GAMES`) with **static** per-move `narration` + static
`wrongMoveResponse`; opponent moves auto-play from the script. No LLM.

## The reconciliation (why it can't be a LITERAL copy of the adult coach)

The adult Play/Learn-with-Coach carries personality dials, SAN notation,
and move-deciding paths — all BANNED in kid mode (locked non-negotiables
#1/#3/#4/#6/#17). So we build the identical *experience* (a live, talking,
conversational coach) on the kid-safe, GROUNDED spine:

- **Kid-safe lane:** every LLM call goes through `getKidLlmResponse`
  (skipPersonality + KID_SAFETY_PROMPT: no SAN, ≤12 words/field, Ruth
  default). Voice is already locked to Ruth via `KidLayout.lockKidVoice()`.
- **Grounded (G0):** the LLM NEVER decides chess content. The move played
  is the scripted SAN; board facts come from `buildFedTacticsContext` /
  `formatTacticsSubBlock` (the inversion shipped this session). The LLM
  only rephrases code-computed facts into fresh kid prose.
- **Moves stay scripted (kid #17):** LLM never picks a move / FEN / level.
- **Static fallback (kid #17 P0):** on ANY LLM failure or anomaly
  (empty, SAN leak, over-length), fall back to the authored
  `narration` / `wrongMoveResponse`. A hallucination in kid mode is P0 —
  the authored text is always the safety net.
- **No per-move praise (kid #5):** milestone-only; commentary restates the
  move's *effect*, never "Great move!".

## Build

1. **`src/services/kidGameCoach.ts`** (new) + `.test.ts`:
   - `describeKidMove(fenBefore, san)` — chess.js → spelled-out move
     ("your bishop moves to c4"), never SAN.
   - `generateKidMoveNarration({fenBefore, san, isPlayerMove,
     teachingConcept, authoredNarration})` — dynamic kid narration,
     grounded by the computed move + concept; static fallback.
   - `generateKidWrongMoveHint({fenBefore, expectedSan, authoredResponse})`
     — dynamic encouragement, grounded by the expected move; fallback.
   - `answerKidGameQuestion({question, fen, expectedNextSan, gameTitle,
     history})` — the "ask the coach" chat (Learn parity), grounded by
     board facts + the scripted next move; kid-safe; safe canned fallback.
   - `sanitizeKidCoachText()` — strip any leaked SAN, cap length; shared
     by all three so a model slip can't reach a child.

2. **`GuidedGamePage.tsx`** wiring:
   - On every move shown (player-correct + opponent-auto + first), request
     dynamic narration; speak (Ruth) + display; fall back to authored.
   - Wrong move → dynamic hint; fallback to authored.
   - Add a coach **chat input** ("Ask the coach") — kid asks, kid-safe
     grounded answer renders + speaks. Mirrors Learn-with-Coach.
   - A "thinking…" state while the LLM resolves; never block the board
     (board stays responsive; narration swaps in when it lands).

3. **Tests:** kid contract (no SAN leak, fallback on rejection/empty,
   grounding present), plus GuidedGamePage still drives the scripted line.

## Status
- [x] kidGameCoach service + tests (22 tests: no-SAN-leak, fallback on every
      failure path, grounding present)
- [x] GuidedGamePage wiring — dynamic move commentary + dynamic "what to play"
      instructions + dynamic wrong-move hints + "Ask the Coach" chat (quick-tap
      chips + text input). Authored text shows instantly (no dead air) then the
      dynamic version swaps in + speaks; static fallback on any anomaly.
- [x] ship-check green (typecheck 0, lint 0 errors, content gates, changed-file
      tests) + `audit-kid-static.mjs` 0 errors (kid LLM-ban + contract holds).

Done. Built the identical *experience* on the kid-safe spine — moves stay
scripted (kid #17), every LLM output is grounded + sanitized + falls back to the
authored text (P0), Ruth voice, no SAN, no per-move praise.

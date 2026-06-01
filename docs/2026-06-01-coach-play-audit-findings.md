# Play-with-Coach (`/coach/play`) — full interactive audit findings (2026-06-01)

Audit script: `scripts/audit-coach-play-full.mjs` (3-instrument: Playwright
drives the live UI + prod audit-stream pull + narration-listener sidecar).
Run against LIVE prod (`https://chess-academy-pro.vercel.app`).
**13/15 checks green.** Reports under `audit-reports/coach-play-full-*`.

## What the audit drives (David's explicit asks)

| Ask | Result |
|---|---|
| Tell the coach to play an opening **against you** | ✅ `/coach/play?opening=Italian Game&side=black` — coach plays White. |
| Coach plays it **correctly** | ✅ Coach White line = `e4 / Nf3 / Bc4` (the unambiguous Italian signature) + a valid Pianissimo 4th (`c3`/`d3`/`O-O` across runs). Every move legal (chess.js replay). Auto-detected as **C50 Italian Game**. |
| Push the **hint** button | ✅ Advances (one tap → full answer, `level 0→3` — this is intended per `useHintSystem.ts`, David 2026-05-26 "show the answer on first press"). |
| **Ask it questions** | ✅ Typed a real question, coach answered (assistant bubble rendered; real `api.deepseek.com` brain call fired). |
| Off-book warning | ✅ Playing `Qf6` off the Italian tripped the "left theory" warning. |
| Blunder interception | ✅ Hanging the queen (`Qxf3`) triggered the real-time `blunder-interception` modal (continue / takeback / try-best). |
| **Review the game at the end** | ✅ Inline `CoachGameReview` mounts in the `postgame` state. |
| **Asks you about mistakes** | ✅ The review shows "Add this game's mistakes to your weaknesses **(1)**" — correct count. |
| **Logs them correctly** | ❌ See Finding 2 — it asks, but nothing persisted. |
| Voice | ✅ 41–55 narration events captured by the listener (Ruth speaks). |

## Findings

### Finding 1 — Resigning bypasses `finalizeGame` (CONFIRMED, deterministic)

`handleResign` (`CoachGamePage.tsx:1843`) and the `skip-to-review-btn`
(`:4187`) set `status: 'postgame'` **directly**. The only code that writes
the game to Dexie and runs the automatic mistake pipeline —
`db.games.add(...)` + `generateMistakePuzzlesFromGame(...)` — lives in
`finalizeGame` (`:1936-1942`), which fires **only** on a real game-over
(checkmate / stalemate / clock flag).

Consequence: a **resigned coach game is never saved to `db.games` and is
never auto-analyzed for mistakes.** Observed live: `db.games` count stayed
at 0 after resign. On navigate-away the game is gone.

→ **David's call:** is this intended (resign = abandon)? If a resigned game
should still be saved + reviewed, route `handleResign` through
`finalizeGame('loss')` instead of jumping straight to `postgame`.

### Finding 2 — "Add mistakes to weaknesses" logged nothing (NEEDS ON-DEVICE CHECK)

The review correctly **asks** (button shows the right count, "(1)"), but
clicking it wrote **0 rows** to `misconceptionTags` / `mistakePuzzles`
across 4 runs, with no log-audit emitted.

Path: button → `autoAnalyzeBlunders` → `captureMisconception` →
`classifyMisconception` → `getCoachChatResponse` (LLM, strict-JSON) →
`logMisconception` (`db.misconceptionTags.add`).

Most likely cause is the **audit env's degraded brain LLM**: the classify
step parses strict JSON from the model, and the model's output here is
malformed (the in-game chat answer was also garbled — e.g. "C Italian Game
as Black…"), so `JSON.parse` fails → `classifyMisconception` returns `null`
→ nothing logs. The persistence **wiring is unit-test-sound**
(`mistakePuzzleService` / `misconceptionService` / `autoAnalyzeGame`, 35
tests green — but they mock the LLM, so they don't cover this classify→log
seam).

→ **Verify on David's device** (healthy provider): play a game, hang a
piece, finish, tap "Add mistakes to weaknesses", confirm it surfaces under
`/weaknesses` + My Mistakes. If empty there too, add a **non-LLM heuristic
fallback** in `classifyMisconception` when the JSON parse fails (a hung
queen has an obvious `hung-material` tag without needing the LLM).

## Caveat (honest scope)

End-of-game was driven via **resign** because it's the only deterministic
ending in-audit (shortest clock is 3 min; the Stockfish coach won't walk
into a fast mate). Resign is itself the abnormal path of Finding 1, so
Finding 2 was only exercised over an unanalyzed resigned game — the
**automatic** `finalizeGame → mistakePuzzles` path (Stockfish-driven, not
LLM-gated) could not be driven live and is covered by unit tests only.

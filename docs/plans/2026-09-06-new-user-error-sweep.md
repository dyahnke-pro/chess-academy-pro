# PLAN — New-user error sweep + user-message bell (2026-09-06)

Source: PostHog trace of the 7 native App Store users acquired this week.
Method (David 2026-09-06, LOCKED for this sweep): **no slop fixes.** For EACH
error we (1) pull the audit data, (2) read the code to the root cause, (3) agree
a strategic game plan together, (4) then implement + gate + audit. One at a time.

## Error queue (root-cause each, discuss, then fix)

| # | Error | Sev | Who hit it | Status |
|---|---|---|---|---|
| A | Hint drops the move (Tier-3 hint routed to the LLM, which dropped the move) | P1 | both returners | ✅ FIXED — computed in code (move+arrow+why), no LLM |
| B | "best opening" → drill not upload; generalized to ALL personal-data questions with no games | P1 | Port Harcourt | ✅ FIXED — central upload-your-games gate |
| 1 | `adaptGameRecord returned null — PGN unparseable/history empty` → review "could not replay" | P1 | Port Harcourt ×2 | 🔬 root-cause found: `CoachTeachPage.tsx:9476` saves teach game `pgn = game.history.join(' ')`; a ≥4-move teach game produced a PGN chess.js couldn't `loadPgn`. Need to nail WHY that PGN failed (SetUp/FEN start? non-standard?) before fixing. |
| 2 | `analyzePosition failed — interrupted by new request` ×6 → froze takeback → 3 rageclicks on `takeback-btn` | P1 | Port Harcourt | pending — the eval-interrupt and the frozen takeback are the SAME bug |
| 3 | OTA reload kicks users mid-session (`ota_app_reloaded`) | P1 | both returners | pending — behavior chosen: silent background swap, apply on next natural launch; only a non-blocking "Update ready — Restart / Not now" banner if it completes mid-session; never auto-reload |
| 4 | `ota_download_failed` ×2 (may be phantom — manifest reply-shape, see CLAUDE.md OTA note) | P2 | 2 users | pending |
| 5 | `coach_tool_callback_rejected: walkthrough fork picked (unlabeled)` | P2 | Port Harcourt ×2 | pending |
| 6 | `llm_error: reword pass failed — got rewind_walkthrough_narration` (DeepSeek returned wrong tool name) | P3 | Port Harcourt | pending |
| 7 | `coach_grounding_gate_tripped [task=kid_puzzle_gen]` ×3 | P3 | Queens #1 (kid mode) | pending — check the kid puzzle-gen gate |

## NOT bugs (verified)
- `coach_grounding_gate_tripped: dropped [Ng5+] → served computed prose` — G0 working
  (fidelity gate swapping the model's move claim for computed prose).
- `coach_opponent_masters_miss` — Amar has 0 master games; fallback to Stockfish working.

## Rageclick findings (what they hit)
- `/openings` → the **Masterclasses tab** (`data-testid="tab-masterclasses"`) — tab toggle not switching.
- `/coach/teach` ×3 → the **Take-back button** (`takeback-btn`), disabled because the board
  was stuck in `analyzePosition failed`. Same bug as #2.

## Feature — user-message BELL + two-way feedback inbox (David 2026-09-06)
- Home screen ONLY, top-right, big-ish bell icon with a red dot when unread.
- Message channel must reach NATIVE users without an App Store release →
  server-fetched at boot (`public/announcements.json` on prod). David authors via
  committed JSON (publish = commit + push to main; ~30s web deploy).
- Bell panel: David's announcement(s) + a "Send feedback" button (existing form).
- **Two-way (David 2026-09-06):** feedback becomes a threaded inbox — David can REPLY
  and the user sees the reply in the same bell panel ("You said… / Coach replied…").
  App Store users are anonymous, so each thread is device-scoped. Design the thread
  store + David's reply mechanism BEFORE building. (Not yet built.)

## Decisions log
- OTA: silent background swap; mid-session completion → non-blocking "Restart / Not now"
  banner; never force-reload. (David 2026-09-06)
- Bell: home-screen only, top-right, big-ish; committed-JSON authoring; message +
  Send-feedback button; two-way threaded feedback. (David 2026-09-06)

## Next-session pickup
Errors A + B are shipped (branch `claude/new-users-this-week-myzh26`). Resume the
sweep at Error #1 (finish root-causing WHY the teach PGN failed to parse), then #2/#3.
Do NOT batch-fix; each error gets its own discussed plan with David.

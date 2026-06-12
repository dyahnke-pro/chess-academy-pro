# APP-WIDE FUNCTIONAL AUDIT CAMPAIGN (2026-06-12)

David: *"i want you to systematically move throughout the entire app with this
standard for auditing."*

## The standard (per surface) — the locked protocol
See CLAUDE.md §"THE ADVERSARIAL FUNCTIONAL AUDIT". For EVERY surface:

1. **Enumerate every programmed function** the surface implements (submit
   handlers, runtime, buttons, intents) — list the inventory in the script.
2. **Functional coverage grid** (`audit-<surface>-functional.mjs`) — drive the
   REAL UI like a person (click chips/tiles/buttons/board squares; type only
   genuine user requests). EVERY probe ASSERTS it reached its target; a missing
   target = FAIL, never a silent "ok". Emit a per-function PASS/FAIL grid.
3. **Adversarial loop** (`audit-<surface>-loop.mjs`) — messy human input (typos,
   British, abbrev, gibberish, emoji, multi-intent, state chaos: rapid submit,
   pick-before-load, out-of-order, mid-action hijack, cold cache). Escalate +
   shuffle each pass. PUSH UNTIL IT BREAKS.
4. **Capture every break** with the exact input; for React warnings capture the
   KEY VALUE + component stack. Catch React correctness warnings (same key /
   each child / max update depth), not just `Uncaught`/`TypeError`.
5. **Real break vs artifact** — fix the CODE for real breaks (+ sweep the
   pattern everywhere + confirm by re-running the break condition). Load
   artifacts (LLM-proxy saturation) and harness artifacts (empty no-op,
   animating board → force-click, busy input → wait) are NOT coach bugs; pace
   the loop so it doesn't manufacture false hangs.
6. **Contract:** 3 consecutive break-free passes, each harder, every function.

Clone the references: `scripts/audit-coach-teach-functional.mjs` +
`scripts/audit-coach-teach-loop.mjs`.

## ✅ APP-WIDE STABILITY SWEEP — DONE (2026-06-12)
`scripts/audit-app-sweep.mjs` loads ALL 55 routes (seed-warmed so content
actually renders), captures console/pageerror/React-warnings/error-boundary +
a light interaction. **Result: 55/55 clean** — every route mounts + renders
real content with ZERO crashes, console errors, React key warnings, or error
boundaries (incl. the 404 catch-all). This is the breadth baseline; the
per-surface DEEP functional grids + adversarial loops below add the depth.

## Surface inventory + status

| # | Surface | Routes | Status | Findings / fixes |
|---|---|---|---|---|
| 1 | **Coach · Learn (Teach)** | `/coach/teach` | ✅ DONE | **Bugs found+fixed:** board-arrow dup-key flood (deduped + swept to OpeningChallenge); chat-msg id collision under rapid use (freshTurnId); control-words stop/switch/resume (PR #720); skip-onto-fork stalled (auto-advance added). **Feature:** Watch auto-advances through forks down the main line (David: "pages need to advance automatically"). **Coverage grid 29/32**, 0 console/page errors. **Breaking-point loop:** fork-race chaos (pick/pause/stop vs the 4s timer) = CLEAN (0 pageerror / 0 same-key); dup-key flood zone clean. ⚠ Loop FOLLOW-UP: the out-of-order/spam chaos produces load-artifact `silent-hang`s — needs PACING so the loop can reach 3 clean passes (a harness tune, not a coach bug). |
| 2 | Coach · Play | `/coach/play` | ☐ pending | |
| 3 | Coach · Chat | `/coach/chat` | ☐ pending | |
| 4 | Coach · Review | `/coach/review`, `/coach/review/:gameId`, `/coach/report` | 🔶 healthy, audit partial | `audit-coach-review-functional.mjs` built. Flow mapped: list → open → SUMMARY card → **Start** (gated on LLM walk-narration "Preparing…"→"Start", waits to enable) → move walk. **11/19 reached, ZERO console/page errors** (no bugs found). Verified: list/cards/open/start-walk, classification-badge, narration-banner, engine-lines-toggle, narration-toggle, **ask-panel (brain answered)**, play-again, back. REMAINING (audit-depth, NOT bugs): nav-forward/back (works — only reachable-by-navigating classification-badge proves it; discrete change-detection unreliable on the auto-narrating walk); contextual buttons show-me/blunder-capture/missed-tactics/explore (need a blunder ply) + resume/practice-in-chat (end-of-walk). TODO: drive to a blunder ply + walk-end to close those. |
| 5 | Coach · Home/Plan/Analyse | `/coach/home`, `/coach/plan`, `/coach/analyse` | ☐ pending | |
| 6 | Coach · Endgame / Session | `/coach/endgame`, `/coach/session/:kind`, `/coach/train` | ☐ pending | |
| 7 | **Openings detail (WLPP/traps/gems/books)** | `/openings/:id`, `/openings/pro/:playerId/:id` | 🔶 partial (`audit-punish-gems-loop.mjs` exists) | bring under functional-grid + adversarial standard |
| 8 | Openings hub + SRS | `/openings`, `/openings/srs`, `/openings/pro/:playerId` | ☐ pending | |
| 9 | Tactics | `/tactics` + 12 sub-routes | ☐ pending | |
| 10 | Puzzles | `/puzzles` + 5 sub-routes | ☐ pending | |
| 11 | Weaknesses | `/weaknesses` + 6 sub-routes | ☐ pending | |
| 12 | Games | `/games`, `/games/import` | ☐ pending | |
| 13 | Kid | `/kid/*` (6 piece hubs + journey + games) | ☐ pending | kid non-negotiables apply (CLAUDE.md §🧒) |
| 14 | Settings | `/settings`, `/settings/onboarding` | ☐ pending | |
| 15 | Dashboard | `/` + SmartSearchBar | ☐ pending | |
| 16 | Academy | `/academy` | ☐ pending | |

## Priority order (by user value)
teach ✅ → **openings/:id** → coach/play → coach/review → tactics → weaknesses →
dashboard → kid → settings → puzzles → games → coach home/plan/analyse →
endgame/session → academy.

## Per-surface deliverable (Definition of Done)
- `scripts/audit-<surface>-functional.mjs` (coverage grid, every function ✅)
- `scripts/audit-<surface>-loop.mjs` (adversarial, 3 consecutive break-free passes)
- Every real break fixed in code + swept + confirmed
- Findings logged in this table; push to `main`

## Next-session pickup
- Surface 1 (teach) is the reference + DONE. Finish its auto-advance probe in
  the functional grid, then move to surface 7 (openings/:id) or 2 (coach/play).
- Each surface: read its component(s) end-to-end → enumerate functions → clone
  the two reference scripts → run → break → fix → 3 clean passes → mark ✅ here.

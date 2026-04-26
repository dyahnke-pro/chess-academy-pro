# ROADMAP — Chess Academy Pro

**Last updated:** 2026-04-25
**Constitution:** `COACH-BRAIN-00.md`
**Teaching vision:** `TEACHING-MODE-VISION.md`

Status keys: 🔴 critical / 🟡 important / 🟢 nice-to-have / ⏸️ deferred
Size keys: S (under 30 min) / M (30-90 min) / L (90+ min, multi-session)

---

## What's next (top of queue)

1. **WO-TEACH-01 — Brain verification discipline** (single file, ~30 min, S)
   Updates `src/coach/sources/identity.ts` with three new disciplines (verify the board, ground theory, act on intent). Directly addresses the five hallucinations from the April 25 audit log. Improves every existing surface. Precondition for all teaching mode work.

2. **WO-PHASE-NARRATION-FIX-01 — Why are phase transitions suppressed?** (investigate first, M)
   Audit log showed 17 phase transitions evaluated, 17 suppressed, in a single game. Coach never narrated a phase change. Diagnose before fixing — could be config, could be structural.

3. **BRAIN-05c — Migrate phase narration + live coach interjections** (multi-file, L)
   The remaining two surfaces. Both timing-driven. Higher complexity than chat-style migrations. May incidentally fix the phase suppression bug.

---

## Brain Foundation

| Status | Size | Item | Notes |
|---|---|---|---|
| 🔴 | S | WO-TEACH-01 — verification discipline | identity.ts, 3 new rules from TEACHING-MODE-VISION |
| 🔴 | L | BRAIN-05c — phase narration + live coach migration | last two surfaces; timing-sensitive |
| 🟡 | M | BRAIN-06 — delete runAgentTurn + cleanup | runs after 05c lands |
| 🟢 | M | WO-BRAIN-00-LOCK — constitution passphrase + signed commits | ceremonial Tolkien-style passphrase, hashed only |

---

## Production Bugs (from April 25 audit log)

| Status | Size | Item | Notes |
|---|---|---|---|
| 🔴 | M | Phase narration silently suppressing 17/17 fires | see WO-PHASE-NARRATION-FIX-01 above |
| 🟡 | S | Voice splitter chops decimals ("0." then "4." then "pawns") | regex fix in sentence splitter |
| 🟡 | M | Stockfish WASM crashes mid-analysis (2 in one game) | "Unreachable code" runtime error; concurrency issue |
| 🟡 | M | Brain talks about navigation without emitting navigate_to_route | partly addressed by WO-TEACH-01 Discipline 3 |
| 🟡 | M | Brain talks about openings without emitting set_intended_opening | same — Discipline 3 |
| 🟢 | M | local_opening_book never consulted in real games | brain not reaching for the cerebellum book |
| 🟢 | M | FEN cache hit rate near zero (1 of 8 stockfish_eval calls) | shared LRU cache underutilized |
| 🟢 | M | Post-game review only advances one move then stops | reported by Dave; needs reproduction |
| 🟢 | S | App is "slow" during play | known tradeoff from BRAIN-04 calibration; future caching WO |

---

## Test Debt

| Status | Size | Item | Notes |
|---|---|---|---|
| 🟡 | M | WO-COACH-REVIEW-TEST-FIX-01 (retry) | now actionable post-986e613; 26 individual failures to investigate |
| 🟢 | S | weaknessAnalyzer test failures | 4 tests, predates brain work |
| 🟢 | S | mistakePuzzleService test failures | 3 tests, predates brain work |
| 🟢 | S | annotationService test failure | 1 test, predates brain work |
| 🟢 | S | db/database.test.ts schema test | 1 test, predates brain work |
| 🟢 | M | bundle.perf.test.ts (8.9MB > 7.8MB ceiling) | real concern, not urgent |
| ⏸️ | M | dexie.perf.test.ts environmental flake | passes in isolation, fails under contention |

---

## Teaching Mode (sequenced)

| Status | Size | Item | Notes |
|---|---|---|---|
| 🔴 | S | WO-TEACH-01 — verification discipline | (also listed under Brain Foundation) |
| ⏸️ | M | WO-TEACH-02 — board control tools | set_board_position, play_sequence, reset, clear |
| ⏸️ | M | WO-TEACH-03 — annotation tools | draw_arrow, highlight_squares |
| ⏸️ | L | WO-TEACH-04 — lesson surface | new UI mode, enter/exit_lesson_mode |
| ⏸️ | M | WO-TEACH-05 — traps + lesson plan tools | wire WO-TRAPS-* database; lookup_lesson_plan |
| ⏸️ | L | WO-TEACH-06 — Bishop's Opening proof-point demo | end-to-end teaching mode validation |

Teaching mode WOs are blocked on: BRAIN migration finished + verification discipline acceptance bar holds.

---

## Pre-Launch Housekeeping

| Status | Size | Item | Notes |
|---|---|---|---|
| 🟢 | S | Lemon Squeezy API key + product IDs | $7.99/mo, $79.99/yr — pricing rethink first |
| 🟢 | S | Voice-coach pricing rethink | Polly + LLM + Stockfish + Lichess is materially more expensive than original pricing assumed |
| 🟢 | S | Purchase chessacademy.pro domain | ~$15/yr Cloudflare Registrar |

---

## Recently Shipped (last 48 hours)

- `bdb41eb` BRAIN-00 — constitution
- `a855827` BRAIN-01 — spine
- `0d92ec3` BRAIN-02 — in-game chat migrated
- `790ea88` BRAIN-03 — drawer + review-ask migrated
- `848a16b` BRAIN-04 — move selector + cerebellum book + calibration
- `05f7100` stale BRAIN-04 doc removed
- `6de50eb` BRAIN-05a — standalone chat + smart search migrated
- `770ad56` BRAIN-05b — hint engine migrated
- `89f7c07` BRAIN-05b-FIX-01 — synchronous tier increment + concurrency hardening
- `0256388` removed temp hint audit doc
- `6c066f3` WO-KID-HINT-TEST-FIX-01 — Kid mode tests on brain-era mocks
- `986e613` WO-TEST-CRYPTO-POLYFILL-01 — webcrypto.subtle.digest polyfill

Six surfaces on the brain. Spine 57/57 green. Three surfaces remain on runAgentTurn.

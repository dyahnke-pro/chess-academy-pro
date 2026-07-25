# Coach Tab — Comprehensive BY-HAND Audit (2026-07-25)

Driven by hand against **LIVE PROD** (`https://chess-academy-pro.vercel.app`,
bundle `index-CscmmGub.js`, sha `342e4ce`) via `scripts/handdrive.mjs` — one
action at a time, state read between clicks. NOT a fire-and-forget bot.

Legend: `[ ]` pending · `[x]` confirmed working (by hand) · `[!]` broken/found a
bug · `[~]` partial / can't fully verify headless (flagged for device).

Voice caveat: headless can't hear audio. "Voice fired" is confirmed via the
`/api/tts` request + the narration-listener/audit-stream events, never by ear —
real audio playback is a device-only check (flagged `[~]` where it matters).

---

## WATCH  (opening detail WLPP Watch + variation tabs + model games)

- [x] W1  Opening detail mounts; onboarding + calibration + help modals dismissed (Vienna, 8 variation tabs, WLPP ladder-gated)
- [x] W2  Watch launches curated `lesson-player` ("Vienna Game — A Master Class, 14 min"); `walkthrough-progress` count = 0 → NOT legacy WalkthroughMode (Gate A ✓)
- [x] W3  Watch steps move-by-move (lesson-next advances board + narration)
- [x] W4  Per-move narration = present-tense in-game register; names f7/f2/e4/long-diagonal, cites Lasker + Capablanca (NOT retrospective)
- [~] W5  Voice per beat — headless can't hear audio; `/api/tts` not yet probed this run → device check
- [~] W6  Lead-the-eye arrows/highlights — not probed headless (SVG); gated at build by lessonIntegrity; narration names the squares
- [x] W7  Reaches middlegame — 14-min lesson goes deep (classical spine → symmetry → "Italian and the Ruy" middlegame teaching)
- [~] W8  8 distinct variation tabs present (Main/Gambit/vs 2…Nc6/Frankenstein-Dracula/Paulsen/Qf3/Stanley/Vienna Gambit Accept/Copycat); per-tab distinct-lesson click-through PENDING
- [ ] W9  Model games (2 present, both White wins: Nakamura–Firouzja, Firouzja–Carlsen) — playback PENDING

## LEARN  (WLPP Learn + /coach/teach walkthrough + why-faucet)

- [x] L1  Learn rung launches (PlayableLinePlayer memory phase; "Play the highlighted move — 1 of 27")
- [x] L2  Move-only prompt + full written theory narration shows BELOW the board (`memory-move-narration`, "MOVE 3 OF 27" + prose)
- [x] L3  Played e4 by clicking board squares → advanced through opponent reply to move 3
- [~] L4  Opponent reply auto-played correctly (no desync); voice-promise gating not audible headless → device
- [ ] L5  `/coach/teach`: type a canonical opening → resolves + starts walkthrough
- [ ] L6  `/coach/teach`: off-canonical input (British/typo/abbrev) resolves (≥3)
- [ ] L7  `/coach/teach`: arrows on every step-by-step coach move (G6)
- [ ] L8  `/coach/teach`: inline Chat + Tips buttons work
- [ ] L9  `/coach/teach`: auto-pause on a chat question
- [ ] L10 why-faucet: interruptive "why'd you play that?" probe fires on a significant move (Learn only)
- [ ] L11 why-faucet: reason picker chips + Hint + type-answer present
- [ ] L12 why-faucet: grounded reveal grades the committed reason
- [ ] L13 Stage keywords route (drill / quiz / findMove / punish / play)
- [ ] L14 Cold-cache / first-time-user flow (fresh IndexedDB)

## PLAY  (/coach/play free game + WLPP Play / OpeningPlayMode)

- [~] P1  Coach makes moves (WLPP Play rung auto-replied after my e4) — full `/coach/play` free game not yet driven
- [ ] P2  Adaptive engine strength matches rating — PENDING
- [ ] P3  Break-book in the opening vs beginner rating — PENDING
- [x] P4  **Eval bar UPDATES** — +0.5 → +0.4 after e4 on the Vienna Play rung. THE regression I reverted; confirmed live on prod ✓
- [ ] P5  Phase-transition narration — PENDING (needs to reach middlegame)
- [ ] P6  NO blocking picker on pure Play — PENDING
- [ ] P7  Slip-detector blunder interception — PENDING
- [~] P8  **Live punish callout** — `__seedFen` hook works (seeded a Nxd5-wins-queen FEN), but callout did NOT fire: eval returned an implausible -0.3 → Stockfish is unreliable in headless Chromium (repeated worker.onerror). Engine-gated; DEVICE-ONLY. Code proven by component test.
- [ ] P9  Show-the-line reveal — blocked by P8 (no callout to reveal here)
- [x] P10 WLPP Play rung mounts in-page `opening-play-mode` ("Opening phase: move 0/22"), locked to line — NOT generic /coach/play ✓
- [ ] P11 Rung completion → markRungComplete → unlock — PENDING (Watch→Learn unlock DID work, see findings)
- [ ] P12 Finished game persists — PENDING
- [x] P13 Board move by clicking squares works (e2→e4 played via square clicks) ✓

## REVIEW  (/coach/review post-game)

- [x] R1  Italian "vs You" game → real Stockfish analysis, live "Analyzing move N of 36…" banner → summary
- [x] R2  Walk mounts (`coach-game-review-walk`, "Ply 0/35"); 35 move-cells + prev/next key-moment nav + back/forward
- [x] R3  Opening named early + retrospective register: "Let's review your game in the Italian Game: Giuoco Piano… you had White and it ended in a win. 2 moments worth a second look"
- [~] R4  Per-move why — narration present; full per-ply confirm needs stepping all 35 plies
- [~] R5  Structural beats — narration present; needs per-ply stepping to confirm anchor→plan→target
- [~] R6  Missed-tactic listed ("Move 18: Tactical Sequence 5.4pts") + key-moment citations (BLUNDER 18 / INACCURACY 17); interactive find-the-shot card surfaces on stepping TO ply 18 (not driven yet)
- [~] R7  blunder rewind — surfaces at the blunder ply (needs stepping)
- [~] R8  turning point — surfaces at the turning ply (needs stepping)
- [~] R9  why-picker student-side — surfaces at a student slip ply (needs stepping)
- [x] R10 Recap reads the REAL tally: "77% ACCURACY · A+ Opening 96% · ?? 1 Blunder" from the analysis
- [~] R11 Ask panel OPENS (`walk-ask-panel`); typing/response not driven (textarea testid + working LLM needed — see the 4× 400 finding)
- [x] R12 Reviewed a full game with NO O-O crash (the odds-game fix is on 342e4ce; review loaded + analyzed clean)

---

## Findings log
(bugs found while driving, with the exact input that triggered them)

- **[BUG — FIXED, pending deploy] `t.startsWith is not a function` (uncaught pageerror).**
  Fired while stepping the Vienna Watch lesson (alongside a Stockfish
  multi-worker onerror). Root cause: `gameAnalysisService.ts:228` worker
  message handler calls `data.startsWith('info ')` with no string guard — a
  crashing multi-thread bundle posts a non-string message → uncaught throw.
  Fixed: `if (typeof data !== 'string') return;`. Swept sibling handlers
  (stockfishEngine uses equality/regex-exec, safe). NOT yet on prod.
- **[OPEN — investigating] Watch completion may not unlock Learn.** After the
  Watch lesson ended, `learn-btn` stayed `disabled` and `ladder-hint` still
  read "Next: Watch it". Unclear yet whether skip-stepping bypassed the
  completion handler or the rung-completion write didn't fire. Re-verify.
- **[KNOWN — mitigated] Stockfish multi-worker `onerror`** fired live on the
  opening detail page (the WASM-crash class from PostHog). Has the
  multi→single→asm fallback chain; noisy but recovers.
- **[CONFIRMED repro] `t.startsWith`** fired AGAIN on `/coach/teach` when the
  stockfish worker errored during lesson gen — same `gameAnalysisService.ts:228`
  root cause; my typeof-guard fix (local, not yet deployed) resolves it.
- **[OPEN — needs URL] 4× HTTP 400** during `/coach/teach` lesson generation
  (Italian Two Knights, cold gen). NON-FATAL — the walkthrough still generated
  and narrated. Needs a network capture to confirm the endpoint; most likely
  the primary LLM provider (DeepSeek baked key) 400ing and falling back to
  Anthropic. Latent risk: if DeepSeek 400s every call, all coach LLM silently
  rides Anthropic fallback → breaks when Anthropic credits run out (matches the
  PostHog `coach-llm-provider-error: credit balance too low` issue).
- **[PAPERCUT] Line-picker chip → "did you mean".** Tapping the `C56 · classical
  Two Knights` line-picker chip did NOT resolve to its lesson — the coach replied
  "I don't have an exact match for 'Italian Game: Italian: Two Knights with d4'.
  Did you mean one of these?" (fuzzy list). A picker chip should resolve straight
  to the lesson, not bounce to a disambiguation prompt.

# The 1:1 Coach — the diagnostic-drill loop (honest delivery)

**David 2026-08-26.** Vision: a coach session that feels like 1:1 with a real
chess coach. Incorporate the tactics tab. The "My Mistake" puzzle engine (which
David rates the strongest tab after Openings) is the core — it's under-utilized.
This doc is the HONEST map of what the app can and cannot deliver toward that.

**No yes-man.** Below, "CAN" means a real mechanism exists today (cited from the
2026-08-26 coach-surface map); "CANNOT" means it does not, and in some cases
should not be faked.

---

## The picture (what a 1:1 coach does) vs what this app can deliver

| A real coach… | This app | Mechanism / honest limit |
|---|---|---|
| Remembers every game + your recurring mistakes | **CAN** | `getUnifiedWeaknessProfile` (mistakePuzzles + misconceptions + tactics + opening/phase). Real strength. |
| Decides what you work on today | **CAN (not wired to initiate)** | Data ranks it; the coach only reads it when ASKED. The missing piece is **initiation**. |
| Pulls up YOUR game, shows the moment, asks the move | **CAN — already built + loved** | The **My Mistake engine** (`coachDrillService` / `buildMistakeDrillQueue`): came-from-a-game, replay-in, name the mistake, find the best move, SRS-graded. |
| Fresh reps of that exact pattern | **CAN** | Tactics tab: `getPuzzlesByTheme(weakness.puzzleThemes)`. This is how the tactics tab gets incorporated — scoped to YOUR weakness, not random. |
| Explains WHY, deeply, at your level | **PARTIAL** | Facts are computable (`positionFacts`/`perturbation`/`boardConcepts` + the pattern count). Depth is deliverable IF the package carries the layers. NOT an open-ended human explanation. |
| Assigns homework, checks next week | **CAN (under-used)** | SRS/mistakePuzzle scheduling already re-tests. |
| Watches you play, interrupts live | **PARTIAL / off by design** | Slip-detector + blunder card exist; `useLiveCoach` is **hard-disabled**; the Learn "why did you play that" picker was **removed** (David's call). |
| Answers any question, conversationally | **PARTIAL** | ~40 grounded lanes answer a lot; outside them → generic LLM → "can't verify" stock line. |
| Motivates, reads your mood, relationship | **CANNOT** | No model of you as a person. Phrasing can be warm; it does not KNOW you're discouraged. The real ceiling. |
| A designed multi-month curriculum | **PARTIAL** | Trends + plan exist; no true pedagogical arc across months. |

## The honest thesis

The app **cannot** be a real coach in the relational / open-conversational sense,
and chasing that is the trap. It **can** deliver something a human coach can't
scale: a tireless **diagnostic-and-drill loop** grounded in every game you've
played — it remembers every mistake and re-tests you forever. That is the app's
real strength, and it is mostly ALREADY BUILT and BURIED.

**So the build is: surface + scale + deepen the loop we already have — not fake
the human relationship.**

## The loop (all deliverable on existing mechanisms)

1. **Diagnose** — `getUnifiedWeaknessProfile()[0]` = your top pattern (from your
   games).
2. **Show** — the My Mistake engine replays YOUR position, names the mistake,
   asks for the best move. (Exists; loved.)
3. **Explain (DNA depth)** — route the drill's narration through `voiceFacts`
   with the LAYERED computed package (below), not the current code template.
4. **Practice** — tactics tab pulls fresh reps of the same `puzzleThemes`.
5. **Follow up** — SRS re-schedules; the coach re-tests next session.
6. **Initiate** — the coach opens with "you've missed this pattern N times —
   let's fix it," instead of waiting to be asked.

## The DNA-depth rule (David's fear: "even with DNA it'll be missing")

Valid fear. **The DNA register phrases depth; it does not create it.** Depth
lives in the computed package. To sound like a real coach, the drill's fact
package must carry the layers:
1. **What** you missed (the tactic / the better move — engine).
2. **Why** it works (removal-of-guard / the leaning piece — `perturbation`).
3. **Pattern** — that this is your Nth time on this motif (weakness count).
4. **Fix** — what to look for next time (the concept — `boardConcepts`).

Where a layer is genuinely absent → **stay terse**, never let the LLM improvise
to fill it (that's the exact G0 failure that reads robotic-or-fake). Measure the
package's completeness; depth = computed layers, not eloquence.

## What we will NOT do (anti-oversell)

- NOT build a new "custom lesson generator." The My Mistake engine is the lesson.
- NOT fake live "react as you play" beyond the existing (disabled-by-choice) slip
  detector — David already rejected the interruptive version.
- NOT promise conversational tutoring beyond the grounded lanes.
- NOT decompose eval into per-theme attribution (not computable); the drill shows
  the real total cp of the detected moments.

## Phased plan (deliverable order)

- **Phase 1 — front door + coach initiates the My Mistake engine.** A "Drill my
  mistakes" entry; the coach proactively surfaces "N unsolved, M same pattern —
  run them?" Highest leverage, fully on existing mechanisms. `pending`
- **Phase 2 — DNA-narrate the drill** with the 4-layer package (route through
  `voiceFacts`, replace the code template). `pending`
- **Phase 3 — tactics tab scoped to the weakness** (`puzzleThemes` → fresh reps),
  wired as the "practice" step after the drill. `pending`
- **Phase 4 — fix the under-feeding** so positional weaknesses count (import
  misconceptions are `counted:false`; the mistake faucet is tactical-gated).
  `pending`
- **Phase 5 (separate, wired into review)** — turning-point "what it hinged on"
  via `positionFacts`. `pending`

## Decisions log

- **2026-08-26** The "custom lesson" IS the My Mistake engine surfaced + scaled,
  not a new generator.
- **2026-08-26** Tactics tab = the pattern-scoped practice step, keyed off each
  weakness's `puzzleThemes`.
- **2026-08-26** Depth = computed layers handed to DNA; terse where a layer is
  missing. Never LLM-fill.
- **2026-08-26** The app leans into the diagnostic-drill loop; it does not fake
  the relational/conversational coach (its honest ceiling).

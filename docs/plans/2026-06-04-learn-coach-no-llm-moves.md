# PLAN — Learn-with-Coach: stop the LLM from playing moves (2026-06-04)

**David (emphatic):** *"NOTHING SHOULD MAKE THE LLM PLAY MOVES!! IF THAT IS
THE CASE THEN SOMETHING IS BROKEN!! I SPENT DAYS MAKING SURE THAT THE LLM
ONLY DID NARRATION!! THAT IS A GROUNDING TRUTH OF THIS APP!!"* — and: *"can
we make learn with coach work like play with coach?"*

## Root cause (confirmed — and BROADER than first thought)

The LLM plays the opponent's move via `play_move` on TWO of the three
play surfaces. Corrected map (2026-06-04):

| Surface | Opponent move | LLM plays? | Grounding-truth |
|---|---|---|---|
| `OpeningPlayMode` (WLPP "Play" rung) | `getAdaptiveMove` (masters → lichess → rating-matched Stockfish), code calls `game.makeMove` | **NO** — LLM only `voiceService.speak` narration | ✅ CORRECT |
| `CoachGamePage` (`/coach/play`, "Play with Coach") | LLM picks + emits `play_move` (CoachGamePage.tsx:2166), random-legal fallback | **YES** | ❌ VIOLATION |
| `CoachTeachPage` (`/coach/teach`, "Learn with Coach") | LLM picks + emits `play_move` (handlePlayMove, CoachTeachPage.tsx:704) | **YES** | ❌ VIOLATION |

So "make Learn work like Play" would NOT have fixed it — **Play is broken
the same way.** Play just *feels* better because its prompt is tighter
(tools → relay via `play_move`). The ONLY place the engine plays and the
LLM merely narrates is `OpeningPlayMode` (the WLPP Play rung). That is the
grounding-truth-correct pattern, and the merge target.

The only checks on a teach `play_move` are chess.js legality + "not the
student's side" — nothing pins the move to the DB. The LLM freely picks it.
That breaks the grounding truth: *the DB owns the moves; the LLM only writes
prose.* Explains "coach forgot its move", illegal-feeling replies, opponent
hanging pieces, and the whole `play_move` tool-use fallback chain (scaffold
to paper over "LLM failed to move").

## Fix — ONE coach, on OpeningPlayMode's pattern (David: "I really just
wanted one coach … merge the play coach with learn, keep the extra tool
calls")

Merge `/coach/play` + `/coach/teach` into ONE coach whose OPPONENT MOVE is
`getAdaptiveMove` (the OpeningPlayMode engine), and whose LLM keeps every
TEACHING tool call but loses `play_move`-for-the-game:

- **KEEP (the "extra tool calls"):** `start_walkthrough_for_opening`,
  `set_board_position` (+ `moves`), arrows/highlights ([BOARD:…]),
  `take_back_move`, `local_opening_book` / `lichess_opening_lookup` /
  `stockfish_eval` (read-only grounding), hints. These TEACH.
- **DROP:** `play_move` as the way the opponent replies. The engine plays
  the opponent (`getAdaptiveMove`), code calls `game.makeMove`, the LLM is
  told the move is on the board and NARRATES it. (`play_move` can survive
  only scoped to a throwaway DEMO board if ever needed — never the live
  game; simpler to cut it and demo via arrows/`set_board_position`.)
- **Bonus David flagged — memory/state persistence:** three surfaces today
  = three divergent state machines + Dexie paths. One coach = one state
  path, so coach/session/progress state persists consistently instead of
  forking per surface.

Code plays the opponent reply from the DB/engine; the LLM only narrates.

1. On a student move, CODE resolves the reply deterministically:
   walkthrough-tree / book continuation → masters/explorer most-played →
   rating-matched Stockfish (reuse `getAdaptiveMove`).
2. CODE plays it (`game.makeMove`).
3. The LLM is told the move is already on the board and asked to **narrate
   only**. `play_move` is removed from the teach tool set so the LLM CANNOT
   move a piece.
4. Arrows/highlights come from the move CODE played (existing synth).

## Phases

- **P0 (shipped `5f5ba681`):** never-freeze backstop — when no move is
  recoverable, code plays the explorer's top move. Same idea on the failure
  path; keep it underneath.
- **P1:** `resolveCoachReplyMove(fen, opening, studentElo)` resolver (tree →
  masters/explorer → `getAdaptiveMove`). Pure + tested.
- **P2:** rewire `handleStudentMove` — play the resolved reply in code, then
  ask the brain to NARRATE (not play). Feature-flag for A/B vs the old path.
- **P3:** remove `play_move` from the teach tool set. Keep
  `set_board_position` + arrows for hypotheticals.
- **P4:** 3-instrument prod audit (Playwright + audit-stream + listener) —
  coach always replies with a DB move and only narrates.

## Locked-surface discipline

`/coach/teach` is `learn-stable`. The structured walkthrough path
(`generateOpeningFromDbNarration`) ALREADY does DB-moves + LLM-narrates;
we bring the FREE-PLAY path in line, inventing nothing. `getAdaptiveMove`
is battle-tested — reuse, don't reimplement. Before removing `play_move`,
grep EVERY consumer (tool registry, envelope tool list, fallback chain,
tests) and confirm each degrades gracefully (verify-before-delete).

## Decision for David

Coach reply difficulty in Learn: default **book/most-played while in theory,
then rating-matched Stockfish** out of book (teach the line, then play a
real game). Confirm or override.

## Parked

Brief-narration-silence: separate bug; voice events now mirror to PostHog
(`675a46f5`), so the next Brief repro is diagnosable from the dashboard.

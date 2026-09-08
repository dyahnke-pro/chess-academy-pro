# Full coach control (real Phase 4) — the coach actuates the whole app, and never fake-"done"

**§0 map + build plan.** David 2026-09-08: "roll in full control over the chess
app. coach needs to be able to set up any position, open any tab, do all
functions within the app when asked. currently it asked if it wanted me to have
it set up the board, it said done, but we were still on the home screen."

## Root cause of "said done, still on home" (diagnosed, cited)
- Cerebrum (action) tools actuate through **surface-supplied callbacks** on the
  tool context: `ToolExecutionContext.onNavigate / onSetBoardPosition /
  onPlayMove / onResetBoard` (`src/coach/types.ts:629-698`).
- **`navigateToRoute` returns SYNTHETIC SUCCESS when `onNavigate` is unwired**
  (`src/coach/tools/cerebrum/navigateToRoute.ts` header + stub branch) — "returns
  synthetic success so the LLM still sees the call as acknowledged." So the LLM
  says "done" while nothing happened. Same shape in the other action tools.
- **NO surface wires `onSetBoardPosition`** (grep: only the tool defines it; no
  component passes it). So "set up the board" from ANY coach chat hits the
  unwired path → fake success.
- `onNavigate` IS wired on some chat surfaces (`VoiceChatMic`, `SmartSearchBar`,
  `CoachChatPage`, `MasterclassCoachChat`) but NOT uniformly, and never on a
  home-screen entry, and board-setup needs navigate-then-set when no board is
  mounted.
- `coachBoardStore` (`src/stores/coachBoardStore.ts`: `fen/setFen/clear`) exists
  but is read only by the Openings surfaces (`PlayableLinePlayer`, `LessonPlayer`,
  `OpeningDetailPage`, `MasterclassCoachChat`) — there is **no universal surface
  that renders an arbitrary coach-set position**.

## The build (load-bearing — do as a focused, tested pass)
1. **A global coach ACTUATOR** (`src/services/coachActuator.ts`, singleton):
   - `navigate` fn registered once at the app root (from `AppLayout`/router).
   - `setBoardTarget(fen | moves, studentColor)` → writes `coachBoardStore` +
     navigates to the board-target surface (navigate-then-set).
   - Every coach-chat context gets `onNavigate` / `onSetBoardPosition` /
     `onPlayMove` / `onResetBoard` from the actuator by DEFAULT (so home and
     every surface can actuate), unless a surface overrides with its own board.
2. **A board-target surface** that renders `coachBoardStore.fen` as a live,
   interactive board (extend `/coach/play` `OpeningPlayMode` to accept a
   coach-set position, or a dedicated `/coach/board`). This is what "set up any
   position from anywhere" lands on.
3. **KILL synthetic success** (G0): an unwired/failed actuation returns
   `{ok:false, error}` — never fake success. Then the coach can't say "done"
   unless it actually did it. This is the honesty fix; the actuator wiring makes
   the unwired path rare, and the {ok:false} makes it truthful when it happens.
4. **Every function reachable**: `navigateToRoute` already validates against the
   routes manifest; ensure the manifest + [App map] block cover every tab
   (tactics, openings/WLPP, review, play, weaknesses, endgame, plan) and that
   navigate-to-tab + the tab's entry action are both expressible.
5. Kid surfaces stay EXCLUDED.

## Tests / audit
- Unit: the actuator sets the store + navigates; navigateToRoute/setBoardPosition
  return {ok:false} when unwired (no synthetic success); navigate-then-set order.
- 3-instrument prod audit: from the home/global chat, "set up <position>" ends
  with the board surface mounted showing that FEN (assert the route changed AND
  the board renders the position) — the exact failure David hit. And "open the
  <tab>" navigates. A "done" is only spoken when the post-state proves it.

## Status
DIAGNOSED + PLANNED (2026-09-08). Not yet built — it's a multi-file, load-bearing
change (global actuator + a new board-target surface + wiring every chat context
+ removing synthetic-success). Build it as a focused fresh pass with the tests +
audit above, on `main` (or a branch for review, David's call).

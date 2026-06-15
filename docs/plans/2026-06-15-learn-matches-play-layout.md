# Make Learn-with-Coach LOOK identical to Play-with-Coach (David 2026-06-15)

David's request: "I want the Learn with Coach tab to look just like the Play
with Coach tab." Chosen approach (AskUserQuestion): **full visual match, tuck
Learn's lesson controls into an accessible menu** (NOT buried — one clear tap).
Explicit detail: **Play shows captured pieces; Learn must too.** "I want them
identical."

## Reference: what Play (`CoachGamePage`) looks like
- Outer: `flex flex-col md:flex-row h-full overflow-hidden`.
- Left board column: `flex flex-col flex-none md:w-3/5 min-h-0 overflow-y-auto`.
- Two-row header: row1 = back + "vs Stockfish Bot / ~ELO" + color selector +
  `AnalysisToggles`; row2 = `DifficultyToggle` + time control + **Chat** + **Tips**.
- `PlayerInfoBar` (opponent) — name + **captured pieces** + material advantage.
- Board: `ChessBoard` capped `w-full md:max-w-[420px]`, centered
  (`flex justify-center`), eval bar on, narration banner above.
- `PlayerInfoBar` (you) below the board.
- Right column: `GameChatPanel`.
- Captured pieces come from `getCapturedPieces(fen)` + `getMaterialAdvantage`
  (`services/boardUtils`), rendered inside `PlayerInfoBar` (`./PlayerInfoBar`).

## Learn (`CoachTeachPage`) today
- Same outer two-column flex, BUT board column is `md:w-3/5` with a **busy
  lesson header**: back, color selector, WLPP/stage/line-picker/walkthrough
  controls. No `PlayerInfoBar`, no captured-pieces tray. Board not capped/
  centered the same way. Has the 11-phase walkthrough overlays (chooser, leaf,
  stage-menu, playout).

## Plan
1. **Reuse, don't reinvent.** Import `PlayerInfoBar` + `getCapturedPieces` /
   `getMaterialAdvantage` — render the captured-pieces tray above + below the
   board exactly as Play does. (The detail David called out.)
2. **Board column → Play's shell.** Centered board capped `md:max-w-[420px]`,
   eval bar, narration banner above — mirror Play's structure/classes.
3. **Header → Play's two-row shell.** Back + title + color selector +
   `AnalysisToggles` (row1); the Chat + Tips buttons (row2). Same classes.
4. **Lesson controls → accessible menu (the guardrail).** WLPP toggle, line
   picker, stage menu, walkthrough nav are the LESSON SPINE — move them into a
   single visible "Lesson" control (one tap opens them), NOT buried. The page
   reads as clean as Play; the lesson flow stays one tap away.
5. **Chat → match.** Learn already has inline chat (locked contract); align its
   placement/styling to Play's right-column `GameChatPanel` look.

## MUST NOT BREAK (locked Learn contracts — verify each after)
- Two-column flex (board left, chat right md+, stacked mobile).
- Inline Chat button on the board surface (NO global FAB).
- `ConsistentChessboard` / `Board/ChessBoard` only (no react-chessboard direct).
- Voice-promise-gated auto-advance (no race timers).
- 11-phase walkthrough state machine (`useTeachWalkthrough`): chooser → leaf →
  stage-menu → playout overlays all still render + function.
- Stage cache polling at the `leaf` phase; walkthrough-aware FEN for chat;
  auto-pause on chat; Find-the-Move accepts board moves.
- Arrow validator wired at response finalization (G6).

## Steps / status
- [ ] PLAN committed
- [ ] Captured-pieces tray (PlayerInfoBar) added to Learn
- [ ] Board column centered/capped to match Play
- [ ] Header restructured to Play's two-row shell
- [ ] Lesson controls folded into an accessible "Lesson" menu
- [ ] Chat placement aligned
- [ ] Gates green (ship-check) + typecheck/lint
- [ ] 3-instrument post-deploy audit on `/coach/teach` (locked-contract regression check)

## Next-session pickup
Start at step "Captured-pieces tray" — lowest-risk, explicitly requested.
Reference Play's board column at `CoachGamePage.tsx` ~4320-4760. Keep every
locked contract above; run the coach-teach audit before claiming done.

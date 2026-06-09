# WO-RESUME-01 — Coach-play game persistence (resume on re-entry)

**Trigger (David 2026-06-09):** "We need games to persist under coach tab!
Right now if you leave the tab and then reenter you lose your game and need
to start over. The only way to start a new game needs to be completion or
resign."

## Root cause
Resume already exists but is **hard-disabled**: `CoachGamePage.tsx`
`RESUME_ENABLED = false` (the mount effect bails before restoring). It was
turned off in WO-CLEANUP-01 because the restore path used `game.loadFen(fen)`
— FEN-only, no move history → "ghost squares" (stale highlights + an empty
move list against a mid-game board). The **save** path still runs every move;
only restore is off.

## Fix (rebuild restore so it's consistent — no ghost squares)
Persist the **move history + game-state snapshot + clock**, not just a FEN, and
rebuild the game by replaying the moves so chess.js has a real history and the
board's last-move highlight is correct.

1. **`useChessGame.ts`** — add `loadHistory(sans: string[]): boolean`: replay
   SANs into a fresh `Chess`, sync `fen` + `history`, set `lastMove` to the
   FINAL move's from/to (this is the ghost-square fix — the board resumes with
   the right square lit), `clearSelection()`.
2. **`useChessClock.ts`** — add `restore(state: ClockState)` so a timed game
   resumes with the exact remaining time, not a fresh clock.
3. **`coachPlayPersistence.ts`** — bump key `coachPlayActive.v1` → `.v2` (old
   FEN-only snapshots ignored cleanly). Extend `CoachPlayActiveState` with
   `sans: string[]`, `gameState: CoachGameState` (move list + hints + takebacks
   + keyMoments + result), `lastMove`, and `clock`. Keep `fen` for validation.
4. **`CoachGamePage.tsx`** —
   - Re-enable resume: `loadHistory(saved.sans)` → `setGameState(saved.gameState)`
     → restore difficulty/color/timeControl/clock → `moveCountRef = sans.length`.
   - Extend the per-move save effect to persist `sans`/`gameState`/`lastMove`/`clock`.

## "New game only via completion or resign"
Re-entry now RESUMES (doesn't new-game), which is the user's actual ask. The
snapshot is cleared ONLY in the game-over path (`finalizeGame` → `clearCoachPlayState`)
and the deliberate `handleRestart` (explicit "new game") / `handleColorChange`.
So a fresh game can only begin after the current one ends (completion/resign)
or an explicit deliberate restart — never silently on tab-switch.

## Gates / verification
- `useChessGame.test` — loadHistory round-trips position + lastMove + history.
- `coachPlayPersistence.test` — v2 round-trip; v1 ignored; stale-age purge.
- Playwright `audit-coach-play-resume.mjs` — play N moves → navigate away →
  return → board + move list + clock resume; game-over clears it.

## Status
- [x] loadHistory (`useChessGame.ts` + 3 unit tests)
- [x] clock.restore (`useChessClock.ts`)
- [x] persistence v2 (`coachPlayPersistence.ts` + updated tests, 12 green)
- [x] re-enable + wire restore/save (`CoachGamePage.tsx`; 26 page tests green)
- [ ] Playwright resume audit against prod (post-deploy, G1)

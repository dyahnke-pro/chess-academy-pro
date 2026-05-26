# PLAN — Strength calibration so the app is truly adaptive to player strength

Status: in progress (2026-05-26). Trigger: David has beginner players
beta-testing and difficulty isn't matching them.

## The disease (one sentence)

Player strength is stored in two divergent fields — `currentRating`
(drives the Stockfish opponent) and `puzzleRating` (drives puzzle /
tactics difficulty) — the user is NEVER asked their strength (onboarding
is auto-skipped in `App.tsx`), and the one authoritative signal (imported
Lichess/Chess.com games) only ever updates `currentRating`. So every new
install runs on the seeded ~1400 fiction, and puzzle difficulty ignores
the player's real strength.

## David's directive (2026-05-26)

> "i want the difficulty to be based off of imported games, if
> non-imported then use the skill picker idea"

So: **imported games are the primary strength signal; a beginner-friendly
skill picker is the fallback when there are no imports.** Whatever the
source, it must seed BOTH `currentRating` and `puzzleRating` as the
baseline. After that the two drift independently via results (correct —
they're different skills).

## Verified findings

- `getOrCreateMainProfile` (dbService.ts:14-15) seeds `currentRating:1420,
  puzzleRating:1400` — intermediate, not beginner.
- `App.tsx:188-193` force-writes `onboarding_skipped='true'` on first boot
  → the ELO capture step is dead; no tester has ever seen it.
- Onboarding (`OnboardingPage.handleFinish`) and the Settings ELO editor
  (`SettingsPage` ProfileTab) write `currentRating` ONLY — puzzleRating
  never moves.
- Puzzle/tactics surfaces read `puzzleRating`: PuzzleTrainerPage:52,
  AdaptivePuzzlePage:76, TacticDrillPage:74, WeaknessPuzzlePage, etc.
- Engine opponent reads `currentRating` (CoachGamePage:475, coachPlaySession
  resolveConfig) — this part is fine.
- `playerRatingService.getPlayerRatingEstimate()` already prioritizes
  imported games → coach games → profile → 1200. Reuse it; it never wrote
  puzzleRating, that's the gap.
- `gameAnalysisService.updateEloFromImportedGames` keeps `currentRating`
  fresh from imports going forward — leave it; engine should track real
  game strength.

## What's actually fine (don't touch)

Engine strength scaling, puzzle band selection (±200), tactical lookahead
banding, kid per-piece adaptivity. These work — they were just fed the
wrong number.

## Plan

1. **Type** — add `strengthCalibrated?: boolean` to `UserProfile`
   (non-indexed optional field → no Dexie version bump, per v24
   precedent). Absent ⇒ not calibrated ⇒ catches the existing beta
   cohort on next boot (retroactive handling).
2. **`strengthCalibrationService.ts`** (new):
   - `SKILL_BANDS` — newcomer/beginner/intermediate/advanced → ELO.
   - `applyStrength(profileId, rating)` — writes BOTH currentRating +
     puzzleRating (clamped), sets `strengthCalibrated:true`.
   - `calibrateStrength(profile)` — if already calibrated → no-op; else
     try `getPlayerRatingEstimate()`, and if source is `imported-games`
     apply silently; else return `{ needsPicker:true }`.
3. **`StrengthCalibrationPage.tsx`** (new) — beginner-friendly band
   picker (loading/empty/error states per standing order; no raw ELO).
   Calls `applyStrength`.
4. **`App.tsx`** — after profile load, run `calibrateStrength`; if
   `needsPicker`, render the picker as a one-time blocking first-run
   screen (import path bypasses it silently). Leave the API-key
   auto-skip untouched.
5. **`dbService`** — default uncalibrated profile to a beginner-safe
   single constant + `strengthCalibrated:false`.
6. **Tests** — `strengthCalibrationService.test.ts`,
   `StrengthCalibrationPage.test.tsx`; update `dbService.test.ts`
   default assertions to the new contract.
7. **Audit** — `scripts/audit-strength-calibration.mjs` (fresh-IDB →
   picker → assert both ratings written). Add to matrix + AUDIT_INDEX.

## Decisions log

- 2026-05-26: Picker is a one-time **blocking** first-run screen when
  there are no imports (David didn't answer the blocking question but the
  whole point is reliable calibration of the beta cohort; it's one tap).
  Trivially reversible to skippable if David prefers.
- 2026-05-26: Imports seed puzzleRating ONLY at the one-time calibration,
  NOT on every auto-import — preserves puzzleRating as an independently
  drifting skill after baseline.

## Next-session pickup

If interrupted: the load-bearing change is #2 + #4 (calibrate at boot,
write BOTH ratings). #5 is a safety floor. Run `npm run ship-check`
before pushing; this touches a runtime path (boot) so pull the
audit-stream after deploy (G2).

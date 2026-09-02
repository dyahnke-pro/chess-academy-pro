# PLAN — Fewer clicks to play: strip pop-ups, unlock course up front, auto-celebrate

**Owner directive (David 2026-09-02):** "There are too many clicks to get to
playing. Stop all pop-ups except the AI one. The app celebrates automatically.
No more how-to-use-this-tab pop-ups." Locked decisions from the clarifying pass:

1. **Path to play → UNLOCK WHOLE COURSE UP FRONT.** Opening a course exposes every
   rung (Watch/Learn/Practice/Play) + every variation tab + weapons/gems
   immediately. No laddered gating (Watch-before-Learn-before-Practice-before-Play)
   before a user can Play. The freemium paywall is SEPARATE and unchanged
   (`canViewOpening` — one free opening, walled on the second).
2. **Strength calibration → REMOVED, fully adaptive.** No first-run calibration
   bubble, no starting-rating step. Difficulty adapts purely from play. (Confirm an
   adaptive path exists; if difficulty needs a seed, default silently — no prompt.)
3. **Celebrations → CELEBRATE THEN AUTO-ADVANCE.** Keep the completion moment
   (Line Mastered! etc.) but remove the required Continue/Next tap — it plays and
   auto-advances. Must still fire `markRungComplete` exactly once (incl. when the
   opponent plays the last auto-move).
4. **PageHelp ("how to use this tab") → passive.** Never auto-pop; keep a
   tap-to-open "?" affordance the user can choose.
5. **CoachUnlockAnnouncement ("coach is free to try") → no auto-pop.**
6. **AiConsentModal → KEEP unchanged** (the one allowed pop-up).

## The rule of thumb
"Stop all pop-ups except the AI one" = **no overlay auto-opens except
`AiConsentModal`.** Audit every auto-opening modal/bubble/announcement and
suppress auto-open for all but AI consent. Passive (tap-to-open) affordances are
fine; auto-pop is not.

## Pushback already raised (and settled)
- Pop-ups are surface friction; the WLPP ladder is the structural click-tax to
  Play. David chose to unlock the whole course up front (removes the structural
  barrier), not just strip pop-ups. Shipping that intent.
- Pedagogy note (non-blocking): unlocking Play up front lets a user play a line
  they haven't Watched. Accepted — the goal is fast-to-play; Watch/Learn remain
  available, just not mandatory.

## Phases
- **P1 — Kill auto-pops. ALREADY DONE in the codebase (found by recon).** The
  only first-run auto-pop is `AiConsentModal` (App.tsx:630, KEEP). Calibration
  bubble + CoachUnlockAnnouncement are unmounted dead code; PageHelp already has
  auto-open removed and is a passive "?" button (page-help-btn). `done` (⚠️ the
  live App Store build predates these ~Aug-22 removals — needs a fresh iOS build).
- **P2 — Remove calibration → adaptive. `done` (partial, safe cut).** App.tsx no
  longer seeds a forced Intermediate(1300) rating on first run; imported-games
  calibration still applies the real rating; no-import users default to the shared
  1200 and tune from imports/puzzle results. Removed unused `applyStrength`/
  `SKILL_BANDS` import. FOLLOW-UP: to make the *starting opponent* self-tune from
  coach-game results (true no-import adaptation), wire the `coach-games`
  `getPlayerRatingEstimate` into `currentRating` — deferred (touches the
  `studentPlayingRating` difficulty contract + its gates; do it carefully).
- **P3 — Unlock course up front. `done`.** `wlppLadder.ts` `isRungUnlocked` +
  `areWeaponsUnlocked` → always `true`. Every rung/variation/weapon open on load;
  `markRungComplete` write path + `canViewOpening` paywall untouched (both verified
  independent). Tests updated (`wlppLadder.test.ts`).
- **P4 — Auto-advance celebrations. `done`.** `PlayableLinePlayer` ("Line
  Mastered!") + `PracticeMode` (perfect run) celebrate then auto-advance after
  ~1.8s; buttons stay as a manual skip. `onComplete`/`markRungComplete` already
  fired in `finishLine()`/completion effect BEFORE the screen, so the exactly-once
  invariant is intact (opponent-last-move + replay tests still green). Fixed stale
  PracticeMode copy that claimed "Play unlocked!" / "reach 100% to unlock Play".
- **P5 — Gates + audits. `in progress`.** ladder + celebration tests green,
  typecheck green; ship-check running; prod 3-instrument audit after push.

## Follow-up polish (not blocking)
- `OpeningDetailPage` ladder-guidance block (~1933-1958) + the weapons-locked card
  (~2085) + the two "expert pass / unlock all" buttons are now REDUNDANT (nothing
  is locked). Harmless (lock icons/cards never render), but the "I already know
  this — use expert pass" button is pointless UX. Remove in a focused pass
  (watch the unused-var cascade: `handleUnlockAll`, `unlockBudget`,
  `confirmingUnlock`, `colorLabel`, the expert-pass budget helpers).
- Delete dead components `StrengthCalibrationBubble` + `CoachUnlockAnnouncement`
  (+ tests) — orphaned, safe to remove.

## Touchpoints (from scout recon)
- Ladder gate: `src/utils/wlppLadder.ts` `isRungUnlocked` (49) / `areWeaponsUnlocked`
  (58). Write path: `openingService.ts` `markRungComplete` (444). Render:
  `OpeningDetailPage.tsx` 1904-1958 (rungs), 2085-2172 (weapons).
- Pop-ups: all in `App.tsx` (`AiConsentModal` 630 keep; calibration boot 329-345).
  `PageHelp.tsx` passive already. `StrengthCalibrationBubble`/`CoachUnlockAnnouncement`
  unmounted.
- Rating: `studentPlayingRating` (coachGameEngine.ts) → currentRating??puzzleRating??1200,
  contract-gated. `calibrateStrength` (strengthCalibrationService.ts) applies
  imported-games rating. `getPlayerRatingEstimate` (playerRatingService.ts) is the
  adaptive estimate (imports + coach-games ELO ≥5).
- Celebrations: `PlayableLinePlayer.tsx` finishLine 123 + memoryComplete screen 669;
  `PracticeMode.tsx` completion effect 229 + screen 403.

## Decisions log
- 2026-09-02: unlock-whole-course / fully-adaptive / celebrate-then-auto-advance /
  passive-PageHelp / keep-AI-consent — David, via clarifying questions.

## Next-session pickup
Read this file. If phases are unstarted, begin at P1. The scout recon fills the
Touchpoints section; build strictly from real file:line, not memory.

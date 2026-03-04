# TWO-03: Unit Tests — State Management

**Status:** Not Started
**Dependencies:** WO-09, TWO-01
**Estimated Scope:** Zustand store tests, computed state, async actions

---

## Objective

Write unit tests for all Zustand stores, verifying state transitions, computed values, and async actions.

---

## Test Suites

### 1. App Store Tests (`src/stores/appStore.test.ts`)

- Initial state has correct defaults
- `setProfile` switches between 'main' and 'kid'
- `setTheme` updates theme ID
- `setOnboarded` toggles onboarding flag
- `toggleSidebar` flips sidebar state
- State persists across multiple actions

### 2. Streak Store Tests (`src/stores/streakStore.test.ts`)

- New user starts with 0 streak
- Completing a session increments streak
- Second session on same day does NOT double-increment
- Missing a day resets streak to 0
- Streak freeze prevents reset (1 freeze consumed)
- Multiple streak freezes can be accumulated (max 3)
- Streak freeze earned every 7 days
- Longest streak is tracked separately
- `lastActiveDate` updates correctly

### 3. XP & Level Tests (via `xpService.test.ts`)

- `awardXp('puzzle_correct')` returns correct XP
- XP includes bonus for solving harder puzzles
- `getLevel(0)` returns level 1, title "Pawn"
- `getLevel(200)` returns level 2, title "Knight"
- `getLevel(8000)` returns level 7, title "Grandmaster"
- Level-up threshold calculations are correct
- Progress to next level is 0-1 range

### 4. Achievement Service Tests (`src/services/achievementService.test.ts`)

- `streak_7` unlocks when streak reaches 7
- `puzzles_100` unlocks when puzzle count reaches 100
- `accuracy_90_20` unlocks with 90%+ on 20 consecutive
- Already-unlocked achievements are not re-triggered
- `getNewlyUnlocked` returns only freshly unlocked achievements
- `getAchievementProgress` returns correct 0-1 values

---

## Acceptance Criteria

- [ ] All store state transitions tested
- [ ] Streak edge cases covered (same-day, missed day, freeze)
- [ ] XP calculation correct for all action types
- [ ] Level thresholds match BLUEPRINT specification
- [ ] Achievement conditions trigger at correct thresholds
- [ ] All tests pass

---

## Files Created

```
src/
  stores/
    appStore.test.ts
    streakStore.test.ts
  services/
    xpService.test.ts
    achievementService.test.ts
```

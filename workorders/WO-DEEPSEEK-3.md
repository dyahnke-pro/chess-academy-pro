# WO-DEEPSEEK-3 — Remove LLM Position Generation

**Status:** Not Started
**Dependencies:** WO-DEEPSEEK-2 (must be completed first)
**Scope:** Remove all code that asks the LLM to generate novel chess positions/FENs. Replace with deterministic approaches using the existing puzzle DB.

## Summary

The LLM (previously Claude, now DeepSeek) is unreliable at generating valid chess positions from scratch — it produces illegal FENs, unrealistic positions, and unsound tactics. Two places in the codebase ask the LLM to generate positions. Remove both and replace with DB-driven approaches.

## Context: What exists today

### Location 1: `src/services/coachChatService.ts` — `getGameSystemPromptAddition()`
Lines ~434-438 instruct the coach to create practice positions:
```
Sources for practice positions:
- If a game just finished, create positions similar to their mistakes
- Reference their weakness profile for targeted practice
- For endgame practice, set up classic endgame positions (K+R vs K, K+Q vs K, etc.)
- For tactical practice, create positions with clear tactical solutions (forks, pins, skewers)
```
This tells the LLM to invent FENs from scratch. Unreliable.

**Note:** The same function also has `[BOARD: position:FEN]` display commands (~lines 411, 420) that show positions by applying engine moves to the *current* game position. These are legitimate — **keep them**.

### Location 2: `src/services/kidPuzzleService.ts` — `generateKidPuzzles()`
The `KID_PUZZLE_SYSTEM_PROMPT` (lines ~5-25) asks the LLM to generate kid-friendly puzzles with FEN strings from scratch. The `generateKidPuzzles()` function (lines ~77-124) calls the API with this prompt. Positions are validated post-generation with chess.js, but the LLM frequently produces invalid FENs requiring fallback to hardcoded puzzles.

## Changes

### 1. Update `src/services/coachChatService.ts` — `getGameSystemPromptAddition()`

**Remove** the "Sources for practice positions" block (~lines 434-438) that tells the LLM to create positions from scratch.

**Replace** with a prompt instruction directing the coach to recommend existing app features:
```
When the student needs practice:
- Direct them to the Puzzle Trainer for tactical practice ("Head to the Puzzle Trainer and select the fork theme to work on that weakness")
- Direct them to the Opening Explorer for opening practice ("Let's drill that line — go to the Opening Explorer and find the Sicilian")
- Reference specific themes from their weakness profile (e.g., "Your pin accuracy is low — the Puzzle Trainer has pin exercises")
- Do NOT attempt to create or generate chess positions, FENs, or puzzles yourself
```

**Keep** the `[BOARD: position:FEN]` commands on lines ~411 and ~420 — these show positions derived from engine analysis of the current game, not invented positions.

### 2. Rewrite `src/services/kidPuzzleService.ts` — Replace `generateKidPuzzles()`

**Remove:**
- The `KID_PUZZLE_SYSTEM_PROMPT` constant
- The `generateKidPuzzles()` function that calls the coach API
- Any imports only used by the removed code (e.g., coach API imports)

**Add** a new `getKidPuzzles()` function that queries the existing puzzle database:
```typescript
export async function getKidPuzzles(
  chapterId: string,  // piece type: 'king', 'queen', 'rook', 'bishop', 'knight', 'pawn'
  playerRating: number,
  count: number = 4,
): Promise<KidPuzzle[]> {
  // 1. Map chapter piece to puzzle themes:
  //    knight → ['fork'] (knight forks are the classic knight tactic)
  //    bishop → ['pin', 'skewer'] (diagonal tactics)
  //    rook   → ['backRankMate', 'skewer'] (rook tactics)
  //    queen  → ['fork', 'pin', 'skewer'] (queen combines all)
  //    king   → ['endgame'] (king activity in endgames)
  //    pawn   → ['fork', 'endgame'] (pawn promotion, pawn forks)
  //
  // 2. Query db.puzzles filtered by:
  //    - themes matching the mapped themes above
  //    - rating <= max(playerRating + 200, 800) (keep it easy for kids)
  //    - Prefer puzzles with fewer moves in solution (simpler)
  //
  // 3. Randomly select `count` puzzles from results
  //
  // 4. Map each PuzzleRecord to the KidPuzzle shape the component expects:
  //    { fen, solution (first move of the puzzle), hint, successMessage }
  //    - hint: generate from theme name ("Look for a fork!" / "Can you pin a piece?")
  //    - successMessage: pick from a cheerful messages array
  //
  // 5. If fewer than `count` results found, pad with the existing hardcoded fallback puzzles
}
```

Keep the `validatePuzzleFen()` helper if it's used elsewhere. Remove it if it was only used by the deleted `generateKidPuzzles()`.

### 3. Update `src/components/Kid/GameChapterPage.tsx`

- Change import: `generateKidPuzzles` → `getKidPuzzles`
- Update the call site to use the new function signature: `getKidPuzzles(chapter.id, profile.currentRating)`
- The new function is sync-query based (returns a Promise but no API call), so loading states may simplify

### 4. Update tests

- **`kidPuzzleService` tests:** Rewrite to test `getKidPuzzles()` — seed the test DB with puzzles of known themes/ratings, verify correct filtering, verify fallback when no matches, verify KidPuzzle shape output
- **`coachChatService` tests:** If any test asserts on the removed "Sources for practice positions" prompt text, update to match the new "Direct them to Puzzle Trainer" text
- **`GameChapterPage` tests:** Update to mock `getKidPuzzles` instead of `generateKidPuzzles`

## Files Modified

| File | Change |
|------|--------|
| `src/services/coachChatService.ts` | Remove position-generation prompt, add puzzle-recommendation prompt |
| `src/services/kidPuzzleService.ts` | Remove `generateKidPuzzles()` + LLM prompt, add `getKidPuzzles()` DB query |
| `src/components/Kid/GameChapterPage.tsx` | Call `getKidPuzzles()` instead of `generateKidPuzzles()` |
| `kidPuzzleService` test file | Rewrite for DB-query approach |
| `coachChatService` test file | Update prompt assertions |
| `GameChapterPage` test file | Update mock function name |

## Verification

1. `npm run typecheck` — 0 errors
2. `npm run test:run` — ALL tests pass
3. `npm run lint` — 0 errors
4. Update MANIFEST.md — mark WO-DEEPSEEK complete, note all 3 parts done

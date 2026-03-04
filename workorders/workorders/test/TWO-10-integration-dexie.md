# TWO-10: Integration Tests — IndexedDB / Dexie

**Status:** Not Started
**Dependencies:** WO-03, TWO-01

---

## Objective

Integration tests for the Dexie.js database layer using fake-indexeddb. Verify CRUD operations, schema integrity, bulk operations, and data persistence.

---

## Test Suites

### 1. Database Schema Tests (`src/db/database.test.ts`)

- Database opens without errors
- All tables exist (puzzles, openings, games, flashcards, profiles, sessions)
- Table indexes are correct
- Schema version is 1

### 2. Puzzle CRUD Tests (`src/db/puzzles.test.ts`)

- Add a puzzle → retrieve by ID
- Add 100 puzzles → count returns 100
- Query by rating range returns correct subset
- Query by theme returns matching puzzles
- Update SRS fields persists correctly
- Delete a puzzle removes it
- Bulk add 10,000 puzzles completes < 2 seconds

### 3. Opening CRUD Tests (`src/db/openings.test.ts`)

- Add an opening → retrieve by ID
- Query by ECO code returns matches
- Query by `isRepertoire: true` returns only repertoire openings
- Query by color returns correct subset
- Update drill accuracy persists

### 4. Game CRUD Tests (`src/db/games.test.ts`)

- Add a game with full PGN → retrieve correctly
- Query by source (lichess/chesscom/import)
- Query by opening ID returns linked games
- Annotations stored and retrieved with game
- Duplicate detection (by game ID) works

### 5. Flashcard CRUD Tests (`src/db/flashcards.test.ts`)

- Add cards → retrieve by opening ID
- Query due cards (srsDueDate <= today)
- Update SRS fields after review

### 6. Profile Tests (`src/db/profiles.test.ts`)

- Create main profile with defaults
- Create kid profile
- Update profile fields (rating, XP, streak)
- Bad habits array updates correctly
- Preferences persist

### 7. Data Loader Tests (`src/services/dataLoader.test.ts`)

- Detects empty database correctly
- Loads ECO data into openings table
- Loads repertoire data with isRepertoire: true
- Marks loading complete in metadata
- Second run skips loading (already loaded)

---

## Files Created

```
src/db/database.test.ts
src/db/puzzles.test.ts
src/db/openings.test.ts
src/db/games.test.ts
src/db/flashcards.test.ts
src/db/profiles.test.ts
src/services/dataLoader.test.ts
```

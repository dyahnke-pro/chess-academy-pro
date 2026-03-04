# TWO-11: Integration Tests — External APIs

**Status:** Not Started
**Dependencies:** WO-13, WO-07, TWO-01

---

## Objective

Integration tests for external API services (Lichess, Chess.com, Claude) using MSW. Verify request formatting, response parsing, error handling, and data transformation.

---

## Test Suites

### 1. Lichess API Tests (`src/services/lichessApi.test.ts`)

- `getUser` returns parsed user profile
- `getGames` parses NDJSON stream correctly
- `getGames` with max option limits results
- `getGames` with since option sends timestamp parameter
- Non-existent username returns appropriate error
- Network error handled gracefully
- Games are converted to GameRecord schema correctly

### 2. Chess.com API Tests (`src/services/chesscomApi.test.ts`)

- `getStats` returns parsed stats
- `getArchives` returns array of URLs
- `getMonthGames` parses PGN games correctly
- `getRecentGames` fetches correct number of months
- Non-existent username returns appropriate error
- PGN parsing handles various game formats
- Games converted to GameRecord schema correctly

### 3. Import Pipeline Tests (`src/services/importPipeline.test.ts`)

- Processing games detects openings correctly
- Duplicate games are skipped
- Import report contains accurate counts
- Repertoire matches are tagged

### 4. Coach API Integration Tests (`src/services/coachApi.test.ts`)

Using MSW to mock Claude API:

- Successful non-streaming request returns full response
- Streaming request delivers tokens incrementally
- 401 response triggers re-auth message
- 429 response triggers retry (verify retry count)
- 500 response triggers retry then fallback
- Network error triggers offline fallback
- Budget exceeded triggers template-only mode
- API usage record saved to Dexie after each call
- Prompt caching header is included in request

---

## Files Created

```
src/services/lichessApi.test.ts
src/services/chesscomApi.test.ts
src/services/importPipeline.test.ts
src/services/coachApi.integration.test.ts
```

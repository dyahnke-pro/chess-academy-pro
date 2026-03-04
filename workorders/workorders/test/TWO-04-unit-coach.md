# TWO-04: Unit Tests — Coach System

**Status:** Not Started
**Dependencies:** WO-07, TWO-01
**Estimated Scope:** Template tests, prompt generation, API handling, cost tracking

---

## Objective

Write unit tests for the coach system: prompt generation, context building, template fallbacks, crypto service, cost tracking, and error handling.

---

## Test Suites

### 1. Coach Context Builder Tests (`src/services/coachContext.test.ts`)

**buildMoveCommentary:**
- Produces well-formatted context string
- Includes FEN, last move, evaluation, best move, classification
- Handles mate scores
- Includes player profile data
- Handles missing optional fields

**buildPostGameAnalysis:**
- Includes full PGN
- Includes move annotations summary
- Includes opening name and result

**buildDailyLesson:**
- Includes weakest themes
- Includes recent accuracy data

**buildWeeklyReport:**
- Includes all stats fields
- Handles zero-session weeks

### 2. Coach Templates Tests (`src/services/coachTemplates.test.ts`)

- Each personality has templates for all classifications (brilliant through blunder)
- Each personality has templates for all phases (opening, middlegame, endgame)
- Templates contain valid placeholders ({bestMove}, {playerMove}, etc.)
- Template interpolation replaces all placeholders
- No empty template arrays
- Minimum 3 templates per combination
- Personalities produce distinctly different tones

### 3. Coach Prompts Tests (`src/services/coachPrompts.test.ts`)

- Each personality prompt is > 500 tokens (substantive)
- Prompts contain Big Five personality description
- Prompts contain few-shot examples
- Prompts instruct to use Stockfish data
- Prompts instruct to stay in character
- All 3 prompts are distinct (not copy-pasted)

### 4. Crypto Service Tests (`src/services/cryptoService.test.ts`)

- Encrypt → decrypt round trip produces original key
- Different keys produce different ciphertexts
- Decryption with wrong IV fails
- `hasApiKey` returns false when no key stored
- `hasApiKey` returns true after storing a key
- `clearApiKey` removes the stored key
- Empty string encryption/decryption works

### 5. Coach API Service Tests (`src/services/coachApi.test.ts`)

Using MSW to mock the Claude API:

- Successful request returns parsed response
- Streaming request delivers tokens via callback
- 401 error triggers "invalid API key" message
- 429 error triggers retry with backoff
- Network error triggers offline fallback
- Circuit breaker opens after 3 consecutive failures
- Circuit breaker closes after timeout
- Request queue enforces minimum interval
- AbortController cancels in-flight request
- Cost calculation is correct for each model
- API usage is logged to Dexie

### 6. Model Routing Tests

- `move_commentary` routes to Haiku
- `post_game_analysis` routes to Sonnet
- `weekly_report` routes to Opus
- All task types have a model mapping
- Max tokens are set correctly per task

---

## Acceptance Criteria

- [ ] Context builders produce well-formatted strings for all input types
- [ ] Templates exist for all personality × classification × phase combinations
- [ ] Crypto round-trip works correctly
- [ ] API error handling produces correct user-facing messages
- [ ] Retry logic with backoff works as specified
- [ ] Circuit breaker opens and closes correctly
- [ ] Model routing matches BLUEPRINT specification
- [ ] Cost tracking logs all API calls
- [ ] All tests pass

---

## Files Created

```
src/
  services/
    coachContext.test.ts
    coachTemplates.test.ts
    coachPrompts.test.ts
    cryptoService.test.ts
    coachApi.test.ts
```

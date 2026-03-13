# WO-DEEPSEEK-2 — UI Labels, Tests, and Config Updates

**Status:** Not Started
**Dependencies:** WO-DEEPSEEK-1 (must be completed first)
**Scope:** Update all UI text referencing "Anthropic", update test mocks/handlers, update CLAUDE.md and .env.local.

## Summary

After WO-DEEPSEEK-1 swapped the SDK and rewrote coachApi.ts, this WO updates everything else: settings UI labels, onboarding text, test mocks, MSW handlers, CLAUDE.md rules, and the env var file.

## Changes

### 1. Update `src/components/Settings/SettingsPage.tsx` — CoachTab function (~line 543)

- Label text: `"Anthropic API Key"` → `"DeepSeek API Key"`
- Placeholder: `"sk-ant-..."` → `"sk-..."`
- Replace `modelOptions` array — remove the 3 Claude models:
  ```typescript
  // OLD
  const modelOptions = [
    { value: 'claude-haiku-4-5-20251001', label: 'Haiku (fastest)' },
    { value: 'claude-sonnet-4-5-20250514', label: 'Sonnet (balanced)' },
    { value: 'claude-opus-4-5-20250514', label: 'Opus (best)' },
  ];
  // NEW
  const modelOptions = [
    { value: 'deepseek-chat', label: 'DeepSeek V3 (fast)' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 (reasoning)' },
  ];
  ```

### 2. Update `src/components/Settings/OnboardingPage.tsx`

- Help text (~line 94): `"Enter your Anthropic API key to enable AI coaching. Get one at console.anthropic.com."` → `"Enter your DeepSeek API key to enable AI coaching. Get one at platform.deepseek.com."`
- Placeholder (~line 101): `"sk-ant-api03-..."` → `"sk-..."`

### 3. Update `src/components/Coach/CoachPanel.tsx`

- No-key message (~line 25): `"add your Anthropic API key in Settings → Coach tab"` → `"add your DeepSeek API key in Settings → Coach tab"`

### 4. Update `src/test/mocks/handlers.ts`

- Change MSW intercept URL: `https://api.anthropic.com/v1/messages` → `https://api.deepseek.com/chat/completions`
- Change mock response shape from Anthropic format to OpenAI format:
  ```typescript
  // OLD Anthropic response
  { content: [{ type: 'text', text: '...' }], usage: { input_tokens: 10, output_tokens: 20 } }
  // NEW OpenAI response
  { choices: [{ message: { role: 'assistant', content: '...' } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }
  ```
- If there's a streaming mock, update SSE format:
  ```
  data: {"choices":[{"delta":{"content":"chunk text"}}]}
  ```

### 5. Update test files that mock `@anthropic-ai/sdk`

Search for `vi.mock('@anthropic-ai/sdk'` or `vi.mock("@anthropic-ai/sdk"` across all test files. Change to `vi.mock('openai', ...)` and update the mock factory return shapes:
- The Anthropic SDK mock returns a class with `messages.create()` and `messages.stream()`
- The OpenAI SDK mock should return a class with `chat.completions.create()` that returns:
  - Non-streaming: `{ choices: [{ message: { content: '...' } }], usage: { prompt_tokens, completion_tokens } }`
  - Streaming: An async iterable of `{ choices: [{ delta: { content: '...' } }] }` chunks

### 6. Update `CLAUDE.md`

Two changes:
- **Tech stack** (~line 23): Replace `@anthropic-ai/sdk 0.78.0` with `openai <installed_version>` and add note: `(configured with baseURL: https://api.deepseek.com)`
- **"Do NOT" rules** (~line 143): Change `"Import from @anthropic-ai/sdk anywhere except src/services/coachApi.ts"` → `"Import from openai anywhere except src/services/coachApi.ts"`

### 7. Update `.env.local`

- Rename the variable: `VITE_ANTHROPIC_API_KEY=...` → `VITE_DEEPSEEK_API_KEY=`
- Clear the value — the user needs to obtain a DeepSeek API key from platform.deepseek.com and paste it here

## Files Modified

| File | Change |
|------|--------|
| `src/components/Settings/SettingsPage.tsx` | Label, placeholder, model options |
| `src/components/Settings/OnboardingPage.tsx` | Help text, placeholder |
| `src/components/Coach/CoachPanel.tsx` | No-key message |
| `src/test/mocks/handlers.ts` | MSW URL + response shape |
| Test files mocking `@anthropic-ai/sdk` | Update mock targets + shapes |
| `CLAUDE.md` | Tech stack + import rule |
| `.env.local` | Rename env var, clear value |

## Verification

1. `npm run typecheck` — 0 errors
2. `npm run test:run` — ALL tests pass
3. `npm run lint` — 0 errors

# WO-DEEPSEEK-1 — Swap Anthropic SDK for OpenAI SDK (DeepSeek)

**Status:** Not Started
**Dependencies:** WO-COACH
**Scope:** Package swap, coachApi.ts rewrite, cost service update. No UI or test changes.

## Summary

Replace `@anthropic-ai/sdk` with the `openai` npm package, pointed at DeepSeek's API (`https://api.deepseek.com`). Rewrite `coachApi.ts` to use the OpenAI SDK format. Update cost pricing. This is the core backend change — UI and test updates happen in WO-DEEPSEEK-2.

## Model Mapping

Two DeepSeek models replace three Claude tiers:

**DeepSeek-V3 (`deepseek-chat`)** — fast conversational tasks:
- move_commentary, hint, puzzle_feedback, game_commentary, game_opening_line, whatif_commentary, game_narrative_summary

**DeepSeek-R1 (`deepseek-reasoner`)** — reasoning/analysis tasks:
- post_game_analysis, daily_lesson, bad_habit_report, opening_overview, chat_response, game_post_review, position_analysis_chat, session_plan_generation, interactive_review, weakness_report, weekly_report, deep_analysis

## Changes

### 1. Package swap
```bash
npm uninstall @anthropic-ai/sdk
npm install openai
```

### 2. Rewrite `src/services/coachApi.ts`

This file currently imports `Anthropic` from `@anthropic-ai/sdk` and uses the Anthropic messages API. Rewrite it to use the OpenAI SDK pointed at DeepSeek.

Key changes:
- `import OpenAI from 'openai'` (replaces `import Anthropic from '@anthropic-ai/sdk'`)
- Client creation: `new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true })`
- Update `MODEL_MAP` entries to `'deepseek-chat'` / `'deepseek-reasoner'` per mapping above
- Rename env var: `VITE_ANTHROPIC_API_KEY` → `VITE_DEEPSEEK_API_KEY`

**System prompt format change:**
- OLD (Anthropic): `system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]`
- NEW (OpenAI): Add `{ role: 'system', content: systemPrompt }` as the first element in the `messages` array
- Remove `cache_control` entirely (Anthropic-specific)

**Non-streaming calls:**
- OLD: `client.messages.create({ model, max_tokens, system, messages })`
- NEW: `client.chat.completions.create({ model, max_tokens, messages: [systemMsg, ...userMsgs] })`
- OLD response: `response.content[0].type === 'text' ? response.content[0].text : ''`
- NEW response: `response.choices[0]?.message?.content ?? ''`

**Streaming calls:**
- OLD: `client.messages.stream({ model, max_tokens, system, messages })` then iterate chunks with `chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta'` → `chunk.delta.text`
- NEW: `client.chat.completions.create({ model, max_tokens, messages, stream: true })` then iterate with `for await (const chunk of stream)` → `chunk.choices[0]?.delta?.content ?? ''`
- OLD: `stream.finalMessage()` for usage stats after streaming
- NEW: Usage may be on the final chunk as `chunk.usage` or not available during streaming. If not available on stream chunks, skip the `recordApiUsage` call for streaming requests (cost tracking for streaming is best-effort).

**Token usage field names:**
- OLD: `response.usage.input_tokens` / `response.usage.output_tokens`
- NEW: `response.usage?.prompt_tokens` / `response.usage?.completion_tokens`

### 3. Update `src/services/coachCostService.ts`

Replace the `PRICING` record. Remove all Claude model entries and add:
```typescript
const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat':     { input: 0.00000027, output: 0.0000011 },
  'deepseek-reasoner': { input: 0.00000055, output: 0.00000219 },
};
```

## Files Modified

| File | Change |
|------|--------|
| `package.json` | Remove `@anthropic-ai/sdk`, add `openai` |
| `src/services/coachApi.ts` | Full rewrite — OpenAI SDK pointed at DeepSeek |
| `src/services/coachCostService.ts` | DeepSeek pricing table |

## Verification

1. `npm run typecheck` — 0 errors (there will be test type errors from mocks referencing `@anthropic-ai/sdk` — those are fixed in WO-DEEPSEEK-2, ignore for now)
2. `npm run lint` — 0 errors
3. Do NOT run tests yet — mock handlers need updating in WO-DEEPSEEK-2

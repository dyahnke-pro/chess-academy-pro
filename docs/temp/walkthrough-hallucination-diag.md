# Walkthrough Hallucination Diagnostic

Context: Vienna Trap walkthrough — user asked "why doesn't black take the bishop?". Brain answered without calling `stockfish_eval` (zero tool calls, narrative-only response). The toolbelt has Stockfish (verified in toolbelt-unification-diag.md). Question: why didn't the brain reach for it?

---

## (1) Walkthrough surface identity / system prompt

Search for surface-specific identity prompts. Coach has a single identity (Danya) loaded by `loadIdentityPrompt` in `src/coach/sources/identity.ts` regardless of surface.

```
ugrep: warning: src/coach/identity/: No such file or directory
ugrep: warning: src/coach/spine/identity*: No such file or directory
```

```
# directories that don't exist
ls: cannot access 'src/coach/identity/': No such file or directory
ls: cannot access 'src/coach/spine/': No such file or directory

# actual identity location
src/coach/sources/identity.ts

# surface branching in identity
25:Tools available to your hands: play_move, take_back_move, set_board_position, reset_board, navigate_to_route, set_intended_opening, clear_memory, record_hint_request, record_blunder, plus the read-only cerebellum tools (stockfish_eval, lichess_opening_lookup, local_opening_book, etc.) for when you need to think before acting.
```

**Finding:** No `src/coach/identity/` or `src/coach/spine/identity*` directory exists. Identity lives at `src/coach/sources/identity.ts` and is **a single string (`DANYA_IDENTITY`) used unconditionally** — `KASPAROV` and `FISCHER` are aliases of the same constant. The identity prompt does not branch on surface or contain the word "walkthrough" or "opening".

---

## (2) coachService.ask call sites in Openings/walkthrough

```
# direct grep

# the standalone-chat surface (CoachChatPage) — visible globally but is its own page
        timestamp: Date.now(),
      }),
    });

    try {
      const answer = await coachService.ask(
        { surface: 'standalone-chat', ask: text, liveState },
        {
          maxToolRoundTrips: 1,
          onNavigate: (path: string) => {
            void navigate(path);
          },
          onChunk: (chunk: string) => {
            streamed += chunk;
            // Display side: strip [BOARD:] / [[ACTION:]] tags so the
            // user sees only narrative text in the bubble.
            const displayText = streamed.replace(TAG_STRIP_RE, '').trim();
            setStreamingContent(displayText);

            if (shouldSpeak) {
              speechBufferRef.current += chunk;
              // Flush on any terminator including newline — no trailing
              // whitespace requirement. Matches VoiceChatMic and
              // SmartSearchBar; saves 200-400ms of first-word latency.
              const sentenceEnd = /[.!?\n]/.exec(speechBufferRef.current);
              if (sentenceEnd) {
                const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1).trim();
                speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 1).trimStart();
                // Strip tags from spoken text too — never read action
                // tags out loud.
                const spoken = sentence.replace(TAG_STRIP_RE, '').trim();
                if (spoken) speakOrQueue(spoken);
              }
            }
          },
        },
--
        role: 'coach',
        text: cleanText,
        trigger: null,
      });
    } catch (err) {
      console.warn('[CoachChatPage] coachService.ask failed:', err);
      // Surface the failure to the student instead of leaving a stuck
      // spinner + orphaned user message. Refresh-loses-chat was the
      // prior behaviour; now they see what went wrong.
      const detail = err instanceof Error ? err.message : 'Please try again.';
      appendMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Coach is unavailable right now (${detail}). Your message is saved — tap send to retry when you\u2019re back online.`,
        timestamp: Date.now(),
      });
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [activeProfile, hydrated, chatMessages, isStreaming, appendMessage, flushSpeechBuffer, navigate]);

  // Auto-send a query carried in the URL (e.g., from the Game Insights

# legacy non-spine path used by walkthrough narration
 * ask the LLM for the rest. That way the curator's work always wins.
 */
import { Chess } from 'chess.js';
import { getCoachChatResponse } from './coachApi';
import { isGenericAnnotationText } from './walkthroughNarration';
import { db } from '../db/schema';

/** Cache version — bump to invalidate all previously-cached narrations
 *  when the prompt / output format changes. */
const CACHE_VERSION = 'v1';

export interface WalkthroughNarrationInput {
  openingName: string;
  /** Variation name, if this walkthrough is for a specific sub-line. */
  variationName?: string;
  /** Space-separated SAN moves, e.g. "d4 Nf6 c4 e6 g3 d5". */
--
  ].join('\n');

  try {
    const raw = await getCoachChatResponse(
      [{ role: 'user', content: userMessage }],
      systemAdditions,
      undefined,
      'chat_response',
      1200,
    );
    const parsed = extractJsonArray(raw);
    if (Array.isArray(parsed)) {
      return perMove.map((_, i) => {
        const entry = parsed[i];
        return typeof entry === 'string' && entry.trim() ? entry.trim() : '';
      });
```

**Finding:** The walkthrough page (`src/components/Openings/`) does **not** call `coachService.ask` at all. The walkthrough's own narration uses `getCoachChatResponse` from `src/services/coachApi.ts` — the **legacy LLM path that bypasses the spine entirely**. No envelope, no toolbelt, no Stockfish access on the narration path.

User questions during a walkthrough land in the global `<GlobalCoachDrawer>` (rendered by `AppLayout`), which embeds `<GameChatPanel>`. `GameChatPanel.handleSend` (lines 551 + 773) does call `coachService.ask` with surface `'game-chat'` (in-game branch) or `'home-chat'` (drawer branch) — **but does not pass `maxToolRoundTrips`, so it defaults to 1** (see Section 5 below).

---

## (3) Where the walkthrough actually lives

```
src/data/appRoutesManifest.ts:93:    featuresAvailable: ['opening-walkthrough', 'opening-variations', 'opening-traps'],
src/data/appRoutesManifest.ts:105:    featuresAvailable: ['pro-opening-walkthrough'],

# walkthrough runner / page files
src/types/walkthrough.ts
src/components/Openings/WalkthroughMode.tsx
src/components/Openings/OpeningDetailPage.tsx
src/components/Openings/WalkthroughMode.test.tsx
src/components/Openings/WalkthroughIntegration.test.tsx
src/components/Coach/CoachSessionPage.tsx
src/components/Coach/CoachSessionPage.test.tsx
src/hooks/useWalkthroughRunner.ts
src/hooks/useWalkthroughRunner.test.tsx
src/hooks/useStrictNarration.ts
src/services/walkthroughLlmNarrator.ts
src/services/walkthroughRunner.test.ts
src/services/coachAgent.ts
src/services/walkthroughResolver.test.ts
src/services/middlegamePlanner.test.ts
src/services/coachSessionRouter.ts
src/services/walkthroughRunner.ts
src/services/walkthroughResolver.ts
src/services/gameNarrationBuilder.test.ts
src/services/middlegamePlanner.ts
src/services/walkthroughAdapter.ts
src/components/Coach/DynamicCoachSession.test.tsx
src/services/walkthroughNarration.ts
src/services/gameNarrationBuilder.ts
src/services/walkthroughAdapter.test.ts
```

**Finding:** Walkthrough surface = `src/components/Openings/WalkthroughMode.tsx` + `OpeningDetailPage.tsx`, narration LLM = `src/services/walkthroughLlmNarrator.ts`. Routes manifest declares `featuresAvailable: ['opening-walkthrough', 'opening-variations', 'opening-traps']` at `src/data/appRoutesManifest.ts:93`. There is no "walkthrough" surface enum value (`CoachSurface` in `src/coach/types.ts:44-53` does not include it).

---

## (4) Identity instructions about Stockfish grounding

```

# all stockfish references in identity
2. If you tell the user you will navigate, set up a position, take back a move, or change any board state, you ALSO emit the matching tool in the same response. Same rule. Words without action are failure.

Tools available to your hands: play_move, take_back_move, set_board_position, reset_board, navigate_to_route, set_intended_opening, clear_memory, record_hint_request, record_blunder, plus the read-only cerebellum tools (stockfish_eval, lichess_opening_lookup, local_opening_book, etc.) for when you need to think before acting.

You're an operator. Operate.`;

const KASPAROV_IDENTITY = DANYA_IDENTITY; // future personality pack
```

**Finding:** The identity prompt mentions Stockfish exactly **once**, as part of a list of "read-only cerebellum tools (`stockfish_eval`, `lichess_opening_lookup`, `local_opening_book`, etc.) for when you need to think before acting." There is no rule like "for tactical questions, ALWAYS call `stockfish_eval` first to ground your answer" or "never claim a move is bad without consulting the engine."

---

## (5) Round-trip budget — the silent killer

```
src/components/Coach/CoachGamePage.tsx:1549:              maxToolRoundTrips: 3,
src/components/Coach/CoachChatPage.tsx:269:          maxToolRoundTrips: 1,
src/coach/coachService.ts:14: *   5. If `maxToolRoundTrips > 1` (BRAIN-04), feeds the tool results
src/coach/coachService.ts:17: *      or a final answer. Capped at `maxToolRoundTrips` to prevent
src/coach/coachService.ts:81:   *  Follow-up turns (when `maxToolRoundTrips > 1`) always run
src/coach/coachService.ts:89:  maxToolRoundTrips?: number;
src/coach/coachService.ts:251:  const maxRoundTrips = Math.max(1, options.maxToolRoundTrips ?? 1);
```

**Finding:** `maxToolRoundTrips` defaults to **1** (`coachService.ts:251`). Only `CoachGamePage.tsx:1549` (move-selector surface) passes `3`. `CoachChatPage` passes `1` explicitly; `GameChatPanel` does not pass it at all (in-game and drawer branches both fall back to default 1).

**Implication:** With `maxToolRoundTrips=1`, if the LLM emits `stockfish_eval` to ground a tactical answer, the spine dispatches the tool and immediately closes the call — the LLM gets no follow-up turn to use the result. The LLM is therefore incentivized to skip tools and answer narratively in one shot. Combined with Section (4)'s soft guidance, this is the structural reason the brain hallucinates instead of consulting Stockfish.

---

## Root cause summary (hypothesis, not yet fixed)

Three compounding factors, ranked by suspected impact:

1. **Round-trip budget = 1 on chat surfaces.** The chat path used during walkthroughs (`GameChatPanel` drawer branch, surface=`home-chat`) caps at one provider trip, so calling `stockfish_eval` would orphan the result with no synthesis turn. The LLM correctly avoids tools that can't pay off. Move-selector (`CoachGamePage:1549`) uses `3` and does not exhibit this pattern.
2. **Identity prompt has no "verify-before-claim" rule.** Stockfish is listed as available but not mandated for tactical questions (`src/coach/sources/identity.ts`). The current prompt is action-mandate-heavy ("words without action are failure") for state changes but says nothing about epistemics.
3. **Walkthrough narration bypasses the spine entirely.** `walkthroughLlmNarrator.ts` calls `getCoachChatResponse` from `coachApi.ts` directly, with no envelope and no toolbelt. The auto-generated annotations during walkthrough playback CANNOT use Stockfish under any prompt. (User questions during a walkthrough land in the global drawer, which does go through the spine — that's where factor 1 bites.)

**Suggested fix order (out of scope for this diagnostic):** (a) bump `maxToolRoundTrips` to `3` in `GameChatPanel` both branches; (b) add a "verify tactical claims with `stockfish_eval` first" rule to the identity prompt; (c) migrate walkthrough narration to the spine so explanations get the same toolbelt.

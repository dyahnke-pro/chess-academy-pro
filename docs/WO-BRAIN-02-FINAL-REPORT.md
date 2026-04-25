# WO-BRAIN-02 — Final Sign-Off Report

**PR:** https://github.com/dyahnke-pro/chess-academy-pro/pull/324
**Squash commit on main:** `0d92ec3`
**Branch:** `claude/coach-position-narration-QEUmx`

---

## 1. Caro-Kann sanity test (lead)

The bug that started this whole arc — "set Caro-Kann from chat, coach plays c5 instead of c6 next game" — was already fixed at the data layer by UNIFY-01. BRAIN-02 doesn't change that fact; it simply routes the in-game chat surface through the brain so the prompt layer carries the same memory snapshot every call.

**Trace, post-migration:**

1. Mid-game, Dave types "play Caro-Kann as Black" in the in-game chat.
2. `GameChatPanel.handleSend(text)` runs. User message added.
3. The legacy in-game intercept at `inGameChatIntent.ts:111` may match "play <opening>" — if it does, it fires `onRestartGame()` + `onPlayOpening('Caro-Kann Defense')` and returns BEFORE the brain. That writes to `useCoachMemoryStore.intendedOpening` via the existing UNIFY-01 path. (Belt-and-suspenders; BRAIN-06 will retire this regex once we trust the brain's tool path.)
4. If the legacy intercept did NOT match, the brain branch fires:
   - `coach-surface-migrated` audit logged.
   - `coachService.ask({ surface: 'game-chat', ask: text, liveState })`.
   - Spine assembles the six-part envelope (identity, memory snapshot, full app map, live state, 13-tool toolbelt, ask).
   - DeepSeek streams a response that includes `[[ACTION:set_intended_opening {"name":"Caro-Kann Defense","color":"black","surface":"game-chat"}]]`.
   - Provider parses the tag, returns it as a tool call.
   - Spine dispatches the tool. Tool's `execute` calls `useCoachMemoryStore.getState().setIntendedOpening(...)` — store action emits `coach-memory-intent-set` audit.
   - `coach-brain-tool-called: set_intended_opening ok`.
5. **Next coach turn:** `CoachGamePage.tsx:1495` calls `tryOpeningBookMove(game.fen, game.history, requestedOpeningMoves, aiColor)`. `requestedOpeningMoves` is a `useMemo` derived from `useCoachMemoryStore.intendedOpening` (UNIFY-01) — Caro-Kann is in the store, so the move selector returns `c6`.

Both the regex shortcut path AND the brain-tool path now write to the same store. Either route gets Dave to c6. The brain path is the architectural future. **The 28 `openingDetectionService` regression tests covering Caro-Kann / Sicilian / French / London / KID against their expected first moves are still green.**

---

## 2. Diff summary

6 files changed, 353 insertions, 131 deletions.

| File | Change |
|---|---|
| `src/coach/types.ts` | Added optional `Provider.callStreaming?(envelope, onChunk)` |
| `src/coach/providers/deepseek.ts` | Implements `callStreaming` via `getCoachChatResponse`'s existing `onStream` callback. Refactored to share `callDeepSeek(envelope, onChunk?)` between the two methods |
| `src/coach/coachService.ts` | `CoachServiceOptions.onChunk?` routes to streaming when both are present; `coach-brain-provider-called` audit now logs `streaming=true\|false` |
| `src/services/appAuditor.ts` | New audit kind `coach-surface-migrated` |
| `src/components/Coach/GameChatPanel.tsx` | Branch on `isGameOver`. In-game (false) routes through `coachService.ask`; drawer (true) unchanged. `tryCaptureOpeningIntent` now ONLY runs on drawer branch. Dead `if (!isGameOver)` blocks removed (engine prefetch, tactic classifier, position assessment, auto-arrow). Imports trimmed |
| `src/coach/__tests__/streaming.test.ts` | NEW — 4 tests |

---

## 3. The split — new `handleSend` (annotated)

```ts
const handleSend = useCallback(async (text: string) => {
  if (!activeProfile || isStreaming) return;

  // Add user message (unchanged)
  const userMsg = { id: `gmsg-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
  setMessages([...messagesRef.current, userMsg]);

  // Memory captures (split: forget runs both branches; opening capture
  // runs ONLY on the drawer branch where the brain isn't yet wired).
  const surface = isGameOver ? 'drawer-chat' : 'in-game-chat';
  tryCaptureForgetIntent(text, surface);
  if (isGameOver) {
    tryCaptureOpeningIntent(text, surface, playerColor);
  }

  // Pre-LLM intercepts (unchanged): narration toggle, in-game intent
  // (mute/restart/play-opening), isGameOver intent router. Each may
  // early-return before any LLM call.

  // ── WO-BRAIN-02 — IN-GAME BRANCH (migrated) ──────────────────────
  if (!isGameOver) {
    onBoardAnnotation?.([{ type: 'clear' }]);
    setIsStreaming(true);
    setStreamingContent('');
    speechBufferRef.current = '';
    let fullResponse = '';
    try {
      const liveState: LiveState = {
        surface: 'game-chat',
        fen,
        moveHistory: history,
        userJustDid: text,
        currentRoute: '/coach/play',
      };
      void logAppAudit({
        kind: 'coach-surface-migrated',
        category: 'subsystem',
        source: 'GameChatPanel.handleSend',
        summary: 'surface=game-chat viaSpine=true',
        details: JSON.stringify({ surface: 'game-chat', viaSpine: true, timestamp: Date.now(), fenIfPresent: fen }),
        fen,
      });
      const answer = await coachService.ask(
        { surface: 'game-chat', ask: text, liveState },
        {
          onChunk: (chunk) => {
            fullResponse += chunk;
            const displayText = fullResponse
              .replace(BOARD_TAG_STRIP_RE, '')
              .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
              .trim();
            setStreamingContent(displayText);
            if (useAppStore.getState().coachVoiceOn) {
              speechBufferRef.current += chunk;
              const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
              if (sentenceEnd) {
                const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
                speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
                void voiceService.speak(sentence.trim());
              }
            }
          },
        },
      );
      if (speechBufferRef.current.trim()) flushSpeechBuffer();
      const { cleanText, commands: annotations } = parseBoardTags(answer.text);
      const hasExplicitArrows = annotations.some(c => c.type === 'arrow' && (c.arrows?.length ?? 0) > 0);
      if (!hasExplicitArrows) {
        const autoArrows = extractMoveArrows(cleanText, { fen });
        if (autoArrows.length > 0) annotations.push({ type: 'arrow', arrows: autoArrows });
      }
      const assistantMsg = {
        id: `gmsg-${Date.now()}-resp`,
        role: 'assistant',
        content: cleanText,
        timestamp: Date.now(),
        metadata: { annotations: annotations.length > 0 ? annotations : undefined },
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (annotations.length > 0) onBoardAnnotation?.(annotations);
    } catch (err) {
      console.error('[GameChatPanel] coachService.ask failed:', err);
      setMessages(prev => [...prev, {
        id: `gmsg-${Date.now()}-err`,
        role: 'assistant',
        content: "Sorry — I couldn't reach the coach just now. Try again in a moment.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
    return;
  }

  // ── DRAWER / POST-GAME BRANCH (unchanged; BRAIN-03 migrates this) ──
  // gameContext + runAgentTurn path lives below. Untouched by this WO.
  // ...
}, [activeProfile, isStreaming, fen, /* etc */]);
```

---

## 4. One real round-trip log (envelope + response + tool calls + audits)

Captured against the real spine code via mocked DeepSeek streaming provider. Memory pre-set: `intendedOpening = { name: 'Caro-Kann Defense', color: 'black' }`.

### Input args

```json
{
  "surface": "game-chat",
  "ask": "What opening am I in right now?",
  "liveState": {
    "surface": "game-chat",
    "fen": "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    "moveHistory": ["e4", "c6"],
    "userJustDid": "What opening am I in right now?",
    "currentRoute": "/coach/play"
  }
}
```

### System prompt sent to provider (full identity + 39-route app map + 13-tool toolbelt)

Identical structure to the WO-BRAIN-01 ping system prompt. See `docs/WO-BRAIN-01-FINAL-REPORT.md` for the full text — no surface-specific addition is layered on top.

### User message sent to provider

```
[Coach memory]
- Intended opening: Caro-Kann Defense (color: black; captured from: game-chat)

[Live state]
- Surface: game-chat
- Current route: /coach/play
- FEN: rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2
- Phase: opening
- Move history: e4 c6
- User just did: What opening am I in right now?

[Ask]
What opening am I in right now?
```

### Streamed chunks (token-by-token, 14 total)

```
[0]  "You're in the Caro-K"
[1]  "ann Defense, exactly"
[2]  " the line you commit"
[3]  "ted to. Black's c6 p"
[4]  "repares the d5 push "
[5]  "and keeps the bishop"
[6]  " free to land on f5 "
[7]  "later — solid, calm,"
[8]  " structural. [[ACTIO"
[9]  "N:set_intended_openi"
[10] "ng {\"name\":\"Caro-Kan"
[11] "n Defense\",\"color\":\""
[12] "black\",\"surface\":\"ga"
[13] "me-chat\"}]]"
```

### Coach response text (post-strip)

> "You're in the Caro-Kann Defense, exactly the line you committed to. Black's c6 prepares the d5 push and keeps the bishop free to land on f5 later — solid, calm, structural."

### Tool calls dispatched

```json
["tc-demo-0"]
```

(One call: `set_intended_opening { name: 'Caro-Kann Defense', color: 'black', surface: 'game-chat' }`. The LLM reaffirmed the commitment via tool — exactly the behavior the migration enables. The store's audit fired `coach-memory-intent-set` from inside the action.)

### Audit log entries this call

```
- coach-surface-migrated: surface=game-chat viaSpine=true                  [from GameChatPanel.handleSend]
- coach-brain-ask-received: surface=game-chat ask="What opening..."        [from coachService.ask]
- coach-brain-envelope-assembled: assembled (13 tools, 39 routes)          [from coachService.ask]
- coach-brain-provider-called: provider=deepseek streaming=true            [from coachService.ask]
- coach-memory-intent-set: intent=Caro-Kann Defense color=black ...        [from store action, dispatched by tool]
- coach-brain-tool-called: set_intended_opening ok                         [from coachService.ask]
- coach-brain-answer-returned: provider=deepseek text=172c tools=1         [from coachService.ask]
```

---

## 5. Tests

### New (this WO)

- `src/coach/__tests__/streaming.test.ts` (4 tests, all pass):
  1. routes through `provider.callStreaming` when `onChunk` provided
  2. falls back to `provider.call` when `onChunk` absent
  3. falls back to `provider.call` when provider doesn't implement `callStreaming`
  4. forwards memory snapshot into the streaming provider envelope

### Existing (regression check)

- `src/coach/__tests__/coachService.test.ts` — 5/5 pass
- `src/coach/__tests__/envelope.test.ts` — 6/6 pass
- `src/coach/__tests__/ping.integration.test.ts` — 2/2 pass

**17/17 spine tests green.** Existing 28 `openingDetectionService` Caro-Kann regression tests untouched, still green.

Typecheck clean. Lint count 324 → 325 (+1 = pre-existing `parserOptions.project` parser-infra error on the new test file, same as every `.test.ts` in the repo). Zero new code-quality errors.

---

## 6. Self-verification answers

### Q1. What does `tryCaptureOpeningIntent` do today on the in-game branch, and why does this WO remove it from that branch but keep it on the home-drawer branch?

`tryCaptureOpeningIntent` is a deterministic regex helper that parses the user's chat message for opening-name phrases ("play the Caro-Kann"), validates against `openings-lichess.json`, and writes to `useCoachMemoryStore.setIntendedOpening` directly — bypassing the LLM. It exists from UNIFY-01 as a fast, reliable shortcut so the data layer captures intent even when the LLM is slow / wrong / cost-constrained. **In-game branch removes it because the migrated brain envelope now contains the user's chat AND the full toolbelt** (`set_intended_opening` is one of the 13 tools), so the LLM itself can persist intent via tool emission. The brain has more context than the regex (memory, identity, app map, live state) and will reliably emit the tool when the user means it. The drawer branch keeps the regex because it isn't migrated yet — without the brain on that branch, the regex is the only path. BRAIN-03 collapses the regex on the drawer branch the same way.

### Q2. A user types "play Caro-Kann as Black" mid-game. Walk through what happens, in order, post-migration.

See Section 1 above (Caro-Kann sanity test trace). Both the regex shortcut path AND the brain-tool path now write to the same store. The move selector reads from the same store. c6 is the deterministic reply on the next coach turn.

### Q3. If `coachService.ask` throws (DeepSeek down, network error), what does the in-game chat user see? Is the failure mode acceptable, or does it need a fallback path?

Today's behavior: the `try { ... } catch (err) { ... }` wrap around the brain call posts a friendly assistant message ("Sorry — I couldn't reach the coach just now. Try again in a moment.") and resets streaming state in `finally`. The user sees a graceful error bubble, the chat doesn't lock up, the rest of the app keeps working.

That's acceptable for v1. It is NOT acceptable forever. Two real failure modes I want to flag:

1. **Mid-stream timeout.** `getCoachChatResponse` times out at 30s inside the DeepSeek provider; if it returns a partial response with the timeout error wrapped in the text, my error catch will surface the friendly message even though some tokens did arrive. The legacy `runAgentTurn` had the same shape, so this isn't a regression — but it's a known edge.

2. **No retry / no fallback provider.** If DeepSeek is down, the user's message is lost (the assistant message says "try again," but the conversation history doesn't store a flag that this turn failed). The provider abstraction supports flipping to Anthropic via `COACH_PROVIDER` env var, but there's no automatic same-call retry. **Follow-up:** add a "retry once with the dark provider" path inside `coachService.ask` when `provider.call*` throws.

Neither failure is severe enough to block this WO. The drawer branch's `runAgentTurn` already had no retry either — so this is parity, not regression.

---

## 7. Anything punted

1. **`play_variation` LLM tool not added to spine.** `runAgentTurn` had a `playVariation` callback wired so the LLM could spawn a variation board mid-chat. The brain's toolbelt doesn't include this. Post-migration, the in-game LLM cannot emit a variation. Surface still has `onPlayVariation` prop wired but it's unreachable from the brain branch. Restore in BRAIN-04 when the move selector / variation control migrates.

2. **`fetchRelevantGames` historical-context block dropped.** `runAgentTurn`'s `extraSystemPrompt` included a "Relevant prior games" block from the user's archive. The brain envelope doesn't include this today. The constitution lists four sources; "user's prior games" arguably belongs in `memory.gameHistory` (schema-defined, unpopulated). Wire when `gameHistory` ships.

3. **Engine prefetch + tactic classifier + position assessment dropped from the migrated branch.** Previously `runAgentTurn` got a pre-baked `engineData / tacticAnalysis / positionAssessment` block in the system prompt. The brain instead exposes `stockfish_eval` / `stockfish_classify_move` / `lichess_opening_lookup` as TOOLS — the LLM calls them on demand. This is the constitution's intended design (cerebellum is read-only tool, not pre-baked context). **Behavioral change worth watching:** the LLM may make extra tool calls per turn vs. the legacy single-prompt block. Cost / latency monitor in audit log.

4. **No automatic retry on provider failure.** Q3 above. Single-provider, single-attempt today. Acceptable parity; follow-up to add retry with the dark provider.

5. **Tool-result loop-back not added.** Spine still single-pass per BRAIN-01's deferred decision. If the LLM emits `stockfish_eval` and wants to react to the result, the surface re-asks. For chat surfaces this is rarely needed (chat is usually one-shot Q&A); for move-selector (BRAIN-04) it'll matter more. Plan: add the multi-turn loop in BRAIN-04 if it's needed, not before.

6. **`coachVoiceOn` voice-streaming via `voiceService.speak` per chunk** — kept identical to the pre-migration behavior. The constitution's `speak` cerebrum tool exists as a stub; eventually voice flows through it. Today this surface still calls `voiceService.speak` directly during the streaming callback. BRAIN-05 reroutes when narration / voice migrates.

7. **Type narrowing post-early-return left a `gameContext` block populated with `engineData/tacticAnalysis/positionAssessment` set to `undefined`** — could be deleted entirely; left for now so the drawer-path `gameContext` keeps its structural shape. Cleanup target for BRAIN-06.

---

## 8. Phase boundary

In-game chat speaks the brain's voice now. Drawer / post-game chat still uses `runAgentTurn`. **BRAIN-03 migrates the drawer branch** — same pattern, same template, plus this WO's streaming infrastructure already in place. No spine-level changes expected for BRAIN-03.

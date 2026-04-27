# Toolbelt Unification Audit (per constitution)

Branch: `claude/diag-coach-toolbelt-unification`. Diagnostic only — no fixes.

## (1) Toolbelt assembly

```
ugrep: warning: src/coach/spine/: No such file or directory
  // surface chose to forward (real LLM round-trips), so router
  // bypass-LLM logic at this layer was dead code.

  const envelope = assembleEnvelope({
    identity: options.identity,
    toolbelt: getToolDefinitions(),
    input,
  });

  void logAppAudit({
    kind: 'coach-brain-envelope-assembled',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `assembled (${envelope.toolbelt.length} tools, ${envelope.appMap.length} routes)`,
    details: JSON.stringify({
      toolbeltSize: envelope.toolbelt.length,
      appMapSize: envelope.appMap.length,
      hasIntendedOpening: envelope.memory.intendedOpening !== null,
      hintRequestCount: envelope.memory.hintRequests.length,
      conversationHistorySize: envelope.memory.conversationHistory.length,
    }),
  });

  // WO-FOUNDATION-02 trace harness — list the tool names the LLM
  // sees in the toolbelt so we can verify play_move / take_back_move
  // / reset_board / set_board_position are present.
  void logAppAudit({
    kind: 'trace-toolbelt',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: `tools=${envelope.toolbelt.map((t) => t.name).join(',')} traceId=${options.traceId ?? 'none'}`,
  });

  const providerName = options.provider ?? resolveProviderName();
  const provider = options.providerOverride ?? pickProvider(providerName);

  const ctx: ToolExecutionContext = {
    onPlayMove: options.onPlayMove,
    onTakeBackMove: options.onTakeBackMove,
    onSetBoardPosition: options.onSetBoardPosition,
    onResetBoard: options.onResetBoard,
    onNavigate: options.onNavigate,
    liveFen: input.liveState.fen,
    traceId: options.traceId,
  };

```

## (2) Surface filtering

```
src/coach/coachService.ts-    kind: 'coach-brain-ask-received',
src/coach/coachService.ts-    category: 'subsystem',
src/coach/coachService.ts-    source: 'coachService.ask',
src/coach/coachService.ts:    summary: `surface=${input.surface} ask="${input.ask.slice(0, 60)}"`,
src/coach/coachService.ts:    details: JSON.stringify({ surface: input.surface, askLen: input.ask.length }),
src/coach/coachService.ts-  });
src/coach/coachService.ts-
src/coach/coachService.ts-  // WO-FOUNDATION-02 trace harness — fires at the start of every
src/coach/coachService.ts-  // ask, mirroring coach-brain-ask-received but carrying the
src/coach/coachService.ts-  // traceId so the audit pipeline can be reconstructed.
src/coach/coachService.ts-   
src/coach/coachService.ts-  console.log('[TRACE-5]', options.traceId, 'ask received, input.ask:', input.ask);
src/coach/coachService.ts-  void logAppAudit({
src/coach/coachService.ts-    kind: 'trace-ask-received',
src/coach/coachService.ts-    category: 'subsystem',
src/coach/coachService.ts-    source: 'coachService.ask',
src/coach/coachService.ts:    summary: `ask="${input.ask.slice(0, 80)}" surface=${input.surface} traceId=${options.traceId ?? 'none'}`,
src/coach/coachService.ts-  });
src/coach/coachService.ts-
src/coach/coachService.ts-  // WO-FOUNDATION-02: Layer 1 routing moved upstream to
src/coach/coachService.ts-  // GameChatPanel.handleSend. Most user messages never reached this
src/coach/coachService.ts-  // entry point — pre-LLM intercepts at the surface short-circuit
src/coach/coachService.ts-  // first. The router now runs at the surface boundary with the
src/coach/coachService.ts-  // user's raw text. This entry point only sees messages that the
src/coach/coachService.ts-  // surface chose to forward (real LLM round-trips), so router
src/coach/coachService.ts-  // bypass-LLM logic at this layer was dead code.
src/coach/coachService.ts-
src/coach/sources/liveState.ts- *  Auto-fills `phase` from `fen` when possible. */
src/coach/sources/liveState.ts-export function prepareLiveState(input: LiveState): LiveState {
src/coach/sources/liveState.ts-  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
src/coach/sources/liveState.ts:  if (!input.surface) {
src/coach/sources/liveState.ts-    throw new Error('liveState.surface is required');
src/coach/sources/liveState.ts-  }
src/coach/sources/liveState.ts-  const next: LiveState = { ...input };
src/coach/sources/liveState.ts-  if (next.fen && !next.phase) {
src/coach/sources/liveState.ts-    try {
src/coach/sources/liveState.ts-      // Use the existing `classifyPhase` helper so the phase label
src/coach/sources/liveState.ts-      // matches whatever the rest of the app reports.
src/coach/sources/liveState.ts-      const moveNumber = next.moveHistory?.length ?? 0;
src/coach/sources/liveState.ts-      next.phase = classifyPhase(next.fen, moveNumber);
src/coach/sources/liveState.ts-    } catch {
src/coach/tools/cerebrum/setIntendedOpening.ts-  async execute(args) {
src/coach/tools/cerebrum/setIntendedOpening.ts-    const name = (typeof args.name === 'string' ? args.name : '').trim();
src/coach/tools/cerebrum/setIntendedOpening.ts-    const colorRaw = (typeof args.color === 'string' ? args.color : '').toLowerCase();
src/coach/tools/cerebrum/setIntendedOpening.ts:    const surface = typeof args.surface === 'string' ? args.surface : 'coach-brain';
src/coach/tools/cerebrum/setIntendedOpening.ts-    if (!name) return { ok: false, error: 'name is required' };
src/coach/tools/cerebrum/setIntendedOpening.ts-    if (colorRaw !== 'white' && colorRaw !== 'black') {
src/coach/tools/cerebrum/setIntendedOpening.ts-      return { ok: false, error: 'color must be "white" or "black"' };
src/coach/tools/cerebrum/setIntendedOpening.ts-    }
src/coach/tools/cerebrum/setIntendedOpening.ts-    try {
src/coach/tools/cerebrum/setIntendedOpening.ts-      const stored = memorySetIntendedOpening({
src/coach/tools/cerebrum/setIntendedOpening.ts-        name,
src/coach/tools/cerebrum/setIntendedOpening.ts-        color: colorRaw,
src/coach/tools/cerebrum/setIntendedOpening.ts-        capturedFromSurface: surface,
src/coach/tools/cerebrum/setIntendedOpening.ts-      });
```

## (3) Tool registration

```
src/coach/types.ts:92:export type ToolCategory = 'cerebellum' | 'cerebrum';
src/coach/coachService.ts:24: * a real side effect (cerebrum) consume the context; cerebellum tools
src/coach/coachService.ts:87:   *  cerebellum tools, see results, and emit a `play_move` decision in
src/coach/coachService.ts:90:  /** Callback the `play_move` cerebrum tool uses to actually play a
src/coach/coachService.ts:95:  /** Callback the `take_back_move` cerebrum tool uses to revert the
src/coach/coachService.ts:98:  /** Callback the `set_board_position` cerebrum tool uses to jump the
src/coach/coachService.ts:101:  /** Callback the `reset_board` cerebrum tool uses to restart the game
src/coach/coachService.ts:104:  /** Callback the `navigate_to_route` cerebrum tool uses to actually
src/coach/__tests__/localOpeningBook.test.ts:24:import { localOpeningBookTool } from '../tools/cerebellum/localOpeningBook';
src/coach/__tests__/navigateToRoute.test.ts:20:import { navigateToRouteTool } from '../tools/cerebrum/navigateToRoute';
src/coach/__tests__/playMove.test.ts:20:import { playMoveTool } from '../tools/cerebrum/playMove';
src/coach/sources/memory.ts:42:// ─── Writers (used by cerebrum tools only) ───────────────────────────────────
src/coach/sources/memory.ts:86:/** Clear scope used by the `clear_memory` cerebrum tool. */
src/coach/tools/cerebellum/stockfishEval.ts:12:  category: 'cerebellum',
src/coach/__tests__/multiTurnLoop.test.ts:84:      // Turn 1 — call a cerebellum data tool.
src/coach/sources/identity.ts:25:Tools available to your hands: play_move, take_back_move, set_board_position, reset_board, navigate_to_route, set_intended_opening, clear_memory, record_hint_request, record_blunder, plus the read-only cerebellum tools (stockfish_eval, lichess_opening_lookup, local_opening_book, etc.) for when you need to think before acting.
src/coach/tools/cerebellum/lichessMasterGames.ts:12:  category: 'cerebellum',
src/coach/tools/cerebellum/lichessOpeningLookup.ts:11:  category: 'cerebellum',
src/coach/tools/cerebellum/localOpeningBook.ts:24:  category: 'cerebellum',
src/coach/tools/registry.ts:3: * dispatches. Six cerebellum (read-only deterministic), eleven
src/coach/tools/registry.ts:4: * cerebrum (decisions / side effects). See COACH-BRAIN-00 §"The
src/coach/tools/registry.ts:19:import { stockfishEvalTool } from './cerebellum/stockfishEval';
src/coach/tools/registry.ts:20:import { stockfishClassifyMoveTool } from './cerebellum/stockfishClassifyMove';
src/coach/tools/registry.ts:21:import { lichessOpeningLookupTool } from './cerebellum/lichessOpeningLookup';
src/coach/tools/registry.ts:22:import { lichessMasterGamesTool } from './cerebellum/lichessMasterGames';
src/coach/tools/registry.ts:23:import { lichessPuzzleFetchTool } from './cerebellum/lichessPuzzleFetch';
src/coach/tools/registry.ts:24:import { localOpeningBookTool } from './cerebellum/localOpeningBook';
src/coach/tools/registry.ts:26:import { navigateToRouteTool } from './cerebrum/navigateToRoute';
src/coach/tools/registry.ts:27:import { setIntendedOpeningTool } from './cerebrum/setIntendedOpening';
src/coach/tools/registry.ts:28:import { clearMemoryTool } from './cerebrum/clearMemory';
src/coach/tools/registry.ts:29:import { playMoveTool } from './cerebrum/playMove';
src/coach/tools/registry.ts:30:import { takeBackMoveTool } from './cerebrum/takeBackMove';
src/coach/tools/registry.ts:31:import { setBoardPositionTool } from './cerebrum/setBoardPosition';
src/coach/tools/registry.ts:32:import { resetBoardTool } from './cerebrum/resetBoard';
src/coach/tools/registry.ts:33:import { speakTool } from './cerebrum/speak';
src/coach/tools/registry.ts:34:import { requestHintTierTool } from './cerebrum/requestHintTier';
src/coach/tools/registry.ts:35:import { recordHintRequestTool } from './cerebrum/recordHintRequest';
src/coach/tools/registry.ts:36:import { recordBlunderTool } from './cerebrum/recordBlunder';
src/coach/tools/cerebellum/lichessPuzzleFetch.ts:20:  category: 'cerebellum',
src/coach/tools/cerebellum/stockfishClassifyMove.ts:18:  category: 'cerebellum',
src/coach/tools/cerebrum/requestHintTier.ts:10:  category: 'cerebrum',
src/coach/tools/cerebrum/takeBackMove.ts:20:  category: 'cerebrum',
src/coach/tools/cerebrum/setIntendedOpening.ts:10:  category: 'cerebrum',
src/coach/tools/cerebrum/navigateToRoute.ts:23:  category: 'cerebrum',
src/coach/tools/cerebrum/setBoardPosition.ts:14:  category: 'cerebrum',
src/coach/tools/cerebrum/recordBlunder.ts:16:  category: 'cerebrum',
src/coach/tools/cerebrum/resetBoard.ts:13:  category: 'cerebrum',
src/coach/tools/cerebrum/playMove.ts:19:  category: 'cerebrum',
src/coach/tools/cerebrum/clearMemory.ts:10:  category: 'cerebrum',
src/coach/tools/cerebrum/speak.ts:10:  category: 'cerebrum',
```

## (4) Every coachService.ask call site

```
src/components/Coach/CoachChatPage.tsx:266:      const answer = await coachService.ask(
src/components/Coach/CoachChatPage.tsx:325:      console.warn('[CoachChatPage] coachService.ask failed:', err);
src/components/Coach/CoachGamePage.test.tsx:50:  // via coachService.ask. getRandomLegalMove is the safety fallback
src/components/Coach/GameChatPanel.tsx:233:      // (and ultimately coachService.ask) on miss.
src/components/Coach/GameChatPanel.tsx:538:      // envelope assembled in coachService.ask carries the four sources
src/components/Coach/GameChatPanel.tsx:571:          console.log('[TRACE-4]', traceId, 'coachService.ask invoking, ask=', text.slice(0, 100));
src/components/Coach/GameChatPanel.tsx:578:          const answer = await coachService.ask(
src/components/Coach/GameChatPanel.tsx:744:          console.error('[GameChatPanel] coachService.ask failed:', err);
src/components/Coach/GameChatPanel.tsx:794:        console.log('[TRACE-4-drawer]', traceId, 'coachService.ask invoking, ask=', text.slice(0, 100));
src/components/Coach/GameChatPanel.tsx:801:        const answer = await coachService.ask(
src/components/Coach/GameChatPanel.tsx:948:        console.error('[GameChatPanel] coachService.ask (drawer) failed:', err);
src/components/Coach/CoachGamePage.tsx:1542:          await coachService.ask(
src/components/Coach/CoachGamePage.tsx:2202:  // The Layer 1 intent router (in coachService.ask) pattern-matches
src/components/Coach/CoachGameReview.tsx:564:    // WO-BRAIN-03: review-ask now routes through coachService.ask. The
src/hooks/useHintSystem.ts:357:          const answer = await coachService.ask(
src/hooks/useHintSystem.test.ts:8: *   - Each tap dispatches `coachService.ask({ surface: 'hint', ... },
src/hooks/useHintSystem.test.ts:160:  it('sends HINT_TIER_1_ADDITION via coachService.ask on first tap and renders no arrows', async () => {
src/services/appAuditor.ts:127:  // from a surface that has been migrated to coachService.ask. Used in
src/coach/coachService.ts:4: * Every surface in the app calls `coachService.ask({ surface, ask,
src/coach/coachService.ts:147:    source: 'coachService.ask',
src/coach/coachService.ts:160:    source: 'coachService.ask',
src/coach/coachService.ts:181:    source: 'coachService.ask',
src/coach/coachService.ts:198:    source: 'coachService.ask',
src/coach/coachService.ts:220:  console.log('[coachService.ask] ctx-built:', {
src/coach/coachService.ts:230:    source: 'coachService.ask',
src/coach/coachService.ts:247:    source: 'coachService.ask',
src/coach/coachService.ts:262:      source: 'coachService.ask',
src/coach/coachService.ts:281:      source: 'coachService.ask',
src/coach/coachService.ts:301:        source: 'coachService.ask',
src/coach/coachService.ts:309:          source: 'coachService.ask',
src/coach/coachService.ts:327:          source: 'coachService.ask',
src/coach/coachService.ts:335:          source: 'coachService.ask',
src/coach/coachService.ts:367:    source: 'coachService.ask',
src/coach/coachService.ts:380: *  `coachService.ask(...)`. No other entry points. */
src/coach/__tests__/ping.integration.test.ts:9: *   await coachService.ask({
src/coach/__tests__/ping.integration.test.ts:69:    const answer = await coachService.ask(
src/coach/__tests__/ping.integration.test.ts:116:    const answer = await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:75:    await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:102:    const answer = await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:123:    await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:154:    await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:175:    await coachService.ask(
src/coach/__tests__/multiTurnLoop.test.ts:205:    await coachService.ask(
src/services/coachIntentRouter.ts:44: * The caller (coachService.ask) dispatches the matched tool directly
src/services/coachIntentRouter.ts:85:  // BEFORE coachService.ask — its `RESTART_RE` matches a superset of
src/coach/__tests__/coachService.test.ts:39:describe('coachService.ask', () => {
src/coach/__tests__/coachService.test.ts:41:    const answer = await coachService.ask(
src/coach/__tests__/coachService.test.ts:56:    await coachService.ask(
src/coach/__tests__/coachService.test.ts:86:    const answer = await coachService.ask(
src/coach/__tests__/coachService.test.ts:103:    const answer = await coachService.ask(
src/coach/__tests__/coachService.test.ts:118:      coachService.ask(
src/coach/tools/cerebrum/playMove.ts:10: * `coachService.ask`), the tool returns an error. Tools never silently
src/coach/tools/cerebrum/playMove.ts:56:          'The calling surface did not pass an onPlayMove callback to coachService.ask, so the move cannot be played.',
src/coach/tools/cerebrum/playMove.ts:61:          'no onPlayMove callback wired — calling surface must pass one in coachService.ask options',
src/coach/__tests__/streaming.test.ts:3: * `coachService.ask` routes to the provider's `callStreaming` method
src/coach/__tests__/streaming.test.ts:24:describe('coachService.ask — streaming', () => {
src/coach/__tests__/streaming.test.ts:42:    const answer = await coachService.ask(
src/coach/__tests__/streaming.test.ts:73:    const answer = await coachService.ask(
src/coach/__tests__/streaming.test.ts:100:    const answer = await coachService.ask(
src/coach/__tests__/streaming.test.ts:139:    await coachService.ask(
src/coach/tools/cerebrum/navigateToRoute.ts:15: * `onNavigate` to `coachService.ask`.
```

## (5) Per-call-site context (first 8 grep results, deduped by file)

### src/components/Coach/CoachChatPage.tsx

```
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
  // search bar navigating here with ?q=...). Runs once per distinct
  // query, strips the param after firing so refreshing doesn't resend,
  // and waits for the profile + hydration to be ready.
  const autoSentQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProfile || !hydrated) return;
    const q = searchParams.get('q');
    if (!q || !q.trim()) return;
    if (autoSentQueryRef.current === q) return;
    autoSentQueryRef.current = q;
    // Strip ?q= immediately so navigating back here doesn't resend it
    // and refreshing stays clean.
    const next = new URLSearchParams(searchParams);
```

### src/components/Coach/GameChatPanel.tsx

```
      // ─── WO-FOUNDATION-02: Layer 1 intent-router pre-emit ────────
      // Pattern-match high-confidence command shapes BEFORE running
      // any existing pre-LLM intercepts. Matched commands dispatch
      // the surface callback directly. Zero LLM round-trip; zero
      // hallucination risk. Falls through to the existing intercepts
      // (and ultimately coachService.ask) on miss.
      void logAppAudit({
        kind: 'trace-intercept-check',
        category: 'subsystem',
        source: 'GameChatPanel',
        summary: `intercept=tryRouteIntent traceId=${traceId}`,
      });
      const routedIntent = tryRouteIntent(text, { currentFen: fen });
      void logAppAudit({
        kind: 'trace-intercept-result',
        category: 'subsystem',
        source: 'GameChatPanel',
        summary: `intercept=tryRouteIntent matched=${routedIntent ? 'true' : 'false'} traceId=${traceId}`,
      });
      if (routedIntent) {
        void logAppAudit({
          kind: 'coach-brain-intent-routed',
          category: 'subsystem',
          source: 'GameChatPanel.handleSend',
          summary: `routed=${routedIntent.kind} bypass-llm=true`,
        });

        let ackText = 'Done.';
        let dispatchOk = false;
        let dispatchError: string | undefined;

        try {
          switch (routedIntent.kind) {
            case 'play_move': {
              if (!onPlayMove) {
                dispatchError = 'no onPlayMove callback wired';
--
        }
      }

      // ── WO-BRAIN-02 — IN-GAME BRANCH ROUTES THROUGH coachService ─────
      // Mid-game chat goes through the unified Coach Brain spine. The
      // envelope assembled in coachService.ask carries the four sources
      // of truth (identity, memory, app map, live state) plus the full
      // toolbelt — so memory + manifest awareness arrive on every call.
      // The drawer/post-game branch below still uses runAgentTurn until
      // BRAIN-03 collapses it the same way.
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
            details: JSON.stringify({
              surface: 'game-chat',
              viaSpine: true,
              timestamp: Date.now(),
              fenIfPresent: fen,
            }),
            fen,
          });
           
          console.log('[TRACE-4]', traceId, 'coachService.ask invoking, ask=', text.slice(0, 100));
          void logAppAudit({
            kind: 'trace-ask-invoking',
            category: 'subsystem',
            source: 'GameChatPanel',
            summary: `surface=in-game traceId=${traceId}`,
          });
          const answer = await coachService.ask(
            { surface: 'game-chat', ask: text, liveState },
            {
              onChunk: (chunk: string) => {
                fullResponse += chunk;
                const displayText = fullResponse
                  .replace(BOARD_TAG_STRIP_RE, '')
                  .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
                  .trim();
                setStreamingContent(displayText);
                if (useAppStore.getState().coachVoiceOn) {
                  // WO-FOUNDATION-02 (continued): strip [BOARD:...] and
                  // [[ACTION:...]] tags from each chunk before it reaches
                  // the speech buffer. Without this, the action / board
                  // directives get spoken aloud verbatim.
                  const cleanedChunk = chunk
                    .replace(BOARD_TAG_STRIP_RE, '')
                    .replace(/\[\[ACTION:[^\]]*\]\]/gi, '');
                  speechBufferRef.current += cleanedChunk;
                  const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
                  if (sentenceEnd) {
                    const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
                    speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
                    void voiceService.speak(sentence.trim());
                  }
                }
              },
              onNavigate: (path: string) => {
                void navigate(path);
              },
              // WO-COACH-OPERATOR-FOUNDATION-01 — board-state callbacks.
--
          });
          if (annotations.length > 0) {
            onBoardAnnotation?.(annotations);
          }
        } catch (err: unknown) {
          console.error('[GameChatPanel] coachService.ask failed:', err);
          const errMsg: ChatMessageType = {
            id: `gmsg-${Date.now()}-err`,
            role: 'assistant',
            content: 'Sorry — I couldn\'t reach the coach just now. Try again in a moment.',
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errMsg]);
        } finally {
          setIsStreaming(false);
          setStreamingContent('');
        }
        return;
      }

      // ── WO-BRAIN-03 — DRAWER / POST-GAME BRANCH (migrated) ───────────
      // Mirrors the in-game branch above. Differences kept to a
      // minimum: the surface label is `'drawer-chat'`; the live state
      // captures `currentRoute = location.pathname` (matters for "take
      // me to X" intents); FEN / move history are passed only when
      // they're meaningful (post-game review has them, home dashboard
      // typically doesn't).
      onBoardAnnotation?.([{ type: 'clear' }]);
      setIsStreaming(true);
      setStreamingContent('');
      speechBufferRef.current = '';
      let drawerFullResponse = '';
      try {
        const drawerLiveState: LiveState = {
          surface: 'home-chat',
          fen: fen || undefined,
--
            currentRoute: location.pathname,
          }),
          fen: fen || undefined,
        });
         
        console.log('[TRACE-4-drawer]', traceId, 'coachService.ask invoking, ask=', text.slice(0, 100));
        void logAppAudit({
          kind: 'trace-ask-invoking',
          category: 'subsystem',
          source: 'GameChatPanel',
          summary: `surface=drawer traceId=${traceId}`,
        });
        const answer = await coachService.ask(
          { surface: 'home-chat', ask: text, liveState: drawerLiveState },
          {
            onChunk: (chunk: string) => {
              drawerFullResponse += chunk;
              const displayText = drawerFullResponse
                .replace(BOARD_TAG_STRIP_RE, '')
                .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
                .trim();
              setStreamingContent(displayText);
              if (useAppStore.getState().coachVoiceOn) {
                // WO-FOUNDATION-02 (continued): same tag-strip as the
                // in-game branch — see comment above.
                const cleanedChunk = chunk
                  .replace(BOARD_TAG_STRIP_RE, '')
                  .replace(/\[\[ACTION:[^\]]*\]\]/gi, '');
                speechBufferRef.current += cleanedChunk;
                const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
                if (sentenceEnd) {
                  const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
                  speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
                  void voiceService.speak(sentence.trim());
                }
              }
            },
            onNavigate: (path: string) => {
              void navigate(path);
            },
            // WO-COACH-OPERATOR-FOUNDATION-01 — same callback set as
            // the in-game branch. The drawer surface (post-game / home
            // chat) might trigger a play-against / position-set when
--
          text: drawerCleanText,
          fen: fen || undefined,
          trigger: null,
        });
      } catch (err: unknown) {
        console.error('[GameChatPanel] coachService.ask (drawer) failed:', err);
        const errMsg: ChatMessageType = {
          id: `gmsg-${Date.now()}-err`,
          role: 'assistant',
          content: 'Sorry — I couldn\'t reach the coach just now. Try again in a moment.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
      }
    }, [activeProfile, isStreaming, fen, history, isGameOver, flushSpeechBuffer, onBoardAnnotation, onRestartGame, onPlayOpening, onPlayMove, onTakeBackMove, onSetBoardPosition, onResetBoard, setMessages, navigate, location, playerColor]);

    // Auto-send initial prompt (from post-game practice bridge or search bar)
    useEffect(() => {
      if (initialPrompt && !initialPromptSentRef.current && activeProfile && !isStreaming) {
        initialPromptSentRef.current = true;
        void handleSend(initialPrompt);
        onInitialPromptSent?.();
      }
    }, [initialPrompt, activeProfile, isStreaming, handleSend, onInitialPromptSent]);

    return (
      <div
        className={`flex flex-col h-full ${className ?? ''}`}
        data-testid="game-chat-panel"
      >
        {/* Header (hidden when embedded in a container with its own header) */}
        {!hideHeader && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-theme-border">
```

### src/components/Coach/CoachGamePage.tsx

```
            targetStrength,
          }),
          fen: game.fen,
        });
        try {
          await coachService.ask(
            {
              surface: 'move-selector',
              ask: moveSelectorAsk,
              liveState: moveSelectorLiveState,
            },
            {
              maxToolRoundTrips: 3,
              onPlayMove: (san: string) => {
                // Validate against the live FEN. The play_move tool
                // already validated, but board state may have shifted
                // between turns; double-check.
                try {
                  const probe = new Chess(game.fen);
                  const result = probe.move(san);
                  if (!result) return { ok: false, reason: 'illegal at apply time' };
                  brainPickSan = san;
                  return { ok: true };
                } catch (err) {
                  return {
                    ok: false,
                    reason: err instanceof Error ? err.message : String(err),
                  };
                }
              },
            },
          );
        } catch (err: unknown) {
          console.warn('[CoachGame] move-selector spine call failed:', err);
        }

--
      void handlePlayerMove(moveResult);
    }
  }, [isExploreMode, handleExploreMove, practicePosition, handlePracticeMove, handlePlayerMove]);

  // ─── WO-COACH-OPERATOR-FOUNDATION-01 — chat-driven board commands ───
  // The Layer 1 intent router (in coachService.ask) pattern-matches
  // commands like "play e4" / "take that back" / "reset the board"
  // BEFORE the LLM and dispatches via these callbacks. Each handler
  // delegates to existing chess.js + game-state machinery — no new
  // mutation paths.

  const handleChatPlayMove = useCallback(
    (san: string): { ok: boolean; reason?: string } => {
      // WO-FOUNDATION-02 trace harness.
      console.log('[TRACE-12a]', 'handleChatPlayMove invoked, san:', san);
      void logAppAudit({
        kind: 'trace-surface-callback-invoked',
        category: 'subsystem',
        source: 'CoachGamePage.handleChatPlayMove',
        summary: `args=${JSON.stringify({ san }).slice(0, 100)}`,
      });
      const finish = (result: { ok: boolean; reason?: string }): { ok: boolean; reason?: string } => {
        console.log('[TRACE-13a]', 'handleChatPlayMove result:', result);
        void logAppAudit({
          kind: 'trace-surface-callback-result',
          category: 'subsystem',
          source: 'CoachGamePage.handleChatPlayMove',
          summary: `success=${result.ok} reason=${result.reason ?? 'none'}`,
        });
        return result;
      };
      try {
        // Probe SAN in a sandbox to extract from/to/promotion; the
        // live `game.makeMove` API takes from/to, not SAN.
        const probe = new Chess(game.fen);
        const probed = probe.move(san);
```

### src/hooks/useHintSystem.ts

```
        };
        voiceService.stop();

        let response = '';
        try {
          const answer = await coachService.ask(
            { surface: 'hint', ask: askText, liveState },
            {
              maxToolRoundTrips: 2,
              onChunk: (chunk: string) => {
                speechBuffer += chunk;
                const sentenceEnd = /[.!?\n]/.exec(speechBuffer);
                if (sentenceEnd) {
                  const sentence = speechBuffer.slice(0, sentenceEnd.index + 1).trim();
                  speechBuffer = speechBuffer.slice(sentenceEnd.index + 1).trimStart();
                  speakSentence(sentence);
                }
              },
            },
          );
          // Flush any trailing text (no terminator) via the same gate.
          const tail = speechBuffer.replace(TAG_STRIP_RE, '').trim();
          if (tail) speakSentence(tail);
          speechBuffer = '';
          response = answer.text.replace(TAG_STRIP_RE, '').trim();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          void logAppAudit({
            kind: 'llm-error',
            category: 'subsystem',
            source: 'useHintSystem',
            summary: `tier ${nextLevel} spine call failed`,
            details: msg,
          });
        }

```

### src/hooks/useHintSystem.test.ts

```
 *
 * Verifies the progressive hint pipeline post-spine-migration:
 *   - Tier 1 ask carries HINT_TIER_1_ADDITION; no arrow rendered.
 *   - Tier 2 escalates the same FEN's record, still no arrow.
 *   - Tier 3 escalates and now an arrow appears.
 *   - Each tap dispatches `coachService.ask({ surface: 'hint', ... },
 *     { maxToolRoundTrips: 2 })` and the brain's `record_hint_request`
 *     tool call (mocked here as if the LLM emitted it) writes the tap
 *     to coach memory.
 *   - Resetting the hook between FENs finalizes the pending record.
 *   - Tier prompt strings still hold the discipline guarantees the
 *     WO requires (no piece names at Tier 1, no destination at Tier 2,
 *     concrete move + plan at Tier 3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  HINT_TIER_1_ADDITION,
  HINT_TIER_2_ADDITION,
  HINT_TIER_3_ADDITION,
} from '../services/coachPrompts';

// ── Mocks ─────────────────────────────────────────────────────────────────

const speakRecords: { method: string; text: string }[] = [];
vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakForced: vi.fn((text: string) => {
      speakRecords.push({ method: 'speakForced', text });
      return Promise.resolve();
    }),
    speakQueuedForced: vi.fn((text: string) => {
      speakRecords.push({ method: 'speakQueuedForced', text });
      return Promise.resolve();
    }),
    stop: vi.fn(),
--
// Starting position — white to move so the mocked best move (g1f3)
// is legal and Tier 3 can render the arrow.
const FEN_AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('useHintSystem — Tier 1 (the WHY)', () => {
  it('sends HINT_TIER_1_ADDITION via coachService.ask on first tap and renders no arrows', async () => {
    spineResponses.push('Your center is begging for reinforcement — find the piece that can defend it.');
    const { result } = renderHook(() =>
      useHintSystem({
        fen: FEN_AFTER_E4,
        playerColor: 'black',
        enabled: true,
        gameId: 'g-1',
        moveNumber: 1,
        ply: 1,
      }),
    );

    act(() => {
      result.current.requestHint();
    });

    await waitFor(() => expect(spineCalls.length).toBe(1));
    expect(spineCalls[0].surface).toBe('hint');
    expect(spineCalls[0].maxToolRoundTrips).toBe(2);
    expect(spineCalls[0].fen).toBe(FEN_AFTER_E4);
    expect(spineCalls[0].ask).toContain(HINT_TIER_1_ADDITION);
    await waitFor(() => expect(result.current.hintState.level).toBe(1));
    expect(result.current.hintState.arrows).toEqual([]);
    expect(result.current.hintState.ghostMove).toBeNull();
    // Sentence-streamed via Polly as the first sentence (chunk-driven).
    expect(speakRecords.some((r) => r.method === 'speakForced')).toBe(true);
  });

  it('records the request to coach memory via the brain-emitted tool call', async () => {
    spineResponses.push('Your center is collapsing.');
```

### src/coach/__tests__/streaming.test.ts

```
/**
 * Coach Brain spine — streaming round-trip (WO-BRAIN-02). Verifies
 * `coachService.ask` routes to the provider's `callStreaming` method
 * when an `onChunk` callback is supplied, and that chunks arrive
 * before the final answer resolves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

import { coachService } from '../coachService';
import {
  __resetCoachMemoryStoreForTests,
  useCoachMemoryStore,
} from '../../stores/coachMemoryStore';
import type { Provider, ProviderResponse } from '../types';

beforeEach(() => {
  __resetCoachMemoryStoreForTests();
});

describe('coachService.ask — streaming', () => {
  it('routes through provider.callStreaming when onChunk is provided', async () => {
    const callSpy = vi.fn();
    const callStreamingSpy = vi.fn(
      async (_envelope, onChunk: (chunk: string) => void): Promise<ProviderResponse> => {
        // Simulate token-by-token streaming.
        onChunk('Hey ');
        onChunk('Dave ');
        onChunk('— ready to play.');
        return { text: 'Hey Dave — ready to play.', toolCalls: [], raw: {} };
      },
    );
    const mockProvider: Provider = {
      name: 'deepseek',
      call: callSpy,
      callStreaming: callStreamingSpy,
    };
    const chunks: string[] = [];
    const answer = await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'Say hello.',
        liveState: { surface: 'game-chat', currentRoute: '/coach/play' },
      },
      {
        providerOverride: mockProvider,
        onChunk: (c) => chunks.push(c),
      },
    );
    expect(callStreamingSpy).toHaveBeenCalledTimes(1);
    expect(callSpy).not.toHaveBeenCalled();
    expect(chunks).toEqual(['Hey ', 'Dave ', '— ready to play.']);
    expect(answer.text).toBe('Hey Dave — ready to play.');
  });

  it('falls back to provider.call when onChunk is not provided', async () => {
    const callSpy = vi.fn(
      async (): Promise<ProviderResponse> => ({
        text: 'non-streaming answer',
        toolCalls: [],
        raw: {},
      }),
    );
    const callStreamingSpy = vi.fn();
    const mockProvider: Provider = {
      name: 'deepseek',
      call: callSpy,
      callStreaming: callStreamingSpy,
    };
    const answer = await coachService.ask(
      {
        surface: 'ping',
        ask: 'Hello.',
        liveState: { surface: 'ping' },
      },
      { providerOverride: mockProvider },
    );
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(callStreamingSpy).not.toHaveBeenCalled();
    expect(answer.text).toBe('non-streaming answer');
  });

  it('falls back to provider.call when provider does NOT implement callStreaming', async () => {
    const callSpy = vi.fn(
      async (): Promise<ProviderResponse> => ({
        text: 'no streaming support',
        toolCalls: [],
        raw: {},
      }),
    );
    const mockProvider: Provider = {
      name: 'anthropic',
      call: callSpy,
      // callStreaming intentionally omitted.
    };
    const chunks: string[] = [];
    const answer = await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'hi',
        liveState: { surface: 'game-chat' },
      },
      {
        providerOverride: mockProvider,
        onChunk: (c) => chunks.push(c),
      },
    );
    expect(callSpy).toHaveBeenCalledTimes(1);
    expect(chunks).toEqual([]);
    expect(answer.text).toBe('no streaming support');
  });

  it('forwards memory snapshot into the streaming provider envelope', async () => {
    useCoachMemoryStore.getState().setIntendedOpening({
      name: 'Caro-Kann Defense',
      color: 'black',
      capturedFromSurface: 'streaming-test',
    });
    let capturedEnvelope: { memory?: { intendedOpening?: { name: string } | null } } | null = null;
    const mockProvider: Provider = {
      name: 'deepseek',
      async call(env) {
        capturedEnvelope = env as unknown as typeof capturedEnvelope;
        return { text: '', toolCalls: [], raw: {} };
      },
      async callStreaming(env, onChunk) {
        capturedEnvelope = env as unknown as typeof capturedEnvelope;
--
          toolCalls: [],
          raw: {},
        };
      },
    };
    await coachService.ask(
      {
        surface: 'game-chat',
        ask: 'What opening am I committed to?',
        liveState: { surface: 'game-chat' },
      },
      {
        providerOverride: mockProvider,
        onChunk: () => undefined,
      },
    );
    expect(capturedEnvelope?.memory?.intendedOpening?.name).toBe('Caro-Kann Defense');
  });
});
```

## (6) Cerebrum tool definitions and missing-callback handling

```
src/coach/tools/cerebrum/takeBackMove.ts-import type { Tool } from '../../types';
src/coach/tools/cerebrum/takeBackMove.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/takeBackMove.ts-
src/coach/tools/cerebrum/takeBackMove.ts:export const takeBackMoveTool: Tool = {
src/coach/tools/cerebrum/takeBackMove.ts-  name: 'take_back_move',
src/coach/tools/cerebrum/takeBackMove.ts-  category: 'cerebrum',
src/coach/tools/cerebrum/takeBackMove.ts-  description:
src/coach/tools/cerebrum/takeBackMove.ts-    "Revert the board by N half-moves. count=1 undoes the user's last move. count=2 undoes the whole exchange. REQUIRED whenever you say you'll take a move back; saying it without calling this means the move did not get taken back.",
src/coach/tools/cerebrum/takeBackMove.ts-  parameters: {
src/coach/tools/cerebrum/takeBackMove.ts-    type: 'object',
src/coach/tools/cerebrum/takeBackMove.ts-    properties: {
src/coach/tools/cerebrum/takeBackMove.ts-      count: {
src/coach/tools/cerebrum/takeBackMove.ts-        type: 'number',
src/coach/tools/cerebrum/takeBackMove.ts-        description: 'Number of half-moves to revert. Default 1.',
src/coach/tools/cerebrum/takeBackMove.ts-      },
src/coach/tools/cerebrum/takeBackMove.ts-    },
src/coach/tools/cerebrum/takeBackMove.ts-    required: [],
src/coach/tools/cerebrum/takeBackMove.ts-  },
src/coach/tools/cerebrum/takeBackMove.ts-  async execute(args, ctx) {
src/coach/tools/cerebrum/takeBackMove.ts-    // WO-FOUNDATION-02 trace harness.
src/coach/tools/cerebrum/takeBackMove.ts-     
src/coach/tools/cerebrum/takeBackMove.ts:    console.log('[TRACE-11b]', ctx?.traceId, 'takeBackMoveTool entered, count:', args.count, 'hasCallback:', typeof ctx?.onTakeBackMove);
src/coach/tools/cerebrum/takeBackMove.ts-    void logAppAudit({
src/coach/tools/cerebrum/takeBackMove.ts-      kind: 'trace-tool-entered',
src/coach/tools/cerebrum/takeBackMove.ts-      category: 'subsystem',
src/coach/tools/cerebrum/takeBackMove.ts:      source: 'takeBackMoveTool',
src/coach/tools/cerebrum/takeBackMove.ts-      summary: `count=${typeof args.count === 'number' ? args.count : 'undef'} hasCallback=${typeof ctx?.onTakeBackMove === 'function'} traceId=${ctx?.traceId ?? 'none'}`,
src/coach/tools/cerebrum/takeBackMove.ts-    });
src/coach/tools/cerebrum/takeBackMove.ts-
src/coach/tools/cerebrum/takeBackMove.ts-    const rawCount = typeof args.count === 'number' ? args.count : 1;
src/coach/tools/cerebrum/takeBackMove.ts-    const count = Math.max(1, Math.floor(rawCount));
src/coach/tools/cerebrum/takeBackMove.ts-
src/coach/tools/cerebrum/takeBackMove.ts-    if (!ctx?.onTakeBackMove) {
src/coach/tools/cerebrum/takeBackMove.ts-      void logAppAudit({
src/coach/tools/cerebrum/takeBackMove.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/takeBackMove.ts-        category: 'subsystem',
src/coach/tools/cerebrum/takeBackMove.ts:        source: 'takeBackMoveTool',
src/coach/tools/cerebrum/takeBackMove.ts-        summary: `take_back_move count=${count} — no callback wired`,
src/coach/tools/cerebrum/takeBackMove.ts-      });
src/coach/tools/cerebrum/takeBackMove.ts-      return { ok: false, error: 'no onTakeBackMove callback wired' };
src/coach/tools/cerebrum/takeBackMove.ts-    }
src/coach/tools/cerebrum/takeBackMove.ts-
src/coach/tools/cerebrum/takeBackMove.ts-    try {
src/coach/tools/cerebrum/takeBackMove.ts-      const result = await Promise.resolve(ctx.onTakeBackMove(count));
src/coach/tools/cerebrum/takeBackMove.ts-      const ok = typeof result === 'boolean' ? result : result.ok;
src/coach/tools/cerebrum/takeBackMove.ts-      const reason =
src/coach/tools/cerebrum/takeBackMove.ts-        typeof result === 'object' && 'reason' in result ? result.reason : undefined;
src/coach/tools/cerebrum/takeBackMove.ts-      void logAppAudit({
src/coach/tools/cerebrum/takeBackMove.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/takeBackMove.ts-        category: 'subsystem',
src/coach/tools/cerebrum/takeBackMove.ts:        source: 'takeBackMoveTool',
src/coach/tools/cerebrum/takeBackMove.ts-        summary: `take_back_move count=${count} ${ok ? 'ok' : 'rejected'}`,
src/coach/tools/cerebrum/takeBackMove.ts-        details: reason ? `reason=${reason}` : undefined,
src/coach/tools/cerebrum/takeBackMove.ts-        fen: ctx.liveFen,
src/coach/tools/cerebrum/takeBackMove.ts-      });
src/coach/tools/cerebrum/takeBackMove.ts-      return ok
src/coach/tools/cerebrum/takeBackMove.ts-        ? { ok: true, result: { count, reverted: true } }
src/coach/tools/cerebrum/takeBackMove.ts-        : { ok: false, error: reason ?? 'surface rejected take-back' };
src/coach/tools/cerebrum/takeBackMove.ts-    } catch (err) {
src/coach/tools/cerebrum/takeBackMove.ts-      return {
src/coach/tools/cerebrum/takeBackMove.ts-        ok: false,
src/coach/tools/cerebrum/takeBackMove.ts-        error: `onTakeBackMove threw: ${err instanceof Error ? err.message : String(err)}`,
src/coach/tools/cerebrum/takeBackMove.ts-      };
src/coach/tools/cerebrum/takeBackMove.ts-    }
src/coach/tools/cerebrum/takeBackMove.ts-  },
src/coach/tools/cerebrum/takeBackMove.ts-};
src/coach/tools/cerebrum/setBoardPosition.ts-import type { Tool } from '../../types';
src/coach/tools/cerebrum/setBoardPosition.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/setBoardPosition.ts-
src/coach/tools/cerebrum/setBoardPosition.ts:export const setBoardPositionTool: Tool = {
src/coach/tools/cerebrum/setBoardPosition.ts-  name: 'set_board_position',
src/coach/tools/cerebrum/setBoardPosition.ts-  category: 'cerebrum',
src/coach/tools/cerebrum/setBoardPosition.ts-  description:
src/coach/tools/cerebrum/setBoardPosition.ts-    "Jump the board to a specific FEN position. REQUIRED whenever you say you'll set up a position; saying it without calling this means the position did not change. The FEN must be valid; this tool validates before dispatching.",
src/coach/tools/cerebrum/setBoardPosition.ts-  parameters: {
src/coach/tools/cerebrum/setBoardPosition.ts-    type: 'object',
src/coach/tools/cerebrum/setBoardPosition.ts-    properties: {
src/coach/tools/cerebrum/setBoardPosition.ts-      fen: { type: 'string', description: 'FEN string for the target position.' },
src/coach/tools/cerebrum/setBoardPosition.ts-    },
src/coach/tools/cerebrum/setBoardPosition.ts-    required: ['fen'],
src/coach/tools/cerebrum/setBoardPosition.ts-  },
src/coach/tools/cerebrum/setBoardPosition.ts-  async execute(args, ctx) {
src/coach/tools/cerebrum/setBoardPosition.ts-    const fen = typeof args.fen === 'string' ? args.fen.trim() : '';
src/coach/tools/cerebrum/setBoardPosition.ts-    if (!fen) return { ok: false, error: 'fen is required' };
src/coach/tools/cerebrum/setBoardPosition.ts-
src/coach/tools/cerebrum/setBoardPosition.ts-    try {
src/coach/tools/cerebrum/setBoardPosition.ts-      // chess.js validates FEN on construction.
src/coach/tools/cerebrum/setBoardPosition.ts-      new Chess(fen);
src/coach/tools/cerebrum/setBoardPosition.ts-    } catch (err) {
src/coach/tools/cerebrum/setBoardPosition.ts-      return {
src/coach/tools/cerebrum/setBoardPosition.ts-        ok: false,
src/coach/tools/cerebrum/setBoardPosition.ts-        error: `invalid FEN: ${err instanceof Error ? err.message : String(err)}`,
src/coach/tools/cerebrum/setBoardPosition.ts-      };
src/coach/tools/cerebrum/setBoardPosition.ts-    }
src/coach/tools/cerebrum/setBoardPosition.ts-
src/coach/tools/cerebrum/setBoardPosition.ts-    if (!ctx?.onSetBoardPosition) {
src/coach/tools/cerebrum/setBoardPosition.ts-      return { ok: false, error: 'no onSetBoardPosition callback wired' };
src/coach/tools/cerebrum/setBoardPosition.ts-    }
src/coach/tools/cerebrum/setBoardPosition.ts-
src/coach/tools/cerebrum/setBoardPosition.ts-    try {
--
src/coach/tools/cerebrum/setBoardPosition.ts-      void logAppAudit({
src/coach/tools/cerebrum/setBoardPosition.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/setBoardPosition.ts-        category: 'subsystem',
src/coach/tools/cerebrum/setBoardPosition.ts:        source: 'setBoardPositionTool',
src/coach/tools/cerebrum/setBoardPosition.ts-        summary: `set_board_position ${ok ? 'ok' : 'rejected'}`,
src/coach/tools/cerebrum/setBoardPosition.ts-        details: reason ? `reason=${reason}` : undefined,
src/coach/tools/cerebrum/setBoardPosition.ts-        fen,
src/coach/tools/cerebrum/setBoardPosition.ts-      });
src/coach/tools/cerebrum/setBoardPosition.ts-      return ok
src/coach/tools/cerebrum/setBoardPosition.ts-        ? { ok: true, result: { fen } }
src/coach/tools/cerebrum/setBoardPosition.ts-        : { ok: false, error: reason ?? 'surface rejected position-set' };
src/coach/tools/cerebrum/setBoardPosition.ts-    } catch (err) {
src/coach/tools/cerebrum/setBoardPosition.ts-      return {
src/coach/tools/cerebrum/setBoardPosition.ts-        ok: false,
src/coach/tools/cerebrum/setBoardPosition.ts-        error: `onSetBoardPosition threw: ${err instanceof Error ? err.message : String(err)}`,
src/coach/tools/cerebrum/setBoardPosition.ts-      };
src/coach/tools/cerebrum/setBoardPosition.ts-    }
src/coach/tools/cerebrum/setBoardPosition.ts-  },
src/coach/tools/cerebrum/setBoardPosition.ts-};
src/coach/tools/cerebrum/resetBoard.ts-import type { Tool } from '../../types';
src/coach/tools/cerebrum/resetBoard.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/resetBoard.ts-
src/coach/tools/cerebrum/resetBoard.ts:export const resetBoardTool: Tool = {
src/coach/tools/cerebrum/resetBoard.ts-  name: 'reset_board',
src/coach/tools/cerebrum/resetBoard.ts-  category: 'cerebrum',
src/coach/tools/cerebrum/resetBoard.ts-  description:
src/coach/tools/cerebrum/resetBoard.ts-    "Reset the board to the starting position and start a fresh game. REQUIRED whenever you say you'll start over, reset, or play a fresh game; words without action are failure.",
src/coach/tools/cerebrum/resetBoard.ts-  parameters: { type: 'object', properties: {}, required: [] },
src/coach/tools/cerebrum/resetBoard.ts-  async execute(_args, ctx) {
src/coach/tools/cerebrum/resetBoard.ts-    // WO-FOUNDATION-02 trace harness.
src/coach/tools/cerebrum/resetBoard.ts-     
src/coach/tools/cerebrum/resetBoard.ts:    console.log('[TRACE-11c]', ctx?.traceId, 'resetBoardTool entered, hasCallback:', typeof ctx?.onResetBoard);
src/coach/tools/cerebrum/resetBoard.ts-    void logAppAudit({
src/coach/tools/cerebrum/resetBoard.ts-      kind: 'trace-tool-entered',
src/coach/tools/cerebrum/resetBoard.ts-      category: 'subsystem',
src/coach/tools/cerebrum/resetBoard.ts:      source: 'resetBoardTool',
src/coach/tools/cerebrum/resetBoard.ts-      summary: `hasCallback=${typeof ctx?.onResetBoard === 'function'} traceId=${ctx?.traceId ?? 'none'}`,
src/coach/tools/cerebrum/resetBoard.ts-    });
src/coach/tools/cerebrum/resetBoard.ts-
src/coach/tools/cerebrum/resetBoard.ts-    if (!ctx?.onResetBoard) {
src/coach/tools/cerebrum/resetBoard.ts-      return { ok: false, error: 'no onResetBoard callback wired' };
src/coach/tools/cerebrum/resetBoard.ts-    }
src/coach/tools/cerebrum/resetBoard.ts-    try {
src/coach/tools/cerebrum/resetBoard.ts-      const result = await Promise.resolve(ctx.onResetBoard());
src/coach/tools/cerebrum/resetBoard.ts-      const ok = typeof result === 'boolean' ? result : result.ok;
src/coach/tools/cerebrum/resetBoard.ts-      void logAppAudit({
src/coach/tools/cerebrum/resetBoard.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/resetBoard.ts-        category: 'subsystem',
src/coach/tools/cerebrum/resetBoard.ts:        source: 'resetBoardTool',
src/coach/tools/cerebrum/resetBoard.ts-        summary: `reset_board ${ok ? 'ok' : 'rejected'}`,
src/coach/tools/cerebrum/resetBoard.ts-        fen: ctx.liveFen,
src/coach/tools/cerebrum/resetBoard.ts-      });
src/coach/tools/cerebrum/resetBoard.ts-      return ok
src/coach/tools/cerebrum/resetBoard.ts-        ? { ok: true, result: { reset: true } }
src/coach/tools/cerebrum/resetBoard.ts-        : { ok: false, error: 'surface rejected reset' };
src/coach/tools/cerebrum/resetBoard.ts-    } catch (err) {
src/coach/tools/cerebrum/resetBoard.ts-      return {
src/coach/tools/cerebrum/resetBoard.ts-        ok: false,
src/coach/tools/cerebrum/resetBoard.ts-        error: `onResetBoard threw: ${err instanceof Error ? err.message : String(err)}`,
src/coach/tools/cerebrum/resetBoard.ts-      };
src/coach/tools/cerebrum/resetBoard.ts-    }
src/coach/tools/cerebrum/resetBoard.ts-  },
src/coach/tools/cerebrum/resetBoard.ts-};
src/coach/tools/cerebrum/navigateToRoute.ts-import { findRoute } from '../../sources/routesManifest';
src/coach/tools/cerebrum/navigateToRoute.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/navigateToRoute.ts-
src/coach/tools/cerebrum/navigateToRoute.ts:export const navigateToRouteTool: Tool = {
src/coach/tools/cerebrum/navigateToRoute.ts-  name: 'navigate_to_route',
src/coach/tools/cerebrum/navigateToRoute.ts-  category: 'cerebrum',
src/coach/tools/cerebrum/navigateToRoute.ts-  description:
src/coach/tools/cerebrum/navigateToRoute.ts-    'Navigate the user to a route in the app. Pass the exact path from the [App map] block. Returns success with the resolved path.',
src/coach/tools/cerebrum/navigateToRoute.ts-  parameters: {
src/coach/tools/cerebrum/navigateToRoute.ts-    type: 'object',
src/coach/tools/cerebrum/navigateToRoute.ts-    properties: {
src/coach/tools/cerebrum/navigateToRoute.ts-      path: {
src/coach/tools/cerebrum/navigateToRoute.ts-        type: 'string',
src/coach/tools/cerebrum/navigateToRoute.ts-        description: 'Route path (e.g. "/openings", "/coach/play").',
src/coach/tools/cerebrum/navigateToRoute.ts-      },
src/coach/tools/cerebrum/navigateToRoute.ts-    },
src/coach/tools/cerebrum/navigateToRoute.ts-    required: ['path'],
src/coach/tools/cerebrum/navigateToRoute.ts-  },
src/coach/tools/cerebrum/navigateToRoute.ts-  // eslint-disable-next-line @typescript-eslint/require-await
src/coach/tools/cerebrum/navigateToRoute.ts-  async execute(args, ctx) {
src/coach/tools/cerebrum/navigateToRoute.ts-    const path = typeof args.path === 'string' ? args.path : '';
src/coach/tools/cerebrum/navigateToRoute.ts-    if (!path) return { ok: false, error: 'path is required' };
src/coach/tools/cerebrum/navigateToRoute.ts-    // Strict resolution: exact path OR any param-pattern match (treat
src/coach/tools/cerebrum/navigateToRoute.ts-    // `/openings/:id` as matching `/openings/caro-kann`).
src/coach/tools/cerebrum/navigateToRoute.ts-    const match = findRoute((r) => {
src/coach/tools/cerebrum/navigateToRoute.ts-      if (r.path === path) return true;
src/coach/tools/cerebrum/navigateToRoute.ts-      const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
src/coach/tools/cerebrum/navigateToRoute.ts-      return new RegExp(`^${pattern}$`).test(path);
src/coach/tools/cerebrum/navigateToRoute.ts-    });
src/coach/tools/cerebrum/navigateToRoute.ts-    if (!match) {
src/coach/tools/cerebrum/navigateToRoute.ts-      return {
src/coach/tools/cerebrum/navigateToRoute.ts-        ok: false,
src/coach/tools/cerebrum/navigateToRoute.ts-        error: `path "${path}" not found in app manifest. Use a path from the [App map] block.`,
src/coach/tools/cerebrum/navigateToRoute.ts-      };
--
src/coach/tools/cerebrum/navigateToRoute.ts-        void logAppAudit({
src/coach/tools/cerebrum/navigateToRoute.ts-          kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/navigateToRoute.ts-          category: 'subsystem',
src/coach/tools/cerebrum/navigateToRoute.ts:          source: 'navigateToRouteTool',
src/coach/tools/cerebrum/navigateToRoute.ts-          summary: `navigate to ${path}`,
src/coach/tools/cerebrum/navigateToRoute.ts-          details: `resolvedTo=${match.path} title=${match.title}`,
src/coach/tools/cerebrum/navigateToRoute.ts-        });
src/coach/tools/cerebrum/navigateToRoute.ts-        return {
src/coach/tools/cerebrum/navigateToRoute.ts-          ok: true,
src/coach/tools/cerebrum/navigateToRoute.ts-          result: { path, resolvedTo: match.path, title: match.title },
src/coach/tools/cerebrum/navigateToRoute.ts-        };
src/coach/tools/cerebrum/navigateToRoute.ts-      } catch (err) {
src/coach/tools/cerebrum/navigateToRoute.ts-        const message = err instanceof Error ? err.message : String(err);
src/coach/tools/cerebrum/navigateToRoute.ts-        return { ok: false, error: `onNavigate threw: ${message}` };
src/coach/tools/cerebrum/navigateToRoute.ts-      }
src/coach/tools/cerebrum/navigateToRoute.ts-    }
src/coach/tools/cerebrum/navigateToRoute.ts-
src/coach/tools/cerebrum/navigateToRoute.ts-    // No callback — fall back to stub behavior so calls from
src/coach/tools/cerebrum/navigateToRoute.ts-    // unmigrated surfaces don't fail outright.
src/coach/tools/cerebrum/navigateToRoute.ts-    void logAppAudit({
src/coach/tools/cerebrum/navigateToRoute.ts-      kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/navigateToRoute.ts-      category: 'subsystem',
src/coach/tools/cerebrum/navigateToRoute.ts:      source: 'navigateToRouteTool',
src/coach/tools/cerebrum/navigateToRoute.ts-      summary: `STUB navigate to ${path} (no onNavigate callback)`,
src/coach/tools/cerebrum/navigateToRoute.ts-    });
src/coach/tools/cerebrum/navigateToRoute.ts-    return {
src/coach/tools/cerebrum/navigateToRoute.ts-      ok: true,
src/coach/tools/cerebrum/navigateToRoute.ts-      result: { path, resolvedTo: match.path, title: match.title, stub: true },
src/coach/tools/cerebrum/navigateToRoute.ts-    };
src/coach/tools/cerebrum/navigateToRoute.ts-  },
src/coach/tools/cerebrum/navigateToRoute.ts-};
src/coach/tools/cerebrum/playMove.ts-import type { Tool } from '../../types';
src/coach/tools/cerebrum/playMove.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts:export const playMoveTool: Tool = {
src/coach/tools/cerebrum/playMove.ts-  name: 'play_move',
src/coach/tools/cerebrum/playMove.ts-  category: 'cerebrum',
src/coach/tools/cerebrum/playMove.ts-  description:
src/coach/tools/cerebrum/playMove.ts-    "Make a move in the live game on the coach's behalf. Pass SAN; the move is validated against the current FEN before being played. Returns { ok, played, reason? } so you can react to a rejected move on the next turn.",
src/coach/tools/cerebrum/playMove.ts-  parameters: {
src/coach/tools/cerebrum/playMove.ts-    type: 'object',
src/coach/tools/cerebrum/playMove.ts-    properties: {
src/coach/tools/cerebrum/playMove.ts-      san: { type: 'string', description: 'Move in SAN, e.g. "Nf3" or "exd5".' },
src/coach/tools/cerebrum/playMove.ts-    },
src/coach/tools/cerebrum/playMove.ts-    required: ['san'],
src/coach/tools/cerebrum/playMove.ts-  },
src/coach/tools/cerebrum/playMove.ts-  async execute(args, ctx) {
src/coach/tools/cerebrum/playMove.ts-    // WO-FOUNDATION-02 trace harness.
src/coach/tools/cerebrum/playMove.ts-     
src/coach/tools/cerebrum/playMove.ts:    console.log('[TRACE-11a]', ctx?.traceId, 'playMoveTool entered, san:', args.san, 'hasCallback:', typeof ctx?.onPlayMove);
src/coach/tools/cerebrum/playMove.ts-    void logAppAudit({
src/coach/tools/cerebrum/playMove.ts-      kind: 'trace-tool-entered',
src/coach/tools/cerebrum/playMove.ts-      category: 'subsystem',
src/coach/tools/cerebrum/playMove.ts:      source: 'playMoveTool',
src/coach/tools/cerebrum/playMove.ts-      summary: `san=${typeof args.san === 'string' ? args.san : 'undef'} hasCallback=${typeof ctx?.onPlayMove === 'function'} traceId=${ctx?.traceId ?? 'none'}`,
src/coach/tools/cerebrum/playMove.ts-    });
src/coach/tools/cerebrum/playMove.ts-    void logAppAudit({
src/coach/tools/cerebrum/playMove.ts-      kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/playMove.ts-      category: 'subsystem',
src/coach/tools/cerebrum/playMove.ts:      source: 'playMoveTool.execute',
src/coach/tools/cerebrum/playMove.ts-      summary: `entered: san=${typeof args.san === 'string' ? args.san : 'undef'} hasCallback=${typeof ctx?.onPlayMove === 'function'}`,
src/coach/tools/cerebrum/playMove.ts-    });
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts-    const san = typeof args.san === 'string' ? args.san.trim() : '';
src/coach/tools/cerebrum/playMove.ts-    if (!san) return { ok: false, error: 'san is required' };
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts-    if (!ctx?.onPlayMove) {
src/coach/tools/cerebrum/playMove.ts-      void logAppAudit({
src/coach/tools/cerebrum/playMove.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/playMove.ts-        category: 'subsystem',
src/coach/tools/cerebrum/playMove.ts:        source: 'playMoveTool',
src/coach/tools/cerebrum/playMove.ts-        summary: `play_move ${san} — no onPlayMove callback`,
src/coach/tools/cerebrum/playMove.ts-        details:
src/coach/tools/cerebrum/playMove.ts-          'The calling surface did not pass an onPlayMove callback to coachService.ask, so the move cannot be played.',
src/coach/tools/cerebrum/playMove.ts-      });
src/coach/tools/cerebrum/playMove.ts-      return {
src/coach/tools/cerebrum/playMove.ts-        ok: false,
src/coach/tools/cerebrum/playMove.ts-        error:
src/coach/tools/cerebrum/playMove.ts-          'no onPlayMove callback wired — calling surface must pass one in coachService.ask options',
src/coach/tools/cerebrum/playMove.ts-      };
src/coach/tools/cerebrum/playMove.ts-    }
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts-    // Validate SAN against the live FEN before invoking the surface
src/coach/tools/cerebrum/playMove.ts-    // callback. If the FEN is missing (rare; surfaces that emit
src/coach/tools/cerebrum/playMove.ts-    // play_move should always pass it), skip the check and let the
src/coach/tools/cerebrum/playMove.ts-    // surface validate. chess.js throws on illegal SAN.
src/coach/tools/cerebrum/playMove.ts-    if (ctx.liveFen) {
src/coach/tools/cerebrum/playMove.ts-      try {
src/coach/tools/cerebrum/playMove.ts-        const chess = new Chess(ctx.liveFen);
src/coach/tools/cerebrum/playMove.ts-        // chess.js throws on illegal SAN; the catch below converts the
src/coach/tools/cerebrum/playMove.ts-        // throw into a tool error.
src/coach/tools/cerebrum/playMove.ts-        chess.move(san);
src/coach/tools/cerebrum/playMove.ts-      } catch (err) {
src/coach/tools/cerebrum/playMove.ts-        const message = err instanceof Error ? err.message : String(err);
src/coach/tools/cerebrum/playMove.ts-        return {
src/coach/tools/cerebrum/playMove.ts-          ok: false,
src/coach/tools/cerebrum/playMove.ts-          error: `chess.js rejected "${san}" from FEN ${ctx.liveFen}: ${message}`,
src/coach/tools/cerebrum/playMove.ts-        };
src/coach/tools/cerebrum/playMove.ts-      }
src/coach/tools/cerebrum/playMove.ts-    }
src/coach/tools/cerebrum/playMove.ts-
--
src/coach/tools/cerebrum/playMove.ts-      void logAppAudit({
src/coach/tools/cerebrum/playMove.ts-        kind: 'coach-brain-tool-called',
src/coach/tools/cerebrum/playMove.ts-        category: 'subsystem',
src/coach/tools/cerebrum/playMove.ts:        source: 'playMoveTool',
src/coach/tools/cerebrum/playMove.ts-        summary: `play_move ${san} ${ok ? 'ok' : 'rejected'}`,
src/coach/tools/cerebrum/playMove.ts-        details: reason ? `reason=${reason}` : undefined,
src/coach/tools/cerebrum/playMove.ts-        fen: ctx.liveFen,
src/coach/tools/cerebrum/playMove.ts-      });
src/coach/tools/cerebrum/playMove.ts-      return ok
src/coach/tools/cerebrum/playMove.ts-        ? { ok: true, result: { san, played: true } }
src/coach/tools/cerebrum/playMove.ts-        : { ok: false, error: reason ?? `surface rejected "${san}"` };
src/coach/tools/cerebrum/playMove.ts-    } catch (err) {
src/coach/tools/cerebrum/playMove.ts-      const message = err instanceof Error ? err.message : String(err);
src/coach/tools/cerebrum/playMove.ts-      return { ok: false, error: `onPlayMove threw: ${message}` };
src/coach/tools/cerebrum/playMove.ts-    }
src/coach/tools/cerebrum/playMove.ts-  },
src/coach/tools/cerebrum/playMove.ts-};
```

## (7) Stockfish tool definition and registration

```
ugrep: warning: src/coach/spine/: No such file or directory
src/coach/tools/cerebellum/stockfishEval.ts-/**
src/coach/tools/cerebellum/stockfishEval.ts: * stockfish_eval — read-only deterministic position eval.
src/coach/tools/cerebellum/stockfishEval.ts- * Wraps `stockfishEngine.queueAnalysis` so it serializes against
src/coach/tools/cerebellum/stockfishEval.ts- * any other engine work (live-play move selection, narration, etc.)
src/coach/tools/cerebellum/stockfishEval.ts- * without cancelling them.
src/coach/tools/cerebellum/stockfishEval.ts- */
src/coach/tools/cerebellum/stockfishEval.ts-import { stockfishEngine } from '../../../services/stockfishEngine';
src/coach/tools/cerebellum/stockfishEval.ts-import type { Tool } from '../../types';
src/coach/tools/cerebellum/stockfishEval.ts-
src/coach/tools/cerebellum/stockfishEval.ts:export const stockfishEvalTool: Tool = {
src/coach/tools/cerebellum/stockfishEval.ts:  name: 'stockfish_eval',
src/coach/tools/cerebellum/stockfishEval.ts-  category: 'cerebellum',
src/coach/tools/cerebellum/stockfishEval.ts-  description: 'Run Stockfish on a FEN at a chosen depth. Returns centipawn eval, best move, and the top principal variation. Read-only — does not change the game state.',
src/coach/tools/cerebellum/stockfishEval.ts-  parameters: {
src/coach/tools/cerebellum/stockfishEval.ts-    type: 'object',
src/coach/tools/cerebellum/stockfishEval.ts-    properties: {
src/coach/tools/cerebellum/stockfishEval.ts-      fen: { type: 'string', description: 'Position FEN to analyze.' },
src/coach/tools/cerebellum/stockfishEval.ts-      depth: { type: 'number', description: 'Search depth (default 12). Use 16+ for serious analysis, 10 for fast checks.' },
src/coach/tools/cerebellum/stockfishEval.ts-    },
src/coach/tools/cerebellum/stockfishEval.ts-    required: ['fen'],
src/coach/tools/cerebellum/stockfishEval.ts-  },
src/coach/tools/cerebellum/stockfishEval.ts-  async execute(args) {
src/coach/tools/cerebellum/stockfishEval.ts-    const fen = typeof args.fen === 'string' ? args.fen : '';
src/coach/tools/cerebellum/stockfishEval.ts-    const depth = typeof args.depth === 'number' ? args.depth : 12;
src/coach/tools/cerebellum/stockfishEval.ts-    if (!fen.trim()) {
src/coach/tools/cerebellum/stockfishEval.ts-      return { ok: false, error: 'fen is required' };
src/coach/tools/cerebellum/stockfishEval.ts-    }
src/coach/tools/cerebellum/stockfishEval.ts-    try {
src/coach/tools/cerebellum/stockfishEval.ts-      const analysis = await stockfishEngine.queueAnalysis(fen, depth);
src/coach/tools/cerebellum/stockfishEval.ts-      return {
src/coach/tools/cerebellum/stockfishEval.ts-        ok: true,
src/coach/tools/cerebellum/stockfishEval.ts-        result: {
src/coach/tools/cerebellum/stockfishEval.ts-          bestMove: analysis.bestMove,
src/coach/tools/cerebellum/stockfishEval.ts-          evaluation: analysis.evaluation,
src/coach/tools/cerebellum/stockfishEval.ts-          isMate: analysis.isMate,
src/coach/tools/cerebellum/stockfishEval.ts-          mateIn: analysis.mateIn,
src/coach/tools/cerebellum/stockfishEval.ts-          depth: analysis.depth,
src/coach/tools/cerebellum/stockfishEval.ts-          topLines: analysis.topLines.slice(0, 3),
src/coach/tools/cerebellum/stockfishEval.ts-        },
src/coach/tools/cerebellum/stockfishEval.ts-      };
src/coach/tools/cerebellum/stockfishEval.ts-    } catch (err) {
```

## Constitution check

### Q1 — Is the toolbelt assembled in ONE place inside the spine?

**Yes.** Single point of truth.

- `src/coach/tools/registry.ts:39-59` declares the 17-tool array `COACH_TOOLS` (six cerebellum + eleven cerebrum).
- `src/coach/tools/registry.ts:69-71` exposes `getToolDefinitions()`, which strips `category` + `execute` and returns the LLM-facing definitions.
- `src/coach/coachService.ts:174` is the **only** invocation of `getToolDefinitions()` in production code:
  ```ts
  const envelope = assembleEnvelope({
    identity: options.identity,
    toolbelt: getToolDefinitions(),
    input,
  });
  ```
- `src/coach/envelope.ts:46` (`assembleEnvelope`) accepts the toolbelt as an argument and slots it into the envelope unchanged. It does not filter or rewrite.
- No other call site (CoachChatPage, GameChatPanel, CoachGamePage move-selector, useHintSystem) constructs its own toolbelt or filters. They all hit `coachService.ask`, which always assembles the same envelope.

### Q2 — Are cerebellum tools (Stockfish, Lichess, opening book) ALWAYS in the toolbelt regardless of input.surface?

**Yes.** The assembly is unconditional and surface-blind.

- `getToolDefinitions()` (`registry.ts:69-71`) maps over `COACH_TOOLS` with no filter. All six cerebellum tools (`stockfish_eval`, `stockfish_classify_move`, `lichess_opening_lookup`, `lichess_master_games`, `lichess_puzzle_fetch`, `local_opening_book`) are emitted on every call.
- Section (2) above shows the only `input.surface` references in `src/coach/`: they live in audit summaries and are passed to provider envelope formatters as context — never used as a filter on the toolbelt.
- Section (1) above shows the spine never inspects `input.surface` between envelope assembly and provider call. The toolbelt the LLM sees is identical for `'home-chat'`, `'game-chat'`, `'standalone-chat'`, `'smart-search'`, `'move-selector'`, `'hint'`, `'phase-narration'`, `'review'`, `'ping'`.
- The `trace-toolbelt` audit at `coachService.ts:195-200` captures the exact tool-name list per call so this can be verified end-to-end in the audit log.

### Q3 — Do cerebrum tools gracefully no-op when their surface callback is undefined, or do they crash / silently fail / get filtered out of the toolbelt?

**Mixed — none crash, none silently fail, none get filtered, but only one is a true graceful no-op. The other four return a structured tool error.**

| Tool | Behavior when callback missing | Cite |
|---|---|---|
| `play_move` | Returns `{ ok: false, error: 'no onPlayMove callback wired — calling surface must pass one in coachService.ask options' }`. Audits the failure. The LLM gets the error in the next round-trip and can react. | `playMove.ts:49-63` |
| `take_back_move` | Returns `{ ok: false, error: 'no onTakeBackMove callback wired' }`. Same pattern as play_move. | `takeBackMove.ts:47-55` |
| `reset_board` | Returns `{ ok: false, error: 'no onResetBoard callback wired' }`. Same pattern. | `resetBoard.ts:28-30` |
| `set_board_position` | Returns `{ ok: false, error: 'no onSetBoardPosition callback wired' }`. Same pattern. | `setBoardPosition.ts:38-39` |
| `navigate_to_route` | **True graceful no-op**: returns `{ ok: true, result: { path, resolvedTo, title, stub: true } }` and audits as `STUB navigate to <path> (no onNavigate callback)`. The LLM sees ok=true and proceeds. | `navigateToRoute.ts:74-87` |

**Constitution interpretation:** The four board-mutating tools fail "structured" rather than "graceful" — `ok: false` with a human-readable error string. They are NOT filtered out of the toolbelt (Q2 holds), they do NOT crash (every callback access is guarded by `if (!ctx?.callback)`), and they do NOT silently fail (the LLM gets a tool result describing exactly what's missing). But strictly per the constitution wording "gracefully no-op'ing", only `navigate_to_route` follows the pattern; the four board mutators report failure instead.

If the constitution intends "the LLM never sees a hard failure for an absent surface capability", four tools violate it. If it intends "the LLM is told what happened and can react", all five comply.

Recommended follow-up if a graceful-no-op posture is desired: align play_move / take_back_move / reset_board / set_board_position with navigate_to_route's `{ ok: true, result: { stub: true, reason: 'no callback' } }` shape. That would let the LLM treat callback-absent surfaces (e.g. `'ping'`, `'phase-narration'`) as no-op without seeing an error. Out of scope for this diagnostic.

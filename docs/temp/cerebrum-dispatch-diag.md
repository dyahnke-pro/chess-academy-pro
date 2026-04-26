# Cerebrum dispatch diagnostic

Branch: claude/wo-operator-foundation-01 at `4a613f22fcdaca795509d90cdce49c312eb64164`

Goal: prove or disprove whether cerebrum tool callbacks (onPlayMove,
onPlayVariation, onRestartGame) actually reach `ToolExecutionContext`
when the LLM emits play_move / take_back_move / reset_board, and if not,
where in the chain they get dropped.

Six raw greps below + two runtime instrumentation audits added in this
same commit. After deploy, the audit log will show definitively whether
(a) ctx is constructed with the callbacks present, (b) playMoveTool's
execute is even being called, and (c) the surface dispatch reaches the
underlying chess.js machinery.

---

## (1) `grep -B2 -A40 "for.*toolCalls\|lastResponse.toolCalls" src/coach/coachService.ts`

Spine tool dispatch loop. Both cerebrum AND cerebellum tools are dispatched here.

```ts
      : await provider.call(currentEnvelope);

    if (lastResponse.toolCalls.length === 0) {
      // No tools emitted — terminal turn. Exit the loop.
      break;
    }

    // Dispatch tool calls (each gets the surface context).
    const toolResults: { name: string; ok: boolean; result?: unknown; error?: string }[] = [];
    for (const call of lastResponse.toolCalls) {
      const tool = getTool(call.name);
      if (!tool) {
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `unknown tool ${call.name}`,
          details: JSON.stringify({ id: call.id, args: call.args }),
        });
        continue;
      }
      try {
        const result = await tool.execute(call.args, ctx);
        dispatchedIds.push(call.id);
        toolResults.push({
          name: call.name,
          ok: result.ok,
          result: result.result,
          error: result.error,
        });
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} ${result.ok ? 'ok' : 'error'}`,
          details: JSON.stringify({ id: call.id, name: call.name, ok: result.ok, error: result.error }),
        });
      } catch (err) {
        void logAppAudit({
          kind: 'coach-brain-tool-called',
          category: 'subsystem',
          source: 'coachService.ask',
          summary: `${call.name} threw`,
          details: err instanceof Error ? err.message : String(err),
        });
        toolResults.push({
          name: call.name,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
```

---

## (2) `grep -B5 -A30 "executeToolCall\|tool\.execute\b" src/coach -r --include="*.ts"`

Every place tool.execute is invoked across the spine.

```ts
src/coach/coachService.ts-          details: JSON.stringify({ id: call.id, args: call.args }),
src/coach/coachService.ts-        });
src/coach/coachService.ts-        continue;
src/coach/coachService.ts-      }
src/coach/coachService.ts-      try {
src/coach/coachService.ts:        const result = await tool.execute(call.args, ctx);
src/coach/coachService.ts-        dispatchedIds.push(call.id);
src/coach/coachService.ts-        toolResults.push({
src/coach/coachService.ts-          name: call.name,
src/coach/coachService.ts-          ok: result.ok,
src/coach/coachService.ts-          result: result.result,
src/coach/coachService.ts-          error: result.error,
src/coach/coachService.ts-        });
src/coach/coachService.ts-        void logAppAudit({
src/coach/coachService.ts-          kind: 'coach-brain-tool-called',
src/coach/coachService.ts-          category: 'subsystem',
src/coach/coachService.ts-          source: 'coachService.ask',
src/coach/coachService.ts-          summary: `${call.name} ${result.ok ? 'ok' : 'error'}`,
src/coach/coachService.ts-          details: JSON.stringify({ id: call.id, name: call.name, ok: result.ok, error: result.error }),
src/coach/coachService.ts-        });
src/coach/coachService.ts-      } catch (err) {
src/coach/coachService.ts-        void logAppAudit({
src/coach/coachService.ts-          kind: 'coach-brain-tool-called',
src/coach/coachService.ts-          category: 'subsystem',
src/coach/coachService.ts-          source: 'coachService.ask',
src/coach/coachService.ts-          summary: `${call.name} threw`,
src/coach/coachService.ts-          details: err instanceof Error ? err.message : String(err),
src/coach/coachService.ts-        });
src/coach/coachService.ts-        toolResults.push({
src/coach/coachService.ts-          name: call.name,
src/coach/coachService.ts-          ok: false,
src/coach/coachService.ts-          error: err instanceof Error ? err.message : String(err),
src/coach/coachService.ts-        });
src/coach/coachService.ts-      }
src/coach/coachService.ts-    }
src/coach/coachService.ts-
```

---

## (3) `grep -B2 -A10 "onPlayMove" src/components/Coach/CoachGamePage.tsx`

Parent's onPlayMove plumbing — the handleChatPlayMove handler + how it's passed to children.

```tsx
        // brain override) is gone. The brain consults
        // `local_opening_book` and / or `stockfish_eval` itself and
        // emits `play_move`; `onPlayMove` validates the SAN against
        // the live FEN and records the choice in `brainPickSan`. The
        // pre-move Stockfish eval below is purely informational —
        // eval bar, move classification, opponent-threat scan — and
        // does NOT pick the move. If the brain fails to emit
        // `play_move` (network error, parse miss, illegal SAN), the
        // safety fallback is a random legal move so the game never
        // freezes.
        const preAnalysisPromise: Promise<StockfishAnalysis> = stockfishEngine
          .analyzePosition(game.fen, 10)
          .catch(() => ({
--
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
--
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayMove={handleChatPlayMove}
              onTakeBackMove={handleChatTakeBackMove}
              onSetBoardPosition={handleChatSetBoardPosition}
              onResetBoard={handleChatResetBoard}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
              initialPrompt={pendingChatPrompt}
              initialMessages={initialChatMessages ?? undefined}
              onMessagesUpdate={handleChatMessagesUpdate}
              className="h-full"
            />
--
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayMove={handleChatPlayMove}
              onTakeBackMove={handleChatTakeBackMove}
              onSetBoardPosition={handleChatSetBoardPosition}
              onResetBoard={handleChatResetBoard}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
              initialPrompt={pendingChatPrompt}
            />
          </div>
        </div>
      )}
```

---

## (4) `grep -B2 -A20 "<GameChatPanel" src/components/Coach/CoachGamePage.tsx`

Every JSX render of GameChatPanel and which props each site passes.

```tsx

  // Ref to inject messages into GameChatPanel (hints, takeback msgs)
  const gameChatRef = useRef<GameChatPanelHandle>(null);

  const playerRating = activeProfile?.currentRating ?? 1420;

  // Dynamic sessions redirect here with query params set by SmartSearchBar
  // / chat intent routing ("play the Sicilian against me as black hard").
  // Honor those on mount so the student lands in a ready-to-play game
  // with the requested configuration, not the default.
  const difficultyParam = searchParams.get('difficulty');
  const sideParam = searchParams.get('side');
  const subjectParam = searchParams.get('subject');
  // Carried over from the coach-chat "let's play / yes let's do it"
  // affirmation flow. When present, the coach's per-move reactions
  // get prefixed with this agreed training focus so the session
  // doesn't feel like a cold reset from the chat conversation.
  const focusParam = searchParams.get('focus');
  // When the coach describes a position in chat (via the "Play from
  // this position" CTA), or the user asks to play a specific
  // middlegame setup, we seed the game with this FEN instead of the
  // standard start. The book-move auto-play driven by `subject` is
  // suppressed when `fen` is set — we're not starting from move 1.
--

          <MobileChatDrawer isOpen={mobileChatOpen} onClose={() => setMobileChatOpen(false)}>
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              lastMove={game.lastMove && game.history.length > 0 ? { ...game.lastMove, san: game.history[game.history.length - 1] } : undefined}
              history={game.history}
              previousFen={previousFenRef.current}
              onBoardAnnotation={handleBoardAnnotation}
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayMove={handleChatPlayMove}
              onTakeBackMove={handleChatTakeBackMove}
              onSetBoardPosition={handleChatSetBoardPosition}
              onResetBoard={handleChatResetBoard}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
--
            style={{ height: `${chatPercent}%` }}
          >
            <GameChatPanel
              ref={gameChatRef}
              fen={game.fen}
              pgn={game.history.join(' ')}
              moveNumber={moveCountRef.current}
              playerColor={playerColor}
              turn={game.turn}
              isGameOver={game.isGameOver}
              gameResult={gameState.result}
              lastMove={game.lastMove && game.history.length > 0 ? { ...game.lastMove, san: game.history[game.history.length - 1] } : undefined}
              history={game.history}
              previousFen={previousFenRef.current}
              onBoardAnnotation={handleBoardAnnotation}
              onRestartGame={handleRestart}
              onPlayOpening={handleOpeningRequest}
              onPlayMove={handleChatPlayMove}
              onTakeBackMove={handleChatTakeBackMove}
              onSetBoardPosition={handleChatSetBoardPosition}
              onResetBoard={handleChatResetBoard}
              onPlayVariation={handlePlayVariation}
              onReturnToGame={handleReturnToGame}
```

---

## (5) `grep -B2 -A20 "coachService.ask\b" src/components/Coach/GameChatPanel.tsx`

Both branches (in-game + drawer) and what they pass to coachService.ask.

```tsx
      // the surface callback directly. Zero LLM round-trip; zero
      // hallucination risk. Falls through to the existing intercepts
      // (and ultimately coachService.ask) on miss.
      const routedIntent = tryRouteIntent(text, { currentFen: fen });
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
                break;
              }
--
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
--
            fen,
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
--
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
--
          fen: fen || undefined,
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
--
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
```

---

## (6) `grep -B5 -A30 "ToolExecutionContext\b" src/coach/coachService.ts src/coach/types.ts src/coach/tools/cerebrum/playMove.ts`

Every place ctx is constructed AND where playMoveTool reads from it.

```ts
src/coach/coachService.ts- *      runaway loops.
src/coach/coachService.ts- *   6. Returns the cleaned text from the FINAL turn + a list of every
src/coach/coachService.ts- *      tool-call id dispatched across all turns.
src/coach/coachService.ts- *
src/coach/coachService.ts- * Surface-specific callbacks (`onPlayMove`, `onNavigate`) are threaded
src/coach/coachService.ts: * into each tool dispatch via `ToolExecutionContext`. Tools that need
src/coach/coachService.ts- * a real side effect (cerebrum) consume the context; cerebellum tools
src/coach/coachService.ts- * ignore it.
src/coach/coachService.ts- *
src/coach/coachService.ts- * See `docs/COACH-BRAIN-00.md` for the architecture this implements.
src/coach/coachService.ts- */
src/coach/coachService.ts-import { logAppAudit } from '../services/appAuditor';
src/coach/coachService.ts-import { assembleEnvelope } from './envelope';
src/coach/coachService.ts-import { deepseekProvider } from './providers/deepseek';
src/coach/coachService.ts-import { anthropicProvider } from './providers/anthropic';
src/coach/coachService.ts-import { COACH_TOOLS, getTool, getToolDefinitions } from './tools/registry';
src/coach/coachService.ts-import type {
src/coach/coachService.ts-  AssembledEnvelope,
src/coach/coachService.ts-  CoachAnswer,
src/coach/coachService.ts-  CoachAskInput,
src/coach/coachService.ts-  CoachIdentity,
src/coach/coachService.ts-  Provider,
src/coach/coachService.ts-  ProviderName,
src/coach/coachService.ts-  ProviderResponse,
src/coach/coachService.ts:  ToolExecutionContext,
src/coach/coachService.ts-} from './types';
src/coach/coachService.ts-
src/coach/coachService.ts-/** Read provider name from `import.meta.env.COACH_PROVIDER`, falling
src/coach/coachService.ts- *  back to `process.env.COACH_PROVIDER` (Node test envs), default
src/coach/coachService.ts- *  'deepseek'. The constitution requires this be a one-line flip. */
src/coach/coachService.ts-function resolveProviderName(): ProviderName {
src/coach/coachService.ts-  // Vite-style env (browser builds).
src/coach/coachService.ts-  const viteEnv = (typeof import.meta !== 'undefined'
src/coach/coachService.ts-    ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env
src/coach/coachService.ts-    : undefined);
src/coach/coachService.ts-  const fromVite = viteEnv?.VITE_COACH_PROVIDER ?? viteEnv?.COACH_PROVIDER;
src/coach/coachService.ts-  // Node-style env (vitest, scripts).
src/coach/coachService.ts-  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
src/coach/coachService.ts-  const fromProcess = typeof process !== 'undefined' && process.env
src/coach/coachService.ts-    ? process.env.COACH_PROVIDER
src/coach/coachService.ts-    : undefined;
src/coach/coachService.ts-  const raw = (fromVite ?? fromProcess ?? 'deepseek').toLowerCase();
src/coach/coachService.ts-  return raw === 'anthropic' ? 'anthropic' : 'deepseek';
src/coach/coachService.ts-}
src/coach/coachService.ts-
src/coach/coachService.ts-function pickProvider(name: ProviderName): Provider {
src/coach/coachService.ts-  return name === 'anthropic' ? anthropicProvider : deepseekProvider;
src/coach/coachService.ts-}
src/coach/coachService.ts-
src/coach/coachService.ts-export interface CoachServiceOptions {
src/coach/coachService.ts-  /** Override the active provider. Useful for tests. */
src/coach/coachService.ts-  provider?: ProviderName;
src/coach/coachService.ts-  /** Override the coach identity (default: 'danya'). */
src/coach/coachService.ts-  identity?: CoachIdentity;
src/coach/coachService.ts-  /** Inject a custom provider instance (used by tests with a mock). */
--
src/coach/coachService.ts-  maxToolRoundTrips?: number;
src/coach/coachService.ts-  /** Callback the `play_move` cerebrum tool uses to actually play a
src/coach/coachService.ts-   *  move on the calling surface. Returning `{ ok: false, reason }`
src/coach/coachService.ts-   *  surfaces the failure back to the LLM in the next round-trip so it
src/coach/coachService.ts-   *  can choose differently. WO-BRAIN-04. */
src/coach/coachService.ts:  onPlayMove?: ToolExecutionContext['onPlayMove'];
src/coach/coachService.ts-  /** Callback the `take_back_move` cerebrum tool uses to revert the
src/coach/coachService.ts-   *  board by N half-moves. WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/coachService.ts:  onTakeBackMove?: ToolExecutionContext['onTakeBackMove'];
src/coach/coachService.ts-  /** Callback the `set_board_position` cerebrum tool uses to jump the
src/coach/coachService.ts-   *  board to an arbitrary FEN. WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/coachService.ts:  onSetBoardPosition?: ToolExecutionContext['onSetBoardPosition'];
src/coach/coachService.ts-  /** Callback the `reset_board` cerebrum tool uses to restart the game
src/coach/coachService.ts-   *  from the starting position. WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/coachService.ts:  onResetBoard?: ToolExecutionContext['onResetBoard'];
src/coach/coachService.ts-  /** Callback the `navigate_to_route` cerebrum tool uses to actually
src/coach/coachService.ts-   *  push the user-validated route via react-router. WO-BRAIN-04. */
src/coach/coachService.ts:  onNavigate?: ToolExecutionContext['onNavigate'];
src/coach/coachService.ts-}
src/coach/coachService.ts-
src/coach/coachService.ts-/** Format a list of tool results plus the LLM's previous text into a
src/coach/coachService.ts- *  follow-up `ask` body. The follow-up envelope keeps the same
src/coach/coachService.ts- *  identity, memory, app map, live state, and toolbelt — only the
src/coach/coachService.ts- *  ask changes. */
src/coach/coachService.ts-function formatToolResultsAsFollowUpAsk(
src/coach/coachService.ts-  originalAsk: string,
src/coach/coachService.ts-  previousAssistantText: string,
src/coach/coachService.ts-  results: { name: string; ok: boolean; result?: unknown; error?: string }[],
src/coach/coachService.ts-): string {
src/coach/coachService.ts-  const lines: string[] = [
src/coach/coachService.ts-    '[Original ask]',
src/coach/coachService.ts-    originalAsk,
src/coach/coachService.ts-    '',
src/coach/coachService.ts-  ];
src/coach/coachService.ts-  if (previousAssistantText.trim().length > 0) {
src/coach/coachService.ts-    lines.push('[Your previous response]', previousAssistantText, '');
src/coach/coachService.ts-  }
src/coach/coachService.ts-  lines.push('[Tool results from previous turn]');
src/coach/coachService.ts-  for (const r of results) {
src/coach/coachService.ts-    const payload: string[] = [`ok=${r.ok}`];
src/coach/coachService.ts-    if (r.result !== undefined) payload.push(`result=${JSON.stringify(r.result)}`);
src/coach/coachService.ts-    if (r.error) payload.push(`error=${r.error}`);
src/coach/coachService.ts-    lines.push(`- ${r.name}: ${payload.join(' ')}`);
src/coach/coachService.ts-  }
src/coach/coachService.ts-  lines.push(
src/coach/coachService.ts-    '',
src/coach/coachService.ts-    'Use these results to decide. Either call additional tools or give your final answer.',
src/coach/coachService.ts-  );
--
src/coach/coachService.ts-  });
src/coach/coachService.ts-
src/coach/coachService.ts-  const providerName = options.provider ?? resolveProviderName();
src/coach/coachService.ts-  const provider = options.providerOverride ?? pickProvider(providerName);
src/coach/coachService.ts-
src/coach/coachService.ts:  const ctx: ToolExecutionContext = {
src/coach/coachService.ts-    onPlayMove: options.onPlayMove,
src/coach/coachService.ts-    onTakeBackMove: options.onTakeBackMove,
src/coach/coachService.ts-    onSetBoardPosition: options.onSetBoardPosition,
src/coach/coachService.ts-    onResetBoard: options.onResetBoard,
src/coach/coachService.ts-    onNavigate: options.onNavigate,
src/coach/coachService.ts-    liveFen: input.liveState.fen,
src/coach/coachService.ts-  };
src/coach/coachService.ts-
src/coach/coachService.ts-  const maxRoundTrips = Math.max(1, options.maxToolRoundTrips ?? 1);
src/coach/coachService.ts-  const dispatchedIds: string[] = [];
src/coach/coachService.ts-
src/coach/coachService.ts-  let currentEnvelope: AssembledEnvelope = envelope;
src/coach/coachService.ts-  let useStreaming = !!options.onChunk && typeof provider.callStreaming === 'function';
src/coach/coachService.ts-  let lastResponse: ProviderResponse = { text: '', toolCalls: [] };
src/coach/coachService.ts-
src/coach/coachService.ts-  for (let trip = 1; trip <= maxRoundTrips; trip++) {
src/coach/coachService.ts-    void logAppAudit({
src/coach/coachService.ts-      kind: 'coach-brain-provider-called',
src/coach/coachService.ts-      category: 'subsystem',
src/coach/coachService.ts-      source: 'coachService.ask',
src/coach/coachService.ts-      summary: `provider=${provider.name} streaming=${useStreaming} trip=${trip}/${maxRoundTrips}`,
src/coach/coachService.ts-    });
src/coach/coachService.ts-
src/coach/coachService.ts-    lastResponse = useStreaming && options.onChunk && provider.callStreaming
src/coach/coachService.ts-      ? await provider.callStreaming(currentEnvelope, options.onChunk)
src/coach/coachService.ts-      : await provider.call(currentEnvelope);
src/coach/coachService.ts-
src/coach/coachService.ts-    if (lastResponse.toolCalls.length === 0) {
src/coach/coachService.ts-      // No tools emitted — terminal turn. Exit the loop.
src/coach/coachService.ts-      break;
src/coach/types.ts-
src/coach/types.ts-/** Surface-supplied callbacks + context the spine threads into every
src/coach/types.ts- *  tool dispatch. Cerebrum tools use these to invoke real side
src/coach/types.ts- *  effects (play a move, navigate the router) on behalf of the calling
src/coach/types.ts- *  surface. Cerebellum tools ignore the context. WO-BRAIN-04. */
src/coach/types.ts:export interface ToolExecutionContext {
src/coach/types.ts-  /** Called by `play_move` to actually play the chosen SAN. The
src/coach/types.ts-   *  callback returns `{ ok, reason? }` to tell the brain whether the
src/coach/types.ts-   *  move landed (e.g. legal) so the LLM can react in a follow-up
src/coach/types.ts-   *  round-trip. Boolean returns are also accepted. */
src/coach/types.ts-  onPlayMove?: (
src/coach/types.ts-    san: string,
src/coach/types.ts-  ) =>
src/coach/types.ts-    | Promise<{ ok: boolean; reason?: string } | boolean>
src/coach/types.ts-    | { ok: boolean; reason?: string }
src/coach/types.ts-    | boolean;
src/coach/types.ts-  /** Called by `take_back_move` to revert the board by N half-moves.
src/coach/types.ts-   *  WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/types.ts-  onTakeBackMove?: (
src/coach/types.ts-    count: number,
src/coach/types.ts-  ) =>
src/coach/types.ts-    | Promise<{ ok: boolean; reason?: string } | boolean>
src/coach/types.ts-    | { ok: boolean; reason?: string }
src/coach/types.ts-    | boolean;
src/coach/types.ts-  /** Called by `set_board_position` to jump the board to an arbitrary
src/coach/types.ts-   *  FEN. WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/types.ts-  onSetBoardPosition?: (
src/coach/types.ts-    fen: string,
src/coach/types.ts-  ) =>
src/coach/types.ts-    | Promise<{ ok: boolean; reason?: string } | boolean>
src/coach/types.ts-    | { ok: boolean; reason?: string }
src/coach/types.ts-    | boolean;
src/coach/types.ts-  /** Called by `reset_board` to restart the game from the starting
src/coach/types.ts-   *  position. WO-COACH-OPERATOR-FOUNDATION-01. */
src/coach/types.ts-  onResetBoard?: ()
src/coach/types.ts-    => Promise<{ ok: boolean; reason?: string } | boolean>
--
src/coach/types.ts-
src/coach/types.ts-export interface Tool extends ToolDefinition {
src/coach/types.ts-  category: ToolCategory;
src/coach/types.ts-  execute: (
src/coach/types.ts-    args: Record<string, unknown>,
src/coach/types.ts:    ctx?: ToolExecutionContext,
src/coach/types.ts-  ) => Promise<ToolExecutionResult>;
src/coach/types.ts-}
src/coach/types.ts-
src/coach/types.ts-export interface ToolExecutionResult {
src/coach/types.ts-  ok: boolean;
src/coach/types.ts-  /** Free-form payload returned to the LLM as the tool result. */
src/coach/types.ts-  result?: unknown;
src/coach/types.ts-  error?: string;
src/coach/types.ts-}
src/coach/types.ts-
src/coach/types.ts-// ─── Provider abstraction ───────────────────────────────────────────────────
src/coach/types.ts-
src/coach/types.ts-export type ProviderName = 'deepseek' | 'anthropic' | 'router-direct';
src/coach/types.ts-
src/coach/types.ts-export interface ProviderToolCall {
src/coach/types.ts-  id: string;
src/coach/types.ts-  name: string;
src/coach/types.ts-  args: Record<string, unknown>;
src/coach/types.ts-}
src/coach/types.ts-
src/coach/types.ts-export interface ProviderResponse {
src/coach/types.ts-  text: string;
src/coach/types.ts-  toolCalls: ProviderToolCall[];
src/coach/types.ts-  /** Provider-specific metadata for debugging. */
src/coach/types.ts-  raw?: unknown;
src/coach/types.ts-}
src/coach/types.ts-
src/coach/types.ts-export interface Provider {
src/coach/types.ts-  name: ProviderName;
src/coach/types.ts-  call(envelope: AssembledEnvelope): Promise<ProviderResponse>;
src/coach/tools/cerebrum/playMove.ts-/**
src/coach/tools/cerebrum/playMove.ts- * play_move — REAL (WO-BRAIN-04). Validates the requested SAN against
src/coach/tools/cerebrum/playMove.ts: * the live FEN (passed in via `ToolExecutionContext.liveFen`) and
src/coach/tools/cerebrum/playMove.ts- * invokes the surface-supplied `onPlayMove` callback to actually play
src/coach/tools/cerebrum/playMove.ts- * the move. The callback's return value (`{ ok, reason }` or boolean)
src/coach/tools/cerebrum/playMove.ts- * is surfaced back to the LLM in the next round-trip so it can react
src/coach/tools/cerebrum/playMove.ts- * to a rejected move.
src/coach/tools/cerebrum/playMove.ts- *
src/coach/tools/cerebrum/playMove.ts- * If no `onPlayMove` callback is wired (the surface didn't pass one to
src/coach/tools/cerebrum/playMove.ts- * `coachService.ask`), the tool returns an error. Tools never silently
src/coach/tools/cerebrum/playMove.ts- * succeed — the LLM should know its move didn't land.
src/coach/tools/cerebrum/playMove.ts- */
src/coach/tools/cerebrum/playMove.ts-import { Chess } from 'chess.js';
src/coach/tools/cerebrum/playMove.ts-import type { Tool } from '../../types';
src/coach/tools/cerebrum/playMove.ts-import { logAppAudit } from '../../../services/appAuditor';
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts-export const playMoveTool: Tool = {
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
src/coach/tools/cerebrum/playMove.ts-    const san = typeof args.san === 'string' ? args.san.trim() : '';
src/coach/tools/cerebrum/playMove.ts-    if (!san) return { ok: false, error: 'san is required' };
src/coach/tools/cerebrum/playMove.ts-
src/coach/tools/cerebrum/playMove.ts-    if (!ctx?.onPlayMove) {
```

---

## Runtime instrumentation adds (this same commit)

Two audit-log lines added so the next audit-pull definitively shows the ctx state and whether playMoveTool.execute fires:

1. `coachService.ts` — right after `const ctx: ToolExecutionContext = { ... }` construction, log the typeof of each callback so we can see whether the surface plumbing reached the spine.
2. `playMove.ts` — first line of `execute`, log entry with `san` arg + `hasCallback` boolean.

Both fire on the LLM-emitted-tool path. If the LLM emits play_move and the audit shows `onPlayMove=function` at ctx-build time AND `hasCallback=true` at tool entry, the chain is intact and the bug is downstream of the tool callback. If either is `undefined` / `false`, that pinpoints where the callback drops.

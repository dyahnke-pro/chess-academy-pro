# play_move wiring diagnostic — 5 raw command outputs

Working tree: main at e6184666aa4eb9964466edb5d9fc62a079c828fe

---

## 1. `grep -B2 -A20 "surface: 'move-selector'" src/components/Coach/CoachGamePage.tsx`

```tsx
          : `It is your turn (${aiColor}). The student is rated about ${targetStrength}. Use stockfish_eval if you want depth, then pick a move calibrated to the student's rating and play it via play_move.`;
        const moveSelectorLiveState: LiveState = {
          surface: 'move-selector',
          fen: game.fen,
          moveHistory: game.history,
          currentRoute: '/coach/play',
          userJustDid: 'pondering coach move',
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'CoachGamePage.makeCoachMove',
          summary: `surface=move-selector viaSpine=true intent=${intendedOpeningName ?? 'none'}`,
          details: JSON.stringify({
            surface: 'move-selector',
            viaSpine: true,
            intendedOpening: intendedOpeningName,
            plyCount: game.history.length,
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
```

---

## 2. `grep -B2 -A8 "surface: 'game-chat'" src/components/Coach/GameChatPanel.tsx`

```tsx
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
--
            summary: 'surface=game-chat viaSpine=true',
            details: JSON.stringify({
              surface: 'game-chat',
              viaSpine: true,
              timestamp: Date.now(),
              fenIfPresent: fen,
            }),
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
```

---

## 3. `grep -n "onPlayMove\|play_move\|playMoveTool" src/components/Coach/CoachGamePage.tsx src/components/Coach/GameChatPanel.tsx`

```
src/components/Coach/CoachGamePage.tsx:1496:        // emits `play_move`; `onPlayMove` validates the SAN against
src/components/Coach/CoachGamePage.tsx:1501:        // `play_move` (network error, parse miss, illegal SAN), the
src/components/Coach/CoachGamePage.tsx:1519:          ? `It is your turn (${aiColor}). The student is rated about ${targetStrength} and has committed to ${intendedOpeningName}. Consult local_opening_book first; if we are still in book, play that move via play_move. If we are out of book, use stockfish_eval and pick a move calibrated to the student's rating, then play it via play_move.`
src/components/Coach/CoachGamePage.tsx:1520:          : `It is your turn (${aiColor}). The student is rated about ${targetStrength}. Use stockfish_eval if you want depth, then pick a move calibrated to the student's rating and play it via play_move.`;
src/components/Coach/CoachGamePage.tsx:1551:              onPlayMove: (san: string) => {
src/components/Coach/CoachGamePage.tsx:1552:                // Validate against the live FEN. The play_move tool
src/components/Coach/CoachGamePage.tsx:1577:        // emitted no play_move (or an illegal one), fall back to a
src/components/Coach/CoachGamePage.tsx:1594:            '[CoachGame] Brain emitted no usable play_move; falling back to random legal move',
```

---

## 4. `cat src/coach/tools/cerebrum/playMove.ts`

```ts
/**
 * play_move — REAL (WO-BRAIN-04). Validates the requested SAN against
 * the live FEN (passed in via `ToolExecutionContext.liveFen`) and
 * invokes the surface-supplied `onPlayMove` callback to actually play
 * the move. The callback's return value (`{ ok, reason }` or boolean)
 * is surfaced back to the LLM in the next round-trip so it can react
 * to a rejected move.
 *
 * If no `onPlayMove` callback is wired (the surface didn't pass one to
 * `coachService.ask`), the tool returns an error. Tools never silently
 * succeed — the LLM should know its move didn't land.
 */
import { Chess } from 'chess.js';
import type { Tool } from '../../types';
import { logAppAudit } from '../../../services/appAuditor';

export const playMoveTool: Tool = {
  name: 'play_move',
  category: 'cerebrum',
  description:
    "Make a move in the live game on the coach's behalf. Pass SAN; the move is validated against the current FEN before being played. Returns { ok, played, reason? } so you can react to a rejected move on the next turn.",
  parameters: {
    type: 'object',
    properties: {
      san: { type: 'string', description: 'Move in SAN, e.g. "Nf3" or "exd5".' },
    },
    required: ['san'],
  },
  async execute(args, ctx) {
    const san = typeof args.san === 'string' ? args.san.trim() : '';
    if (!san) return { ok: false, error: 'san is required' };

    if (!ctx?.onPlayMove) {
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'playMoveTool',
        summary: `play_move ${san} — no onPlayMove callback`,
        details:
          'The calling surface did not pass an onPlayMove callback to coachService.ask, so the move cannot be played.',
      });
      return {
        ok: false,
        error:
          'no onPlayMove callback wired — calling surface must pass one in coachService.ask options',
      };
    }

    // Validate SAN against the live FEN before invoking the surface
    // callback. If the FEN is missing (rare; surfaces that emit
    // play_move should always pass it), skip the check and let the
    // surface validate. chess.js throws on illegal SAN.
    if (ctx.liveFen) {
      try {
        const chess = new Chess(ctx.liveFen);
        // chess.js throws on illegal SAN; the catch below converts the
        // throw into a tool error.
        chess.move(san);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `chess.js rejected "${san}" from FEN ${ctx.liveFen}: ${message}`,
        };
      }
    }

    // Invoke the surface callback. Accept `boolean` or
    // `{ ok, reason }` shapes. Any thrown error becomes a tool error.
    try {
      const callbackResult = await Promise.resolve(ctx.onPlayMove(san));
      const ok =
        typeof callbackResult === 'boolean'
          ? callbackResult
          : callbackResult.ok;
      const reason =
        typeof callbackResult === 'object' && 'reason' in callbackResult
          ? callbackResult.reason
          : undefined;
      void logAppAudit({
        kind: 'coach-brain-tool-called',
        category: 'subsystem',
        source: 'playMoveTool',
        summary: `play_move ${san} ${ok ? 'ok' : 'rejected'}`,
        details: reason ? `reason=${reason}` : undefined,
        fen: ctx.liveFen,
      });
      return ok
        ? { ok: true, result: { san, played: true } }
        : { ok: false, error: reason ?? `surface rejected "${san}"` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `onPlayMove threw: ${message}` };
    }
  },
};
```

---

## 5. `grep -B2 -A8 "play_move\|playMove" src/coach/sources/identity.ts`

```ts
- You play to teach, not to win. Calibrate to the student's rating. Sometimes the right move for this student isn't the engine's top choice.
- During the opening, when the student has committed to a line, consult \`local_opening_book\` first — it is zero-latency and matches the line they're trying to learn. Reach for \`stockfish_eval\` once you're out of book or the position is sharp.
- When you decide on a move, play it via \`play_move\`. Don't describe what you're going to do; do it.`;

const KASPAROV_IDENTITY = DANYA_IDENTITY; // future personality pack
const FISCHER_IDENTITY = DANYA_IDENTITY;  // future personality pack

/** Load the identity prompt for the requested coach personality.
 *  Defaults to Danya. Returns a string ready to inject into the
 *  envelope's "Identity" slot — no further formatting needed. */
export function loadIdentityPrompt(identity: CoachIdentity = 'danya'): string {
```

---

## Bonus context — GameChatPanel.tsx lines 300-410 (the in-game ask call site, with line numbers, for str_replace blocks)

```tsx
 300:           console.warn('[GameChatPanel] intent routing failed:', err);
 301:         }
 302:       }
 303: 
 304:       // ── WO-BRAIN-02 — IN-GAME BRANCH ROUTES THROUGH coachService ─────
 305:       // Mid-game chat goes through the unified Coach Brain spine. The
 306:       // envelope assembled in coachService.ask carries the four sources
 307:       // of truth (identity, memory, app map, live state) plus the full
 308:       // toolbelt — so memory + manifest awareness arrive on every call.
 309:       // The drawer/post-game branch below still uses runAgentTurn until
 310:       // BRAIN-03 collapses it the same way.
 311:       if (!isGameOver) {
 312:         onBoardAnnotation?.([{ type: 'clear' }]);
 313:         setIsStreaming(true);
 314:         setStreamingContent('');
 315:         speechBufferRef.current = '';
 316:         let fullResponse = '';
 317:         try {
 318:           const liveState: LiveState = {
 319:             surface: 'game-chat',
 320:             fen,
 321:             moveHistory: history,
 322:             userJustDid: text,
 323:             currentRoute: '/coach/play',
 324:           };
 325:           void logAppAudit({
 326:             kind: 'coach-surface-migrated',
 327:             category: 'subsystem',
 328:             source: 'GameChatPanel.handleSend',
 329:             summary: 'surface=game-chat viaSpine=true',
 330:             details: JSON.stringify({
 331:               surface: 'game-chat',
 332:               viaSpine: true,
 333:               timestamp: Date.now(),
 334:               fenIfPresent: fen,
 335:             }),
 336:             fen,
 337:           });
 338:           const answer = await coachService.ask(
 339:             { surface: 'game-chat', ask: text, liveState },
 340:             {
 341:               onChunk: (chunk: string) => {
 342:                 fullResponse += chunk;
 343:                 const displayText = fullResponse
 344:                   .replace(BOARD_TAG_STRIP_RE, '')
 345:                   .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
 346:                   .trim();
 347:                 setStreamingContent(displayText);
 348:                 if (useAppStore.getState().coachVoiceOn) {
 349:                   speechBufferRef.current += chunk;
 350:                   const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
 351:                   if (sentenceEnd) {
 352:                     const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
 353:                     speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
 354:                     void voiceService.speak(sentence.trim());
 355:                   }
 356:                 }
 357:               },
 358:               onNavigate: (path: string) => {
 359:                 void navigate(path);
 360:               },
 361:             },
 362:           );
 363:           if (speechBufferRef.current.trim()) {
 364:             flushSpeechBuffer();
 365:           }
 366:           // The spine already strips [[ACTION:]] tags via parseActions;
 367:           // [BOARD:] tags are surface-local so we still parse them here.
 368:           const { cleanText: textWithoutBoardTags, commands: annotations } =
 369:             parseBoardTags(answer.text);
 370:           const hasExplicitArrows = annotations.some(
 371:             (c) => c.type === 'arrow' && (c.arrows?.length ?? 0) > 0,
 372:           );
 373:           if (!hasExplicitArrows) {
 374:             const autoArrows = extractMoveArrows(textWithoutBoardTags, { fen });
 375:             if (autoArrows.length > 0) {
 376:               annotations.push({ type: 'arrow', arrows: autoArrows });
 377:             }
 378:           }
 379:           const assistantMsg: ChatMessageType = {
 380:             id: `gmsg-${Date.now()}-resp`,
 381:             role: 'assistant',
 382:             content: textWithoutBoardTags,
 383:             timestamp: Date.now(),
 384:             metadata: {
 385:               annotations: annotations.length > 0 ? annotations : undefined,
 386:             },
 387:           };
 388:           setMessages((prev) => [...prev, assistantMsg]);
 389:           // WO-BRAIN-04: thread the coach reply into conversation
 390:           // history so future envelopes carry the back-and-forth.
 391:           useCoachMemoryStore.getState().appendConversationMessage({
 392:             surface: 'chat-in-game',
 393:             role: 'coach',
 394:             text: textWithoutBoardTags,
 395:             fen: fen || undefined,
 396:             trigger: null,
 397:           });
 398:           if (annotations.length > 0) {
 399:             onBoardAnnotation?.(annotations);
 400:           }
 401:         } catch (err: unknown) {
 402:           console.error('[GameChatPanel] coachService.ask failed:', err);
 403:           const errMsg: ChatMessageType = {
 404:             id: `gmsg-${Date.now()}-err`,
 405:             role: 'assistant',
 406:             content: 'Sorry — I couldn\'t reach the coach just now. Try again in a moment.',
 407:             timestamp: Date.now(),
 408:           };
 409:           setMessages((prev) => [...prev, errMsg]);
 410:         } finally {
```

---

## Bonus context — GameChatPanel.tsx props interface (to confirm what the parent already passes)

```tsx
  23: interface GameChatPanelProps {
  24:   fen: string;
  25:   pgn: string;
  26:   moveNumber: number;
  27:   playerColor: 'white' | 'black';
  28:   turn: 'w' | 'b';
  29:   isGameOver: boolean;
  30:   gameResult: string;
  31:   lastMove?: { from: string; to: string; san: string } | null;
  32:   history?: string[];
  33:   /** FEN of the position before the last move (for tactic classification) */
  34:   previousFen?: string | null;
  35:   className?: string;
  36:   onBoardAnnotation?: (commands: BoardAnnotationCommand[]) => void;
  37:   /** Called when the user asks in chat to restart the current game. */
  38:   onRestartGame?: () => void;
  39:   /** Called when the user asks in chat to play a specific opening
  40:    *  against them. The opening name is passed through to the board's
  41:    *  opening-book hook. */
  42:   onPlayOpening?: (openingName: string) => void;
  43:   /** Apply a what-if variation: take back `undo` half-moves, then play
  44:    *  `moves` (SAN) forward. Returns true on success, false if any move
  45:    *  was invalid or there was nothing to undo. Powers the coach's
  46:    *  play_variation action — "what if Black plays Ne4 instead of Bh6?" */
  47:   onPlayVariation?: (args: { undo: number; moves: string[] }) => boolean;
  48:   /** Snap the board back to the position it was in before the first
  49:    *  variation was applied. Returns true on success, false if no
  50:    *  snapshot exists (no variation in progress). Powers
  51:    *  return_to_game — "ok back to my real game". */
  52:   onReturnToGame?: () => boolean;
  53:   /** If set, auto-sends this message on mount (e.g., from post-game practice bridge) */
  54:   initialPrompt?: string | null;
  55:   /** Called after the initial prompt has been sent */
  56:   onInitialPromptSent?: () => void;
  57:   /** Hide the built-in header (when embedded inside a container that provides its own) */
  58:   hideHeader?: boolean;
  59:   /** Restore messages from a previous session (used on mount only) */
  60:   initialMessages?: ChatMessageType[];
  61:   /** Called whenever the messages array changes, so the parent can persist them */
  62:   onMessagesUpdate?: (messages: ChatMessageType[]) => void;
  63: }
```

## Bonus context — CoachGamePage.tsx — how it currently renders/uses GameChatPanel (does it have a setStudentMove / play function it could pass?)

```
22:import { GameChatPanel } from './GameChatPanel';
23:import type { GameChatPanelHandle } from './GameChatPanel';
315:  // Ref to inject messages into GameChatPanel (hints, takeback msgs)
316:  const gameChatRef = useRef<GameChatPanelHandle>(null);
597:  // because GameChatPanel's internal useState was the only home for
3122:            <GameChatPanel
3180:            <GameChatPanel
```

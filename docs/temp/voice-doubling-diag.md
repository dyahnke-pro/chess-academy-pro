# Voice-doubling diagnostic

Branch: claude/wo-teach-fix-02 (post-cherry-pick of 4755f62 — staged but uncommitted)
Working tree includes BOTH the original FIX-02 tag-strip on speech buffer AND the FIX-01 onPlayMove wiring.

April 26 audit log evidence: voiceService.speak, voiceService.speakForced, AND voiceService.speakQueuedForced all firing within ~3 seconds on overlapping content.

Note: GameChatPanel.tsx itself does NOT call speakForced or speakQueuedForced — it only calls voiceService.speak. The forced/queued pair lives in CoachChatPage.tsx (lines 237, 242). So the doubling involves either:
  (a) two GameChatPanel speak sites firing on the same response (e.g. Site E sentence-stream + Site A end-of-stream flush), or
  (b) GameChatPanel speak racing CoachChatPage's speakForced/speakQueuedForced — which would only happen if both components were mounted simultaneously, possible in some route/drawer layout.

---

## 1. `grep -B5 -A2 "voiceService.speak" src/components/Coach/GameChatPanel.tsx`

```tsx
    // Buffer speech to sentence boundaries
    const flushSpeechBuffer = useCallback(() => {
      const buffer = speechBufferRef.current;
      // Read latest voice state directly from store to avoid stale closures
      if (buffer.trim() && useAppStore.getState().coachVoiceOn) {
        void voiceService.speak(buffer.trim());
      }
      speechBufferRef.current = '';
--
          content: ack,
          timestamp: Date.now(),
        };
        setMessages([...updatedMessages, ackMsg]);
        if (narrationToggle.enable) {
          void voiceService.speak(ack);
        } else {
          voiceService.stop();
--
            content: 'Fresh board — starting over. Your move.',
            timestamp: Date.now(),
          };
          setMessages([...updatedMessages, ack]);
          if (useAppStore.getState().coachVoiceOn) {
            void voiceService.speak(ack.content);
          }
          return;
--
            content: `Starting a fresh game — I'll play the ${inGame.openingName} against you.`,
            timestamp: Date.now(),
          };
          setMessages([...updatedMessages, ack]);
          if (useAppStore.getState().coachVoiceOn) {
            void voiceService.speak(ack.content);
          }
          return;
--
                  const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
                  if (sentenceEnd) {
                    const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
                    speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
                    const cleaned = sentence.trim();
                    if (cleaned) void voiceService.speak(cleaned);
                  }
                }
--
                speechBufferRef.current += chunk;
                const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
                if (sentenceEnd) {
                  const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
                  speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
                  void voiceService.speak(sentence.trim());
                }
              }
```

Six call sites. Naming them for the spec:
- **Site A** — flushSpeechBuffer (line ~146): residual buffer flush at end-of-stream.
- **Site B** — narration-toggle ack (line ~204): speaks the toggle-confirmation message.
- **Site C** — restart-game ack (line ~241): speaks 'Fresh board — starting over.'
- **Site D** — play-opening ack (line ~262): speaks 'Starting a fresh game — I'll play the {opening}...'
- **Site E** — in-game streaming sentence (line ~365, surface 'game-chat'): per-sentence emit during streaming.
- **Site F** — drawer/post-game streaming sentence (line ~478, surface 'home-chat'): per-sentence emit for the drawer surface.

---

## 2. `grep -n "routeChatIntent\|detectNarrationToggle\|READ_THIS_RE\|tryCaptureForgetIntent" src/components/Coach/GameChatPanel.tsx | head -20`

```
5:import { routeChatIntent } from '../../services/coachIntentRouter';
6:import { detectNarrationToggle, applyNarrationToggle } from '../../services/coachAgentRunner';
10:import { tryCaptureForgetIntent } from '../../services/openingIntentCapture';
189:      // `tryCaptureForgetIntent` regex stays for one more WO as a
192:      tryCaptureForgetIntent(text, surface);
200:      const narrationToggle = detectNarrationToggle(text);
287:          const routed = await routeChatIntent(text, { currentFen: fen, lastAssistantMessage });
```

---

## Bonus context — handleSend skeleton showing the ordering of the intercept paths relative to the speak sites

The shape of `handleSend` (lines 151-end). Each numbered block shows how an intercept short-circuits before reaching the streaming brain call. The relevant question for voice doubling is: do any two of these paths fire on the same handleSend invocation?

```
 158:     const handleSend = useCallback(async (text: string) => {
 159:       if (!activeProfile || isStreaming) return;
 160: 
 161:       // Add user message
 162:       const userMsg: ChatMessageType = {
 163:         id: `gmsg-${Date.now()}`,
 164:         role: 'user',
 165:         content: text,
 166:         timestamp: Date.now(),
 167:       };
 168:       const updatedMessages = [...messagesRef.current, userMsg];
 169:       setMessages(updatedMessages);
 170: 
 171:       // WO-BRAIN-04: thread the user ask into the coach memory store so
 172:       // the brain envelope sees the back-and-forth on the next call.
 173:       // Surface labels follow `CoachMessage.surface` enum.
 174:       const conversationSurface: 'chat-in-game' | 'chat-home' = isGameOver
 175:         ? 'chat-home'
 176:         : 'chat-in-game';
 177:       useCoachMemoryStore.getState().appendConversationMessage({
 178:         surface: conversationSurface,
 179:         role: 'user',
 180:         text,
 181:         fen: fen || undefined,
 182:         trigger: null,
 183:       });
 184: 
 185:       // WO-BRAIN-03: both branches now route through the brain. The
 186:       // deterministic `tryCaptureOpeningIntent` regex shortcut is
 187:       // retired entirely — `set_intended_opening` is in the brain's
 188:       // toolbelt and the LLM emits it from either surface. The
 189:       // `tryCaptureForgetIntent` regex stays for one more WO as a
 190:       // belt-and-suspenders safety net. Removed in BRAIN-06 cleanup.
 191:       const surface = isGameOver ? 'drawer-chat' : 'in-game-chat';
 192:       tryCaptureForgetIntent(text, surface);
 193: 
 194:       // Narration toggle — deterministic intercept. Runs BEFORE the
 195:       // in-game block below so "narrate while we play" reliably flips
 196:       // the flag even during an active game (which the in-game branch
 197:       // would otherwise handle via its own narrate case). This path
 198:       // uses applyNarrationToggle from coachAgentRunner for consistency
 199:       // with CoachChatPage.
 200:       const narrationToggle = detectNarrationToggle(text);
 201:       if (narrationToggle) {
 202:         const ack = applyNarrationToggle(narrationToggle.enable);
 203:         const ackMsg: ChatMessageType = {
 204:           id: `gmsg-${Date.now()}-narr`,
 205:           role: 'assistant',
 206:           content: ack,
 207:           timestamp: Date.now(),
 208:         };
 209:         setMessages([...updatedMessages, ackMsg]);
 210:         if (narrationToggle.enable) {
 211:           void voiceService.speak(ack);
 212:         } else {
 213:           voiceService.stop();
 214:         }
 215:         return;
 216:       }
 217: 
 218:       // In-game intents: short-circuit the LLM for actions that actually
 219:       // need to change the board (restart, play a specific opening,
 220:       // mute). Previously "Restart the game" would produce a narrative
 221:       // reply but the board stayed where it was — the chat had no way
 222:       // to mutate game state. Handle those here.
 223:       if (!isGameOver) {
 224:         const inGame = detectInGameChatIntent(text);
 225:         if (inGame?.kind === 'mute') {
 226:           useAppStore.getState().setCoachVoiceOn(false);
 227:           voiceService.stop();
 228:           const ack = 'Voice narration is off.';
 229:           const ackMsg: ChatMessageType = {
 230:             id: `gmsg-${Date.now()}-ack`,
 231:             role: 'assistant',
 232:             content: ack,
 233:             timestamp: Date.now(),
 234:           };
 235:           setMessages([...updatedMessages, ackMsg]);
 236:           return;
 237:         }
 238:         if (inGame?.kind === 'restart' && onRestartGame) {
 239:           onRestartGame();
 240:           const ack: ChatMessageType = {
 241:             id: `gmsg-${Date.now()}-ack`,
 242:             role: 'assistant',
 243:             content: 'Fresh board — starting over. Your move.',
 244:             timestamp: Date.now(),
 245:           };
 246:           setMessages([...updatedMessages, ack]);
 247:           if (useAppStore.getState().coachVoiceOn) {
 248:             void voiceService.speak(ack.content);
 249:           }
 250:           return;
 251:         }
 252:         if (inGame?.kind === 'play-opening' && onPlayOpening) {
 253:           // Restart BEFORE queuing the opening — handleRestart clears
 254:           // requestedOpeningMoves, so we have to wipe the board first
 255:           // and then set the book line. React batches both state
 256:           // updates inside this handler, so the coach's move effect
 257:           // sees the fresh board + book on its next run and plays the
 258:           // first book move immediately.
 259:           onRestartGame?.();
 260:           onPlayOpening(inGame.openingName);
 261:           const ack: ChatMessageType = {
 262:             id: `gmsg-${Date.now()}-ack`,
 263:             role: 'assistant',
 264:             content: `Starting a fresh game — I'll play the ${inGame.openingName} against you.`,
 265:             timestamp: Date.now(),
 266:           };
 267:           setMessages([...updatedMessages, ack]);
 268:           if (useAppStore.getState().coachVoiceOn) {
 269:             void voiceService.speak(ack.content);
 270:           }
 271:           return;
 272:         }
 273:       }
 274: 
 275:       // Intent routing: outside of an active game, let "play against me",
 276:       // "explain this position", etc. launch dedicated sessions instead of
 277:       // running through the chat LLM. We skip routing mid-game so the
 278:       // in-game chat stays in-game — the user can finish their move first.
 279:       if (isGameOver) {
 280:         try {
 281:           // Grab the most recent assistant message so the router can
 282:           // detect "coach proposed a game → user said yes". Walk back
 283:           // from the end of the existing chat history (pre-userMsg).
 284:           const lastAssistantMessage = [...messagesRef.current]
 285:             .reverse()
 286:             .find((m) => m.role === 'assistant')?.content;
 287:           const routed = await routeChatIntent(text, { currentFen: fen, lastAssistantMessage });
 288:           if (routed) {
 289:             const ackMsg: ChatMessageType = {
 290:               id: `gmsg-${Date.now()}-ack`,
 291:               role: 'assistant',
 292:               content: routed.ackMessage,
 293:               timestamp: Date.now(),
 294:             };
 295:             setMessages([...updatedMessages, ackMsg]);
 296:             // Reply-only routes (no `path`) just inject the ack as the
 297:             // coach's response and stay in chat — used for cases like
 298:             // "review my last Catalan" when the user has no Catalan
 299:             // games. The ack ends with a play-game offer so the user's
 300:             // next "yes" hits the affirmation-after-proposal path.
 301:             if (routed.path) {
 302:               void navigate(routed.path);
 303:             }
 304:             return;
 305:           }
 306:         } catch (err: unknown) {
 307:           console.warn('[GameChatPanel] intent routing failed:', err);
 308:         }
 309:       }
 310: 
 311:       // ── WO-BRAIN-02 — IN-GAME BRANCH ROUTES THROUGH coachService ─────
 312:       // Mid-game chat goes through the unified Coach Brain spine. The
 313:       // envelope assembled in coachService.ask carries the four sources
 314:       // of truth (identity, memory, app map, live state) plus the full
 315:       // toolbelt — so memory + manifest awareness arrive on every call.
 316:       // The drawer/post-game branch below still uses runAgentTurn until
 317:       // BRAIN-03 collapses it the same way.
 318:       if (!isGameOver) {
 319:         onBoardAnnotation?.([{ type: 'clear' }]);
 320:         setIsStreaming(true);
 321:         setStreamingContent('');
 322:         speechBufferRef.current = '';
 323:         let fullResponse = '';
 324:         try {
 325:           const liveState: LiveState = {
 326:             surface: 'game-chat',
 327:             fen,
 328:             moveHistory: history,
 329:             userJustDid: text,
 330:             currentRoute: '/coach/play',
 331:           };
 332:           void logAppAudit({
 333:             kind: 'coach-surface-migrated',
 334:             category: 'subsystem',
 335:             source: 'GameChatPanel.handleSend',
 336:             summary: 'surface=game-chat viaSpine=true',
 337:             details: JSON.stringify({
 338:               surface: 'game-chat',
 339:               viaSpine: true,
 340:               timestamp: Date.now(),
 341:               fenIfPresent: fen,
 342:             }),
 343:             fen,
 344:           });
 345:           const answer = await coachService.ask(
 346:             { surface: 'game-chat', ask: text, liveState },
 347:             {
 348:               onChunk: (chunk: string) => {
 349:                 fullResponse += chunk;
 350:                 const displayText = fullResponse
 351:                   .replace(BOARD_TAG_STRIP_RE, '')
 352:                   .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
 353:                   .trim();
 354:                 setStreamingContent(displayText);
 355:                 if (useAppStore.getState().coachVoiceOn) {
 356:                   // Strip action and board tags from speech, same as displayText.
 357:                   // Never read [[ACTION:...]] or [BOARD:...] aloud — those are
 358:                   // machine-readable directives, not coach speech. Buffer the
 359:                   // STRIPPED text and emit complete sentences. Tags can span
 360:                   // chunks; we only strip when both opening and closing markers
 361:                   // are present, so a partial tag stays in the buffer until
 362:                   // the rest arrives.
 363:                   speechBufferRef.current += chunk;
 364:                   speechBufferRef.current = speechBufferRef.current
 365:                     .replace(/\[\[ACTION:[^\]]*\]\]/gi, '')
 366:                     .replace(BOARD_TAG_STRIP_RE, '');
 367:                   const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
 368:                   if (sentenceEnd) {
 369:                     const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
 370:                     speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
 371:                     const cleaned = sentence.trim();
 372:                     if (cleaned) void voiceService.speak(cleaned);
 373:                   }
 374:                 }
 375:               },
 376:               onNavigate: (path: string) => {
 377:                 void navigate(path);
 378:               },
 379:               // WO-TEACH-FIX-01 — student says "play knight to f3" in chat,
 380:               // brain emits play_move, this callback executes it on the board.
 381:               // Mirrors the move-selector wiring in CoachGamePage. Wrapped so
 382:               // a thrown error from the parent surfaces as a tool error rather
 383:               // than escaping the spine.
 384:               onPlayMove: onPlayMove
 385:                 ? async (san: string): Promise<{ ok: boolean; reason?: string }> => {
 386:                     try {
 387:                       return await Promise.resolve(onPlayMove(san));
 388:                     } catch (err) {
 389:                       return {
 390:                         ok: false,
 391:                         reason: err instanceof Error ? err.message : String(err),
 392:                       };
 393:                     }
 394:                   }
 395:                 : undefined,
 396:             },
 397:           );
 398:           if (speechBufferRef.current.trim()) {
 399:             flushSpeechBuffer();
 400:           }
 401:           // The spine already strips [[ACTION:]] tags via parseActions;
 402:           // [BOARD:] tags are surface-local so we still parse them here.
 403:           const { cleanText: textWithoutBoardTags, commands: annotations } =
 404:             parseBoardTags(answer.text);
 405:           const hasExplicitArrows = annotations.some(
 406:             (c) => c.type === 'arrow' && (c.arrows?.length ?? 0) > 0,
 407:           );
```

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { routeChatIntent } from '../../services/coachIntentRouter';
import { detectNarrationToggle, applyNarrationToggle } from '../../services/coachAgentRunner';
import { parseBoardTags } from '../../services/boardAnnotationService';
import { extractMoveArrows } from '../../services/coachMoveExtractor';
import { detectInGameChatIntent } from '../../services/inGameChatIntent';
import { tryCaptureForgetIntent } from '../../services/openingIntentCapture';
import { coachService } from '../../coach/coachService';
import type { LiveState } from '../../coach/types';
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
import { logAppAudit } from '../../services/appAuditor';
import { voiceService } from '../../services/voiceService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType, BoardAnnotationCommand } from '../../types';

/** Strip [BOARD: ...] tags from text so they don't flash during streaming */
const BOARD_TAG_STRIP_RE = /\[BOARD:\s*(?:arrow|highlight|position|practice|clear)(?::[^\]]*)?\]/gi;

interface GameChatPanelProps {
  fen: string;
  pgn: string;
  moveNumber: number;
  playerColor: 'white' | 'black';
  turn: 'w' | 'b';
  isGameOver: boolean;
  gameResult: string;
  lastMove?: { from: string; to: string; san: string } | null;
  history?: string[];
  /** FEN of the position before the last move (for tactic classification) */
  previousFen?: string | null;
  className?: string;
  onBoardAnnotation?: (commands: BoardAnnotationCommand[]) => void;
  /** Called when the user asks in chat to restart the current game. */
  onRestartGame?: () => void;
  /** Called when the user asks in chat to play a specific opening
   *  against them. The opening name is passed through to the board's
   *  opening-book hook. */
  onPlayOpening?: (openingName: string) => void;
  /** Called when the brain emits play_move from the chat surface — e.g.
   *  the student says "play knight to f3" and the brain executes it on
   *  their behalf. Validate the SAN against the live FEN before applying.
   *  Return { ok: true } if the move landed, { ok: false, reason } if not.
   *  Same shape as CoachGamePage's move-selector onPlayMove. */
  onPlayMove?: (san: string) => { ok: boolean; reason?: string } | Promise<{ ok: boolean; reason?: string }>;
  /** Apply a what-if variation: take back `undo` half-moves, then play
   *  `moves` (SAN) forward. Returns true on success, false if any move
   *  was invalid or there was nothing to undo. Powers the coach's
   *  play_variation action — "what if Black plays Ne4 instead of Bh6?" */
  onPlayVariation?: (args: { undo: number; moves: string[] }) => boolean;
  /** Snap the board back to the position it was in before the first
   *  variation was applied. Returns true on success, false if no
   *  snapshot exists (no variation in progress). Powers
   *  return_to_game — "ok back to my real game". */
  onReturnToGame?: () => boolean;
  /** If set, auto-sends this message on mount (e.g., from post-game practice bridge) */
  initialPrompt?: string | null;
  /** Called after the initial prompt has been sent */
  onInitialPromptSent?: () => void;
  /** Hide the built-in header (when embedded inside a container that provides its own) */
  hideHeader?: boolean;
  /** Restore messages from a previous session (used on mount only) */
  initialMessages?: ChatMessageType[];
  /** Called whenever the messages array changes, so the parent can persist them */
  onMessagesUpdate?: (messages: ChatMessageType[]) => void;
}

export interface GameChatPanelHandle {
  injectAssistantMessage: (text: string) => void;
}

export const GameChatPanel = forwardRef<GameChatPanelHandle, GameChatPanelProps>(
  function GameChatPanel(
    {
      fen,
      playerColor,
      isGameOver,
      history,
      className,
      onBoardAnnotation,
      onRestartGame,
      onPlayOpening,
      onPlayMove,
      initialPrompt,
      onInitialPromptSent,
      hideHeader,
      initialMessages,
      onMessagesUpdate,
    },
    ref,
  ) {
    const activeProfile = useAppStore((s) => s.activeProfile);
    const navigate = useNavigate();
    const location = useLocation();

    const [messages, setMessagesInternal] = useState<ChatMessageType[]>(initialMessages ?? []);
    const [isStreaming, setIsStreaming] = useState(false);
    const initialPromptSentRef = useRef(false);
    const [streamingContent, setStreamingContent] = useState('');
    const speechBufferRef = useRef('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessageType[]>(messages);

    // Keep messagesRef in sync
    messagesRef.current = messages;

    // Wrapper that also notifies parent
    const setMessages = useCallback((updater: ChatMessageType[] | ((prev: ChatMessageType[]) => ChatMessageType[])): void => {
      setMessagesInternal((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        // Notify parent asynchronously so we don't setState during render
        queueMicrotask(() => onMessagesUpdate?.(next));
        return next;
      });
    }, [onMessagesUpdate]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
      const el = messagesEndRef.current;
      if (el && 'scrollIntoView' in el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages, streamingContent]);

    // Expose method for parent to inject assistant messages (hints, takeback msgs)
    useImperativeHandle(ref, () => ({
      injectAssistantMessage(text: string) {
        const msg: ChatMessageType = {
          id: `coach-${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, msg]);

        // Silenced by WO-LEGACY-VOICE-01 — this path was the funnel for
        // CoachGamePage's coach tips, missed-tactic alerts, and upcoming-
        // threat warnings (all of which carry `tacticSuffix` text like
        // "Hanging: White pawn on h7"). Text surface retained: the
        // message still renders in the chat panel — only TTS is muted.
        void text;
      },
    }), [setMessages]);

    // Buffer speech to sentence boundaries
    const flushSpeechBuffer = useCallback(() => {
      const buffer = speechBufferRef.current;
      // Read latest voice state directly from store to avoid stale closures
      if (buffer.trim() && useAppStore.getState().coachVoiceOn) {
        void voiceService.speak(buffer.trim());
      }
      speechBufferRef.current = '';
    }, []);

    const handleSend = useCallback(async (text: string) => {
      if (!activeProfile || isStreaming) return;

      // Add user message
      const userMsg: ChatMessageType = {
        id: `gmsg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);

      // WO-BRAIN-04: thread the user ask into the coach memory store so
      // the brain envelope sees the back-and-forth on the next call.
      // Surface labels follow `CoachMessage.surface` enum.
      const conversationSurface: 'chat-in-game' | 'chat-home' = isGameOver
        ? 'chat-home'
        : 'chat-in-game';
      useCoachMemoryStore.getState().appendConversationMessage({
        surface: conversationSurface,
        role: 'user',
        text,
        fen: fen || undefined,
        trigger: null,
      });

      // WO-BRAIN-03: both branches now route through the brain. The
      // deterministic `tryCaptureOpeningIntent` regex shortcut is
      // retired entirely — `set_intended_opening` is in the brain's
      // toolbelt and the LLM emits it from either surface. The
      // `tryCaptureForgetIntent` regex stays for one more WO as a
      // belt-and-suspenders safety net. Removed in BRAIN-06 cleanup.
      const surface = isGameOver ? 'drawer-chat' : 'in-game-chat';
      tryCaptureForgetIntent(text, surface);

      // Narration toggle — deterministic intercept. Runs BEFORE the
      // in-game block below so "narrate while we play" reliably flips
      // the flag even during an active game (which the in-game branch
      // would otherwise handle via its own narrate case). This path
      // uses applyNarrationToggle from coachAgentRunner for consistency
      // with CoachChatPage.
      const narrationToggle = detectNarrationToggle(text);
      if (narrationToggle) {
        const ack = applyNarrationToggle(narrationToggle.enable);
        const ackMsg: ChatMessageType = {
          id: `gmsg-${Date.now()}-narr`,
          role: 'assistant',
          content: ack,
          timestamp: Date.now(),
        };
        setMessages([...updatedMessages, ackMsg]);
        if (narrationToggle.enable) {
          void voiceService.speak(ack);
        } else {
          voiceService.stop();
        }
        return;
      }

      // In-game intents: short-circuit the LLM for actions that actually
      // need to change the board (restart, play a specific opening,
      // mute). Previously "Restart the game" would produce a narrative
      // reply but the board stayed where it was — the chat had no way
      // to mutate game state. Handle those here.
      if (!isGameOver) {
        const inGame = detectInGameChatIntent(text);
        if (inGame?.kind === 'mute') {
          useAppStore.getState().setCoachVoiceOn(false);
          voiceService.stop();
          const ack = 'Voice narration is off.';
          const ackMsg: ChatMessageType = {
            id: `gmsg-${Date.now()}-ack`,
            role: 'assistant',
            content: ack,
            timestamp: Date.now(),
          };
          setMessages([...updatedMessages, ackMsg]);
          return;
        }
        if (inGame?.kind === 'restart' && onRestartGame) {
          onRestartGame();
          const ack: ChatMessageType = {
            id: `gmsg-${Date.now()}-ack`,
            role: 'assistant',
            content: 'Fresh board — starting over. Your move.',
            timestamp: Date.now(),
          };
          setMessages([...updatedMessages, ack]);
          if (useAppStore.getState().coachVoiceOn) {
            void voiceService.speak(ack.content);
          }
          return;
        }
        if (inGame?.kind === 'play-opening' && onPlayOpening) {
          // Restart BEFORE queuing the opening — handleRestart clears
          // requestedOpeningMoves, so we have to wipe the board first
          // and then set the book line. React batches both state
          // updates inside this handler, so the coach's move effect
          // sees the fresh board + book on its next run and plays the
          // first book move immediately.
          onRestartGame?.();
          onPlayOpening(inGame.openingName);
          const ack: ChatMessageType = {
            id: `gmsg-${Date.now()}-ack`,
            role: 'assistant',
            content: `Starting a fresh game — I'll play the ${inGame.openingName} against you.`,
            timestamp: Date.now(),
          };
          setMessages([...updatedMessages, ack]);
          if (useAppStore.getState().coachVoiceOn) {
            void voiceService.speak(ack.content);
          }
          return;
        }
      }

      // Intent routing: outside of an active game, let "play against me",
      // "explain this position", etc. launch dedicated sessions instead of
      // running through the chat LLM. We skip routing mid-game so the
      // in-game chat stays in-game — the user can finish their move first.
      if (isGameOver) {
        try {
          // Grab the most recent assistant message so the router can
          // detect "coach proposed a game → user said yes". Walk back
          // from the end of the existing chat history (pre-userMsg).
          const lastAssistantMessage = [...messagesRef.current]
            .reverse()
            .find((m) => m.role === 'assistant')?.content;
          const routed = await routeChatIntent(text, { currentFen: fen, lastAssistantMessage });
          if (routed) {
            const ackMsg: ChatMessageType = {
              id: `gmsg-${Date.now()}-ack`,
              role: 'assistant',
              content: routed.ackMessage,
              timestamp: Date.now(),
            };
            setMessages([...updatedMessages, ackMsg]);
            // Reply-only routes (no `path`) just inject the ack as the
            // coach's response and stay in chat — used for cases like
            // "review my last Catalan" when the user has no Catalan
            // games. The ack ends with a play-game offer so the user's
            // next "yes" hits the affirmation-after-proposal path.
            if (routed.path) {
              void navigate(routed.path);
            }
            return;
          }
        } catch (err: unknown) {
          console.warn('[GameChatPanel] intent routing failed:', err);
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
                  speechBufferRef.current += chunk;
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
              // WO-TEACH-FIX-01 — student says "play knight to f3" in chat,
              // brain emits play_move, this callback executes it on the board.
              // Mirrors the move-selector wiring in CoachGamePage. Wrapped so
              // a thrown error from the parent surfaces as a tool error rather
              // than escaping the spine.
              onPlayMove: onPlayMove
                ? async (san: string): Promise<{ ok: boolean; reason?: string }> => {
                    try {
                      return await Promise.resolve(onPlayMove(san));
                    } catch (err) {
                      return {
                        ok: false,
                        reason: err instanceof Error ? err.message : String(err),
                      };
                    }
                  }
                : undefined,
            },
          );
          if (speechBufferRef.current.trim()) {
            flushSpeechBuffer();
          }
          // The spine already strips [[ACTION:]] tags via parseActions;
          // [BOARD:] tags are surface-local so we still parse them here.
          const { cleanText: textWithoutBoardTags, commands: annotations } =
            parseBoardTags(answer.text);
          const hasExplicitArrows = annotations.some(
            (c) => c.type === 'arrow' && (c.arrows?.length ?? 0) > 0,
          );
          if (!hasExplicitArrows) {
            const autoArrows = extractMoveArrows(textWithoutBoardTags, { fen });
            if (autoArrows.length > 0) {
              annotations.push({ type: 'arrow', arrows: autoArrows });
            }
          }
          const assistantMsg: ChatMessageType = {
            id: `gmsg-${Date.now()}-resp`,
            role: 'assistant',
            content: textWithoutBoardTags,
            timestamp: Date.now(),
            metadata: {
              annotations: annotations.length > 0 ? annotations : undefined,
            },
          };
          setMessages((prev) => [...prev, assistantMsg]);
          // WO-BRAIN-04: thread the coach reply into conversation
          // history so future envelopes carry the back-and-forth.
          useCoachMemoryStore.getState().appendConversationMessage({
            surface: 'chat-in-game',
            role: 'coach',
            text: textWithoutBoardTags,
            fen: fen || undefined,
            trigger: null,
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
          moveHistory: history && history.length > 0 ? history : undefined,
          userJustDid: text,
          currentRoute: location.pathname,
        };
        void logAppAudit({
          kind: 'coach-surface-migrated',
          category: 'subsystem',
          source: 'GameChatPanel.handleSend',
          summary: 'surface=home-chat viaSpine=true',
          details: JSON.stringify({
            surface: 'home-chat',
            viaSpine: true,
            timestamp: Date.now(),
            fenIfPresent: fen || null,
            currentRoute: location.pathname,
          }),
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
                speechBufferRef.current += chunk;
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
          },
        );
        if (speechBufferRef.current.trim()) {
          flushSpeechBuffer();
        }
        // Drawer surface has no live board to draw arrows on; just
        // strip the [BOARD:] tags out of display text and append.
        const { cleanText: drawerCleanText } = parseBoardTags(answer.text);
        const assistantMsg: ChatMessageType = {
          id: `gmsg-${Date.now()}-resp`,
          role: 'assistant',
          content: drawerCleanText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        useCoachMemoryStore.getState().appendConversationMessage({
          surface: 'chat-home',
          role: 'coach',
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
    }, [activeProfile, isStreaming, fen, history, isGameOver, flushSpeechBuffer, onBoardAnnotation, onRestartGame, onPlayOpening, onPlayMove, setMessages, navigate, location, playerColor]);

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
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-theme-accent"
            >
              C
            </div>
            <div>
              <span className="text-sm font-semibold text-theme-text">Game Chat</span>
              <span className="text-xs text-theme-text-muted ml-2">
                {isStreaming ? 'Typing...' : 'Online'}
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col gap-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="In-game coach chat messages"
        >
          {messages.length === 0 && !isStreaming && (
            <motion.div
              className="flex flex-col items-center gap-3 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center max-w-xs">
                <p className="text-sm font-medium text-theme-text">
                  Chat with your coach
                </p>
                <p className="text-xs text-theme-text-muted mt-1">
                  Ask about the position, request analysis, or just chat during the game
                </p>
              </div>
            </motion.div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isStreaming && streamingContent && (
            <ChatMessage
              message={{
                id: 'game-streaming',
                role: 'assistant',
                content: streamingContent,
                timestamp: Date.now(),
              }}
              isStreaming
            />
          )}

          {isStreaming && !streamingContent && (
            <ChatMessage
              message={{
                id: 'game-streaming-empty',
                role: 'assistant',
                content: '',
                timestamp: Date.now(),
              }}
              isStreaming
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={(text) => void handleSend(text)}
          disabled={isStreaming}
          placeholder="Ask about the position..."
        />
      </div>
    );
  },
);

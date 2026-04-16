import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { getCoachChatResponse } from '../../services/coachApi';
import { buildGameChatMessages, getGameSystemPromptAddition, parseAllTags } from '../../services/coachChatService';
import { fetchRelevantGames } from '../../services/gameContextService';
import { routeChatIntent } from '../../services/coachIntentRouter';
import type { EngineData, TacticAnalysisContext, PositionAssessmentContext } from '../../services/coachChatService';
import { stockfishEngine } from '../../services/stockfishEngine';
import { classifyPosition, scanUpcomingTactics } from '../../services/tacticClassifier';
import { assessPosition } from '../../services/positionAssessor';
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
      pgn,
      moveNumber,
      playerColor,
      turn,
      isGameOver,
      gameResult,
      lastMove,
      history,
      previousFen,
      className,
      onBoardAnnotation,
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

    const [messages, setMessagesInternal] = useState<ChatMessageType[]>(initialMessages ?? []);
    const [isStreaming, setIsStreaming] = useState(false);
    const initialPromptSentRef = useRef(false);
    const [streamingContent, setStreamingContent] = useState('');
    const speechBufferRef = useRef('');
    const prevEvalRef = useRef<number>(0);
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

        // Speak if voice is on (read latest state directly)
        if (useAppStore.getState().coachVoiceOn) {
          void voiceService.speak(text);
        }
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

      // Run Stockfish analysis so the coach has engine-backed suggestions
      let engineData: EngineData | undefined;
      if (!isGameOver) {
        try {
          const analysis = await stockfishEngine.analyzePosition(fen, 16);
          engineData = {
            bestMove: analysis.bestMove,
            evaluation: analysis.evaluation,
            isMate: analysis.isMate,
            mateIn: analysis.mateIn,
            topLines: analysis.topLines.map((l) => ({
              moves: l.moves,
              evaluation: l.evaluation,
              mate: l.mate,
            })),
          };
        } catch {
          // If Stockfish fails, continue without engine data
        }
      }

      // Run tactic classification on the last move + scan for upcoming tactics
      let tacticAnalysis: TacticAnalysisContext | undefined;
      if (!isGameOver && lastMove && previousFen && engineData) {
        try {
          const playerColorCode = playerColor === 'white' ? 'w' : 'b';
          // Use cached previous eval for accurate eval swing (fix #1)
          const evalBefore = prevEvalRef.current;
          const classification = classifyPosition(
            previousFen,
            fen,
            lastMove.san,
            evalBefore,
            engineData.evaluation,
          );

          const upcoming = scanUpcomingTactics(
            fen,
            engineData.topLines,
            playerColorCode,
          );

          tacticAnalysis = {
            moveQuality: classification.moveQuality,
            evalSwing: classification.evalSwing,
            hangingPieces: classification.hangingPieces.map((p) => ({
              square: p.square,
              piece: p.piece,
              color: p.color,
            })),
            currentTactics: classification.tactics
              .filter((t) => t.type !== 'none')
              .map((t) => t.description),
            upcomingForPlayer: upcoming
              .filter((u) => u.beneficiary === 'player')
              .map((u) => `In ${u.depthAhead} move${u.depthAhead > 1 ? 's' : ''}: ${u.pattern.description} (after ${u.line.join(' ')})`),
            upcomingForOpponent: upcoming
              .filter((u) => u.beneficiary === 'opponent')
              .map((u) => `In ${u.depthAhead} move${u.depthAhead > 1 ? 's' : ''}: ${u.pattern.description} (after ${u.line.join(' ')})`),
          };
        } catch {
          // Tactic analysis failed, continue without it
        }
      }

      // Cache current eval for next move's eval swing calculation
      if (engineData) {
        prevEvalRef.current = engineData.evaluation;
      }

      // Run position assessment (pawn structure, king safety, piece activity)
      let positionAssessment: PositionAssessmentContext | undefined;
      if (!isGameOver) {
        try {
          const assessment = assessPosition(fen);
          positionAssessment = { summary: assessment.summary };
        } catch {
          // Position assessment failed, continue without it
        }
      }

      // Build game context with lastMove, history, tactic analysis, and position assessment
      const gameContext = {
        fen,
        pgn,
        moveNumber,
        playerColor,
        turn,
        isGameOver,
        gameResult,
        lastMove,
        history,
        engineData,
        tacticAnalysis,
        positionAssessment,
      };

      // Clear previous annotations when a new message is sent
      onBoardAnnotation?.([{ type: 'clear' }]);

      // Start streaming
      setIsStreaming(true);
      setStreamingContent('');
      speechBufferRef.current = '';

      const formattedMessages = buildGameChatMessages(updatedMessages, gameContext, activeProfile);
      const baseAddition = getGameSystemPromptAddition();

      // Best-effort: surface the student's own past games that match the
      // opening / topic in their message so the coach can cite them
      // concretely ("you lost the last two Catalans as black — both
      // times you traded the dark-squared bishop early"). Capped at 5
      // games; returns empty and does nothing when no match.
      let relevantGamesBlock = '';
      try {
        const relevant = await fetchRelevantGames({
          query: text,
          fen,
          username: activeProfile.preferences.chessComUsername
            ?? activeProfile.preferences.lichessUsername
            ?? activeProfile.name,
        });
        relevantGamesBlock = relevant.promptBlock;
      } catch (err: unknown) {
        console.warn('[GameChatPanel] fetchRelevantGames failed', err);
      }
      const systemAddition = relevantGamesBlock
        ? `${baseAddition}\n\n${relevantGamesBlock}`
        : baseAddition;

      let fullResponse = '';

      const response = await getCoachChatResponse(
        formattedMessages,
        systemAddition,
        (chunk) => {
          fullResponse += chunk;
          // Strip [BOARD:] tags in real-time so they don't flash during streaming
          const displayText = fullResponse.replace(BOARD_TAG_STRIP_RE, '').trim();
          setStreamingContent(displayText);

          // Buffer speech to sentence boundaries — read voice state directly from store
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
      );

      // Flush remaining speech buffer
      if (speechBufferRef.current.trim()) {
        flushSpeechBuffer();
      }

      // Parse action tags and board annotation tags
      const { cleanText, actions, annotations } = parseAllTags(response);

      // Add assistant message
      const assistantMsg: ChatMessageType = {
        id: `gmsg-${Date.now()}-resp`,
        role: 'assistant',
        content: cleanText,
        timestamp: Date.now(),
        metadata: {
          actions: actions.length > 0 ? actions : undefined,
          annotations: annotations.length > 0 ? annotations : undefined,
        },
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Apply board annotations (arrows, highlights, temp positions)
      if (annotations.length > 0) {
        onBoardAnnotation?.(annotations);
      }

      setIsStreaming(false);
      setStreamingContent('');
    }, [activeProfile, isStreaming, fen, pgn, moveNumber, playerColor, turn, isGameOver, gameResult, lastMove, history, previousFen, flushSpeechBuffer, onBoardAnnotation, setMessages, navigate]);

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
        <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col gap-4">
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

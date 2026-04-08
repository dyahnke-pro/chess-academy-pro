import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { getCoachChatResponse } from '../../services/coachApi';
import { buildGameChatMessages, getGameSystemPromptAddition, parseAllTags } from '../../services/coachChatService';
import type { EngineData, TacticAnalysisContext } from '../../services/coachChatService';
import { stockfishEngine } from '../../services/stockfishEngine';
import { classifyPosition, scanUpcomingTactics } from '../../services/tacticClassifier';
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
    },
    ref,
  ) {
    const activeProfile = useAppStore((s) => s.activeProfile);

    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const initialPromptSentRef = useRef(false);
    const [streamingContent, setStreamingContent] = useState('');
    const speechBufferRef = useRef('');

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
    }), []);

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
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

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
          const classification = classifyPosition(
            previousFen,
            fen,
            lastMove.san,
            engineData.evaluation,
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

      // Build game context with lastMove, history, and tactic analysis
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
      };

      // Clear previous annotations when a new message is sent
      onBoardAnnotation?.([{ type: 'clear' }]);

      // Start streaming
      setIsStreaming(true);
      setStreamingContent('');
      speechBufferRef.current = '';

      const formattedMessages = buildGameChatMessages(updatedMessages, gameContext, activeProfile);
      const systemAddition = getGameSystemPromptAddition();

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
    }, [activeProfile, messages, isStreaming, fen, pgn, moveNumber, playerColor, turn, isGameOver, gameResult, lastMove, history, previousFen, flushSpeechBuffer, onBoardAnnotation]);

    // Auto-send initial prompt (from post-game practice bridge)
    useEffect(() => {
      if (initialPrompt && !initialPromptSentRef.current && activeProfile && !isStreaming) {
        initialPromptSentRef.current = true;
        void handleSend(initialPrompt);
      }
    }, [initialPrompt, activeProfile, isStreaming, handleSend]);

    return (
      <div
        className={`flex flex-col h-full ${className ?? ''}`}
        data-testid="game-chat-panel"
      >
        {/* Header */}
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

        {/* Messages — flex-col-reverse so newest appear at top without scroll manipulation */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col-reverse gap-4">
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

          {[...messages].reverse().map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

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

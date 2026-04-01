import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { speechService } from '../../services/speechService';
import { getCoachChatResponse } from '../../services/coachApi';
import { stockfishEngine } from '../../services/stockfishEngine';
import { uciMoveToSan, uciLinesToSan } from '../../utils/uciToSan';
import type { ChatMessage } from '../../types';

export interface EngineSnapshot {
  bestMove: string;
  evaluation: number;
  isMate: boolean;
  mateIn: number | null;
  topLines: { moves: string[]; evaluation: number; mate: number | null }[];
}

export interface LastMoveContext {
  san: string;
  player: 'you' | 'opponent';
  classification: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  bestMove: string | null;
}

interface VoiceChatMicProps {
  fen: string;
  pgn?: string;
  turn?: 'w' | 'b';
  /** Which color the student is playing ('white' or 'black'). */
  playerColor?: 'white' | 'black';
  /** Called when the user asks the coach to play a specific opening (e.g. "French Defense"). */
  onOpeningRequest?: (openingName: string) => void;
  /** Pre-computed engine snapshot (avoids running Stockfish again). */
  engineSnapshot?: EngineSnapshot | null;
  /** Context about the last move played (for "was that an inaccuracy?" questions). */
  lastMoveContext?: LastMoveContext | null;
  /** Called when listening state changes (true = mic active). */
  onListeningChange?: (listening: boolean) => void;
}

const MAX_HISTORY_PAIRS = 3;
const VOICE_ENGINE_DEPTH = 10;

function buildSystemAddition(
  fen: string,
  pgn: string | undefined,
  turn: string | undefined,
  playerColor: 'white' | 'black',
  engineData: EngineSnapshot | null,
  lastMove: LastMoveContext | null | undefined,
): string {
  const turnLabel = turn === 'b' ? 'Black' : 'White';
  const opponentColor = playerColor === 'white' ? 'Black' : 'White';
  const playerLabel = playerColor === 'white' ? 'White' : 'Black';

  const engineBlock = engineData
    ? [
        '\n[Engine Analysis — TRUST THIS DATA]',
        `Best move: ${engineData.bestMove}`,
        `Eval: ${engineData.isMate ? `Mate in ${engineData.mateIn}` : `${(engineData.evaluation / 100).toFixed(1)} pawns`}`,
        ...engineData.topLines.slice(0, 3).map(
          (l, i) => `Line ${i + 1}: ${l.moves.join(' ')} (${l.mate !== null ? `M${l.mate}` : (l.evaluation / 100).toFixed(1)})`,
        ),
      ].join('\n')
    : '';

  let lastMoveBlock = '';
  if (lastMove) {
    const evalShift = lastMove.evalBefore !== null && lastMove.evalAfter !== null
      ? ((lastMove.evalAfter - lastMove.evalBefore) / 100).toFixed(1)
      : null;
    // Use explicit labels: "student" and "you (coach)" so the LLM knows whose move it was
    const whoPlayed = lastMove.player === 'you' ? `the student (${playerLabel})` : `you, the coach (${opponentColor})`;
    lastMoveBlock = `\n[Last Move Played]
Move: ${lastMove.san} (played by ${whoPlayed})
${lastMove.classification ? `Classification: ${lastMove.classification}` : ''}
${evalShift !== null ? `Eval change: ${Number(evalShift) >= 0 ? '+' : ''}${evalShift} pawns` : ''}
${lastMove.bestMove ? `Engine's best was: ${lastMove.bestMove}` : ''}`;
  }

  return `VOICE CHAT — You are a chess coach playing a live game against a student.
YOU are playing as ${opponentColor}. The student is playing as ${playerLabel}.
You are both the opponent AND the coach — you make the ${opponentColor} moves, and you also answer the student's questions about the game.

The student is speaking via microphone. Your responses are spoken aloud, so:
1. NEVER start with filler like "Great question!", "Excellent!", "Good thinking!", etc. Jump straight to the answer.
2. When the student asks what to play: ALWAYS name the specific move from the engine analysis in plain English ("move your knight to f3"). No vague advice.
3. When the student asks about a move (yours or theirs): use the [Last Move Played] data. Say if it was good/inaccuracy/mistake and why.
4. Keep responses to 1-2 sentences. Be direct. Start with the move or the assessment.
5. Say "knight to f3" not "Nf3", "castle kingside" not "O-O".
6. Base advice ONLY on the engine analysis below — never guess about positions.
7. You know this game — you played the ${opponentColor} pieces. Own your moves when asked about them ("I played queen to d6 because...").

[Current Position]
FEN: ${fen}
${pgn ? `PGN: ${pgn}` : ''}
You play: ${opponentColor} | Student plays: ${playerLabel}
Turn: ${turnLabel} to move
${engineBlock}
${lastMoveBlock}`;
}

/**
 * Inline mic button for the board controls bar.
 * Voice-to-voice only — no text bubble. Continuous listening stays on
 * until the user taps again. LLM responses are spoken aloud.
 */
/** Common opening name patterns users might say via voice. */
const OPENING_REQUEST_RE = /\b(?:play|use|try|do|go with|switch to|let'?s (?:play|try|do))\b.*?\b(french|sicilian|caro[- ]?kann|italian|spanish|ruy lopez|queen'?s gambit|king'?s indian|english|pirc|scandinavian|alekhine|dutch|london|scotch|vienna|petroff|philidor|nimzo[- ]?indian|grunfeld|slav|catalan|benoni|bogo[- ]?indian)\b/i;

function detectOpeningRequest(text: string): string | null {
  const match = OPENING_REQUEST_RE.exec(text);
  if (!match) return null;
  const raw = match[1].toLowerCase().replace(/-/g, ' ');
  const nameMap: Record<string, string> = {
    french: 'French Defense',
    sicilian: 'Sicilian Defense',
    'caro kann': 'Caro-Kann Defense',
    italian: 'Italian Game',
    spanish: 'Spanish Opening',
    'ruy lopez': 'Ruy Lopez',
    "queen's gambit": "Queen's Gambit",
    'queens gambit': "Queen's Gambit",
    "king's indian": "King's Indian Defense",
    'kings indian': "King's Indian Defense",
    english: 'English Opening',
    pirc: 'Pirc Defense',
    scandinavian: 'Scandinavian Defense',
    alekhine: "Alekhine's Defense",
    dutch: 'Dutch Defense',
    london: 'London System',
    scotch: 'Scotch Game',
    vienna: 'Vienna Game',
    petroff: "Petrov's Defense",
    philidor: "Philidor Defense",
    'nimzo indian': 'Nimzo-Indian Defense',
    grunfeld: 'Grunfeld Defense',
    slav: 'Slav Defense',
    catalan: 'Catalan Opening',
    benoni: 'Benoni Defense',
    'bogo indian': 'Bogo-Indian Defense',
  };
  return nameMap[raw] ?? raw;
}

export function VoiceChatMic({ fen, pgn, turn, playerColor = 'white', onOpeningRequest, engineSnapshot, lastMoveContext, onListeningChange }: VoiceChatMicProps): JSX.Element {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unsupportedFlash, setUnsupportedFlash] = useState(false);
  const listeningRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Notify parent when voice is active (listening or speaking response)
  useEffect(() => {
    onListeningChange?.(listening || isStreaming);
  }, [listening, isStreaming, onListeningChange]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleUserMessage = useCallback(async (text: string) => {
    // Detect opening requests (e.g. "play the French Defense")
    const requestedOpening = detectOpeningRequest(text);
    if (requestedOpening && onOpeningRequest) {
      onOpeningRequest(requestedOpening);
    }

    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentMessages = [...messagesRef.current, userMsg];
    setMessages(currentMessages);
    setIsStreaming(true);

    // Use pre-computed engine data if available (fast path), otherwise run Stockfish
    let engineData: EngineSnapshot | null = engineSnapshot ?? null;
    if (!engineData) {
      try {
        const analysis = await stockfishEngine.analyzePosition(fen, VOICE_ENGINE_DEPTH);
        engineData = {
          bestMove: uciMoveToSan(analysis.bestMove, fen),
          evaluation: analysis.evaluation,
          isMate: analysis.isMate,
          mateIn: analysis.mateIn,
          topLines: analysis.topLines.map((l) => ({
            moves: [uciLinesToSan(l.moves, fen, 5)],
            evaluation: l.evaluation,
            mate: l.mate,
          })),
        };
      } catch {
        // Continue without engine data if Stockfish fails
      }
    }

    const recent = currentMessages.slice(-(MAX_HISTORY_PAIRS * 2));
    const formatted = recent.map((m) => ({ role: m.role, content: m.content }));
    const systemAddition = buildSystemAddition(fen, pgn, turn, playerColor, engineData, lastMoveContext);

    // Stream sentences to speech as they arrive — speak starts on first sentence,
    // subsequent sentences queue without canceling, so speech finishes ~when tokens do.
    let sentenceBuffer = '';
    let isFirstSentence = true;

    const flushSentence = (sentence: string): void => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      if (isFirstSentence) {
        void voiceService.speakForced(trimmed);
        isFirstSentence = false;
      } else {
        voiceService.speakQueuedForced(trimmed);
      }
    };

    const onChunk = (chunk: string): void => {
      sentenceBuffer += chunk;
      // Split on sentence-ending punctuation followed by a space or end
      const match = sentenceBuffer.match(/^(.*?[.!?])\s+(.*)$/s);
      if (match) {
        flushSentence(match[1]);
        sentenceBuffer = match[2];
      }
    };

    const response = await getCoachChatResponse(
      formatted,
      systemAddition,
      onChunk,
      'hint', // Use Haiku for speed — voice responses must be fast
      250, // Low token limit — voice needs 1-3 sentences, not paragraphs
    );

    // Flush any remaining text
    flushSentence(sentenceBuffer);

    const assistantMsg: ChatMessage = {
      id: `voice-${Date.now()}-resp`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(false);
  }, [fen, pgn, turn, playerColor, engineSnapshot, lastMoveContext, onOpeningRequest]);

  // Keep a ref to handleUserMessage so the onResult callback always uses the latest
  const handleUserMessageRef = useRef(handleUserMessage);
  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  const restartListening = useCallback(() => {
    if (listeningRef.current) {
      setTimeout(() => {
        if (listeningRef.current) {
          voiceInputService.startListening();
        }
      }, 200);
    }
  }, []);

  useEffect(() => {
    voiceInputService.onResult((transcript: string) => {
      if (transcript.trim()) {
        void handleUserMessageRef.current(transcript.trim());
      }
      restartListening();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMicToggle = useCallback(() => {
    if (!voiceInputService.isSupported()) {
      setUnsupportedFlash(true);
      setTimeout(() => setUnsupportedFlash(false), 2000);
      return;
    }
    // Warm up Web Speech in this gesture context so iOS doesn't block TTS later
    speechService.warmupInGestureContext();

    if (listening) {
      voiceInputService.stopListening();
      setListening(false);
    } else {
      const started = voiceInputService.startListening();
      setListening(started);
    }
  }, [listening]);

  return (
    <div className="relative" data-testid="voice-chat-mic">
      <AnimatePresence>
        {unsupportedFlash && (
          <motion.span
            className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] text-red-400 bg-theme-surface border border-theme-border rounded px-1.5 py-0.5 whitespace-nowrap z-20"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            data-testid="voice-unsupported-msg"
          >
            Mic not supported
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleMicToggle}
        disabled={isStreaming}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
          listening
            ? 'bg-red-500/15 text-red-500 border border-red-500'
            : 'bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text'
        } disabled:opacity-50`}
        animate={listening ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={listening ? { duration: 1.2, repeat: Infinity } : {}}
        title={listening ? 'Stop listening' : 'Talk to coach'}
        aria-label={listening ? 'Stop listening' : 'Talk to coach'}
        data-testid="voice-chat-mic-btn"
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
        <span>{listening ? 'Stop' : 'Ask'}</span>
      </motion.button>
    </div>
  );
}

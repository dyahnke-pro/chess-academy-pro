import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { speechService } from '../../services/speechService';
import { getCoachChatResponse } from '../../services/coachApi';
import { stockfishEngine } from '../../services/stockfishEngine';
import { uciMoveToSan, uciLinesToSan } from '../../utils/uciToSan';
import type { ChatMessage, BoardArrow } from '../../types';

/** Parse [ARROW:from:to] tags from LLM response. Returns arrows and cleaned text. */
function extractArrows(text: string): { arrows: BoardArrow[]; cleanText: string } {
  const ARROW_RE = /\[ARROW:([a-h][1-8]):([a-h][1-8])\]/gi;
  const arrows: BoardArrow[] = [];
  let match: RegExpExecArray | null;
  while ((match = ARROW_RE.exec(text)) !== null) {
    arrows.push({
      startSquare: match[1],
      endSquare: match[2],
      color: 'rgba(255, 170, 0, 0.85)',
    });
  }
  const cleanText = text.replace(ARROW_RE, '').replace(/\s{2,}/g, ' ').trim();
  return { arrows, cleanText };
}

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
  /** Called when the LLM response includes arrow annotations for the board. */
  onArrows?: (arrows: BoardArrow[]) => void;
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
  const opponentColor = playerColor === 'white' ? 'Black' : 'White';
  const playerLabel = playerColor === 'white' ? 'White' : 'Black';
  const isStudentTurn = (turn === 'w' && playerColor === 'white') || (turn === 'b' && playerColor === 'black');
  const sideToMove = turn === 'b' ? 'Black' : 'White';
  const sideToMoveRole = isStudentTurn ? 'STUDENT' : 'COACH';

  // Engine block — label every move with whose move it is
  let engineBlock = '';
  if (engineData) {
    const bestMoveLabel = isStudentTurn
      ? `Best move for the STUDENT (${playerLabel}): ${engineData.bestMove}`
      : `Best move for the COACH (${opponentColor}): ${engineData.bestMove} ← THIS IS YOUR MOVE, NOT THE STUDENT'S`;

    const evalNum = engineData.isMate
      ? `Mate in ${engineData.mateIn}`
      : `${(engineData.evaluation / 100).toFixed(1)} pawns`;
    const evalExplain = engineData.evaluation > 0 ? '(White is better)' : engineData.evaluation < 0 ? '(Black is better)' : '(equal)';

    const lines = engineData.topLines.slice(0, 3).map(
      (l, i) => `Line ${i + 1}: ${l.moves.join(' ')} (${l.mate !== null ? `M${l.mate}` : (l.evaluation / 100).toFixed(1)})`,
    );

    engineBlock = `
[Engine Analysis — TRUST THIS DATA, DO NOT GUESS]
It is currently ${sideToMove}'s turn (the ${sideToMoveRole}).
${bestMoveLabel}
Evaluation: ${evalNum} ${evalExplain}
${lines.join('\n')}`;
  }

  // Last move block — label whose move and what color piece moved
  let lastMoveBlock = '';
  if (lastMove) {
    const evalShift = lastMove.evalBefore !== null && lastMove.evalAfter !== null
      ? ((lastMove.evalAfter - lastMove.evalBefore) / 100).toFixed(1)
      : null;
    const isStudentMove = lastMove.player === 'you';
    const whoPlayed = isStudentMove
      ? `the STUDENT (${playerLabel} pieces)`
      : `the COACH, which is you (${opponentColor} pieces)`;
    const colorMoved = isStudentMove ? playerLabel : opponentColor;

    lastMoveBlock = `
[Last Move Played]
Move: ${lastMove.san} — a ${colorMoved} move played by ${whoPlayed}
${lastMove.classification ? `Classification: ${lastMove.classification}` : ''}
${evalShift !== null ? `Eval change: ${Number(evalShift) >= 0 ? '+' : ''}${evalShift} pawns` : ''}
${lastMove.bestMove ? `Engine's best move was: ${lastMove.bestMove} (for ${colorMoved})` : ''}`;
  }

  return `VOICE CHAT — You are a chess coach playing a live game against a student.

[ROLES — READ CAREFULLY]
- YOU (the coach/AI) are playing the ${opponentColor} pieces.
- The STUDENT is playing the ${playerLabel} pieces.
- The student's pieces are on the BOTTOM of the board. Your pieces are on the TOP.
- You are both the opponent AND the coach — you make ${opponentColor} moves AND answer questions.

[RULES FOR RESPONDING — YOUR RESPONSES ARE SPOKEN ALOUD VIA TEXT-TO-SPEECH]
1. NEVER start with "Great question!", "Excellent!", "Good thinking!" — jump straight to the answer.
2. When the student asks what THEY should play: ONLY suggest ${playerLabel} moves. ${isStudentTurn
    ? `It IS the student's turn — tell them the best move from [Engine Analysis].`
    : `It is NOT the student's turn right now (it's your turn as ${opponentColor}). Talk about the position or their last move instead.`}
3. CRITICAL: The student plays ${playerLabel}. NEVER suggest a ${opponentColor} move as the student's move. ${opponentColor} moves are YOUR moves.
4. When the student asks about a move: use [Last Move Played]. Say if it was good/inaccuracy/mistake and why.
5. Keep responses to 1-2 sentences. Be direct.
6. CRITICAL — SPEAK LIKE A HUMAN, NOT A COMPUTER. Your response is read aloud by text-to-speech. NEVER output chess notation like "Nc3", "Qd8", "O-O", "e4", "Bxf7", etc. ALWAYS translate moves into plain spoken English. Examples:
   - "Nc3" → "move your knight to c3"
   - "Qd8" → "queen back to d8"
   - "O-O" → "castle kingside"
   - "Bxf7" → "take the pawn on f7 with your bishop"
   - "e4" → "push your pawn to e4"
   - "exd5" → "capture on d5 with your e pawn"
   Also explain WHY the move is good in plain language. For example: "Move your knight to c3 — it develops a piece and attacks their queen, forcing it to retreat."
7. Base advice ONLY on the engine data below — never guess.
8. Own your moves: "I played my queen to d6 because..." (you are ${opponentColor}).
9. ARROWS: If the student asks you to "show me" a move on the board, include [ARROW:from:to] at the END of your response. Use lowercase algebraic squares (e.g. [ARROW:e2:e4]). You can include multiple arrows. Only add arrows when the student asks to see something on the board — do NOT add them by default.

[Current Position]
FEN: ${fen}
${pgn ? `PGN so far: ${pgn}` : 'Game just started — no moves yet.'}
STUDENT color: ${playerLabel} (bottom of board)
COACH color: ${opponentColor} (top of board, that's you)
Current turn: ${sideToMove} to move (the ${sideToMoveRole})
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

export function VoiceChatMic({ fen, pgn, turn, playerColor = 'white', onOpeningRequest, engineSnapshot, lastMoveContext, onListeningChange, onArrows }: VoiceChatMicProps): JSX.Element {
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

    // Use pre-computed engine data if available AND valid, otherwise run Stockfish
    let engineData: EngineSnapshot | null = engineSnapshot ?? null;
    if (engineData && (!engineData.bestMove || engineData.topLines.length === 0)) {
      engineData = null;
    }
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

    const rawResponse = await getCoachChatResponse(
      formatted,
      systemAddition,
      onChunk,
      'chat_response', // Sonnet — Haiku is too weak to follow the engine analysis prompt
      300,
    );

    // Extract arrow annotations before flushing remaining speech
    const { arrows: responseArrows, cleanText: response } = extractArrows(rawResponse);

    // Flush remaining text (cleaned of arrow tags)
    const { cleanText: cleanBuffer } = extractArrows(sentenceBuffer);
    flushSentence(cleanBuffer);

    // Send arrows to the board if the LLM included any
    if (responseArrows.length > 0 && onArrows) {
      onArrows(responseArrows);
    }

    const assistantMsg: ChatMessage = {
      id: `voice-${Date.now()}-resp`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(false);
  }, [fen, pgn, turn, playerColor, engineSnapshot, lastMoveContext, onOpeningRequest, onArrows]);

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

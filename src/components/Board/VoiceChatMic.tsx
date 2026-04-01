import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { getCoachChatResponse } from '../../services/coachApi';
import type { ChatMessage } from '../../types';

interface VoiceChatMicProps {
  fen: string;
  pgn?: string;
  turn?: 'w' | 'b';
}

const MAX_HISTORY_PAIRS = 6;

function buildSystemAddition(fen: string, pgn: string | undefined, turn: string | undefined): string {
  const turnLabel = turn === 'b' ? 'Black' : 'White';
  return `VOICE CHAT — The student is speaking to you via microphone.
Keep responses concise (2-3 sentences max) since they will be spoken aloud.
Use simple language — avoid notation like "Nf3" unless the student uses it first.

[Current Position]
FEN: ${fen}
${pgn ? `PGN: ${pgn}` : ''}
Turn: ${turnLabel} to move

Respond naturally as a chess coach reviewing the board with the student.`;
}

/**
 * Inline mic button for the board controls bar.
 * Voice-to-voice only — no text bubble. Continuous listening stays on
 * until the user taps again. LLM responses are spoken aloud.
 */
export function VoiceChatMic({ fen, pgn, turn }: VoiceChatMicProps): JSX.Element {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unsupportedFlash, setUnsupportedFlash] = useState(false);
  const listeningRef = useRef(false);
  const speechBufferRef = useRef('');
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
        void handleUserMessage(transcript.trim());
      }
      restartListening();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `voice-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const currentMessages = [...messagesRef.current, userMsg];
    setMessages(currentMessages);
    setIsStreaming(true);
    speechBufferRef.current = '';

    const recent = currentMessages.slice(-(MAX_HISTORY_PAIRS * 2));
    const formatted = recent.map((m) => ({ role: m.role, content: m.content }));
    const systemAddition = buildSystemAddition(fen, pgn, turn);

    const response = await getCoachChatResponse(
      formatted,
      systemAddition,
      (chunk) => {
        speechBufferRef.current += chunk;
        const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
        if (sentenceEnd) {
          const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
          speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
          void voiceService.speak(sentence.trim());
        }
      },
    );

    if (speechBufferRef.current.trim()) {
      void voiceService.speak(speechBufferRef.current.trim());
      speechBufferRef.current = '';
    }

    const assistantMsg: ChatMessage = {
      id: `voice-${Date.now()}-resp`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(false);
  }, [fen, pgn, turn]);

  const handleMicToggle = useCallback(() => {
    if (!voiceInputService.isSupported()) {
      setUnsupportedFlash(true);
      setTimeout(() => setUnsupportedFlash(false), 2000);
      return;
    }
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

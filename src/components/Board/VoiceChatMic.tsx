import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, X, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { getCoachChatResponse } from '../../services/coachApi';
import { useAppStore } from '../../stores/appStore';
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

export function VoiceChatMic({ fen, pgn, turn }: VoiceChatMicProps): JSX.Element {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(() => useAppStore.getState().coachVoiceOn);
  const listeningRef = useRef(false);
  const voiceSupported = voiceInputService.isSupported();
  const speechBufferRef = useRef('');

  // Sync listening ref
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Register voice result handler
  useEffect(() => {
    voiceInputService.onResult((transcript: string) => {
      if (transcript.trim()) {
        void handleUserMessage(transcript.trim());
      }
      // Don't restart — single-shot per tap
      setListening(false);
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

    setMessages((prev) => [...prev, userMsg]);
    setShowBubble(true);
    setIsStreaming(true);
    setStreamingContent('');
    speechBufferRef.current = '';

    // Build message history for context (last N pairs + new message)
    const allMessages = [...messages, userMsg];
    const recent = allMessages.slice(-(MAX_HISTORY_PAIRS * 2));
    const formatted = recent.map((m) => ({ role: m.role, content: m.content }));

    const systemAddition = buildSystemAddition(fen, pgn, turn);

    let fullResponse = '';
    const response = await getCoachChatResponse(
      formatted,
      systemAddition,
      (chunk) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);

        // Buffer speech to sentence boundaries
        if (speakEnabled) {
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
    if (speechBufferRef.current.trim() && speakEnabled) {
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
    setStreamingContent('');
  }, [messages, fen, pgn, turn, speakEnabled]);

  const handleMicToggle = useCallback(() => {
    if (listening) {
      voiceInputService.stopListening();
      setListening(false);
    } else {
      const started = voiceInputService.startListening();
      setListening(started);
    }
  }, [listening]);

  const handleCloseBubble = useCallback(() => {
    setShowBubble(false);
  }, []);

  const toggleSpeak = useCallback(() => {
    setSpeakEnabled((prev) => !prev);
  }, []);

  // Get last assistant message for display
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const displayText = isStreaming
    ? streamingContent
    : lastAssistantMsg?.content ?? '';

  if (!voiceSupported) return <></>;

  return (
    <div className="relative flex items-center justify-center" data-testid="voice-chat-mic">
      {/* Response bubble */}
      <AnimatePresence>
        {showBubble && displayText && (
          <motion.div
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 max-h-40 overflow-y-auto rounded-xl bg-theme-surface border border-theme-border shadow-lg p-3 z-20"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            data-testid="voice-chat-bubble"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-theme-text leading-relaxed flex-1">
                {displayText}
                {isStreaming && (
                  <span className="inline-block ml-1 animate-pulse">...</span>
                )}
              </p>
              <button
                onClick={handleCloseBubble}
                className="shrink-0 p-0.5 rounded text-theme-text-muted hover:text-theme-text"
                aria-label="Close response"
                data-testid="voice-chat-close"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speak toggle */}
      <button
        onClick={toggleSpeak}
        className={`p-1.5 rounded-md transition-colors ${
          speakEnabled
            ? 'text-theme-accent'
            : 'text-theme-text-muted hover:text-theme-text'
        }`}
        title={speakEnabled ? 'Mute coach voice' : 'Enable coach voice'}
        aria-label={speakEnabled ? 'Mute coach voice' : 'Enable coach voice'}
        data-testid="voice-chat-speak-toggle"
      >
        {speakEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </button>

      {/* Mic button */}
      <motion.button
        onClick={handleMicToggle}
        disabled={isStreaming}
        className={`p-2 rounded-full transition-colors ${
          listening
            ? 'bg-red-500/15 text-red-500 border border-red-500'
            : 'bg-theme-surface hover:bg-theme-border text-theme-text-muted hover:text-theme-text border border-theme-border'
        } disabled:opacity-50`}
        animate={listening ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={listening ? { duration: 1, repeat: Infinity } : {}}
        title={listening ? 'Stop listening' : 'Talk to coach'}
        aria-label={listening ? 'Stop listening' : 'Talk to coach'}
        data-testid="voice-chat-mic-btn"
      >
        {listening ? <MicOff size={16} /> : <Mic size={16} />}
      </motion.button>
    </div>
  );
}

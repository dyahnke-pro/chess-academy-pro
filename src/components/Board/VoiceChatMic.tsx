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

/**
 * Compact floating mic button — meant to be placed inside a `relative`
 * container. Renders at the bottom-right corner of the parent.
 *
 * Always renders (even without Web Speech API) — tapping when unsupported
 * shows a brief "not supported" tooltip instead of hiding the button.
 */
export function VoiceChatMic({ fen, pgn, turn }: VoiceChatMicProps): JSX.Element {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(() => useAppStore.getState().coachVoiceOn);
  const [unsupportedFlash, setUnsupportedFlash] = useState(false);
  const listeningRef = useRef(false);
  const speechBufferRef = useRef('');

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  // Register voice result handler once
  useEffect(() => {
    voiceInputService.onResult((transcript: string) => {
      if (transcript.trim()) {
        void handleUserMessage(transcript.trim());
      }
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

  const handleCloseBubble = useCallback(() => {
    setShowBubble(false);
  }, []);

  const toggleSpeak = useCallback(() => {
    setSpeakEnabled((prev) => !prev);
  }, []);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const displayText = isStreaming
    ? streamingContent
    : lastAssistantMsg?.content ?? '';

  return (
    <div
      className="absolute bottom-1 right-1 z-10 flex items-center gap-1"
      data-testid="voice-chat-mic"
    >
      {/* "Not supported" flash */}
      <AnimatePresence>
        {unsupportedFlash && (
          <motion.span
            className="text-[10px] text-red-400 bg-theme-surface/90 border border-theme-border rounded px-1.5 py-0.5 whitespace-nowrap"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            data-testid="voice-unsupported-msg"
          >
            Mic not supported
          </motion.span>
        )}
      </AnimatePresence>

      {/* Response bubble — floats above the mic */}
      <AnimatePresence>
        {showBubble && displayText && (
          <motion.div
            className="absolute bottom-full right-0 mb-2 w-64 max-h-36 overflow-y-auto rounded-xl bg-theme-surface border border-theme-border shadow-lg p-2.5 z-20"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            data-testid="voice-chat-bubble"
          >
            <div className="flex items-start justify-between gap-1.5">
              <p className="text-[11px] text-theme-text leading-relaxed flex-1">
                {displayText}
                {isStreaming && (
                  <span className="inline-block ml-0.5 animate-pulse">...</span>
                )}
              </p>
              <button
                onClick={handleCloseBubble}
                className="shrink-0 p-0.5 rounded text-theme-text-muted hover:text-theme-text"
                aria-label="Close response"
                data-testid="voice-chat-close"
              >
                <X size={10} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speak toggle */}
      <button
        onClick={toggleSpeak}
        className={`p-1 rounded-md transition-colors backdrop-blur-sm ${
          speakEnabled
            ? 'text-theme-accent bg-theme-surface/70'
            : 'text-theme-text-muted hover:text-theme-text bg-theme-surface/50'
        }`}
        title={speakEnabled ? 'Mute coach voice' : 'Enable coach voice'}
        aria-label={speakEnabled ? 'Mute coach voice' : 'Enable coach voice'}
        data-testid="voice-chat-speak-toggle"
      >
        {speakEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
      </button>

      {/* Mic button */}
      <motion.button
        onClick={handleMicToggle}
        disabled={isStreaming}
        className={`p-1.5 rounded-full shadow-md transition-colors ${
          listening
            ? 'bg-red-500 text-white'
            : 'bg-theme-accent/90 text-white hover:bg-theme-accent'
        } disabled:opacity-50`}
        animate={listening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={listening ? { duration: 1, repeat: Infinity } : {}}
        title={listening ? 'Stop listening' : 'Talk to coach'}
        aria-label={listening ? 'Stop listening' : 'Talk to coach'}
        data-testid="voice-chat-mic-btn"
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
      </motion.button>
    </div>
  );
}

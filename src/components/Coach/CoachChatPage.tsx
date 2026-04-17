import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeOff } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCoachSessionStore } from '../../stores/coachSessionStore';
import { getChatSystemPromptAdditions, loadAnalysisContext } from '../../services/coachChatService';
import { routeChatIntent } from '../../services/coachIntentRouter';
import { runCoachTurn } from '../../services/coachAgentRunner';
import { voiceService } from '../../services/voiceService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function CoachChatPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const chatMessages = useCoachSessionStore((s) => s.messages);
  const appendMessage = useCoachSessionStore((s) => s.appendMessage);
  const hydrate = useCoachSessionStore((s) => s.hydrate);
  const hydrated = useCoachSessionStore((s) => s.hydrated);
  const setCurrentRoute = useCoachSessionStore((s) => s.setCurrentRoute);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [analysisContext, setAnalysisContext] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechBufferRef = useRef('');
  const voiceMutedRef = useRef(true);

  // Hydrate persisted session on mount and publish current route.
  useEffect(() => {
    if (!hydrated) void hydrate();
    setCurrentRoute('/coach/chat');
  }, [hydrate, hydrated, setCurrentRoute]);

  // Keep ref in sync for use inside streaming callback
  useEffect(() => {
    voiceMutedRef.current = voiceMuted;
  }, [voiceMuted]);

  // Load game analysis context on mount
  useEffect(() => {
    const username = activeProfile?.preferences.chessComUsername
      ?? activeProfile?.preferences.lichessUsername;
    void loadAnalysisContext(username ?? undefined).then(setAnalysisContext);
  }, [activeProfile]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  // Buffer speech to sentence boundaries
  const flushSpeechBuffer = useCallback(() => {
    const buffer = speechBufferRef.current;
    if (buffer.trim() && !voiceMutedRef.current) {
      void voiceService.speak(buffer.trim());
    }
    speechBufferRef.current = '';
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!activeProfile || isStreaming) return;

    // Fast-path: deterministic intent router for explicit phrases like
    // "play the KIA against me" or "review my last Catalan". Routes
    // instantly without an LLM round-trip. Falls through to the agent
    // loop for everything it doesn't recognize — that's where actions
    // like list_games / start_play with arbitrary openings live.
    try {
      const lastAssistantMessage = [...chatMessages]
        .reverse()
        .find((m) => m.role === 'assistant')?.content;
      const routed = await routeChatIntent(text, { lastAssistantMessage });
      if (routed) {
        appendMessage({
          id: `msg-${Date.now()}-u`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
        appendMessage({
          id: `msg-${Date.now()}-ack`,
          role: 'assistant',
          content: routed.ackMessage,
          timestamp: Date.now(),
        });
        if (routed.path) {
          void navigate(routed.path);
        }
        return;
      }
    } catch (err: unknown) {
      console.warn('[CoachChatPage] intent routing failed:', err);
    }

    // Agent loop: build snapshot, call LLM, dispatch any [[ACTION:]]
    // tags it emits. The runner appends both user + assistant messages
    // to the session store; this view just renders them.
    setIsStreaming(true);
    setStreamingContent('');
    speechBufferRef.current = '';

    const extraSystem = analysisContext
      ? `${getChatSystemPromptAdditions(true)}\n\n${analysisContext}`
      : getChatSystemPromptAdditions(false);

    let streamed = '';
    try {
      await runCoachTurn({
        userText: text,
        navigate: (path: string) => { void navigate(path); },
        extraSystemPrompt: extraSystem,
        onChunk: (chunk: string) => {
          streamed += chunk;
          setStreamingContent(streamed);

          if (!voiceMutedRef.current) {
            speechBufferRef.current += chunk;
            const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
            if (sentenceEnd) {
              const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
              speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
              void voiceService.speak(sentence.trim());
            }
          }
        },
      });
      if (speechBufferRef.current.trim()) {
        flushSpeechBuffer();
      }
    } catch (err) {
      console.warn('[CoachChatPage] agent turn failed:', err);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [activeProfile, chatMessages, isStreaming, appendMessage, flushSpeechBuffer, analysisContext, navigate]);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] pb-16 md:pb-0 max-w-2xl mx-auto w-full" data-testid="coach-chat-page">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-theme-border">
        <button
          onClick={() => void navigate('/coach')}
          className="p-1.5 rounded-lg hover:bg-theme-surface transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-theme-accent"
        >
          C
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-theme-text">
            Chat with Coach
          </h2>
          <p className="text-xs text-theme-text-muted">
            {isStreaming ? 'Typing...' : 'Online'}
          </p>
        </div>
        <button
          onClick={() => {
            setVoiceMuted((prev) => !prev);
            if (!voiceMuted) voiceService.stop();
          }}
          className="p-2 rounded-lg hover:bg-theme-surface transition-colors"
          data-testid="voice-toggle"
          title={voiceMuted ? 'Unmute voice' : 'Mute voice'}
        >
          {voiceMuted
            ? <VolumeOff size={18} className="text-theme-text-muted" />
            : <Volume2 size={18} className="text-theme-accent" />
          }
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 space-y-4">
        {chatMessages.length === 0 && !isStreaming && (
          <motion.div
            className="flex flex-col items-center gap-4 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-theme-accent"
            >
              C
            </div>
            <div className="text-center max-w-xs">
              <p className="text-sm font-medium text-theme-text">
                Your coach is ready to chat
              </p>
              <p className="text-xs text-theme-text-muted mt-1">
                Ask about positions, openings, strategy, or just say hello!
              </p>
            </div>
          </motion.div>
        )}

        {chatMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
          />
        ))}

        {isStreaming && streamingContent && (
          <ChatMessage
            message={{
              id: 'streaming',
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
              id: 'streaming-empty',
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
        placeholder="Ask your coach anything..."
      />
    </div>
  );
}

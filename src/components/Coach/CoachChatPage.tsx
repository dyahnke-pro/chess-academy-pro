import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeOff } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getCoachChatResponse } from '../../services/coachApi';
import { buildChatMessages, parseActionTags, getChatSystemPromptAdditions, loadAnalysisContext } from '../../services/coachChatService';
import { routeChatIntent } from '../../services/coachIntentRouter';
import { voiceService } from '../../services/voiceService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '../../types';

export function CoachChatPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [analysisContext, setAnalysisContext] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechBufferRef = useRef('');
  const voiceMutedRef = useRef(true);

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

    // Add user message
    const userMsg: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);

    // Intent routing: if this message resolves to a dynamic session,
    // acknowledge in chat and navigate instead of calling the LLM.
    // Pre-validation inside routeChatIntent ensures false-positive
    // intents (e.g. "teach me about forks") fall through to QA.
    try {
      const routed = await routeChatIntent(text);
      if (routed) {
        const ackMsg: ChatMessageType = {
          id: `msg-${Date.now()}-ack`,
          role: 'assistant',
          content: routed.ackMessage,
          timestamp: Date.now(),
        };
        addChatMessage(ackMsg);
        void navigate(routed.path);
        return;
      }
    } catch (err: unknown) {
      // Router failures should never block the LLM fallback.
      console.warn('[CoachChatPage] intent routing failed:', err);
    }

    // Start streaming response
    setIsStreaming(true);
    setStreamingContent('');
    speechBufferRef.current = '';

    const allMessages = [...chatMessages, userMsg];
    const formattedMessages = buildChatMessages(allMessages, activeProfile, analysisContext || undefined);
    const systemAdditions = getChatSystemPromptAdditions(!!analysisContext);

    let fullResponse = '';

    const response = await getCoachChatResponse(
      formattedMessages,
      systemAdditions,
      (chunk) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);

        // Buffer speech to sentence boundaries (skip if muted)
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
    );

    // Flush remaining speech buffer
    if (speechBufferRef.current.trim()) {
      flushSpeechBuffer();
    }

    // Parse action tags
    const { cleanText, actions } = parseActionTags(response);

    // Add assistant message
    const assistantMsg: ChatMessageType = {
      id: `msg-${Date.now()}-resp`,
      role: 'assistant',
      content: cleanText,
      timestamp: Date.now(),
      metadata: {
        actions: actions.length > 0 ? actions : undefined,
      },
    };
    addChatMessage(assistantMsg);

    setIsStreaming(false);
    setStreamingContent('');
  }, [activeProfile, chatMessages, isStreaming, addChatMessage, flushSpeechBuffer, analysisContext, navigate]);

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

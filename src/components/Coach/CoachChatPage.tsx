import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { getCoachChatResponse } from '../../services/coachApi';
import { buildChatMessages, parseActionTags, detectExpression, getChatSystemPromptAdditions, resetExpressionDebounce } from '../../services/coachChatService';
import { voiceService } from '../../services/voiceService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType, CoachPersonality } from '../../types';

const PERSONALITY_COLORS: Record<CoachPersonality, string> = {
  danya: '#4F9D69',
  kasparov: '#C62828',
  fischer: '#1565C0',
};

export function CoachChatPage(): JSX.Element {
  const navigate = useNavigate();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setCoachExpression = useAppStore((s) => s.setCoachExpression);
  const setCoachSpeaking = useAppStore((s) => s.setCoachSpeaking);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechBufferRef = useRef('');

  const personality = activeProfile?.coachPersonality ?? 'danya';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  // Reset expression debounce on mount
  useEffect(() => {
    resetExpressionDebounce();
  }, []);

  // Buffer speech to sentence boundaries
  const flushSpeechBuffer = useCallback(() => {
    const buffer = speechBufferRef.current;
    if (buffer.trim()) {
      void voiceService.speak(buffer.trim(), personality);
      setCoachSpeaking(true);
      speechBufferRef.current = '';
    }
  }, [personality, setCoachSpeaking]);

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

    // Start streaming response
    setIsStreaming(true);
    setStreamingContent('');
    setCoachExpression('thinking');
    speechBufferRef.current = '';

    const allMessages = [...chatMessages, userMsg];
    const formattedMessages = buildChatMessages(allMessages, activeProfile);
    const systemAdditions = getChatSystemPromptAdditions(personality);

    let fullResponse = '';

    const response = await getCoachChatResponse(
      formattedMessages,
      personality,
      systemAdditions,
      (chunk) => {
        fullResponse += chunk;
        setStreamingContent(fullResponse);

        // Detect expression from streaming content
        const expression = detectExpression(fullResponse);
        if (expression !== 'neutral') {
          setCoachExpression(expression);
        }

        // Buffer speech to sentence boundaries
        speechBufferRef.current += chunk;
        const sentenceEnd = /[.!?]\s/.exec(speechBufferRef.current);
        if (sentenceEnd) {
          const sentence = speechBufferRef.current.slice(0, sentenceEnd.index + 1);
          speechBufferRef.current = speechBufferRef.current.slice(sentenceEnd.index + 2);
          void voiceService.speak(sentence.trim(), personality);
          setCoachSpeaking(true);
        }
      },
    );

    // Flush remaining speech buffer
    if (speechBufferRef.current.trim()) {
      flushSpeechBuffer();
    }

    // Parse action tags
    const { cleanText, actions } = parseActionTags(response);
    const expression = detectExpression(cleanText);

    // Add assistant message
    const assistantMsg: ChatMessageType = {
      id: `msg-${Date.now()}-resp`,
      role: 'assistant',
      content: cleanText,
      timestamp: Date.now(),
      metadata: {
        actions: actions.length > 0 ? actions : undefined,
        expression: expression !== 'neutral' ? expression : undefined,
      },
    };
    addChatMessage(assistantMsg);

    setIsStreaming(false);
    setStreamingContent('');
    setCoachExpression(expression);

    // Stop speaking indicator after a delay
    setTimeout(() => setCoachSpeaking(false), 2000);
  }, [activeProfile, chatMessages, isStreaming, personality, addChatMessage, setCoachExpression, setCoachSpeaking, flushSpeechBuffer]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full" data-testid="coach-chat-page">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-theme-border">
        <button
          onClick={() => void navigate('/coach')}
          className="p-1.5 rounded-lg hover:bg-theme-surface transition-colors"
        >
          <ArrowLeft size={20} className="text-theme-text" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: PERSONALITY_COLORS[personality] }}
        >
          {personality.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-theme-text">
            Chat with {personality.charAt(0).toUpperCase() + personality.slice(1)}
          </h2>
          <p className="text-xs text-theme-text-muted">
            {isStreaming ? 'Typing...' : 'Online'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 && !isStreaming && (
          <motion.div
            className="flex flex-col items-center gap-4 py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: PERSONALITY_COLORS[personality] }}
            >
              {personality.charAt(0).toUpperCase()}
            </div>
            <div className="text-center max-w-xs">
              <p className="text-sm font-medium text-theme-text">
                {personality.charAt(0).toUpperCase() + personality.slice(1)} is ready to chat
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
            personality={personality}
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
            personality={personality}
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
            personality={personality}
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

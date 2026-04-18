import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeOff } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useCoachSessionStore } from '../../stores/coachSessionStore';
import { getChatSystemPromptAdditions, loadAnalysisContext } from '../../services/coachChatService';
import { routeChatIntent } from '../../services/coachIntentRouter';
import { runCoachTurn, detectNarrationToggle, applyNarrationToggle } from '../../services/coachAgentRunner';
import { buildCoachMemoryBlock } from '../../services/coachMemoryService';
import { voiceService } from '../../services/voiceService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { ChatMessage as ChatMessageType } from '../../types';

const STARTER_CHIPS = [
  'Play the Italian against me',
  'Play Black against me',
  'Narrate my last game',
  'Walk me through the Sicilian',
  'Key insights from my last game',
  "What's my worst opening?",
] as const;

/** "Read this to me" / "read that aloud" / "speak it" — user wants the
 *  previous coach message spoken verbatim, not re-summarized. */
const READ_THIS_RE =
  /^\s*(?:please\s+)?(?:read|say|speak|narrate)\s+(?:this|that|it|the\s+(?:last|previous)\s+(?:message|reply|response))(?:\s+(?:to\s+me|aloud|out\s+loud|for\s+me))?[.!?\s]*$/i;

/** Strip markdown/tags so Polly/Web Speech doesn't read "asterisk asterisk
 *  bold asterisk asterisk". Intentionally not a full Markdown parser. */
function stripMarkdownForTts(text: string): string {
  return text
    .replace(/\[BOARD:[^\]]*\]/gi, '')
    .replace(/\[ACTION:[^\]]*\]/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/→/g, 'to')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CoachChatPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const chatMessages = useCoachSessionStore((s) => s.messages);
  const appendMessage = useCoachSessionStore((s) => s.appendMessage);
  const hydrate = useCoachSessionStore((s) => s.hydrate);
  const hydrated = useCoachSessionStore((s) => s.hydrated);
  const setCurrentRoute = useCoachSessionStore((s) => s.setCurrentRoute);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [analysisContext, setAnalysisContext] = useState('');
  const [voiceMuted, setVoiceMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechBufferRef = useRef('');
  const voiceMutedRef = useRef(false);

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

    // Deterministic narration toggle — flips voice on/off reliably
    // without depending on LLM prompt-following. When enabling from
    // the chat page (not mid-game), ALSO navigate to a new play
    // session so "narrate a game while we play" actually starts one.
    const narrationToggle = detectNarrationToggle(text);
    if (narrationToggle) {
      appendMessage({
        id: `msg-${Date.now()}-u`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
      });
      const ack = applyNarrationToggle(narrationToggle.enable);
      appendMessage({
        id: `msg-${Date.now()}-narr`,
        role: 'assistant',
        content: ack,
        timestamp: Date.now(),
      } satisfies ChatMessageType);
      if (narrationToggle.enable) {
        void navigate('/coach/session/play-against?narrate=1');
      }
      return;
    }

    // "Read this to me" — speak the last coach message verbatim
    // (markdown-stripped). Bypass the LLM so the spoken words match
    // what's on screen instead of being paraphrased. Append the user
    // message to the session store so the transcript stays honest.
    if (READ_THIS_RE.test(text)) {
      const lastAssistant = [...chatMessages].reverse().find((m) => m.role === 'assistant');
      if (lastAssistant) {
        appendMessage({
          id: `msg-${Date.now()}-u`,
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
        setVoiceMuted(false);
        voiceMutedRef.current = false;
        voiceService.stop();
        void voiceService.speak(stripMarkdownForTts(lastAssistant.content));
        return;
      }
    }

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

    // Persistent coach memory (cross-session observations about this
     // student). Appended to the system prompt so advice stays
     // consistent across days/weeks.
    const memoryBlock = await buildCoachMemoryBlock();
    const chatAdditions = analysisContext
      ? `${getChatSystemPromptAdditions(true)}\n\n${analysisContext}`
      : getChatSystemPromptAdditions(false);
    const extraSystem = memoryBlock ? `${chatAdditions}\n\n${memoryBlock}` : chatAdditions;

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

  // Auto-send a query carried in the URL (e.g., from the Game Insights
  // search bar navigating here with ?q=...). Runs once per distinct
  // query, strips the param after firing so refreshing doesn't resend,
  // and waits for the profile + hydration to be ready.
  const autoSentQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProfile || !hydrated) return;
    const q = searchParams.get('q');
    if (!q || !q.trim()) return;
    if (autoSentQueryRef.current === q) return;
    autoSentQueryRef.current = q;
    // Strip ?q= immediately so navigating back here doesn't resend it
    // and refreshing stays clean.
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
    void handleSend(q);
  }, [activeProfile, hydrated, searchParams, setSearchParams, handleSend]);

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
            className="flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            data-testid="coach-greeting"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold bg-theme-accent"
            >
              C
            </div>
            <div className="text-center max-w-sm">
              <p className="text-lg font-semibold text-theme-text">
                How can I help you today?
              </p>
              <p className="text-xs text-theme-text-muted mt-2 leading-relaxed">
                I can play you at any strength, narrate your games move-by-move,
                study your history for patterns, walk through openings, and
                answer any chess question.
              </p>
            </div>
            <div className="w-full max-w-md">
              <p className="text-xs text-theme-text-muted mb-2">
                You can ask me to:
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTER_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => void handleSend(chip)}
                    className="text-xs px-3 py-2 rounded-full border border-theme-border bg-theme-surface text-theme-text hover:border-theme-accent hover:text-theme-accent transition-colors"
                    data-testid="coach-starter-chip"
                  >
                    {chip}
                  </button>
                ))}
              </div>
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

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage as ChatMessageType } from '../../types';

/** Render basic markdown-style formatting: **bold** and *italic* */
function renderFormattedText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold** first, then *italic*
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

function ActionButton({ action, onClick }: {
  action: { type: string; id: string };
  onClick: () => void;
}): JSX.Element {
  const labels: Record<string, string> = {
    drill_opening: 'Practice Opening',
    puzzle_theme: 'Try Puzzles',
    review_game: 'Review Game',
    analyse_position: 'Analyse Position',
  };

  return (
    <button
      onClick={onClick}
      className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-theme-accent text-theme-accent hover:bg-theme-accent/10 transition-colors"
      data-testid={`action-${action.type}`}
    >
      {labels[action.type] ?? action.type} →
    </button>
  );
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps): JSX.Element {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  const actions = message.metadata?.actions ?? [];
  // Voice-mode assistant replies render as a compact "Speaking…"
  // chip instead of the full text bubble — user asked by voice, so
  // TTS is the primary output and a transcript on screen would
  // compete with it. The raw text is still stored in the session
  // for memory + context snapshot purposes.
  const isVoiceAssistant = !isUser && message.modality === 'voice';

  const handleAction = (action: { type: string; id: string }): void => {
    switch (action.type) {
      case 'drill_opening':
        void navigate(`/openings/${action.id}`);
        break;
      case 'puzzle_theme':
        void navigate('/tactics/adaptive');
        break;
      case 'review_game':
        void navigate('/games');
        break;
      case 'analyse_position':
        void navigate('/analysis');
        break;
    }
  };

  return (
    <motion.div
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      data-testid={`chat-message-${message.role}`}
    >
      {!isUser && (
        <div
          className="flex-shrink-0 mt-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold bg-theme-accent"
          data-testid="coach-badge"
        >
          C
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-theme-accent text-white rounded-br-sm'
            : 'bg-theme-surface border border-theme-border text-theme-text rounded-bl-sm'
        }`}
      >
        {isVoiceAssistant ? (
          <div className="flex items-center gap-2 py-0.5" data-testid="voice-assistant-indicator">
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-3 rounded-full bg-theme-accent"
                  animate={
                    isStreaming
                      ? { scaleY: [0.4, 1, 0.4] }
                      : { scaleY: 0.6 }
                  }
                  transition={
                    isStreaming
                      ? { duration: 0.9, repeat: Infinity, delay: i * 0.12 }
                      : {}
                  }
                />
              ))}
            </div>
            <span className="text-xs text-theme-text-muted italic">
              {isStreaming ? 'Speaking…' : 'Spoken reply'}
            </span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderFormattedText(message.content)}</p>
        )}

        {isStreaming && !isVoiceAssistant && !message.content && (
          <div className="flex gap-1 py-1" data-testid="streaming-indicator">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-theme-text-muted"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}

        {actions.length > 0 && !isVoiceAssistant && (
          <div className="flex flex-wrap gap-2 mt-1">
            {actions.map((action, i) => (
              <ActionButton
                key={i}
                action={action}
                onClick={() => handleAction(action)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

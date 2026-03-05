import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CoachAvatar } from './CoachAvatar';
import type { ChatMessage as ChatMessageType, CoachPersonality } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
  personality: CoachPersonality;
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

export function ChatMessage({ message, personality, isStreaming }: ChatMessageProps): JSX.Element {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  const actions = message.metadata?.actions ?? [];

  const handleAction = (action: { type: string; id: string }): void => {
    switch (action.type) {
      case 'drill_opening':
        void navigate(`/openings/${action.id}`);
        break;
      case 'puzzle_theme':
        void navigate('/puzzles');
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
        <div className="flex-shrink-0 mt-1">
          <CoachAvatar
            personality={personality}
            expression={message.metadata?.expression ?? 'neutral'}
            speaking={isStreaming ?? false}
            size="sm"
          />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-theme-accent text-white rounded-br-sm'
            : 'bg-theme-surface border border-theme-border text-theme-text rounded-bl-sm'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

        {isStreaming && !message.content && (
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

        {actions.length > 0 && (
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

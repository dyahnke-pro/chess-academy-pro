import { useState, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { getCoachCommentary } from '../../services/coachApi';
import { MessageSquare, Loader, X, Volume2 } from 'lucide-react';
import { voiceService } from '../../services/voiceService';
import type { CoachTask, CoachContext } from '../../types';

interface CoachPanelProps {
  context: CoachContext;
  task?: CoachTask;
}

export function CoachPanel({ context, task = 'move_commentary' }: CoachPanelProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleAsk = useCallback(async (): Promise<void> => {
    setVisible(true);
    setMessage('');

    const provider = activeProfile?.preferences.aiProvider ?? 'deepseek';
    const hasKey = provider === 'anthropic'
      ? Boolean(activeProfile?.preferences.anthropicApiKeyEncrypted)
      : Boolean(activeProfile?.preferences.apiKeyEncrypted);
    if (!hasKey) {
      setMessage('To enable AI coaching, add your API key in Settings → Coach tab. The coach will respond once your key is saved.');
      return;
    }

    setLoading(true);

    const result = await getCoachCommentary(task, context, (chunk) => {
      setMessage((prev) => prev + chunk);
    });

    setMessage(result);
    setLoading(false);
  }, [task, context, activeProfile]);

  const handleSpeak = useCallback((): void => {
    if (message) {
      void voiceService.speak(message);
    }
  }, [message]);

  if (!visible) {
    return (
      <button
        onClick={() => void handleAsk()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-surface hover:bg-theme-border text-sm text-theme-text transition-colors"
        data-testid="coach-ask-btn"
      >
        <MessageSquare size={14} className="text-theme-accent" />
        Ask Coach
      </button>
    );
  }

  return (
    <div className="bg-theme-surface rounded-lg p-4 border border-theme-border" data-testid="coach-panel">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-theme-accent" />
          <span className="text-sm font-semibold text-theme-text">
            Coach
          </span>
        </div>
        <div className="flex items-center gap-1">
          {message && (
            <button
              onClick={handleSpeak}
              className="p-1 rounded hover:bg-theme-border transition-colors"
              aria-label="Read aloud"
            >
              <Volume2 size={14} className="text-theme-text-muted" />
            </button>
          )}
          <button
            onClick={() => { setVisible(false); setMessage(''); }}
            className="p-1 rounded hover:bg-theme-border transition-colors"
            aria-label="Close"
          >
            <X size={14} className="text-theme-text-muted" />
          </button>
        </div>
      </div>
      {loading && !message && (
        <div className="flex items-center gap-2 text-theme-text-muted">
          <Loader size={14} className="animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      )}
      {message && (
        <p className="text-sm text-theme-text leading-relaxed whitespace-pre-wrap" data-testid="coach-message">
          {message}
        </p>
      )}
    </div>
  );
}

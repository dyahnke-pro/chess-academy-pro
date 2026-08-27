import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage as ChatMessageType } from '../../types';
import { stripCoachMarkup } from '../../services/sanitizeCoachText';

/** Render basic markdown-style formatting: **bold** and *italic*.
 *  Defense-in-depth: strip any coach directive markup
 *  (`[BOARD: arrow:e2-e4]`, `[[ACTION:...]]`, escaped `\[BOARD:...]`)
 *  that slipped past a surface's own sanitize before it reaches the
 *  bubble. The move-narration path on /coach/play did NOT strip, so a
 *  raw `\[BOARD: arrow:f3-f3:green]` leaked into the chat (David
 *  2026-06-15). This is the single render-level chokepoint every coach
 *  surface shares, so stripping here closes the leak everywhere at
 *  once. Idempotent — already-clean text is unchanged. */
function renderFormattedText(rawText: string): React.ReactNode[] {
  const text = stripCoachMarkup(rawText);
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
  /** Tap handler for the inline "did you mean…" answer chips
   *  (`message.choices`). When absent, chips don't render (e.g. the
   *  streaming placeholder bubble). */
  onPickChoice?: (choice: string) => void;
}

function ActionButton({ action, onClick }: {
  action: { type: string; id: string };
  onClick: () => void;
}): JSX.Element {
  const labels: Record<string, string> = {
    drill_opening: 'Practice Opening',
    puzzle_theme: 'Try Puzzles',
    review_game: 'Review Game',
    walk_game: 'Walk it move-by-move',
    analyse_position: 'Analyse Position',
    start_review: 'Start review',
    // Game-sourced training actions (David 2026-07-04: pull from real user
    // games). Each routes to a surface that draws from the student's own games.
    calc_training: 'Train calculation',
    train_mistakes: 'Drill my mistakes',
    weakness_drill: 'Drill my weaknesses',
    endgame_training: 'Train endgames',
    review_games: 'Review my games',
    // Recommend-a-focused-game: the coach set a trainingFocus (the point of the
    // game) and offers to play one now (David 2026-08-27).
    play_focused_game: "Play a game — I'll coach it",
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

export function ChatMessage({ message, isStreaming, onPickChoice }: ChatMessageProps): JSX.Element {
  const navigate = useNavigate();
  const isUser = message.role === 'user';
  const actions = message.metadata?.actions ?? [];
  const choices = (!isUser && message.choices) || [];
  // Voice-mode assistant replies render as a compact "Speaking…"
  // chip instead of the full text bubble — user asked by voice, so
  // TTS is the primary output and a transcript on screen would
  // compete with it. The raw text is still stored in the session
  // for memory + context snapshot purposes.
  const isVoiceAssistant = !isUser && message.modality === 'voice';

  const handleAction = (action: { type: string; id: string }): void => {
    switch (action.type) {
      case 'drill_opening':
        // With a concrete opening id → its detail page; with no id (the coach
        // couldn't name a weakest opening) → the explorer to pick one, never a
        // bare `/openings/` trailing-slash route.
        void navigate(action.id ? `/openings/${action.id}` : '/openings');
        break;
      case 'puzzle_theme':
        void navigate('/tactics/adaptive');
        break;
      case 'review_game':
        void navigate('/games');
        break;
      case 'walk_game':
        // A famous game the app teaches move-by-move in the grounded review
        // walk (id = a review sample, e.g. the Opera Game). This is the
        // "see the fundamentals in a real game" hand-off from the fundamentals
        // + famous-game lanes (David 2026-08-26).
        void navigate(action.id ? `/coach/review/${action.id}` : '/coach/review');
        break;
      case 'analyse_position':
        // The analysis board lives at /coach/analyse (CoachAnalysePage) —
        // /analysis was never a registered route, so this chip used to land on
        // a blank 404 (David 2026-07-04 dead-wire fix).
        void navigate('/coach/analyse');
        break;
      case 'start_review':
        void navigate('/openings/srs');
        break;
      // Game-sourced training. `action.id` may carry a weak theme for the
      // weakness drill so it opens pre-scoped to what the data flagged.
      case 'calc_training':
        void navigate('/tactics/analysis-practice');
        break;
      case 'train_mistakes':
        void navigate('/tactics/mistakes');
        break;
      case 'weakness_drill':
        // Drill the student's mistakes IN the coach tab, on the board — never a
        // reroute to the tactics tab (David 2026-08-27: "coach is supposed to
        // drill mistakes within the coach tab and not rerouting"). /coach/teach
        // consumes ?drill=mistakes → startMistakeDrills, which builds the ranked
        // queue (most-common weakness first, adaptive until it tests out). This
        // also sidesteps the WeaknessThemesPage entirely. A scoped motif rides
        // along as a hint; the in-place queue still leads with the top weakness.
        if (action.id && action.id !== 'all') {
          void navigate(`/coach/teach?drill=mistakes&theme=${encodeURIComponent(action.id)}`);
        } else {
          void navigate('/coach/teach?drill=mistakes');
        }
        break;
      case 'endgame_training':
        void navigate('/coach/endgame');
        break;
      case 'review_games':
        void navigate('/coach/review');
        break;
      case 'play_focused_game':
        // The coach already stored the trainingFocus (the point of the game);
        // the play surface reads it to tag the game + scope its feedback. Carry
        // the area in the query so the surface can pick it up immediately
        // (David 2026-08-27). id = the TrainingArea.
        void navigate(action.id ? `/coach/play?focus=${encodeURIComponent(action.id)}` : '/coach/play');
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

        {choices.length > 0 && onPickChoice && !isVoiceAssistant && (
          <div
            className="flex flex-wrap gap-2 mt-2"
            data-testid="message-choice-chips"
            role="group"
            aria-label="Coach is asking — tap an answer"
          >
            {choices.map((choice, i) => (
              <button
                key={`mchoice-${i}-${choice}`}
                type="button"
                onClick={() => onPickChoice(choice)}
                className="px-3 py-1.5 rounded-full border-2 border-theme-accent/40 bg-theme-accent/10 text-sm text-theme-text hover:bg-theme-accent/20 hover:border-theme-accent transition-colors min-h-[36px]"
                data-testid={`message-choice-chip-${i}`}
                data-choice={choice}
              >
                {choice}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { Compass, PlayCircle, BookOpen as LearnIcon, Brain, Swords } from 'lucide-react';
import { getPlansForOpening } from '../../services/middlegamePlanService';
import { MiniBoard } from '../Board/MiniBoard';
import type { MiddlegamePlan } from '../../types';

export type MiddlegameAction = 'watch' | 'learn' | 'practice' | 'play';

interface MiddlegamePlansSectionProps {
  openingId: string;
  boardOrientation: 'white' | 'black';
  onAction: (plan: MiddlegamePlan, action: MiddlegameAction) => void;
  /** When set, show only plans whose id is in this list (variation rescope). */
  filterPlanIds?: string[];
  /** When there are no plans for the current scope AND this is provided,
   *  render the section header with this explanatory line INSTEAD of
   *  hiding it. Used on the main-line tab of openings whose plans are all
   *  variation-specific, so the section states why it's empty rather than
   *  silently vanishing. */
  emptyNote?: string;
}

const ACTION_BTN =
  'p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow';

export function MiddlegamePlansSection({
  openingId,
  boardOrientation,
  onAction,
  filterPlanIds,
  emptyNote,
}: MiddlegamePlansSectionProps): JSX.Element {
  const [allPlans, setAllPlans] = useState<MiddlegamePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPlansForOpening(openingId).then((result) => {
      if (!cancelled) {
        setAllPlans(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  const plans = filterPlanIds
    ? allPlans.filter((p) => filterPlanIds.includes(p.id))
    : allPlans;

  if (loading) return <div data-testid="middlegame-plans-empty" />;

  // No plans for this scope. On the main-line tab of an opening whose plans
  // are all variation-specific, state that fact instead of hiding (David
  // 2026-05-22). Everywhere else, stay silent (empty > generic).
  if (plans.length === 0) {
    if (!emptyNote) return <div data-testid="middlegame-plans-empty" />;
    return (
      <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="middlegame-plans-note">
        <div className="flex items-center gap-2 mb-2">
          <Compass size={14} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-theme-text">Middlegame Plans</h3>
        </div>
        <p className="text-xs text-theme-text-muted leading-relaxed">{emptyNote}</p>
      </div>
    );
  }

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="middlegame-plans-section">
      <div className="flex items-center gap-2 mb-3">
        <Compass size={14} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-theme-text">Middlegame Plans ({plans.length})</h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        Watch the plan played out, learn it, practise it, then play it against the coach.
      </p>
      <div className="space-y-1">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="w-full p-3 rounded-lg hover:bg-theme-border/50 transition-colors"
            data-testid={`plan-line-${plan.id}`}
          >
            <button
              onClick={() => onAction(plan, 'watch')}
              className="flex items-center gap-3 w-full text-left"
              aria-label={`Watch ${plan.title}`}
            >
              <MiniBoard fen={plan.criticalPositionFen} size={48} orientation={boardOrientation} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-theme-text">{plan.title}</span>
                <p className="text-xs text-theme-text-muted line-clamp-2 mt-0.5">{plan.overview}</p>
              </div>
            </button>
            <div className="flex items-center gap-1.5 mt-2 ml-[60px]">
              <button
                onClick={() => onAction(plan, 'watch')}
                className={`${ACTION_BTN} opening-action-glow-watch`}
                aria-label={`Watch ${plan.title}`}
                title="Watch"
                data-testid={`plan-watch-${plan.id}`}
              >
                <PlayCircle size={16} />
              </button>
              <button
                onClick={() => onAction(plan, 'learn')}
                className={`${ACTION_BTN} opening-action-glow-learn`}
                aria-label={`Learn ${plan.title}`}
                title="Learn"
                data-testid={`plan-learn-${plan.id}`}
              >
                <LearnIcon size={16} />
              </button>
              <button
                onClick={() => onAction(plan, 'practice')}
                className={`${ACTION_BTN} opening-action-glow-practice`}
                aria-label={`Practice ${plan.title}`}
                title="Practice"
                data-testid={`plan-practice-${plan.id}`}
              >
                <Brain size={16} />
              </button>
              <button
                onClick={() => onAction(plan, 'play')}
                className={`${ACTION_BTN} opening-action-glow-play`}
                aria-label={`Play ${plan.title}`}
                title="Play"
                data-testid={`plan-play-${plan.id}`}
              >
                <Swords size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Crown, PlayCircle, BookOpen as LearnIcon, Brain, Swords } from 'lucide-react';
import { getPlansForOpening } from '../../services/middlegamePlanService';
import { MiniBoard } from '../Board/MiniBoard';
import type { MiddlegamePlan } from '../../types';
import type { MiddlegameAction } from './MiddlegamePlansSection';

// Phase architecture (David 2026-05-22). The opening's structure naturally
// splits into three phases — Opening / Middlegame / Endgame — and the
// platform's deep-dive promise is that each phase gets first-class
// teaching. This section is the ENDGAME PHASE:
//
//   - Filters `middlegame-plans.json` entries whose id ends `-endgame`.
//     Same data file, same schema as middlegame plans (a deep DB line +
//     per-move annotations + pawn breaks / piece manoeuvres / strategic
//     themes / endgame transitions), but the line runs DEEP into the
//     characteristic endgame structure the opening produces.
//   - Per playbook §4: only GENUINE, LINE-SPECIFIC endgames belong here.
//     General endgame technique (Lucena, opposition, Philidor) belongs in
//     the BookReader's Endgame chapter — never bolted onto opening tabs.
//   - Empty by design for openings whose character is decided in the
//     middlegame (Vienna, sharp gambits, attacking openings). The section
//     self-hides when no `-endgame` plans exist for the current scope.
//
// Visually parallels MiddlegamePlansSection — same MiniBoard + WLPP row,
// emerald accent instead of blue.

interface EndgamePlansSectionProps {
  openingId: string;
  boardOrientation: 'white' | 'black';
  onAction: (plan: MiddlegamePlan, action: MiddlegameAction) => void;
  /** When set, show only plans whose id is in this list (variation rescope). */
  filterPlanIds?: string[];
}

const ACTION_BTN =
  'p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-theme-accent/20 bg-theme-surface border border-theme-border hover:border-theme-accent/40 text-theme-text-muted hover:text-theme-accent transition-colors opening-action-glow';

export function EndgamePlansSection({
  openingId,
  boardOrientation,
  onAction,
  filterPlanIds,
}: EndgamePlansSectionProps): JSX.Element {
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

  // Endgame-phase plans: id suffix convention (see MiddlegamePlansSection).
  const endgamePlans = allPlans.filter((p) => p.id.endsWith('-endgame'));
  const plans = filterPlanIds
    ? endgamePlans.filter((p) => filterPlanIds.includes(p.id))
    : endgamePlans;

  if (loading) return <div data-testid="endgame-plans-empty" />;

  // No curated endgame for this scope — stay silent (empty > generic).
  // Per playbook §4: "It's fine for a sharp gambit / attacking line to
  // have NO endgame. Don't fabricate." The Vienna deliberately has no
  // entries here; the opening's character is decided in the middlegame.
  if (plans.length === 0) return <div data-testid="endgame-plans-empty" />;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="endgame-plans-section">
      <div className="flex items-center gap-2 mb-3">
        <Crown size={14} className="text-emerald-500" />
        <h3 className="text-sm font-semibold text-theme-text">Endgame Plans ({plans.length})</h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        The structural endgame this opening produces — watch it form, learn the technique, practise the conversion, play it against the coach.
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

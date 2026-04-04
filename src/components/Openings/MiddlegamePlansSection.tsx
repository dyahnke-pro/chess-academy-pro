import { useState, useEffect } from 'react';
import { Compass, ChevronRight } from 'lucide-react';
import { getPlansForOpening } from '../../services/middlegamePlanService';
import type { MiddlegamePlan } from '../../types';

interface MiddlegamePlansSectionProps {
  openingId: string;
  onSelectPlan: (plan: MiddlegamePlan) => void;
}

export function MiddlegamePlansSection({
  openingId,
  onSelectPlan,
}: MiddlegamePlansSectionProps): JSX.Element {
  const [plans, setPlans] = useState<MiddlegamePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getPlansForOpening(openingId).then((result) => {
      if (!cancelled) {
        setPlans(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [openingId]);

  if (loading || plans.length === 0) return <div data-testid="middlegame-plans-empty" />;

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="middlegame-plans-section">
      <div className="flex items-center gap-2 mb-3">
        <Compass size={14} className="text-blue-500" />
        <h3 className="text-sm font-semibold text-theme-text">
          Middlegame Plans ({plans.length})
        </h3>
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        Learn what to do after the opening moves run out.
      </p>
      <div className="space-y-2">
        {plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onSelectPlan(plan)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-theme-border/50 transition-colors text-left"
            data-testid={`plan-card-${plan.id}`}
          >
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-theme-text">
                {plan.title}
              </span>
              <p className="text-xs text-theme-text-muted mt-0.5 line-clamp-2">
                {plan.overview}
              </p>
              {plan.pawnBreaks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {plan.pawnBreaks.map((pb, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-theme-accent/15 text-theme-accent font-mono"
                    >
                      {pb.move}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight size={16} className="text-theme-text-muted shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

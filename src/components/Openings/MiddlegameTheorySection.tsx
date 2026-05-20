import { Compass, ChevronDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { getPlansForOpening } from '../../services/middlegamePlanService';
import type { MiddlegamePlan } from '../../types';

interface MiddlegameTheorySectionProps {
  openingId: string;
  /** Render-prop for the host page's NarrationButton (carries TTS). */
  renderNarrationButton?: (text: string) => ReactNode;
  /** Clicking the header narrates the full theory text. */
  onActivate?: (text: string) => void;
}

/** Flatten one plan's theory into a single spoken/readable string. */
function planSpokenText(plan: MiddlegamePlan): string {
  const parts: string[] = [`${plan.title}.`, plan.overview];
  if (plan.strategicThemes.length > 0) {
    parts.push(`Strategic ideas. ${plan.strategicThemes.join('. ')}.`);
  }
  if (plan.pawnBreaks.length > 0) {
    parts.push(
      `Pawn breaks. ${plan.pawnBreaks.map((pb) => `${pb.move}: ${pb.explanation}`).join(' ')}`,
    );
  }
  if (plan.pieceManeuvers.length > 0) {
    parts.push(
      `Key maneuvers. ${plan.pieceManeuvers.map((m) => `${m.route}: ${m.explanation}`).join(' ')}`,
    );
  }
  if (plan.endgameTransitions.length > 0) {
    parts.push(`Into the endgame. ${plan.endgameTransitions.join('. ')}.`);
  }
  return parts.filter(Boolean).join(' ');
}

/**
 * "Middlegame Theory" reading panel — the prose counterpart to the
 * interactive MiddlegamePlansSection. Renders each plan's overview,
 * strategic ideas, pawn breaks, key maneuvers, and endgame transitions
 * as readable text in the same card format as the Understand-zone
 * sections (Overview / Key Ideas / Classic Wisdom / From the Books), so
 * the middlegame theory is readable inline rather than only behind a
 * tap-through study view. Renders nothing when no plan exists.
 */
export function MiddlegameTheorySection({
  openingId,
  renderNarrationButton,
  onActivate,
}: MiddlegameTheorySectionProps): ReactNode {
  const [plans, setPlans] = useState<MiddlegamePlan[]>([]);
  const [loading, setLoading] = useState(true);
  // Which plan is expanded. First plan opens by default once loaded.
  const [openId, setOpenId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    void getPlansForOpening(openingId).then((result) => {
      if (cancelled) return;
      setPlans(result);
      setOpenId(result[0]?.id ?? '');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [openingId]);

  if (loading || plans.length === 0) return null;

  const allText = plans.map(planSpokenText).join(' ');

  return (
    <div className="bg-theme-surface rounded-xl p-4 mb-4" data-testid="middlegame-theory-section">
      <div
        className="flex items-center gap-2 mb-1 cursor-pointer"
        onClick={() => onActivate?.(allText)}
        role={onActivate ? 'button' : undefined}
        data-testid="middlegame-theory-header"
      >
        <Compass size={14} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-theme-text">Middlegame Theory</h3>
        <span className="text-[10px] uppercase tracking-wider text-theme-text-muted/60">
          {plans.length} plan{plans.length === 1 ? '' : 's'}
        </span>
        {renderNarrationButton?.(allText)}
      </div>
      <p className="text-xs text-theme-text-muted mb-3">
        What to do once the opening moves run out — the plans, breaks, and endgames each line steers toward.
      </p>

      <div className="space-y-2" data-testid="middlegame-theory-list">
        {plans.map((plan) => {
          const isOpen = openId === plan.id;
          return (
            <div
              key={plan.id}
              className="border-l-2 border-blue-400/40 pl-3"
              data-testid={`mg-theory-${plan.id}`}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? '' : plan.id)}
                className="w-full flex items-center gap-2 text-left py-1"
                aria-expanded={isOpen}
                data-testid={`mg-theory-toggle-${plan.id}`}
              >
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-blue-400/80 transition-transform ${isOpen ? '' : '-rotate-90'}`}
                />
                <span className="text-sm font-medium text-theme-text">{plan.title}</span>
              </button>

              {isOpen && (
                <div className="mt-1 space-y-3 pb-2">
                  <p className="text-sm text-theme-text-muted leading-relaxed">{plan.overview}</p>

                  {plan.strategicThemes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted/80 mb-1.5">
                        Strategic ideas
                      </h4>
                      <ul className="space-y-1.5">
                        {plan.strategicThemes.map((theme, i) => (
                          <li key={i} className="text-sm text-theme-text-muted flex gap-2">
                            <span className="text-blue-400 mt-0.5 shrink-0">-</span>
                            <span>{theme}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.pawnBreaks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted/80 mb-1.5">
                        Pawn breaks
                      </h4>
                      <ul className="space-y-1.5">
                        {plan.pawnBreaks.map((pb, i) => (
                          <li key={i} className="text-sm text-theme-text-muted flex gap-2 items-start">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-accent/15 text-theme-accent font-mono shrink-0 mt-0.5">
                              {pb.move}
                            </span>
                            <span>{pb.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.pieceManeuvers.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted/80 mb-1.5">
                        Key maneuvers
                      </h4>
                      <ul className="space-y-1.5">
                        {plan.pieceManeuvers.map((m, i) => (
                          <li key={i} className="text-sm text-theme-text-muted flex gap-2 items-start">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/15 text-blue-300 font-mono shrink-0 mt-0.5">
                              {m.route}
                            </span>
                            <span>{m.explanation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.endgameTransitions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted/80 mb-1.5">
                        Into the endgame
                      </h4>
                      <ul className="space-y-1.5">
                        {plan.endgameTransitions.map((t, i) => (
                          <li key={i} className="text-sm text-theme-text-muted flex gap-2">
                            <span className="text-blue-400 mt-0.5 shrink-0">-</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

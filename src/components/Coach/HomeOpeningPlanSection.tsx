import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { buildHomeOpeningPlan, type HomePlanSection } from '../../services/homeOpeningPlan';
import { logAppAudit } from '../../services/appAuditor';
import type { PlayerColor } from '../../services/playerIdentity';

// THE PLAN'S FIRST SECTION (WO-HOME-OPENING-01 A4): one block per colour with a
// home opening, listing the reps computed INSIDE it — analyse its games, its
// weakest line, where the student leaves book, the recurring fundamentals in
// those games, its middlegame plan. Each rep is a tap into the surface that
// works it. A colour with no home yet says so in numbers (the card on
// /weaknesses is where a home is chosen).

const pct = (s: number): string => `${Math.round(s * 100)}%`;

export function HomeOpeningPlanSection({ onLoaded }: { onLoaded?: (hasHome: boolean) => void }): JSX.Element | null {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Record<PlayerColor, HomePlanSection | null> | null>(null);

  useEffect(() => {
    const flag = { cancelled: false };
    void buildHomeOpeningPlan()
      .then((p) => {
        if (flag.cancelled) return;
        setPlan(p);
        onLoaded?.(!!(p.white || p.black));
        void logAppAudit({
          kind: 'home-opening-plan-built',
          category: 'subsystem',
          source: 'HomeOpeningPlanSection',
          summary: (['white', 'black'] as const).map((c) => {
            const s = p[c];
            return s ? `${c}: ${s.choice.family} — ${s.reps.length} rep(s) [${s.reps.map((r) => r.kind).join(', ')}] (${s.analysed}/${s.games} analysed)` : `${c}: no home opening`;
          }).join(' · '),
          details: JSON.stringify({
            white: p.white ? { family: p.white.choice.family, games: p.white.games, analysed: p.white.analysed, reps: p.white.reps.map((r) => r.kind) } : null,
            black: p.black ? { family: p.black.choice.family, games: p.black.games, analysed: p.black.analysed, reps: p.black.reps.map((r) => r.kind) } : null,
          }),
        });
      })
      .catch(() => { if (!flag.cancelled) { setPlan({ white: null, black: null }); onLoaded?.(false); } });
    return () => { flag.cancelled = true; };
  }, [onLoaded]);

  if (!plan) return <div className="mt-4 text-xs text-theme-text-muted" data-testid="home-opening-plan-loading">Reading your home openings…</div>;
  if (!plan.white && !plan.black) return null;

  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="home-opening-plan">
      {(['white', 'black'] as const).map((colour) => {
        const section = plan[colour];
        return (
          <div key={colour} className="rounded-2xl border-2 border-theme-accent/30 bg-theme-accent/5 p-4" data-testid={`home-opening-plan-${colour}`}>
            <div className="flex items-center gap-2 mb-2">
              <Home size={16} className="text-theme-accent" />
              <h2 className="text-sm font-bold text-theme-text">
                {section
                  ? <>Your home opening as {colour}: <span data-testid={`home-opening-plan-${colour}-family`}>{section.choice.family}</span></>
                  : <>No home opening as {colour} yet</>}
              </h2>
            </div>
            {section ? (
              <>
                <p className="text-xs text-theme-text-muted mb-3">
                  {section.choice.games} games at {pct(section.choice.score)} · {section.analysed} of {section.games} analysed{section.choice.source === 'student' ? ' · your pick' : ''}
                </p>
                {section.reps.length === 0 ? (
                  <p className="text-sm text-theme-text-muted" data-testid={`home-opening-plan-${colour}-empty`}>
                    Nothing recorded inside it yet — play it or review a game in it and the holes show up here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {section.reps.map((rep) => (
                      <li key={rep.key}>
                        <button
                          type="button"
                          onClick={() => void navigate(rep.route.path, rep.route.state ? { state: rep.route.state } : undefined)}
                          className="w-full flex items-center gap-3 text-left p-3 rounded-xl bg-theme-surface border border-theme-border hover:border-theme-accent/40 transition-colors"
                          data-testid={`home-plan-rep-${colour}-${rep.kind}`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-theme-text">{rep.label}</span>
                            <p className="text-xs text-theme-text-muted mt-0.5">{rep.subtitle}</p>
                          </div>
                          <ChevronRight size={16} className="text-theme-text-muted shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-xs text-theme-text-muted" data-testid={`home-opening-plan-${colour}-none`}>
                Ten games in one line as {colour} makes it your home — or pick one on the Weaknesses page.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

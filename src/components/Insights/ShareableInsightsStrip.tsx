import { useEffect, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShareableInsightCard } from './ShareableInsightCard';
import {
  computeShareableInsights,
  type ShareableInsight,
} from '../../services/shareableInsightsService';

/**
 * ShareableInsightsStrip — the carousel of "did you know" cards at
 * the top of the Game Insights page. Each card is individually
 * share-worthy; the strip lets the user flick through a few so they
 * can pick their favorite.
 *
 * Auto-hides when the user has <5 analyzed games (no honest insights
 * yet — we don't want to surface noise).
 */
export function ShareableInsightsStrip(): JSX.Element | null {
  const [insights, setInsights] = useState<ShareableInsight[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void computeShareableInsights()
      .then((result) => {
        if (!cancelled) setInsights(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          console.warn('[ShareableInsightsStrip] compute failed:', err);
          setInsights([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading — return null for now (skeletons would add noise).
  if (insights === null) return null;
  // No insights worth showing — strip stays hidden. Don't upsell,
  // don't show empty state. The user will see insights once they
  // import / analyze enough games.
  if (insights.length === 0) return null;

  const current = insights[index];
  const hasPrev = index > 0;
  const hasNext = index < insights.length - 1;

  return (
    <section
      className="mb-5"
      aria-label="Shareable chess insights"
      data-testid="shareable-insights-strip"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
          Your Chess, In A Nutshell
        </div>
        {insights.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={!hasPrev}
              aria-label="Previous insight"
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="shareable-insight-prev"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
              {index + 1} / {insights.length}
            </span>
            <button
              onClick={() => setIndex((i) => Math.min(insights.length - 1, i + 1))}
              disabled={!hasNext}
              aria-label="Next insight"
              className="p-1 rounded hover:opacity-80 disabled:opacity-30"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="shareable-insight-next"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
      <ShareableInsightCard insight={current} />
    </section>
  );
}

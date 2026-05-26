import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ChevronRight } from 'lucide-react';
import { buildTodaysReps, type RepCandidate } from '../../services/trainingPlanSelector';
import { getUnifiedWeaknessProfile } from '../../services/weaknessSpine';
import { getSrsDueOpenings } from '../../services/srsOpeningService';
import { getUnlearnedFavoriteOpenings } from '../../services/openingService';
import { logAppAudit } from '../../services/appAuditor';

interface TodaysRepsProps {
  /** Audit source tag so we can tell the Dashboard mount from the
   *  Training Plan mount in the stream. */
  source: string;
  /** When the bucket is empty: the Training Plan shows a teaching
   *  prompt; the Dashboard prefers to render nothing so a fresh home
   *  screen isn't nagged. */
  hideWhenEmpty?: boolean;
  /** Extra classes on the card root — caller-controlled spacing. */
  className?: string;
}

/** "Today's reps" — the prioritised daily training todos over the weakness
 *  bucket. Advises; it never gates. A weakness rep deep-links into the
 *  adaptive tactical drill scoped to its motif; an opening rep to its
 *  masterclass. Shared by the Training Plan page and the Dashboard so both
 *  surface the SAME curated feed (David 2026-05-26 — the dashboard shows the
 *  plan's daily todos, not raw aggregate "due" counts). */
export function TodaysReps({ source, hideWhenEmpty = false, className = '' }: TodaysRepsProps): JSX.Element | null {
  const navigate = useNavigate();
  const [reps, setReps] = useState<RepCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const flag = { cancelled: false };
    void (async () => {
      // Pull from ALL three sources so the feed reflects the whole loop.
      // Weaknesses = unified coach+Analyze profile (weaknessSpine); SRS-due =
      // enrolled opening cards due today; new lines = favorited openings with
      // an un-learned line.
      const [weaknesses, srsDue, newLines] = await Promise.all([
        getUnifiedWeaknessProfile(),
        getSrsDueOpenings(),
        getUnlearnedFavoriteOpenings(),
      ]);
      if (flag.cancelled) return;
      const built = buildTodaysReps({ weaknesses, srsDue, newLines, total: 5 });
      setReps(built);
      setLoaded(true);
      void logAppAudit({
        kind: 'todays-reps-built',
        category: 'subsystem',
        source,
        summary: `reps=${built.length} weaknesses=${weaknesses.length} due=${weaknesses.filter((w) => w.openCount > 0).length} srsDue=${srsDue.length} newLines=${newLines.length}`,
        details: JSON.stringify({
          repKinds: built.map((r) => r.kind),
          topWeaknesses: weaknesses.slice(0, 5).map((w) => ({ tag: w.tag, openCount: w.openCount, total: w.total })),
        }),
      });
    })();
    return () => { flag.cancelled = true; };
  }, [source]);

  if (!loaded) return null;
  if (hideWhenEmpty && reps.length === 0) return null;

  return (
    <div className={`${className} rounded-2xl border-2 border-theme-accent/30 bg-theme-accent/5 p-4`} data-testid="todays-reps">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-theme-accent" />
        <h2 className="text-sm font-bold text-theme-text">Today's reps</h2>
      </div>
      {reps.length === 0 ? (
        <p className="text-sm text-theme-text-muted leading-relaxed" data-testid="todays-reps-empty">
          Play a game with the coach or review one of yours — once I spot the patterns you keep
          missing, your drills show up here.
        </p>
      ) : (
        <ul className="space-y-2">
          {reps.map((rep) => (
            <li key={rep.key}>
              <button
                type="button"
                onClick={() => {
                  if (rep.kind !== 'weakness') {
                    void navigate(`/openings/${rep.openingId ?? ''}`);
                    return;
                  }
                  // A weakness rep drills its motif: deep-link into the
                  // adaptive tactical drill scoped to the tag's themes. The
                  // real misconception tag (not an analysis:* cluster) rides
                  // along so the drill can space it out on completion.
                  if (rep.puzzleThemes && rep.puzzleThemes.length > 0) {
                    void navigate('/tactics/adaptive', {
                      state: {
                        forcedWeakThemes: rep.puzzleThemes,
                        misconceptionTag: rep.tag && !rep.tag.startsWith('analysis:') ? rep.tag : undefined,
                      },
                    });
                  } else {
                    void navigate('/weaknesses');
                  }
                }}
                className="w-full flex items-center gap-3 text-left p-3 rounded-xl bg-theme-surface border border-theme-border hover:border-theme-accent/40 transition-colors"
                data-testid={`todays-rep-${rep.kind}`}
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
    </div>
  );
}

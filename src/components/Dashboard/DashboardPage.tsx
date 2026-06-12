import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { updateStreak } from '../../services/sessionGenerator';
import { seedDatabase } from '../../services/dataLoader';
import { BookOpen, GraduationCap, Target, AlertTriangle, Upload, ChevronRight, CheckCircle2 } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { PageHelp } from '../Layout/PageHelp';
import { useSettings } from '../../hooks/useSettings';
import { scaledShadow } from '../../utils/neonColors';
import { getUnifiedWeaknessProfile } from '../../services/weaknessSpine';
import { getUnlearnedFavoriteOpenings } from '../../services/openingService';
import { getSrsDueOpenings } from '../../services/srsOpeningService';
import { buildTodaysReps, type RepCandidate } from '../../services/trainingPlanSelector';
import { getCompletedRepKeysToday } from '../../services/repCompletion';
import { resolveRepRoute } from '../../services/repRouting';

interface SectionItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  rgb: string;
}

const SECTIONS: SectionItem[] = [
  {
    label: 'Openings',
    icon: BookOpen,
    route: '/openings',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    rgb: '6, 182, 212',
  },
  {
    label: 'Coach',
    icon: GraduationCap,
    route: '/coach/home',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    rgb: '251, 113, 133',
  },
  {
    label: 'Tactics',
    icon: Target,
    route: '/tactics',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    rgb: '52, 211, 153',
  },
  {
    label: 'Weaknesses',
    icon: AlertTriangle,
    route: '/weaknesses',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    rgb: '139, 92, 246',
  },
];

/** Live loop-state strip (David 2026-05-25): the Dashboard is the status
 *  board for the one training loop, not just static tiles. Pulls today's
 *  reps from the same three sources as the Training Plan (unified
 *  weaknesses + SRS-due + new lines) and routes into the hub. Renders
 *  nothing until there's something to do, so a fresh user isn't nagged. */
/** Route a Today's rep into its drill — same logic as the Training Plan hub
 *  (TrainingPlanRolodexPage) so the dashboard tasks and the plan agree. */
function navigateToRep(navigate: ReturnType<typeof useNavigate>, rep: RepCandidate): void {
  const route = resolveRepRoute(rep);
  void navigate(route.path, route.state ? { state: route.state } : undefined);
}

function TodayStatus(): JSX.Element | null {
  const navigate = useNavigate();
  const [reps, setReps] = useState<RepCandidate[] | null>(null);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [weaknesses, srsDue, newLines, done] = await Promise.all([
        getUnifiedWeaknessProfile(),
        getSrsDueOpenings(),
        getUnlearnedFavoriteOpenings(),
        getCompletedRepKeysToday(),
      ]);
      if (cancelled) return;
      setReps(buildTodaysReps({ weaknesses, srsDue, newLines, total: 5 }));
      setCompletedKeys(done);
    })();
    return () => { cancelled = true; };
  }, []);

  if (reps === null) return null;
  if (reps.length === 0) return null;

  return (
    <div className="max-w-lg mx-auto w-full flex flex-col gap-2" data-testid="dashboard-due-board">
      {reps.length > 0 && (
        <div className="flex items-center gap-2 px-1 pt-1" data-testid="dashboard-today-status">
          <Target size={16} className="text-theme-accent shrink-0" />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Today&apos;s training
          </span>
          <button
            onClick={() => void navigate('/coach/plan')}
            className="ml-auto text-xs text-theme-text-muted hover:text-theme-accent transition-colors"
            data-testid="dashboard-today-seeall"
          >
            See plan
          </button>
        </div>
      )}
      {reps.map((rep) => {
        const done = completedKeys.has(rep.key);
        return (
          <button
            key={rep.key}
            onClick={() => navigateToRep(navigate, rep)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:opacity-80 ${done ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-theme-accent/10 border-theme-accent/30'}`}
            data-testid={`dashboard-rep-${rep.kind}`}
            data-rep-done={done ? 'true' : 'false'}
          >
            <div className="flex-1 text-left min-w-0">
              <span className={`text-sm font-medium ${done ? 'line-through opacity-70' : ''}`} style={{ color: 'var(--color-text)' }}>{rep.label}</span>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{done ? 'Done for today — tap for more.' : rep.subtitle}</p>
            </div>
            {done
              ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              : <ChevronRight size={16} className="text-theme-text-muted shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function DashboardPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const gB = settings.glowBrightness;
  const gS = gB / 100;

  useEffect(() => {
    void seedDatabase();

    if (activeProfile) {
      void updateStreak(activeProfile).then(({ currentStreak, longestStreak }) => {
        if (currentStreak !== activeProfile.currentStreak || longestStreak !== activeProfile.longestStreak) {
          setActiveProfile({ ...activeProfile, currentStreak, longestStreak });
        }
      });
    }
  }, [activeProfile, setActiveProfile]);

  if (!activeProfile) return <></>;

  return (
    <div
      className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
      <div className="relative mt-2">
        <h1 className="text-xl font-bold text-center">
          Chess Academy Pro
        </h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <PageHelp
            helpId="dashboard"
            suppressAutoOpen={activeProfile?.strengthCalibrated === false}
            title="The order of operations"
            steps={[
              { label: '1. Pick an opening', body: 'Go to Openings → Masterclasses and pick one you actually play as White or Black — not at random. This is where everything starts.' },
              { label: '2. Climb the WLPP tabs', body: 'For each line: Watch it (get the ideas) → Learn it (you play, voice cues) → Practice it (silent, Hint if stuck) → Play it vs the coach. Each tab you finish unlocks the next.' },
              { label: '3. Unlock the deeper theory', body: 'Finishing a line’s full ladder unlocks its reward — the model game and its traps/weapons (how to punish your opponent’s common mistakes).' },
              { label: '4. Import your games', body: 'Pull in your real games so the app can log the mistakes and blunders you actually make.' },
              { label: '5. Fix your holes', body: 'Those logged errors flow to Weaknesses and the Coach, which turn them into review walk-throughs and targeted drills until the patterns stick.' },
              { label: 'The loop', body: 'Learn it → play it → find the holes → drill them shut. The four sections below are the steps of that one cycle.' },
            ]}
          />
        </div>
      </div>

      {/* Import Games */}
      <div className="max-w-lg mx-auto w-full">
        <button
          onClick={() => void navigate('/games/import')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 hover:opacity-80 transition-all duration-200"
          style={{
            borderTop: `1px solid rgba(245, 158, 11, ${Math.min(1, 0.1 * gS)})`,
            borderRight: `1px solid rgba(245, 158, 11, ${Math.min(1, 0.1 * gS)})`,
            borderLeft: `2px solid rgba(245, 158, 11, ${Math.min(1, 0.6 * gS)})`,
            borderBottom: `2px solid rgba(245, 158, 11, ${Math.min(1, 0.6 * gS)})`,
            boxShadow: scaledShadow('245, 158, 11', gB),
          }}
          data-testid="import-games-btn"
        >
          <Upload size={18} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Import Games</span>
        </button>
      </div>

      {/* Smart Search */}
      <div className="max-w-lg mx-auto w-full">
        <SmartSearchBar />
      </div>

      {/* Live loop status — today's reps, routes into the Training Plan hub */}
      <TodayStatus />

      {/* "The Philosophy of A General" (our book) now lives in The Coaches
          Library (Coach › The Coaches Library), so its dashboard tile is gone. */}

      {/* Section grid — uniform cards, order matches sidebar */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-center max-w-lg mx-auto w-full">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const shadow = scaledShadow(section.rgb, gB);
          const shadowHover = scaledShadow(section.rgb, Math.min(200, gB * 1.4));
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-200 aspect-square`}
              style={{
                borderTop: `1px solid rgba(${section.rgb}, ${Math.min(1, 0.1 * gS)})`,
                borderRight: `1px solid rgba(${section.rgb}, ${Math.min(1, 0.1 * gS)})`,
                borderLeft: `2px solid rgba(${section.rgb}, ${Math.min(1, 0.6 * gS)})`,
                borderBottom: `2px solid rgba(${section.rgb}, ${Math.min(1, 0.6 * gS)})`,
                boxShadow: shadow,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderLeft = `2px solid rgba(${section.rgb}, ${Math.min(1, 0.85 * gS)})`;
                el.style.borderBottom = `2px solid rgba(${section.rgb}, ${Math.min(1, 0.85 * gS)})`;
                el.style.borderTop = `1px solid rgba(${section.rgb}, ${Math.min(1, 0.2 * gS)})`;
                el.style.borderRight = `1px solid rgba(${section.rgb}, ${Math.min(1, 0.2 * gS)})`;
                el.style.boxShadow = shadowHover;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderLeft = `2px solid rgba(${section.rgb}, ${Math.min(1, 0.6 * gS)})`;
                el.style.borderBottom = `2px solid rgba(${section.rgb}, ${Math.min(1, 0.6 * gS)})`;
                el.style.borderTop = `1px solid rgba(${section.rgb}, ${Math.min(1, 0.1 * gS)})`;
                el.style.borderRight = `1px solid rgba(${section.rgb}, ${Math.min(1, 0.1 * gS)})`;
                el.style.boxShadow = shadow;
              }}
              data-testid={`section-${section.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon size={40} className={section.color} />
              <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

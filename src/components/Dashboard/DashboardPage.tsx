import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { updateStreak } from '../../services/sessionGenerator';
import { seedDatabase } from '../../services/dataLoader';
import { BookOpen, GraduationCap, Target, AlertTriangle, Upload, ChevronRight, CheckCircle2, Baby } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { PageHelp } from '../Layout/PageHelp';
import { TableOfContents } from './TableOfContents';
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
  /** 1-4 for the loop steps, rendered LARGE in place of the icon (David
   *  2026-09-05: "replace symbols with large 1,2,3,4 numbers. Do not number
   *  kids."). A numeral says "this is step two of four" in a way a mortarboard
   *  glyph cannot — the order IS the instruction on this screen. Kids Mode has
   *  no step because it is not part of the loop, so it keeps its icon. */
  step?: number;
  /** What this section actually does, in the user's terms. Four unlabelled
   *  squares asked people to guess; 64 of 67 native users never finished
   *  anything, and guessing is a step they were stopping at. */
  description: string;
  /** Which step of the training loop this IS. The page already tells the user
   *  the loop is "Learn it → play it → find the holes → drill them shut" — this
   *  puts that on the buttons so the words and the tiles agree. */
  loopStep?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  rgb: string;
}

// ORDERED BY THE LOOP THE PAGE ITSELF DESCRIBES. The order-of-operations card a
// few lines above says: "Learn it → play it → find the holes → drill them shut.
// The four sections below are the steps of that one cycle." The tiles did not
// follow it — Tactics sat third and Weaknesses fourth, so the page contradicted
// its own instructions. Weaknesses IS "find the holes" and Tactics IS "drill
// them shut", so they swap.
const SECTIONS: SectionItem[] = [
  {
    label: 'Openings',
    step: 1,
    description: 'Masterclasses for the lines you actually play — watch, learn, practise, then play them.',
    loopStep: 'Learn it',
    icon: BookOpen,
    route: '/openings',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    rgb: '6, 182, 212',
  },
  {
    label: 'Coach',
    step: 2,
    description: 'Play a game it talks you through, or one where it stays quiet until you ask.',
    loopStep: 'Play it',
    icon: GraduationCap,
    route: '/coach/home',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    rgb: '251, 113, 133',
  },
  {
    label: 'Weaknesses',
    step: 3,
    description: 'The mistakes your own games keep repeating, grouped so the pattern is visible.',
    loopStep: 'Find the holes',
    icon: AlertTriangle,
    route: '/weaknesses',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    rgb: '139, 92, 246',
  },
  {
    label: 'Tactics',
    step: 4,
    description: 'Puzzles built from your own blunders, plus a bank of thousands more.',
    loopStep: 'Drill them shut',
    icon: Target,
    route: '/tactics',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    rgb: '52, 211, 153',
  },
];

/** Kids mode sits BELOW the loop, deliberately without a loop step — it is a
 *  separate app for a young player, not a stage of the adult training cycle.
 *  It had no entry point on the home screen at all (only the desktop sidebar,
 *  which the mobile nav trims away), so on a phone it was unreachable from here
 *  — and ZERO native users have ever opened /kid in 60 days. */
const KIDS_SECTION: SectionItem = {
  label: 'Kids Mode',
  description: 'A simpler board for young players, one piece at a time.',
  icon: Baby,
  route: '/kid',
  color: 'text-orange-400',
  bgColor: 'bg-orange-500/10',
  rgb: '251, 146, 60',
};

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
  const [expanded, setExpanded] = useState(false);

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

  // The slot is RESERVED from first paint (fixed min-height) so the reps
  // arriving async never push the section grid down mid-tap — David's
  // misclick report (2026-07-31): the late-loading tiles shifted the
  // layout and his Coach tap landed on a training row. Collapsed by
  // default; expanding is user-initiated, so that shift is fine.
  const doneCount = reps?.filter((r) => completedKeys.has(r.key)).length ?? 0;
  const allDone = reps !== null && reps.length > 0 && doneCount === reps.length;

  return (
    <div className="max-w-lg mx-auto w-full flex flex-col gap-2 min-h-[2.75rem]" data-testid="dashboard-due-board">
      {reps !== null && reps.length > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className={`w-full h-11 flex items-center gap-2 px-4 rounded-xl border transition-all hover:opacity-80 ${allDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-theme-accent/10 border-theme-accent/30'}`}
          data-testid="dashboard-today-toggle"
          data-expanded={expanded ? 'true' : 'false'}
        >
          <Target size={16} className="text-theme-accent shrink-0" />
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Today&apos;s training
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {doneCount}/{reps.length} done
          </span>
          <ChevronRight
            size={16}
            className={`ml-auto shrink-0 text-theme-text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      )}
      {expanded && reps !== null && reps.map((rep) => {
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
      {expanded && (
        <button
          onClick={() => void navigate('/coach/plan')}
          className="self-end px-1 text-xs text-theme-text-muted hover:text-theme-accent transition-colors"
          data-testid="dashboard-today-seeall"
        >
          See full plan
        </button>
      )}
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
      className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6"
      style={{ color: 'var(--color-text)' }}
      data-testid="dashboard"
    >
      <div className="relative mt-2">
        <h1 className="text-xl font-bold text-center">
          Chess Academy Pro
        </h1>
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
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

      {/* STACKED BARS, NOT A GRID OF SQUARES (David 2026-09-03: "four main
          squares to be thin bars stacked in order... with the kids section
          added at the bottom").

          The squares carried a one-word label and nothing else, so the home
          screen asked a new user to guess what "Tactics" or "Weaknesses" meant
          and pick one. That guess is a step people were stopping at: 32 of 39
          native users had a single ~4-minute session and 64 of 67 never
          finished anything. A full-width row fits the label, a sentence saying
          what it does, and the loop step it belongs to — so the page reads as
          one ordered path rather than four unexplained doors.

          NOTE FOR THE NEXT SESSION: this deliberately DEPARTS from the
          "2-column grid of big tap targets" house rule in CLAUDE.md. That rule
          says hub pages must match the Dashboard — so the Dashboard changing IS
          the rule changing, and CLAUDE.md has been updated to match. */}
      {/* No `flex-1 content-center` here. Those came from the square-grid
          layout, where the tiles were meant to sit centred in the leftover
          space. With five FULL-HEIGHT bars the growing flex child absorbed the
          column and pushed the Table of Contents below the scrollable area —
          David 2026-09-05: "cannot scroll down all the way". Natural height,
          normal scroll. */}
      <div className="flex flex-col gap-2 max-w-lg mx-auto w-full">
        {[...SECTIONS, KIDS_SECTION].map((section) => {
          const Icon = section.icon;
          const shadow = scaledShadow(section.rgb, gB);
          const shadowHover = scaledShadow(section.rgb, Math.min(200, gB * 1.4));
          const isKids = section.route === KIDS_SECTION.route;
          return (
            <button
              key={section.route}
              onClick={() => void navigate(section.route)}
              className={`${section.bgColor} rounded-2xl flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 w-full ${isKids ? 'mt-2' : ''}`}
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
              {section.step ? (
                <span
                  className={`${section.color} shrink-0 w-8 text-center text-3xl font-black leading-none tabular-nums`}
                  aria-hidden="true"
                >
                  {section.step}
                </span>
              ) : (
                <Icon size={28} className={`${section.color} shrink-0`} />
              )}
              <span className="flex flex-col min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{section.label}</span>
                  {section.loopStep && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${section.color} opacity-70`}>
                      {section.loopStep}
                    </span>
                  )}
                </span>
                <span className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                  {section.description}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
            </button>
          );
        })}
      </div>

      {/* App table of contents — thin yellow bar under the section cards,
          expands into every tab's capabilities (David 2026-06-15). */}
      <TableOfContents />
    </div>
  );
}

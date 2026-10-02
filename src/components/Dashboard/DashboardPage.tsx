import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { updateStreak } from '../../services/sessionGenerator';
import { seedDatabase } from '../../services/dataLoader';
import { BookOpen, GraduationCap, Target, AlertTriangle, Upload, ChevronRight, Baby } from 'lucide-react';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { PageHelp } from '../Layout/PageHelp';
import { ReviewLastGameCard } from './ReviewLastGameCard';
import { TableOfContents } from './TableOfContents';
import { useSettings } from '../../hooks/useSettings';
import { scaledShadow } from '../../utils/neonColors';
import { db } from '../../db/schema';
import { useUpNext } from '../../hooks/useUpNext';
import type { UpNextState } from '../../services/upNextLoader';
import { UpNextBar } from './UpNextBar';
import { TodayRing } from './TodayRing';
import { getTrainedDays, daysTrainedThisWeek } from '../../services/trainingWeek';
import { loadWhatGotBetter, sayPickOncePerDay } from '../../services/upNextHome';

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

/** Which Home row the Up-next pick lives under — that row pulses in place. */
function homePulseRoute(hub: string | null): string | null {
  if (!hub) return null;
  if (hub.startsWith('tactics:')) return '/tactics';
  if (hub === 'openings') return '/openings';
  return null;
}

/** THE UP-NEXT SECTION (David 2026-10-01) — replaces the old five-rep list.
 *  One pick, pinned and pulsing, with its reason and finish line; today's
 *  ring of three bites; the week's trained days; what got better. Built on
 *  the SAME selector (`buildTodaysReps`) the Training Plan reads. The coach
 *  says the reason once a day per pick, after the student's first tap —
 *  never on launch, and through the narration setting. */
function UpNextSection({ upNext }: { upNext: UpNextState | null }): JSX.Element {
  const navigate = useNavigate();
  const [days, setDays] = useState(0);
  const [better, setBetter] = useState<{ green: number; red: number; newly: number } | null>(null);
  const [deepBest, setDeepBest] = useState(0);
  const spokeRef = useRef(false);

  useEffect(() => {
    void getTrainedDays().then((d) => setDays(daysTrainedThisWeek(d, new Date())));
    void loadWhatGotBetter().then(setBetter).catch(() => undefined);
    void db.meta.get('deep_run_best_v1').then((r) => setDeepBest(Number(r?.value) || 0)).catch(() => undefined);
  }, [upNext]);

  // The gentle voice: after the first tap anywhere on Home, once a day per pick.
  useEffect(() => {
    const pick = upNext?.current;
    if (!pick) return;
    const say = (): void => {
      if (spokeRef.current) return;
      spokeRef.current = true;
      void sayPickOncePerDay(pick.key, pick.reason);
    };
    window.addEventListener('pointerdown', say, { once: true });
    return () => window.removeEventListener('pointerdown', say);
  }, [upNext?.current]);

  return (
    <div className="max-w-lg mx-auto w-full flex flex-col gap-2 shrink-0" data-testid="dashboard-up-next">
      {upNext?.current && <UpNextBar pick={upNext.current} surface="home" />}
      {upNext && <TodayRing ring={upNext.ring} done={upNext.done} daysThisWeek={days} />}
      {better && (better.green > 0 || better.red > 0 || deepBest > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] font-semibold" data-testid="what-got-better">
          {better.newly > 0 && <span className="text-green-300">{better.newly} skill{better.newly === 1 ? '' : 's'} turned green this week</span>}
          <span className="text-green-300/80">{better.green} proven</span>
          <span className="text-rose-300/80">{better.red} to fix</span>
          {deepBest > 0 && <span className="text-fuchsia-300">Deep Run best {deepBest}</span>}
        </div>
      )}
      <button
        onClick={() => void navigate('/coach/plan')}
        className="self-end px-1 text-xs text-theme-text-muted hover:text-theme-accent transition-colors"
        data-testid="dashboard-today-seeall"
      >
        See full plan
      </button>
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
  const upNextForPulse = useUpNext();

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
  const pulseRoute = homePulseRoute(upNextForPulse?.current?.hub ?? null);

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

      {/* Up next + today's ring — routes into one short bite */}
      <UpNextSection upNext={upNextForPulse} />

      {/* The import→review handoff. Analysis already ran on their games and
          nobody was being shown it — see ReviewLastGameCard for the numbers.
          Renders nothing until they have a game of their own; dismissible. */}
      <ReviewLastGameCard />

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
              className={`${section.bgColor} rounded-2xl flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 w-full ${isKids ? 'mt-2' : ''} ${section.route === pulseRoute ? 'ring-2 ring-fuchsia-300/80 upnext-glow' : ''}`}
              data-up-next={section.route === pulseRoute ? 'true' : undefined}
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

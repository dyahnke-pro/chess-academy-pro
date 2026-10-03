import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertTriangle, Shuffle, Trophy, Wrench, MapPin, Lightbulb, Calculator, Swords, Crown, ChevronRight, Route, Flame } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { SmartSearchBar } from '../Search/SmartSearchBar';
import { PageHelp } from '../Layout/PageHelp';
import { PuzzleQuickSettings } from './PuzzleQuickSettings';
import { THEME_MAP } from '../../services/puzzleService';
import { useSettings } from '../../hooks/useSettings';
import { useCollapseOnScroll } from '../../hooks/useCollapseOnScroll';
import { scaledShadow } from '../../utils/neonColors';
import { logAppAudit } from '../../services/appAuditor';
import { useUpNext } from '../../hooks/useUpNext';
import { UpNextBar } from '../Dashboard/UpNextBar';
import { sectionPick } from '../../services/upNextPicker';

// ─── Theme Category Definitions ──────────────────────────────────────────

interface ThemeCard {
  label: string;
  themes: string[];
  emoji: string;
  color: string;
  bgColor: string;
  rgb: string;
}

const THEME_STYLE: Record<string, { emoji: string; color: string; bgColor: string; rgb: string }> = {
  'Forks':              { emoji: '\u2694\uFE0F', color: 'text-red-400', bgColor: 'bg-red-500/10', rgb: '239, 68, 68' },
  'Pins & Skewers':     { emoji: '\uD83D\uDCCC', color: 'text-sky-400', bgColor: 'bg-sky-500/10', rgb: '56, 189, 248' },
  'Discovered Attacks':  { emoji: '\uD83D\uDCA5', color: 'text-orange-400', bgColor: 'bg-orange-500/10', rgb: '249, 115, 22' },
  'Back Rank Mates':     { emoji: '\uD83C\uDFF0', color: 'text-purple-400', bgColor: 'bg-purple-500/10', rgb: '168, 85, 247' },
  'Sacrifices':          { emoji: '\uD83D\uDD25', color: 'text-amber-400', bgColor: 'bg-amber-500/10', rgb: '245, 158, 11' },
  'Deflection & Decoy':  { emoji: '\u21AA\uFE0F', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', rgb: '6, 182, 212' },
  'Zugzwang':            { emoji: '\u26A1', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', rgb: '250, 204, 21' },
  'Endgame Technique':   { emoji: '\uD83C\uDFC1', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', rgb: '52, 211, 153' },
  'Opening Traps':       { emoji: '\uD83E\uDEA4', color: 'text-rose-400', bgColor: 'bg-rose-500/10', rgb: '251, 113, 133' },
  'Mating Nets':         { emoji: '\uD83D\uDC51', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', rgb: '99, 102, 241' },
};

const THEME_CARDS: ThemeCard[] = Object.entries(THEME_MAP).map(([label, themes]) => {
  const config = THEME_STYLE[label] ?? { emoji: '\uD83C\uDFAF', color: 'text-gray-400', bgColor: 'bg-gray-500/10', rgb: '156, 163, 175' };
  return { label, themes, ...config };
});

// ─── Main Page ──────────────────────────────────────────────────────────────

/** One row on the hub. A bar carries the name AND a sentence saying what the
 *  section does — a square carried a one-word label and asked the student to
 *  guess (the Home screen made the same change, 2026-09-03; hand walk
 *  2026-10-01: 26 squares, 23 users open the hub, 9 go further). */
interface HubRow {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  route: string;
  color: string;
  bgColor: string;
  rgb: string;
  state?: Record<string, unknown>;
}

interface HubGroup {
  title: string;
  rows: HubRow[];
}

// Ordered as the loop runs: your own games first, then training, then the
// skills that sit underneath it. Test ids are unchanged (`section-<key>`).
const HUB_GROUPS: HubGroup[] = [
  {
    title: 'From your games',
    rows: [
      { key: 'my mistakes', label: 'My Weaknesses', description: 'Your own game mistakes, grouped by the pattern behind them — then more puzzles like them.', icon: AlertTriangle, route: '/tactics/mistakes', color: 'text-red-400', bgColor: 'bg-red-500/10', rgb: '239, 68, 68' },
      { key: 'spot', label: 'My Profile', description: 'Your strongest and weakest tactical motifs.', icon: Eye, route: '/tactics/profile', color: 'text-amber-400', bgColor: 'bg-amber-500/10', rgb: '245, 158, 11' },
    ],
  },
  {
    title: 'Train',
    rows: [
      { key: 'deep-run', label: 'Deep Run', description: 'Each puzzle one move longer. How many moves deep can you go?', icon: Flame, route: '/tactics/deep-run', color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/10', rgb: '232, 121, 249' },
      { key: 'daily', label: 'Daily Training', description: 'A mixed set at your level; missed puzzles come back on a schedule.', icon: Trophy, route: '/tactics/classic', color: 'text-violet-400', bgColor: 'bg-violet-500/10', rgb: '139, 92, 246' },
      { key: 'random-mix', label: 'Random Mix', description: 'Forks, pins, skewers, discoveries and more, shuffled.', icon: Shuffle, route: '/tactics/drill', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', rgb: '52, 211, 153', state: { filterThemes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate', 'sacrifice', 'deflection'], filterLabel: 'Random Mix' } },
      { key: 'long', label: 'Long Puzzles', description: 'Three, four, five moves deep — calculate the whole line.', icon: Route, route: '/tactics/long', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', rgb: '34, 211, 238' },
      { key: 'master-level', label: 'Master Level', description: 'Puzzles from the elite 2400+ pool.', icon: Crown, route: '/tactics/master', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', rgb: '250, 204, 21' },
      { key: 'setup', label: 'Setup Trainer', description: 'Find the quiet move that sets the tactic up.', icon: Wrench, route: '/tactics/setup', color: 'text-teal-400', bgColor: 'bg-teal-500/10', rgb: '45, 212, 191' },
    ],
  },
  {
    title: 'Skills',
    rows: [
      { key: 'pattern-school', label: 'Pattern Recognition', description: 'Each pattern: how to spot it, use it, and stop it.', icon: Swords, route: '/tactics/patterns', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', rgb: '99, 102, 241' },
      { key: 'analysis-practice', label: 'Analysis Practice', description: 'Read a position before you look for a move.', icon: Lightbulb, route: '/tactics/analysis-practice', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', rgb: '99, 102, 241' },
      { key: 'calculation', label: 'Calculation', description: 'See a line through to the end before you play it.', icon: Calculator, route: '/tactics/calculation', color: 'text-blue-400', bgColor: 'bg-blue-500/10', rgb: '59, 130, 246' },
      { key: 'find-the-square', label: 'Find the Square', description: 'Name squares fast to sharpen board vision.', icon: MapPin, route: '/tactics/find-square', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', rgb: '34, 211, 238' },
    ],
  },
];

function neonBorderStyle(rgb: string, gS: number): React.CSSProperties {
  return {
    borderTop: `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`,
    borderRight: `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`,
    borderLeft: `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`,
    borderBottom: `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`,
  };
}

function applyHoverBorder(el: HTMLElement, rgb: string, gS: number): void {
  el.style.borderLeft = `2px solid rgba(${rgb}, ${Math.min(1, 0.85 * gS)})`;
  el.style.borderBottom = `2px solid rgba(${rgb}, ${Math.min(1, 0.85 * gS)})`;
  el.style.borderTop = `1px solid rgba(${rgb}, ${Math.min(1, 0.2 * gS)})`;
  el.style.borderRight = `1px solid rgba(${rgb}, ${Math.min(1, 0.2 * gS)})`;
}

function applyRestBorder(el: HTMLElement, rgb: string, gS: number): void {
  el.style.borderLeft = `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`;
  el.style.borderBottom = `2px solid rgba(${rgb}, ${Math.min(1, 0.6 * gS)})`;
  el.style.borderTop = `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`;
  el.style.borderRight = `1px solid rgba(${rgb}, ${Math.min(1, 0.1 * gS)})`;
}

export function TacticsPage(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const gB = settings.glowBrightness;
  const gS = gB / 100;
  const { collapsed, onScroll } = useCollapseOnScroll();
  // This hub's own next step, pinned on top whatever Home is showing (David
  // 2026-10-02: hubs blink their own), and its real row pulses in place (the
  // list never reorders — muscle memory).
  const upNext = useUpNext();
  const pick = upNext ? sectionPick(upNext.ranked, upNext.done, (h) => h.startsWith('tactics:')) : null;
  const pulseKey = pick ? pick.hub.slice('tactics:'.length) : null;

  // Hub-visit signal so the audit stream can attribute downstream
  // surface events to the entry path through /tactics. Mirrors the
  // F1 fix from PR #504 on /weaknesses where the whole tab was
  // observability-blind.
  useEffect(() => {
    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: 'TacticsPage.mount',
      summary: 'tactics hub opened',
    });
  }, []);

  const handleNavigate = (route: string, label: string, state?: Record<string, unknown>): void => {
    void logAppAudit({
      kind: 'tactics-surface-event',
      category: 'subsystem',
      source: `TacticsPage.tap.${label}`,
      summary: `hub tile "${label}" → ${route}`,
      details: state ? JSON.stringify({ route, state }) : JSON.stringify({ route }),
    });
    void navigate(route, state ? { state } : undefined);
  };

  if (!activeProfile) {
    // Render a loading state instead of silent empty render — the
    // previous behavior left users staring at a blank page during
    // profile bootstrapping (SHOULD-WORK clause 1).
    return (
      <div
        className="flex items-center justify-center p-6 flex-1 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
        data-testid="tactics-page-loading"
      >
        Loading tactics…
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ color: 'var(--color-text)' }}
      data-testid="tactics-page"
    >
      {/* Fixed header — the title collapses on scroll-down (re-expands at the
          top); the search row stays pinned so it's always reachable. Mirrors
          the Game Insights collapse (David 2026-06-19). */}
      <div className="px-4 pt-4 shrink-0 flex flex-col gap-4">
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${collapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-24 opacity-100 mt-2'}`}
          aria-hidden={collapsed}
        >
          <div className="relative">
            <h1 className="text-xl font-bold text-center">
              Tactical Training
            </h1>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <PageHelp
                helpId="tactics"
                title="How Tactics works"
                steps={[
                  { label: 'Sharpen your eye', body: 'Puzzle training — forks, pins, mates, sacrifices — graded to your level. My Profile shows your strongest and weakest motifs.' },
                  { label: 'Themed sets', body: 'Drill one specific motif, or take a mixed set. Setup Trainer drills the quiet moves that set tactics up.' },
                  { label: 'From your games', body: 'My Mistakes turns the blunders logged from your imported games into puzzles — you re-solve the exact positions you got wrong.' },
                  { label: 'It sticks', body: 'Missed puzzles come back on a schedule so the pattern locks in. Tactics + Weaknesses are the drilling end of the loop.' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Search — pinned key row */}
        <div className="max-w-lg mx-auto w-full">
          <SmartSearchBar placeholder="Search tactics, games, openings..." />
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 flex flex-col gap-5"
        onScroll={onScroll}
      >
        {/* Quick settings — collapsible toggles for puzzle UX prefs
            (timer, tactic name, hints, voice). Closed by default. */}
        <PuzzleQuickSettings />

        {pick && (
          <div className="max-w-lg mx-auto w-full">
            <UpNextBar pick={pick} surface="tactics" />
          </div>
        )}

        {HUB_GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-2 max-w-lg mx-auto w-full">
            <h2 className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--color-text-muted)' }}>{group.title}</h2>
            {group.rows.map((row) => {
              const Icon = row.icon;
              const shadow = scaledShadow(row.rgb, gB);
              const shadowHover = scaledShadow(row.rgb, Math.min(200, gB * 1.4));
              return (
                <button
                  key={row.key}
                  onClick={() => handleNavigate(row.route, row.label, row.state)}
                  className={`${row.bgColor} rounded-2xl flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 w-full ${row.key === pulseKey ? 'ring-2 ring-fuchsia-300 upnext-glow' : ''}`}
                  data-up-next={row.key === pulseKey ? 'true' : undefined}
                  style={{ ...neonBorderStyle(row.rgb, gS), boxShadow: shadow }}
                  onMouseEnter={(e) => { applyHoverBorder(e.currentTarget, row.rgb, gS); e.currentTarget.style.boxShadow = shadowHover; }}
                  onMouseLeave={(e) => { applyRestBorder(e.currentTarget, row.rgb, gS); e.currentTarget.style.boxShadow = shadow; }}
                  data-testid={`section-${row.key}`}
                >
                  <Icon size={28} className={`${row.color} shrink-0`} />
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{row.label}</span>
                    <span className="text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{row.description}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
                </button>
              );
            })}
          </section>
        ))}

        {/* Themed sets — one motif per bar. */}
        <section className="flex flex-col gap-2 max-w-lg mx-auto w-full">
          <h2 className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: 'var(--color-text-muted)' }}>Themes</h2>
          {THEME_CARDS.map((card) => {
            const shadow = scaledShadow(card.rgb, gB);
            const shadowHover = scaledShadow(card.rgb, Math.min(200, gB * 1.4));
            // Opening Traps has its own surface (family-grouped, White/Black
            // split); every other theme opens the drill, titled by its card.
            const onClick =
              card.label === 'Opening Traps'
                ? () => handleNavigate('/tactics/opening-traps', card.label)
                : () => handleNavigate('/tactics/drill', card.label, { filterThemes: card.themes, filterLabel: card.label });
            return (
              <button
                key={card.label}
                onClick={onClick}
                className={`${card.bgColor} rounded-2xl flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 w-full`}
                style={{ ...neonBorderStyle(card.rgb, gS), boxShadow: shadow }}
                onMouseEnter={(e) => { applyHoverBorder(e.currentTarget, card.rgb, gS); e.currentTarget.style.boxShadow = shadowHover; }}
                onMouseLeave={(e) => { applyRestBorder(e.currentTarget, card.rgb, gS); e.currentTarget.style.boxShadow = shadow; }}
                data-testid={`section-${card.label.toLowerCase()}`}
              >
                <span className="text-xl w-7 text-center shrink-0" aria-hidden="true">{card.emoji}</span>
                <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text)' }}>{card.label}</span>
                <ChevronRight size={16} className="shrink-0 opacity-40" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTree,
  ChevronDown,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Target,
  AlertTriangle,
  Swords,
  Baby,
  Settings,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { scaledShadow } from '../../utils/neonColors';
import { THEME_MAP } from '../../services/puzzleService';

// ─── Tree shape ───────────────────────────────────────────────────────────

interface TocItem {
  label: string;
  /** Navigation target. Items without a route are non-clickable labels
   *  (pure "capability listed" entries) or expandable subcategories. */
  route?: string;
  /** Router state forwarded on navigate (theme filters, insight sub-tab). */
  state?: Record<string, unknown>;
  /** One-line description shown under the label. */
  desc?: string;
  /** Expandable subcategory. */
  children?: TocItem[];
}

interface TocSection {
  key: string;
  label: string;
  rgb: string;
  colorClass: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  items: TocItem[];
}

// Tactics motif cards mirror TacticsPage exactly — reuse THEME_MAP so the
// list never drifts from the real hub. 'Opening Traps' has its own surface.
const TACTIC_THEME_ITEMS: TocItem[] = Object.entries(THEME_MAP).map(([label, themes]) =>
  label === 'Opening Traps'
    ? { label, route: '/tactics/opening-traps' }
    : { label, route: '/tactics/drill', state: { filterThemes: themes } },
);

// The full app map. Each section = a main nav tab; its items = every
// capability that tab exposes. Subcategories nest under `children`.
const SECTIONS: TocSection[] = [
  {
    key: 'openings',
    label: 'Openings',
    rgb: '6, 182, 212',
    colorClass: 'text-cyan-400',
    icon: BookOpen,
    items: [
      { label: 'Masterclasses', route: '/openings', desc: 'Curated openings — Watch, Learn, Practice, Play each line.' },
      { label: 'Pro Repertoires', route: '/openings', desc: "Real pros' repertoires built from their own games." },
      { label: 'Gambits', route: '/openings', desc: 'Sharp gambit lines and how to play them.' },
      {
        label: 'All Openings (ECO A–E)',
        desc: 'Browse the full 3,600-entry catalog by ECO family.',
        children: [
          { label: 'A · Flank Openings', route: '/openings' },
          { label: 'B · Semi-Open Games', route: '/openings' },
          { label: 'C · Open Games & French', route: '/openings' },
          { label: "D · Queen's Pawn & Closed", route: '/openings' },
          { label: 'E · Indian Defences', route: '/openings' },
        ],
      },
      { label: 'Opening Trainer (SRS)', route: '/openings/srs', desc: 'Spaced-repetition drills for your saved lines.' },
    ],
  },
  {
    key: 'coach',
    label: 'Coach',
    rgb: '251, 113, 133',
    colorClass: 'text-rose-400',
    icon: GraduationCap,
    items: [
      { label: 'Learn with Coach', route: '/coach/teach', desc: 'Guided, voice-narrated walkthroughs of any line.' },
      { label: 'Play with Coach', route: '/coach/play', desc: 'Real game vs the engine, coach narrating and hinting.' },
      { label: 'The Coaches Library', route: '/coach/library', desc: 'Master books read aloud with live playable boards.' },
      { label: 'Game Insights', route: '/coach/report', desc: 'Analytics across all your games.' },
      {
        label: 'Endgame',
        route: '/coach/endgame',
        desc: 'Mating patterns, principles, drills, and your own endings.',
        children: [
          { label: 'Mating Patterns', route: '/coach/endgame' },
          { label: 'Principles / Pawn / Rook / Drawn', route: '/coach/endgame' },
          { label: 'Eval Lab', route: '/coach/endgame' },
          { label: 'Calculation', route: '/coach/endgame' },
          { label: 'Your Games', route: '/coach/endgame' },
        ],
      },
      { label: 'Training Plan', route: '/coach/plan', desc: 'Your repertoire as a rolodex with 8 drills per opening.' },
      { label: 'Analyse', route: '/coach/analyse', desc: 'Drop a position, get a Stockfish-grounded breakdown.' },
      { label: 'Review with Coach', route: '/coach/review', desc: 'Walk any past game move by move with the coach.' },
    ],
  },
  {
    key: 'tactics',
    label: 'Tactics',
    rgb: '52, 211, 153',
    colorClass: 'text-emerald-400',
    icon: Target,
    items: [
      { label: 'My Mistakes', route: '/tactics/mistakes', desc: 'Re-solve the exact blunders from your games.' },
      { label: 'My Weaknesses', route: '/tactics/weakness-themes', desc: 'Drill the motifs you miss most.' },
      { label: 'My Profile', route: '/tactics/profile', desc: 'Your strongest and weakest tactical motifs.' },
      { label: 'Daily Training', route: '/tactics/classic', desc: 'A graded puzzle set for today.' },
      { label: 'Setup Trainer', route: '/tactics/setup', desc: 'Drill the quiet moves that set tactics up.' },
      { label: 'Random Mix', route: '/tactics/drill', state: { filterThemes: ['fork', 'pin', 'skewer', 'discoveredAttack', 'backRankMate', 'sacrifice', 'deflection'] }, desc: 'A mixed bag of motifs.' },
      { label: 'Find the Square', route: '/tactics/find-square', desc: 'Board-vision coordinate trainer.' },
      {
        label: 'Themed Sets',
        desc: 'Drill one motif at a time.',
        children: TACTIC_THEME_ITEMS,
      },
    ],
  },
  {
    key: 'weaknesses',
    label: 'Weaknesses',
    rgb: '139, 92, 246',
    colorClass: 'text-violet-400',
    icon: AlertTriangle,
    items: [
      { label: 'Overview', route: '/weaknesses', state: { tab: 'overview' }, desc: 'Accuracy, trends, and flagged holes at a glance.' },
      { label: 'Thinking Errors', route: '/weaknesses', state: { tab: 'misconceptions' }, desc: 'Recurring misconceptions behind your mistakes.' },
      { label: 'Openings', route: '/weaknesses', state: { tab: 'openings' }, desc: 'Win rates and weak spots by opening.' },
      { label: 'Mistakes', route: '/weaknesses', state: { tab: 'mistakes' }, desc: 'Every logged mistake, classified.' },
      { label: 'Tactics', route: '/weaknesses', state: { tab: 'tactics' }, desc: 'The tactical motifs you miss by phase.' },
      { label: 'Patterns', route: '/weaknesses', state: { tab: 'patterns' }, desc: 'Time-management and habit patterns.' },
      { label: 'Games Drill-down', route: '/weaknesses/games', desc: 'Filter and dig into individual games.' },
    ],
  },
  {
    key: 'academy',
    label: 'Academy',
    rgb: '99, 102, 241',
    colorClass: 'text-indigo-400',
    icon: Swords,
    items: [
      { label: 'The Philosophy of a General', route: '/academy', desc: 'Our board-free doctrine, read aloud as an audiobook.' },
    ],
  },
  {
    key: 'kids',
    label: 'Kids Mode',
    rgb: '251, 146, 60',
    colorClass: 'text-orange-400',
    icon: Baby,
    items: [
      { label: 'Piece Games', route: '/kid', desc: 'Pawn, Rook, Knight, Bishop, Queen, King hubs.' },
      { label: 'Journey Map', route: '/kid/journey', desc: 'Story-driven chapters that teach the basics.' },
      { label: 'Fairy-Tale Adventure', route: '/kid/fairy-tale', desc: 'A themed chapter adventure.' },
      { label: 'Puzzles', route: '/kid/puzzles', desc: 'Kid-safe adaptive puzzles, no SAN, no timer pressure.' },
      { label: 'Guided Games', route: '/kid/play-games', desc: 'Play a real game with friendly guidance.' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    rgb: '148, 163, 184',
    colorClass: 'text-slate-400',
    icon: Settings,
    items: [
      { label: 'Open Settings', route: '/settings', desc: 'Voice, narration, theme, glow, backup, and API keys.' },
      { label: 'Import Games', route: '/games/import', desc: 'Pull in your Chess.com / Lichess games.' },
      { label: 'Game Database', route: '/games', desc: 'Browse every game you have imported.' },
    ],
  },
];

// ─── Recursive node ─────────────────────────────────────────────────────────

interface NodeProps {
  item: TocItem;
  depth: number;
  rgb: string;
  nodeKey: string;
  expanded: Set<string>;
  toggle: (key: string) => void;
  onNavigate: (route: string, state: Record<string, unknown> | undefined) => void;
}

function TocNode({ item, depth, rgb, nodeKey, expanded, toggle, onNavigate }: NodeProps): JSX.Element {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isOpen = expanded.has(nodeKey);
  // depth 1 = direct capability, depth 2 = sub-item. Indent accordingly.
  const indent = 12 + depth * 14;

  const handleClick = (): void => {
    if (hasChildren) {
      toggle(nodeKey);
    } else if (item.route) {
      onNavigate(item.route, item.state);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-start gap-2 py-1.5 pr-3 text-left transition-colors hover:bg-white/5 rounded-md"
        style={{ paddingLeft: `${indent}px` }}
        data-testid={`toc-item-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      >
        <span className="shrink-0 mt-0.5 w-3.5">
          {hasChildren
            ? (isOpen
              ? <ChevronDown size={14} style={{ color: `rgb(${rgb})` }} />
              : <ChevronRight size={14} style={{ color: `rgb(${rgb})` }} />)
            : <span className="block w-1 h-1 rounded-full mt-1.5 ml-1" style={{ background: `rgb(${rgb})` }} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-sm" style={{ color: 'var(--color-text)' }}>{item.label}</span>
          {item.desc && (
            <span className="block text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</span>
          )}
        </span>
      </button>
      {hasChildren && isOpen && (
        <div>
          {(item.children ?? []).map((child, i) => (
            <TocNode
              key={`${nodeKey}/${i}`}
              item={child}
              depth={depth + 1}
              rgb={rgb}
              nodeKey={`${nodeKey}/${i}`}
              expanded={expanded}
              toggle={toggle}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Table of Contents ──────────────────────────────────────────────────────

/** Collapsible map of the whole app — one thin yellow bar on the dashboard
 *  that expands into every tab's capabilities. Main tabs and their
 *  subcategories each collapse independently to keep it compact. */
export function TableOfContents(): JSX.Element {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const gB = settings.glowBrightness;
  const gS = gB / 100;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onNavigate = (route: string, state: Record<string, unknown> | undefined): void => {
    void navigate(route, state ? { state } : undefined);
  };

  const YELLOW = '250, 204, 21';

  return (
    <div className="max-w-lg mx-auto w-full" data-testid="dashboard-toc">
      {/* The thin yellow bar */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl bg-yellow-500/10 hover:opacity-90 transition-all duration-200"
        style={{
          borderTop: `1px solid rgba(${YELLOW}, ${Math.min(1, 0.1 * gS)})`,
          borderRight: `1px solid rgba(${YELLOW}, ${Math.min(1, 0.1 * gS)})`,
          borderLeft: `2px solid rgba(${YELLOW}, ${Math.min(1, 0.6 * gS)})`,
          borderBottom: `2px solid rgba(${YELLOW}, ${Math.min(1, 0.6 * gS)})`,
          boxShadow: scaledShadow(YELLOW, gB),
        }}
        data-testid="toc-toggle"
      >
        <ListTree size={18} className="text-yellow-400 shrink-0" />
        <span className="text-sm font-semibold text-yellow-400 flex-1 text-left">Table of Contents</span>
        {open
          ? <ChevronDown size={18} className="text-yellow-400 shrink-0" />
          : <ChevronRight size={18} className="text-yellow-400 shrink-0" />}
      </button>

      {/* Expanded map */}
      {open && (
        <div
          className="mt-2 rounded-xl py-1 overflow-hidden"
          style={{
            background: 'var(--color-bg-secondary)',
            border: `1px solid rgba(${YELLOW}, ${Math.min(1, 0.25 * gS)})`,
          }}
          data-testid="toc-panel"
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const sectionKey = section.key;
            const isOpen = expanded.has(sectionKey);
            return (
              <div key={section.key}>
                {/* Main tab — expand/collapse */}
                <button
                  type="button"
                  onClick={() => toggle(sectionKey)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-2 py-2 px-3 text-left transition-colors hover:bg-white/5"
                  data-testid={`toc-section-${section.key}`}
                >
                  <Icon size={16} className={`${section.colorClass} shrink-0`} />
                  <span className={`text-sm font-bold flex-1 ${section.colorClass}`}>{section.label}</span>
                  {isOpen
                    ? <ChevronDown size={16} className={`${section.colorClass} shrink-0`} />
                    : <ChevronRight size={16} className={`${section.colorClass} shrink-0`} />}
                </button>
                {isOpen && (
                  <div className="pb-1">
                    {section.items.map((item, i) => (
                      <TocNode
                        key={`${sectionKey}/${i}`}
                        item={item}
                        depth={1}
                        rgb={section.rgb}
                        nodeKey={`${sectionKey}/${i}`}
                        expanded={expanded}
                        toggle={toggle}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

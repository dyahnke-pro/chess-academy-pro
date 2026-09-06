import { useCallback, useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { usePullToRefresh, PULL_TO_REFRESH_THRESHOLD_PX } from '../../hooks/usePullToRefresh';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  Baby,
  Menu,
  X,
  MessageCircle,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { ThemeToggle } from './ThemeToggle';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { GlobalCoachDrawer } from '../Coach/GlobalCoachDrawer';
import { QuickFeedbackButton } from '../Feedback/QuickFeedbackButton';
import { logAppAudit } from '../../services/appAuditor';
import { voiceService } from '../../services/voiceService';
import { cancelBackgroundAnalysis } from '../../services/gameAnalysisService';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  glowColor: string;
  iconColor: string;
  activeText: string;
  activeBg: string;
}

/* 🔒 THIS ORDER MIRRORS THE HOME SCREEN (David 2026-09-05: "adjust the tabs at
   bottom of screen to match the order of the Home Screen").

   The home screen numbers its sections 1-4 and prints the loop they belong to —
   "Learn it → play it → find the holes → drill them shut" — so Openings, Coach,
   Weaknesses, Tactics is a sequence the user is being taught, not an arbitrary
   list. The nav used to run Tactics before Weaknesses, which contradicted the
   numbered steps the same user had just read. Keep the two in step: reordering
   the home screen means reordering here.

   MOBILE_NAV_ITEMS takes the first five, so this order also decides the phone
   tabs — Home plus the four numbered sections, in their numbered order. */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, glowColor: 'rgba(250, 204, 21, 0.6)', iconColor: 'rgb(250, 204, 21)', activeText: 'text-yellow-400', activeBg: 'bg-yellow-500/10' },
  { to: '/openings', label: 'Openings', icon: BookOpen, glowColor: 'rgba(6, 182, 212, 0.6)', iconColor: 'rgb(6, 182, 212)', activeText: 'text-cyan-400', activeBg: 'bg-cyan-500/10' },
  { to: '/coach/home', label: 'Coach', icon: GraduationCap, glowColor: 'rgba(251, 113, 133, 0.6)', iconColor: 'rgb(251, 113, 133)', activeText: 'text-rose-400', activeBg: 'bg-rose-500/10' },
  { to: '/weaknesses', label: 'Weaknesses', icon: AlertTriangle, glowColor: 'rgba(139, 92, 246, 0.6)', iconColor: 'rgb(139, 92, 246)', activeText: 'text-violet-400', activeBg: 'bg-violet-500/10' },
  { to: '/tactics', label: 'Tactics', icon: Target, glowColor: 'rgba(52, 211, 153, 0.6)', iconColor: 'rgb(52, 211, 153)', activeText: 'text-emerald-400', activeBg: 'bg-emerald-500/10' },
  { to: '/kid', label: 'Kids Mode', icon: Baby, glowColor: 'rgba(251, 146, 60, 0.6)', iconColor: 'rgb(251, 146, 60)', activeText: 'text-orange-400', activeBg: 'bg-orange-500/10' },
  { to: '/settings', label: 'Settings', icon: Settings, glowColor: 'rgba(148, 163, 184, 0.5)', iconColor: 'rgb(148, 163, 184)', activeText: 'text-slate-400', activeBg: 'bg-slate-500/10' },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

const DRAG_THRESHOLD = 8; // px — movement below this is treated as a tap

function DraggableCoachFab({ onOpen }: { onOpen: () => void }): JSX.Element {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    moved: boolean;
  } | null>(null);

  const defaultTop = 'calc(env(safe-area-inset-top, 0px) + 4rem)';

  const handleTouchStart = useCallback((e: React.TouchEvent): void => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: rect.left + rect.width / 2,
      startPosY: rect.top + rect.height / 2,
      moved: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent): void => {
    const drag = dragRef.current;
    if (!drag) return;
    const touch = e.touches[0];
    const dx = touch.clientX - drag.startX;
    const dy = touch.clientY - drag.startY;

    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    drag.moved = true;

    const newX = Math.max(40, Math.min(window.innerWidth - 40, drag.startPosX + dx));
    const newY = Math.max(40, Math.min(window.innerHeight - 40, drag.startPosY + dy));
    setPos({ x: newX, y: newY });
  }, []);

  const handleTouchEnd = useCallback((): void => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) {
      onOpen();
    }
  }, [onOpen]);

  const positioned = pos !== null;

  return (
    <button
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={positioned ? undefined : () => onOpen()}
      className="md:hidden fixed z-40 flex items-center justify-center gap-1.5 px-4 py-2 rounded-full shadow-lg"
      style={{
        background: 'var(--color-accent)',
        color: 'var(--color-bg)',
        boxShadow: '0 0 12px rgba(6, 182, 212, 0.4), 0 4px 12px rgba(0, 0, 0, 0.25)',
        touchAction: 'none',
        ...(positioned
          ? {
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: 'translate(-50%, -50%)',
            }
          : {
              right: '1rem',
              top: defaultTop,
            }),
      }}
      aria-label="Open chat"
      data-testid="coach-edge-tab"
    >
      <MessageCircle size={16} />
      <span className="text-xs font-semibold">Chat</span>
    </button>
  );
}

export function AppLayout(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const coachDrawerOpen = useAppStore((s) => s.coachDrawerOpen);
  const setCoachDrawerOpen = useAppStore((s) => s.setCoachDrawerOpen);
  const bgAnalysisRunning = useAppStore((s) => s.backgroundAnalysisRunning);
  const bgAnalysisProgress = useAppStore((s) => s.backgroundAnalysisProgress);
  const location = useLocation();
  // Native-style pull-to-refresh on the page wrapper (David 2026-09-05). Each
  // page is its own scroller, so the hook finds the scroller under the touch
  // and arms only at scrollTop 0; a release past the threshold hard-reloads,
  // which also applies any deferred SW/OTA bundle swap.
  const mainRef = useRef<HTMLElement>(null);
  const pull = usePullToRefresh(mainRef);

  // Emit a route-changed audit on every URL change so a session can
  // reconstruct navigation flow from the audit log alone — joins with
  // coach-hub-tile-clicked etc. for a "what did the user actually tap?"
  // story without speculation.
  const lastRouteRef = useRef<string>('');
  useEffect(() => {
    const path = location.pathname + location.search + location.hash;
    if (path === lastRouteRef.current) return;
    const from = lastRouteRef.current || '(initial)';
    lastRouteRef.current = path;
    // Stop any in-flight narration the moment the route changes — leaving a
    // lesson/coach surface must silence its voice immediately, even if the
    // unmounting component's own cleanup races the navigation (David 2026-06-18
    // "the narration is not stopping when I leave the tab"). Each destination
    // re-initiates its own voice on mount, so a blanket stop here is safe.
    if (from !== '(initial)') voiceService.stop();
    void logAppAudit({
      kind: 'route-changed',
      category: 'app',
      source: 'AppLayout',
      summary: `${from} → ${path}`,
    });
  }, [location]);

  const closeSidebar = useCallback((): void => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  // Tap target: if the current page already exposes the inline coach
  // chat textarea, scroll to it and focus the cursor instead of
  // opening the drawer (the drawer would just duplicate that input).
  const handleOpenCoach = useCallback((): void => {
    const el = document.getElementById('coach-chat-textarea');
    if (el instanceof HTMLTextAreaElement && !el.disabled) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      return;
    }
    setCoachDrawerOpen(true);
  }, [setCoachDrawerOpen]);

  // Hide FAB on pages with their own chat panel and when no profile
  // Global chat FAB is retired. Per user feedback (build a48b721):
  //   - Tabs with SmartSearchBar (Home, Openings, Tactics, Weaknesses,
  //     Coach landing) already provide a chat entry point via search.
  //   - Chessboard surfaces (Coach Teach, Coach Play, etc.) carry a
  //     dedicated inline Chat button next to the Tips toggle.
  // The duplicate floating FAB cluttered the top-right corner and
  // could cover board UI. Disabled here; both inline buttons + the
  // SmartSearchBar handle the chat-open intent.
  const showCoachFab = false;
  void activeProfile;
  void coachDrawerOpen;

  return (
    <div
      // h-full, NOT h-dvh: this sits INSIDE #root, which already fills the
      // viewport minus the safe-area insets html pads by. Asking for the whole
      // screen here re-adds those insets and pushes the layout — and every page
      // scroller inside it — off the bottom of the screen, which is exactly the
      // "can't scroll to the end" David reported (measured: this box ended 59px
      // below the viewport on a Dynamic Island iPhone). Fill the parent.
      className="flex flex-col h-full min-h-0 overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
      data-testid="app-layout"
      data-profile-loaded={activeProfile ? 'true' : 'false'}
    >
      <OfflineBanner />

      {bgAnalysisRunning && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="bg-analysis-banner"
        >
          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
          <span>Analyzing games{bgAnalysisProgress ? ` — ${bgAnalysisProgress}` : '...'}</span>
          <button
            type="button"
            onClick={() => cancelBackgroundAnalysis()}
            className="ml-auto px-2 py-0.5 rounded font-semibold border border-current/40 hover:opacity-80 active:opacity-60"
            style={{ background: 'color-mix(in srgb, var(--color-bg) 18%, transparent)' }}
            data-testid="bg-analysis-stop"
            aria-label="Stop analyzing games"
          >
            Stop
          </button>
        </div>
      )}

      {/* Mobile header */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">♛</span>
          <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
            Chess Academy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <QuickFeedbackButton />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg"
            style={{ color: 'var(--color-text)' }}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            data-testid="mobile-menu-btn"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeSidebar}
            data-testid="sidebar-overlay"
          />
          <nav
            className="md:hidden fixed top-0 right-0 bottom-0 w-64 z-50 flex flex-col py-6"
            style={{
              background: 'var(--color-bg-secondary)',
              borderLeft: '2px solid rgba(0, 229, 255, 0.4)',
              boxShadow: '-4px 0 20px rgba(0, 229, 255, 0.15), -2px 0 8px rgba(168, 85, 247, 0.1)',
            }}
          >
            <div className="flex items-center justify-between px-4 mb-6">
              <span
                className="font-bold text-sm"
                style={{
                  color: 'var(--color-text)',
                  textShadow: '0 0 8px rgba(0, 229, 255, 0.4)',
                }}
              >
                Menu
              </span>
              <button
                onClick={closeSidebar}
                className="p-1 rounded"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto">
              {NAV_ITEMS.map(({ to, label, icon: Icon, iconColor, glowColor, activeText, activeBg }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? `${activeText} ${activeBg}`
                        : 'hover:text-theme-text hover:bg-theme-surface'
                    }`
                  }
                  style={({ isActive }) => isActive ? {
                    borderLeft: `3px solid ${glowColor}`,
                    boxShadow: `0 4px 8px -2px ${glowColor}, 0 0 10px ${glowColor}, inset 2px 0 8px ${glowColor.replace('0.6)', '0.15)')}`,
                  } : {
                    borderLeft: '3px solid transparent',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Icon size={16} style={{ color: iconColor }} />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <nav
          className="hidden md:flex flex-col w-56 shrink-0 border-r py-6"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'color-mix(in srgb, var(--color-accent) 20%, var(--color-border))',
          }}
        >
          <div className="px-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">♛</span>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                  Chess Academy
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Pro
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0.5 px-2 flex-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, iconColor, glowColor, activeText, activeBg }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                    isActive
                      ? `${activeText} ${activeBg}`
                      : 'hover:text-theme-text hover:bg-theme-surface'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  borderLeft: `3px solid ${glowColor}`,
                  boxShadow: `0 4px 8px -2px ${glowColor}, 0 0 10px ${glowColor}, inset 2px 0 8px ${glowColor.replace('0.6)', '0.15)')}`,
                } : {
                  borderLeft: '3px solid transparent',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Icon size={16} style={{ color: iconColor }} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="px-2 border-t pt-3 mt-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="px-3 pb-2">
              <QuickFeedbackButton />
            </div>
            <ThemeToggle />
            {activeProfile && (
              <div className="flex items-center gap-2 px-3 py-2 mt-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                >
                  {activeProfile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {activeProfile.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Level {activeProfile.level} · {activeProfile.currentRating} ELO
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Main content */}
        <main ref={mainRef} className="relative flex flex-1 flex-col min-h-0 overflow-hidden">
          {(pull.pullDistance > 0 || pull.refreshing) && (
            /* iOS-style pull spinner (David 2026-09-05: "the circle you see on
               an iPhone, not a written notification"). The ring fills with the
               pull and rotates with it; once past the threshold — or while the
               reload is in flight — it spins. No text. */
            <div
              className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center"
              style={{
                transform: `translateY(${Math.max(0, pull.pullDistance - 44)}px)`,
                opacity: Math.min(1, pull.pullDistance / 40),
              }}
              data-testid="pull-to-refresh-indicator"
              aria-live="polite"
              aria-label={pull.refreshing ? 'Refreshing' : pull.ready ? 'Release to refresh' : 'Pull to refresh'}
            >
              <span
                className="mt-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md"
                style={{ background: 'var(--color-bg)' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 ${pull.ready || pull.refreshing ? 'animate-spin' : ''}`}
                  style={
                    pull.ready || pull.refreshing
                      ? undefined
                      : { transform: `rotate(${(pull.pullDistance / PULL_TO_REFRESH_THRESHOLD_PX) * 270}deg)` }
                  }
                  aria-hidden="true"
                >
                  <circle
                    cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" strokeLinecap="round"
                    style={{ stroke: 'var(--color-text-muted)', opacity: 0.25 }}
                  />
                  <circle
                    cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 9}
                    strokeDashoffset={
                      pull.ready || pull.refreshing
                        ? 2 * Math.PI * 9 * 0.7
                        : 2 * Math.PI * 9 * (1 - Math.min(1, pull.pullDistance / PULL_TO_REFRESH_THRESHOLD_PX))
                    }
                    style={{ stroke: 'var(--color-accent, var(--color-text))' }}
                  />
                </svg>
              </span>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      <InstallPrompt />

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around border-t py-2 pb-safe z-30"
        style={{
          background: 'color-mix(in srgb, var(--color-bg-secondary) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'var(--color-border)',
        }}
      >
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon, iconColor, glowColor, activeText }) => {
          // Phase 5 (#9): replace the top-line indicator with a left+bottom
          // corner glow that bleeds into the nav background. Same asymmetric
          // L-shape Openings tabs use, but with inset shadows so the glow
          // fades into the surface instead of cutting it.
          const glowFaint = glowColor.replace('0.6)', '0.08)').replace('0.5)', '0.07)');
          const glowSoft = glowColor.replace('0.6)', '0.3)').replace('0.5)', '0.25)');
          const glowStrong = glowColor.replace('0.6)', '0.7)').replace('0.5)', '0.6)');
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              // WO-ROLODEX-UI-01 PR-5: the Coach tab is the slide
              // destination for the favorite-an-opening star
              // animation. StarAnimationLayer looks this up via
              // `nav-coach-tab` testid; keeping the per-tab testid
              // tagged so adding more animation destinations later
              // doesn't need a second pass.
              data-testid={`nav-${to.replace(/^\//, '').replace(/\//g, '-') || 'home'}-tab`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors min-w-0 ${
                  isActive ? activeText : ''
                }`
              }
              style={({ isActive }) => isActive ? {
                borderLeft: `2px solid ${glowStrong}`,
                borderBottom: `2px solid ${glowStrong}`,
                background: `linear-gradient(225deg, ${glowFaint} 0%, transparent 70%)`,
                boxShadow: `inset 6px 0 14px -4px ${glowSoft}, inset 0 -6px 14px -4px ${glowSoft}, 0 0 10px ${glowSoft}`,
                filter: `drop-shadow(0 0 4px ${glowSoft})`,
              } : {
                borderLeft: '2px solid transparent',
                borderBottom: '2px solid transparent',
                color: 'var(--color-text-muted)',
              }}
            >
              <Icon size={22} style={{ color: iconColor }} />
              <span className="truncate w-full text-center leading-tight">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Coach trigger — draggable on mobile, FAB on desktop */}
      {showCoachFab && (
        <>
          <DraggableCoachFab onOpen={handleOpenCoach} />

          {/* Desktop: floating action button */}
          <button
            onClick={handleOpenCoach}
            className="hidden md:flex fixed z-40 items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              right: '1rem',
              top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            }}
            aria-label="Open chat"
            data-testid="coach-fab"
          >
            <MessageCircle size={22} />
          </button>
        </>
      )}

      {/* Global coach drawer */}
      <GlobalCoachDrawer />
    </div>
  );
}

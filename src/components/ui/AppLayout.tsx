import { useCallback, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  Baby,
  Menu,
  X,
  MessageCircle,
  ChevronLeft,
  AlertTriangle,
  Target,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { ThemeToggle } from './ThemeToggle';
import { InstallPrompt } from './InstallPrompt';
import { OfflineBanner } from './OfflineBanner';
import { GlobalCoachDrawer } from '../Coach/GlobalCoachDrawer';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/openings', label: 'Openings', icon: BookOpen },
  { to: '/coach/play', label: 'Coach', icon: GraduationCap },
  { to: '/tactics', label: 'Tactics', icon: Target },
  { to: '/weaknesses', label: 'Weaknesses', icon: AlertTriangle },
  { to: '/kid', label: 'Kids Mode', icon: Baby },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.slice(0, 5);

export function AppLayout(): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const coachDrawerOpen = useAppStore((s) => s.coachDrawerOpen);
  const setCoachDrawerOpen = useAppStore((s) => s.setCoachDrawerOpen);
  const coachEdgeTabPercent = useAppStore((s) => s.coachEdgeTabPercent);
  const setCoachEdgeTabPercent = useAppStore((s) => s.setCoachEdgeTabPercent);
  const bgAnalysisRunning = useAppStore((s) => s.backgroundAnalysisRunning);
  const bgAnalysisProgress = useAppStore((s) => s.backgroundAnalysisProgress);
  const location = useLocation();

  // Draggable edge tab
  const edgeDragRef = useRef<{ startY: number; startPercent: number; dragged: boolean } | null>(null);

  const handleEdgePointerDown = useCallback((e: React.PointerEvent) => {
    edgeDragRef.current = { startY: e.clientY, startPercent: coachEdgeTabPercent, dragged: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [coachEdgeTabPercent]);

  const handleEdgePointerMove = useCallback((e: React.PointerEvent) => {
    if (!edgeDragRef.current) return;
    const dy = e.clientY - edgeDragRef.current.startY;
    if (Math.abs(dy) > 4) edgeDragRef.current.dragged = true;
    const viewportH = window.innerHeight;
    const deltaPercent = (dy / viewportH) * 100;
    setCoachEdgeTabPercent(edgeDragRef.current.startPercent + deltaPercent);
  }, [setCoachEdgeTabPercent]);

  const handleEdgePointerUp = useCallback((e: React.PointerEvent) => {
    const wasDrag = edgeDragRef.current?.dragged ?? false;
    edgeDragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (!wasDrag) {
      setCoachDrawerOpen(true);
    }
  }, [setCoachDrawerOpen]);

  const closeSidebar = useCallback((): void => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  // Hide FAB on pages with their own chat panel and when no profile
  const showCoachFab = activeProfile
    && location.pathname !== '/coach/play'
    && !location.pathname.startsWith('/play')
    && !coachDrawerOpen;

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--color-bg)' }}>
      <OfflineBanner />

      {bgAnalysisRunning && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="bg-analysis-banner"
        >
          <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
          <span>Analyzing games{bgAnalysisProgress ? ` — ${bgAnalysisProgress}` : '...'}</span>
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
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg"
          style={{ color: 'var(--color-text)' }}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          data-testid="mobile-menu-btn"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
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
            className="md:hidden fixed top-0 right-0 bottom-0 w-64 z-50 flex flex-col py-6 border-l"
            style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center justify-between px-4 mb-6">
              <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Menu</span>
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
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-theme-accent text-theme-bg'
                        : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-surface'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </>
      )}

      <div className="flex flex-1">
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
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    isActive
                      ? 'text-theme-accent bg-theme-accent/10'
                      : 'text-theme-text-muted hover:text-theme-text hover:bg-theme-surface'
                  }`
                }
                style={({ isActive }) => isActive ? {
                  borderBottom: '2px solid var(--color-accent)',
                  boxShadow: '0 2px 8px color-mix(in srgb, var(--color-accent) 50%, transparent)',
                } : undefined}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          <div className="px-2 border-t pt-3 mt-3" style={{ borderColor: 'var(--color-border)' }}>
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
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
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
        {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors min-w-0 ${
                isActive ? 'text-theme-accent' : 'text-theme-text-muted'
              }`
            }
            style={({ isActive }) => isActive ? {
              borderTop: '2px solid var(--color-accent)',
              filter: 'drop-shadow(0 0 6px var(--color-accent))',
            } : { borderTop: '2px solid transparent' }}
          >
            <Icon size={22} />
            <span className="truncate w-full text-center leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Coach trigger — edge tab on mobile, FAB on desktop */}
      {showCoachFab && (
        <>
          {/* Mobile: right-edge tab — draggable, thinner profile */}
          <button
            onPointerDown={handleEdgePointerDown}
            onPointerMove={handleEdgePointerMove}
            onPointerUp={handleEdgePointerUp}
            className="md:hidden fixed z-40 flex items-center justify-center rounded-l-md shadow-md touch-none select-none"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              right: 0,
              top: `${coachEdgeTabPercent}%`,
              transform: 'translateY(-50%)',
              width: 24,
              height: 48,
            }}
            aria-label="Open coach chat (drag to reposition)"
            data-testid="coach-edge-tab"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Desktop: floating action button */}
          <button
            onClick={() => setCoachDrawerOpen(true)}
            className="hidden md:flex fixed z-40 items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              right: '1rem',
              bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))',
            }}
            aria-label="Open coach chat"
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

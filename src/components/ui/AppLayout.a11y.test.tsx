import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// Mock child components that hit APIs/DB
vi.mock('./InstallPrompt', () => ({
  InstallPrompt: () => <div data-testid="install-prompt" />,
}));

vi.mock('./OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner" />,
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="page-outlet">Page Content</div>,
  };
});

const { AppLayout } = await import('./AppLayout');

describe('AppLayout a11y', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    const profile = buildUserProfile({ id: 'main', name: 'TestPlayer', level: 3, currentRating: 1500 });
    useAppStore.getState().setActiveProfile(profile);
  });

  it('mobile menu button has aria-label', () => {
    render(<AppLayout />);
    const menuBtn = screen.getByTestId('mobile-menu-btn');
    expect(menuBtn).toHaveAttribute('aria-label');
    expect(menuBtn.getAttribute('aria-label')).toMatch(/menu/i);
  });

  it('nav links have accessible text', () => {
    render(<AppLayout />);
    const dashboardLinks = screen.getAllByText('Dashboard');
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('desktop sidebar contains nav element', () => {
    render(<AppLayout />);
    const navElements = document.querySelectorAll('nav');
    expect(navElements.length).toBeGreaterThanOrEqual(1);
  });

  it('all nav links render with text labels', () => {
    render(<AppLayout />);
    const expectedLabels = ['Dashboard', 'Openings', 'Coach', 'Puzzles', 'Play', 'Games', 'Analysis', 'Stats', 'Settings', 'Kids Mode'];
    for (const label of expectedLabels) {
      const links = screen.getAllByText(label);
      expect(links.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('main content area is a main element', () => {
    render(<AppLayout />);
    const mainEl = document.querySelector('main');
    expect(mainEl).toBeTruthy();
  });

  it('profile info is visible for logged-in user', () => {
    render(<AppLayout />);
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
  });

  it('mobile menu toggle has correct aria-label when closed', () => {
    useAppStore.getState().setSidebarOpen(false);
    render(<AppLayout />);
    const menuBtn = screen.getByTestId('mobile-menu-btn');
    expect(menuBtn.getAttribute('aria-label')).toBe('Open menu');
  });

  it('displays user level and ELO', () => {
    render(<AppLayout />);
    expect(screen.getByText(/Level 3/)).toBeInTheDocument();
    expect(screen.getByText(/1500 ELO/)).toBeInTheDocument();
  });
});

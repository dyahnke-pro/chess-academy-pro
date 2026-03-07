import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { KidLayout } from './KidLayout';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

vi.mock('../../services/themeService', async () => {
  const actual = await vi.importActual<typeof import('../../services/themeService')>('../../services/themeService');
  return { ...actual, applyTheme: vi.fn() };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-content">Child content</div>,
  };
});

describe('KidLayout', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: true }));
  });

  it('renders the layout container', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('kid-layout')).toBeInTheDocument();
  });

  it('renders Chess Quest branding in header', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('kid-header')).toBeInTheDocument();
    expect(screen.getByText('Chess Quest')).toBeInTheDocument();
  });

  it('renders the chess knight icon', () => {
    render(<KidLayout />);
    expect(screen.getByText('♞')).toBeInTheDocument();
  });

  it('renders back to main button', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('kid-back-to-main')).toBeInTheDocument();
    expect(screen.getByLabelText('Back to Chess Academy')).toBeInTheDocument();
  });

  it('renders child content via Outlet', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});

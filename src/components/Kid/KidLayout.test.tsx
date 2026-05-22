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

const mockLockKidVoice = vi.fn();
const mockUnlockKidVoice = vi.fn();
vi.mock('../../services/voiceService', () => ({
  voiceService: {
    lockKidVoice: () => mockLockKidVoice(),
    unlockKidVoice: () => mockUnlockKidVoice(),
    stop: vi.fn(),
  },
}));

describe('KidLayout', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: true }));
  });

  it('renders the layout container', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('kid-layout')).toBeInTheDocument();
  });

  it('renders Kids Mode branding in header', () => {
    render(<KidLayout />);
    expect(screen.getByTestId('kid-header')).toBeInTheDocument();
    expect(screen.getByText('Kids Mode')).toBeInTheDocument();
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

  it('locks kid voice to Ruth on mount, unlocks on unmount (non-negotiable #4)', () => {
    mockLockKidVoice.mockClear();
    mockUnlockKidVoice.mockClear();
    const { unmount } = render(<KidLayout />);
    expect(mockLockKidVoice).toHaveBeenCalledTimes(1);
    expect(mockUnlockKidVoice).not.toHaveBeenCalled();
    unmount();
    expect(mockUnlockKidVoice).toHaveBeenCalledTimes(1);
  });
});

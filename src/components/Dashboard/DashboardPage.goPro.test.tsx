/**
 * GO PRO, IN SIGHT (David 2026-11-12). App Review rejected 4.0.8 twice under
 * 2.1(b) because nothing on screen led to a purchase until a free limit was
 * spent. A free user on a store build sees "Go Pro" on Home; a subscriber,
 * the web app (no store) and a still-resolving entitlement do not.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { DashboardPage } from './DashboardPage';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';

const mockNavigate = vi.fn();
const ent = vi.hoisted(() => ({ shouldShowPaywall: true, billing: true }));

vi.mock('../../services/sessionGenerator', () => ({
  updateStreak: vi.fn().mockResolvedValue({ currentStreak: 0, longestStreak: 0 }),
}));
vi.mock('../../services/dataLoader', () => ({
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useNavigate: () => mockNavigate,
}));
vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ shouldShowPaywall: ent.shouldShowPaywall }),
}));
vi.mock('../../services/billingService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/billingService')>()),
  isBillingConfigured: () => ent.billing,
}));

describe('Home — Go Pro', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile());
    vi.clearAllMocks();
    ent.shouldShowPaywall = true;
    ent.billing = true;
  });

  it('a free user on a store build sees Go Pro, and it opens the plans with Home as the way back', async () => {
    render(<DashboardPage />);
    const btn = await screen.findByTestId('home-go-pro-btn');
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/pro', { state: { from: '/' } });
  });

  it('a subscriber (or a still-resolving entitlement) does not see it', async () => {
    ent.shouldShowPaywall = false;
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument());
    expect(screen.queryByTestId('home-go-pro-btn')).toBeNull();
  });

  it('the web app (no store) does not see it', async () => {
    ent.billing = false;
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByTestId('dashboard')).toBeInTheDocument());
    expect(screen.queryByTestId('home-go-pro-btn')).toBeNull();
  });
});

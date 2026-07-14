import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AccessGate } from './AccessGate';
import { useFreeTierStore } from '../../stores/freeTierStore';
import { db } from '../../db/schema';

// Mock the entitlement hook — the gate reads isPro / gateEnabled / isResolving.
const entitlement = { isPro: false, gateEnabled: true, isResolving: false };
vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => entitlement,
}));

function setEnt(over: Partial<typeof entitlement>): void {
  Object.assign(entitlement, over);
}

function setRow(over: Partial<{ puzzlesSolved: number; freeOpeningId: string | null; kidFirstAccessAt: number | null }>): void {
  useFreeTierStore.setState({
    row: { id: 'singleton', puzzlesSolved: 0, freeOpeningId: null, kidFirstAccessAt: null, updatedAt: 0, ...over },
    hydrated: true,
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AccessGate>
        <div data-testid="app-shell">APP</div>
      </AccessGate>
    </MemoryRouter>,
  );
}

const appShown = () => screen.queryByTestId('app-shell') != null;
const wallShown = () => screen.queryByTestId('paywall-back-free') != null;

beforeEach(async () => {
  setEnt({ isPro: false, gateEnabled: true, isResolving: false });
  setRow({});
  await db.freeTier.clear();
});

describe('AccessGate — dormant', () => {
  it('shows the app when the gate is off', () => {
    setEnt({ gateEnabled: false });
    renderAt('/coach/play');
    expect(appShown()).toBe(true);
  });
  it('shows the app for a Pro user', () => {
    setEnt({ isPro: true });
    renderAt('/coach/play');
    expect(appShown()).toBe(true);
  });
  it('does not flash the wall before hydration', () => {
    useFreeTierStore.setState({ hydrated: false });
    renderAt('/coach/play');
    expect(appShown()).toBe(true);
  });
});

describe('AccessGate — free surfaces', () => {
  it.each(['/', '/weaknesses', '/games/import', '/settings'])('shows the app on %s', (p) => {
    renderAt(p);
    expect(appShown()).toBe(true);
  });
});

describe('AccessGate — walled', () => {
  it('walls the coach', () => {
    renderAt('/coach/teach');
    expect(wallShown()).toBe(true);
    expect(appShown()).toBe(false);
  });
  it('walls a second, different opening', () => {
    setRow({ freeOpeningId: 'italian-game' });
    renderAt('/openings/caro-kann');
    expect(wallShown()).toBe(true);
  });
  it('walls a Gambits-tab course (not in the main tab)', () => {
    renderAt('/openings/smith-morra-gambit');
    expect(wallShown()).toBe(true);
  });
  it('walls tactics once the bucket is spent', () => {
    setRow({ puzzlesSolved: 20 });
    renderAt('/tactics/classic');
    expect(wallShown()).toBe(true);
  });
});

describe('AccessGate — allowed free tier', () => {
  it('shows the first eligible opening (and it is not walled)', () => {
    renderAt('/openings/italian-game');
    expect(appShown()).toBe(true);
  });
  it('shows the already-claimed opening', () => {
    setRow({ freeOpeningId: 'caro-kann' });
    renderAt('/openings/caro-kann');
    expect(appShown()).toBe(true);
  });
  it('meters tactics while the bucket has room', () => {
    setRow({ puzzlesSolved: 5 });
    renderAt('/tactics/classic');
    expect(appShown()).toBe(true);
  });
  it('shows kid mode before the window starts', () => {
    renderAt('/kid/pawn-games');
    expect(appShown()).toBe(true);
  });
});

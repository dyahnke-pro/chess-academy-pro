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

function setRow(
  over: Partial<{
    puzzlesSolved: number;
    freeOpeningId: string | null;
    kidFirstAccessAt: number | null;
    coachLessonsUsed: number;
    coachChatTurnsUsed: number;
  }>,
): void {
  useFreeTierStore.setState({
    row: {
      id: 'singleton',
      puzzlesSolved: 0,
      freeOpeningId: null,
      kidFirstAccessAt: null,
      coachLessonsUsed: 0,
      coachChatTurnsUsed: 0,
      coachUnlockSeenAt: null,
      updatedAt: 0,
      ...over,
    },
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
  it('walls the coach once both free-tier buckets are spent', () => {
    setRow({ coachLessonsUsed: 7, coachChatTurnsUsed: 50 });
    renderAt('/coach/teach');
    expect(wallShown()).toBe(true);
    expect(appShown()).toBe(false);
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
  it('BROWSES a second masterclass opening page even after one is claimed (wall moved in-page)', () => {
    // Page + model games stay free for every main-tab opening; the one-pick
    // limit is enforced on the WLPP deep-dive tap in OpeningDetailPage, not here.
    setRow({ freeOpeningId: 'italian-game' });
    renderAt('/openings/caro-kann');
    expect(appShown()).toBe(true);
  });
  it('meters tactics while the bucket has room', () => {
    setRow({ puzzlesSolved: 5 });
    renderAt('/tactics/classic');
    expect(appShown()).toBe(true);
  });
  it('meters the coach with a fresh free-tier budget', () => {
    renderAt('/coach/teach');
    expect(appShown()).toBe(true);
  });
  it('meters the coach while only one bucket is spent', () => {
    setRow({ coachLessonsUsed: 7, coachChatTurnsUsed: 12 });
    renderAt('/coach/play');
    expect(appShown()).toBe(true);
  });
  it('shows kid mode before the window starts', () => {
    renderAt('/kid/pawn-games');
    expect(appShown()).toBe(true);
  });
});

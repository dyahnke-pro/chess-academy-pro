import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CoachUnlockAnnouncement } from './CoachUnlockAnnouncement';
import { useFreeTierStore } from '../../stores/freeTierStore';
import { db } from '../../db/schema';

const entitlement = { isPro: false, gateEnabled: true, isResolving: false };
vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => entitlement,
}));

function setEnt(over: Partial<typeof entitlement>): void {
  Object.assign(entitlement, over);
}

function setRow(over: Partial<{ coachUnlockSeenAt: number | null }>): void {
  useFreeTierStore.setState({
    row: {
      id: 'singleton',
      puzzlesSolved: 0,
      freeOpeningId: null,
      kidFirstAccessAt: null,
      coachLessonsUsed: 0,
      coachChatTurnsUsed: 0,
      coachSpendUsd: 0,
      coachUnlockSeenAt: null,
      updatedAt: 0,
      ...over,
    },
    hydrated: true,
  });
}

function renderIt() {
  return render(
    <MemoryRouter>
      <CoachUnlockAnnouncement />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  setEnt({ isPro: false, gateEnabled: true, isResolving: false });
  setRow({});
  await db.freeTier.clear();
});

describe('CoachUnlockAnnouncement', () => {
  it('shows for a non-Pro user who has not seen it', () => {
    renderIt();
    expect(screen.queryByTestId('coach-unlock-announcement')).not.toBeNull();
  });
  it('stays hidden once already seen', () => {
    setRow({ coachUnlockSeenAt: Date.now() });
    renderIt();
    expect(screen.queryByTestId('coach-unlock-announcement')).toBeNull();
  });
  it('stays hidden for a Pro user', () => {
    setEnt({ isPro: true });
    renderIt();
    expect(screen.queryByTestId('coach-unlock-announcement')).toBeNull();
  });
  it('stays hidden when the gate is off', () => {
    setEnt({ gateEnabled: false });
    renderIt();
    expect(screen.queryByTestId('coach-unlock-announcement')).toBeNull();
  });
  it('stays hidden before hydration', () => {
    useFreeTierStore.setState({ hydrated: false });
    renderIt();
    expect(screen.queryByTestId('coach-unlock-announcement')).toBeNull();
  });
  it('dismissing marks it seen and hides it', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('coach-unlock-dismiss'));
    await waitFor(() => {
      expect(useFreeTierStore.getState().row.coachUnlockSeenAt).toBeTypeOf('number');
    });
  });
  it('tapping "Try the coach" marks it seen too', async () => {
    renderIt();
    fireEvent.click(screen.getByTestId('coach-unlock-try'));
    await waitFor(() => {
      expect(useFreeTierStore.getState().row.coachUnlockSeenAt).toBeTypeOf('number');
    });
  });
});

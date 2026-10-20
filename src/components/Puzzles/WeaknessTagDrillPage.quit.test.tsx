import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const recordTagDrillResult = vi.fn((..._a: unknown[]) => Promise.resolve());
vi.mock('../../services/misconceptionService', () => ({ recordTagDrillResult: (...a: unknown[]) => recordTagDrillResult(...a) }));
vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn() }));
vi.mock('../../services/mistakePuzzleService', () => ({
  getMisconceptionDrillPuzzles: () => Promise.resolve([
    { id: 'p1', moves: 'e2e4', tacticType: 'fork' },
    { id: 'p2', moves: 'd2d4', tacticType: 'fork' },
    { id: 'p3', moves: 'c2c4', tacticType: 'fork' },
  ]),
  ensureSequenceSolution: (p: unknown) => Promise.resolve(p),
}));
vi.mock('./MistakePuzzleBoard', () => ({
  MistakePuzzleBoard: ({ onResolved, onComplete }: { onResolved: (c: boolean) => void; onComplete: () => void }) => (
    <button data-testid="solve" onClick={() => { onResolved(true); onComplete(); }}>solve</button>
  ),
}));
vi.mock('../Tactics/TacticsPageHeader', () => ({ TacticsPageHeader: () => null }));

import { WeaknessTagDrillPage } from './WeaknessTagDrillPage';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/drill', state: { misconceptionTag: 'hung-piece', label: 'Hanging pieces' } }]}>
      <WeaknessTagDrillPage />
    </MemoryRouter>,
  );
}

beforeEach(() => { recordTagDrillResult.mockClear(); });

describe('WeaknessTagDrillPage — quitting mid-drill still spaces the tag (persistent memory)', () => {
  it('leaving after one solved puzzle records the drill', async () => {
    const r = renderPage();
    await waitFor(() => expect(screen.getByTestId('solve')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('solve'));
    r.unmount();
    expect(recordTagDrillResult).toHaveBeenCalledWith('hung-piece', true);
  });

  it('leaving before any answer records nothing', async () => {
    const r = renderPage();
    await waitFor(() => expect(screen.getByTestId('solve')).toBeInTheDocument());
    r.unmount();
    expect(recordTagDrillResult).not.toHaveBeenCalled();
  });
});

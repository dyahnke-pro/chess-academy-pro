import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { TacticCreatePage } from './TacticCreatePage';

vi.mock('../../services/tacticCreateService', () => ({
  buildTacticCreateQueue: vi.fn().mockResolvedValue([]),
  updateContextDepth: vi.fn().mockResolvedValue(8),
  resetContextDepth: vi.fn().mockResolvedValue(undefined),
  getContextDepth: vi.fn().mockResolvedValue(8),
}));

vi.mock('../../services/voiceService', () => ({
  voiceService: { warmup: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), speak: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../services/appAuditor', () => ({
  logAppAudit: vi.fn().mockResolvedValue(undefined),
}));

// Hand walk 2026-10-04 (D13): with no games to build from, the page opened on
// "Session Complete" before anything had been played.
describe('TacticCreatePage — nothing to build from', () => {
  it('shows an honest empty state with Import Games, never "Session Complete"', async () => {
    render(<TacticCreatePage />);
    expect(await screen.findByTestId('create-empty')).toBeInTheDocument();
    expect(screen.getByText('No games to build from yet')).toBeInTheDocument();
    expect(screen.getByTestId('create-empty-import')).toHaveTextContent('Import Games');
    expect(screen.queryByText('Session Complete')).toBeNull();
    expect(screen.queryByTestId('session-summary')).toBeNull();
  });

  it('has the one Tactics header with a back button', async () => {
    render(<TacticCreatePage />);
    await screen.findByTestId('create-empty');
    expect(screen.getByTestId('back-btn')).toHaveAttribute('aria-label', 'Back to Tactics');
  });
});

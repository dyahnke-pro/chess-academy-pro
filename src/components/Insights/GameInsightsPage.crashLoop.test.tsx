// 🔒 THE CRASH-LOOP BREAKER on /weaknesses (2026-11-25). The killed web view
// relaunched onto this page and re-ran every whole-library derivation on open,
// so a student whose phone could not take them never got out. After a killed
// session the page derives nothing until the student taps.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { GameInsightsPage } from './GameInsightsPage';

vi.stubGlobal('ResizeObserver', class {
  observe(): void { /* noop */ }
  unobserve(): void { /* noop */ }
  disconnect(): void { /* noop */ }
});

vi.mock('../../services/sessionWatch', async (orig) => ({
  ...(await orig<typeof import('../../services/sessionWatch')>()),
  lastSessionWasKilled: () => Promise.resolve(true),
}));

const overview = vi.fn(() => new Promise<never>(() => { /* never lands: the test only counts the call */ }));
const backfill = vi.fn(() => Promise.resolve(0));
vi.mock('../../services/gameInsightsService', () => ({
  getOverviewInsights: (): unknown => overview(),
  getOpeningInsights: (): unknown => new Promise(() => undefined),
  getMistakeInsights: (): unknown => new Promise(() => undefined),
  getTacticInsights: (): unknown => new Promise(() => undefined),
  getAnalysisCounts: (): unknown => new Promise(() => undefined),
}));
vi.mock('../../services/tacticClassifierService', () => ({
  backfillClassifiedTactics: (): unknown => backfill(),
}));

describe('GameInsightsPage after a killed session', () => {
  it('derives nothing on open, and loads the report on a tap', async () => {
    render(<GameInsightsPage />);
    expect(await screen.findByTestId('insights-held-after-kill')).toBeInTheDocument();
    expect(overview).not.toHaveBeenCalled();
    expect(backfill).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('insights-load-report-btn'));
    await waitFor(() => expect(overview).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('insights-held-after-kill')).toBeNull();
  });
});

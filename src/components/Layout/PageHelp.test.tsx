import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { PageHelp } from './PageHelp';
import { db } from '../../db/schema';

const STEPS = [{ label: 'Step', body: 'Body' }];

// First-visit auto-open was removed 2026-08-22 (no pop-ups on a fresh download).
// The help now lives behind the "i" button only — it never opens itself.
describe('PageHelp', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('does NOT auto-open on first visit', async () => {
    render(<PageHelp helpId="t1" title="T1" steps={STEPS} />);
    // Give any effect a tick; the modal must not appear on its own.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('page-help-modal')).not.toBeInTheDocument();
  });

  it('opens when the "i" button is tapped', async () => {
    render(<PageHelp helpId="t2" title="T2" steps={STEPS} />);
    fireEvent.click(screen.getByTestId('page-help-btn'));
    await waitFor(() => expect(screen.getByTestId('page-help-modal')).toBeInTheDocument());
  });

  it('does not auto-open even with suppressAutoOpen toggled off', async () => {
    const { rerender } = render(<PageHelp helpId="t3" title="T3" steps={STEPS} suppressAutoOpen />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('page-help-modal')).not.toBeInTheDocument();

    rerender(<PageHelp helpId="t3" title="T3" steps={STEPS} suppressAutoOpen={false} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('page-help-modal')).not.toBeInTheDocument();
  });
});

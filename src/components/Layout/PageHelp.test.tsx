import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import { PageHelp } from './PageHelp';
import { db } from '../../db/schema';

const STEPS = [{ label: 'Step', body: 'Body' }];

describe('PageHelp', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('auto-opens on first visit when not suppressed', async () => {
    render(<PageHelp helpId="t1" title="T1" steps={STEPS} />);
    await waitFor(() => expect(screen.getByTestId('page-help-modal')).toBeInTheDocument());
  });

  it('does NOT auto-open while suppressed', async () => {
    render(<PageHelp helpId="t2" title="T2" steps={STEPS} suppressAutoOpen />);
    // Give the (suppressed) effect a tick; it must not open or mark seen.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('page-help-modal')).not.toBeInTheDocument();
    expect(await db.meta.get('pagehelp-seen-t2')).toBeUndefined();
  });

  it('auto-opens once suppression is lifted', async () => {
    const { rerender } = render(<PageHelp helpId="t3" title="T3" steps={STEPS} suppressAutoOpen />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('page-help-modal')).not.toBeInTheDocument();

    rerender(<PageHelp helpId="t3" title="T3" steps={STEPS} suppressAutoOpen={false} />);
    await waitFor(() => expect(screen.getByTestId('page-help-modal')).toBeInTheDocument());
  });
});

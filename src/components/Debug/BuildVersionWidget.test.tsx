import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { BuildVersionWidget } from './BuildVersionWidget';

describe('BuildVersionWidget', () => {
  it('renders the truncated build id', () => {
    render(<BuildVersionWidget />);
    const widget = screen.getByTestId('build-version-widget');
    expect(widget).toBeInTheDocument();
    // Text should be at most 7 chars + optional " • refresh" suffix
    // when SW update is pending.
    expect(widget.textContent ?? '').toMatch(/^[a-z0-9-]+( • refresh)?$|^copied$/i);
  });

  it('has an aria-label for screen readers', () => {
    render(<BuildVersionWidget />);
    expect(screen.getByLabelText(/Build version/i)).toBeInTheDocument();
  });

  // Hand walk 2026-10-04 (B7): pinned at bottom-1 it sat on the "Tactics"
  // label of the mobile bottom nav. On phones it rides above the nav; on
  // desktop (no bottom nav) it keeps its corner.
  it('sits above the mobile bottom nav and keeps its desktop corner', () => {
    render(<BuildVersionWidget />);
    const cls = screen.getByTestId('build-version-widget').className;
    expect(cls).toContain('bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]');
    expect(cls).toContain('md:bottom-1');
    expect(cls.split(/\s+/)).not.toContain('bottom-1');
  });
});

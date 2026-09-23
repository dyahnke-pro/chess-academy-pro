import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';

vi.mock('../services/appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

import { lazyPage } from './lazyPage';

const reload = vi.fn();

describe('lazyPage — a page loads on first visit, and a chunk gone after a deploy reloads once', () => {
  beforeEach(() => {
    reload.mockReset();
    sessionStorage.clear();
    Object.defineProperty(globalThis, 'location', { value: { ...globalThis.location, reload }, configurable: true });
  });

  it('renders the page once its code arrives', async () => {
    const Page = lazyPage('Hello', () => Promise.resolve(() => <p>hello page</p>));
    render(<Suspense fallback={<p>loading</p>}><Page /></Suspense>);
    expect(await screen.findByText('hello page')).toBeTruthy();
  });

  it('a failed chunk reloads the document ONCE', async () => {
    const Page = lazyPage('Gone', () => Promise.reject(new Error('Failed to fetch dynamically imported module')));
    render(<Suspense fallback={<p>loading</p>}><Page /></Suspense>);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(Number(sessionStorage.getItem('lazy-page-reload-at'))).toBeGreaterThan(0);
  });

  it('a second failure inside the window does not reload again — it throws to the boundary', async () => {
    sessionStorage.setItem('lazy-page-reload-at', String(Date.now()));
    const err = new Error('still gone');
    const Page = lazyPage('StillGone', () => Promise.reject(err));
    const onError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ErrorBoundary } = await import('../components/ui/ErrorBoundary');
    render(<ErrorBoundary><Suspense fallback={<p>loading</p>}><Page /></Suspense></ErrorBoundary>);
    await new Promise((r) => setTimeout(r, 50));
    expect(reload).not.toHaveBeenCalled();
    onError.mockRestore();
  });
});

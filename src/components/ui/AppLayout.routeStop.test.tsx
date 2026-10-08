import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { buildUserProfile } from '../../test/factories';

// The route-change stop must land BEFORE the destination page asks for its first
// line. A real stop() also cancels lines still waiting to speak
// (voiceService.cancelEpoch, 2026-10-08); as a passive effect in the parent it
// ran after the page's own mount effect and would cancel the page's opening line.
const order: string[] = [];
vi.mock('../../services/voiceService', async () => {
  const actual = await vi.importActual<typeof import('../../services/voiceService')>('../../services/voiceService');
  return { ...actual, voiceService: new Proxy(actual.voiceService, {
    get(target, prop, recv) {
      if (prop === 'stop') return () => { order.push('stop'); };
      return Reflect.get(target, prop, recv) as unknown;
    },
  }) };
});
vi.mock('./InstallPrompt', () => ({ InstallPrompt: () => null }));
vi.mock('./OfflineBanner', () => ({ OfflineBanner: () => null }));

const { AppLayout } = await import('./AppLayout');

function PageA(): JSX.Element {
  const navigate = useNavigate();
  return <button data-testid="go" onClick={() => void navigate('/b')}>go</button>;
}
function PageB(): JSX.Element {
  useEffect(() => { order.push('page-b-speaks'); }, []);
  return <div data-testid="page-b" />;
}

describe('AppLayout route-change stop', () => {
  beforeEach(() => {
    order.length = 0;
    useAppStore.getState().reset();
    useAppStore.getState().setActiveProfile(buildUserProfile({ id: 'main' }));
  });

  it('stops the old page BEFORE the new page speaks its first line', async () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/a']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/a" element={<PageA />} />
            <Route path="/b" element={<PageB />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => getByTestId('go'));
    order.length = 0;
    fireEvent.click(getByTestId('go'));
    await waitFor(() => expect(order).toContain('page-b-speaks'));
    expect(order.indexOf('stop')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('stop')).toBeLessThan(order.indexOf('page-b-speaks'));
  });
});

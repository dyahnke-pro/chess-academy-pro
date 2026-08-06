// A super-property registered while posthog-js is still lazy-loading must not
// be lost — it is queued and registered the moment the client lands, BEFORE
// the first capture.
//
// The 2026-08-06 pipe probe proved the race is real: the App-boot identity
// chain stamped audit_run_id via registerSuperProperties, the client had not
// finished its lazy import, the old guard returned silently, and the property
// never reached a single event or the taxonomy.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { register, setPersonProperties, capture, init } = vi.hoisted(() => ({
  register: vi.fn(),
  setPersonProperties: vi.fn(),
  capture: vi.fn(),
  init: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    init,
    register,
    setPersonProperties,
    capture,
    opt_out_capturing: vi.fn(),
    captureException: vi.fn(),
  },
}));

describe('registerSuperProperties survives the lazy-load race', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
  });

  it('a pre-client registration lands once the client does, before first capture', async () => {
    const analytics = await import('./analytics');
    analytics.initAnalytics();
    // The race: registration arrives while the import is still in flight.
    analytics.registerSuperProperties({ audit_run_id: 'run-x' });
    // Let the mocked lazy import resolve — two bare microtask ticks are not
    // enough for the dynamic-import chain under vitest.
    await new Promise((r) => setTimeout(r, 25));

    const registered = register.mock.calls.some(
      ([props]) => (props as Record<string, unknown>).audit_run_id === 'run-x',
    );
    expect(registered, 'queued super-prop never registered — the race is back').toBe(true);

    // Ordering: the run id must be registered before app_session_started
    // fires, or the canonical per-load event escapes untagged.
    const regIdx = register.mock.invocationCallOrder[
      register.mock.calls.findIndex(([p]) => (p as Record<string, unknown>).audit_run_id === 'run-x')
    ];
    const capIdx = capture.mock.invocationCallOrder[
      capture.mock.calls.findIndex(([name]) => name === 'app_session_started')
    ];
    expect(regIdx, 'register must precede the first capture').toBeLessThan(capIdx);
  });
});

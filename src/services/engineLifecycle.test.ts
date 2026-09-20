// 🔒 #21 (2026-09-20): every engine is torn down when the document goes away,
// so the next document boots against freed WASM memory. Negative-controlled:
// nothing is torn down before pagehide; a second install registers nothing.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const destroy = vi.fn();
const destroyAll = vi.fn(() => 5);
vi.mock('./stockfishEngine', () => ({ stockfishEngine: { destroy, get status() { return 'ready'; } } }));
vi.mock('./gameAnalysisService', () => ({ destroyAllAnalysisWorkers: destroyAll }));
vi.mock('./appAuditor', () => ({ logAppAudit: vi.fn(async () => undefined) }));

type Listener = () => void;

describe('engineLifecycle — engines die with the document', () => {
  let listeners: Record<string, Listener[]>;
  beforeEach(async () => {
    destroy.mockClear();
    destroyAll.mockClear();
    listeners = {};
    vi.stubGlobal('window', {
      addEventListener: (type: string, cb: Listener) => { (listeners[type] ??= []).push(cb); },
      removeEventListener: () => undefined,
    });
    const m = await import('./engineLifecycle');
    m.__resetEngineUnloadHooksForTests();
  });

  it('installs ONE pagehide listener, however many times boot calls it', async () => {
    const { installEngineUnloadHooks } = await import('./engineLifecycle');
    installEngineUnloadHooks();
    installEngineUnloadHooks();
    expect(listeners.pagehide?.length).toBe(1);
    // negative control: nothing torn down until the event fires
    expect(destroy).not.toHaveBeenCalled();
    expect(destroyAll).not.toHaveBeenCalled();
  });

  it('pagehide destroys the singleton AND every analysis worker, and reports the counts', async () => {
    const { installEngineUnloadHooks } = await import('./engineLifecycle');
    installEngineUnloadHooks();
    for (const cb of listeners.pagehide ?? []) cb();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(destroyAll).toHaveBeenCalledTimes(1);
  });

  it('teardownEngines is callable on its own and returns what it did', async () => {
    const { teardownEngines } = await import('./engineLifecycle');
    const r = teardownEngines('test');
    expect(r).toEqual({ singleton: true, poolWorkers: 5 });
  });

  it('without a window (worker / node) install is a no-op, never a throw', async () => {
    vi.stubGlobal('window', undefined);
    const { installEngineUnloadHooks } = await import('./engineLifecycle');
    expect(() => installEngineUnloadHooks()).not.toThrow();
  });
});

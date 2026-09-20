// engineLifecycle — tear every engine down when the DOCUMENT goes away.
//
// 🔒 THE #21 STORM, named 2026-09-20 by `audit-engine-worker-census-prod`:
// on a reopened review (a real navigation — refresh, the service-worker reload,
// a deep link) the multi-thread Stockfish singleton could not allocate its
// 512 MB shared heap, its pthread runtime spawned ~120 Workers in 5 s, the page
// threw `WebAssembly.Memory(): could not allocate memory` 761k times and the
// renderer wedged. First open on the same page life inits fine. The difference
// is what was still RESIDENT: the previous document's singleton and its five
// warm pool workers (kept 60 s by `POOL_IDLE_RETIRE_MS`). A browser terminates a
// document's workers on navigation eventually — not before the next document's
// engines allocate. So this module terminates them explicitly on `pagehide`,
// which fires on every navigation shape including iOS Safari, where `unload`
// does not (the same reason `appAuditor` flushes on it).
//
// A leaf: it imports the two engine owners and nothing else, so wiring it at
// boot adds no edge into the coach. Idempotent — installing twice registers once.
import { stockfishEngine } from './stockfishEngine';
import { destroyAllAnalysisWorkers } from './gameAnalysisService';
import { logAppAudit } from './appAuditor';

let installed = false;

/** What one teardown did — returned so a caller (or a test) can audit it. */
export interface EngineTeardown {
  singleton: boolean;
  poolWorkers: number;
}

/** Terminate the singleton and every analysis worker, warm or leased. Safe to
 *  call any time; the next `initialize()` / `acquirePool()` spawns fresh. */
export function teardownEngines(reason: string): EngineTeardown {
  const singleton = stockfishEngine.status !== 'idle';
  try { stockfishEngine.destroy(); } catch { /* already gone */ }
  let poolWorkers = 0;
  try { poolWorkers = destroyAllAnalysisWorkers(); } catch { /* already gone */ }
  void logAppAudit({
    kind: 'stockfish-variant-resolved',
    category: 'subsystem',
    source: 'engineLifecycle.teardownEngines',
    summary: `engines torn down on ${reason}: singleton=${singleton} poolWorkers=${poolWorkers}`,
  });
  return { singleton, poolWorkers };
}

/** Register the `pagehide` teardown once. Call from boot. */
export function installEngineUnloadHooks(): void {
  if (installed) return;
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  installed = true;
  window.addEventListener('pagehide', () => { teardownEngines('pagehide'); });
}

/** Test hook — forget the install so a fresh window can register again. */
export function __resetEngineUnloadHooksForTests(): void {
  installed = false;
}

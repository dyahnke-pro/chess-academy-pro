import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Gate — A NEW SERVICE WORKER MUST NEVER TAKE OVER A RUNNING PAGE (2026-09-19).
 *
 * The app froze on David's iPhone mid-session. Cause: `skipWaiting` +
 * `clientsClaim` let a freshly-deployed worker activate under a live page,
 * `cleanupOutdatedCaches` deleted the precache that page was executing out of,
 * and every later chunk / Web Worker fetch asked for a hashed file the deploy
 * no longer serves.
 *
 * These assertions are NOT style checks. Each one guards a way the fix can be
 * silently undone:
 *
 *  1. `registerType` must not be 'autoUpdate'. vite-plugin-pwa FORCES
 *     `workbox.skipWaiting = true` and `workbox.clientsClaim = true` whenever
 *     registerType is 'autoUpdate' and injectRegister is auto/unset
 *     (node_modules/vite-plugin-pwa/dist/index.js:874-876), overwriting the
 *     config. Flipping that one word would make the two flags below decorative
 *     — the config would read as fixed and ship as broken.
 *  2. The flags themselves must be false.
 *  3. `controllerchange` must reload UNCONDITIONALLY. Gating it on
 *     `__HOLD_SW_RELOAD__` is the original bug: by the time it fires the old
 *     bundle is already gone, so holding keeps a page alive on deleted code.
 *     The hold belongs on the ASK (SKIP_WAITING), never on the reload.
 */
describe('service-worker handover', () => {
  const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
  const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

  it('does not use registerType autoUpdate (it force-overrides skipWaiting)', () => {
    const match = /registerType:\s*'([^']+)'/.exec(viteConfig);
    expect(match, 'registerType missing from vite.config.ts').not.toBeNull();
    expect(match?.[1]).not.toBe('autoUpdate');
    expect(match?.[1]).toBe('prompt');
  });

  it('ships skipWaiting:false and clientsClaim:false', () => {
    expect(viteConfig).toMatch(/skipWaiting:\s*false/);
    expect(viteConfig).toMatch(/clientsClaim:\s*false/);
    expect(viteConfig).not.toMatch(/skipWaiting:\s*true/);
    expect(viteConfig).not.toMatch(/clientsClaim:\s*true/);
  });

  it('asks a WAITING worker to take over rather than letting it claim', () => {
    expect(indexHtml).toMatch(/postMessage\(\{\s*type:\s*'SKIP_WAITING'\s*\}\)/);
    // The ask is what the hold gates.
    const askBlock = indexHtml.slice(
      indexHtml.indexOf('function askWaitingWorker'),
      indexHtml.indexOf('function watchRegistration'),
    );
    expect(askBlock, 'askWaitingWorker() not found in index.html').not.toBe('');
    expect(askBlock).toContain('__HOLD_SW_RELOAD__');
  });

  it('reloads on controllerchange without consulting the hold', () => {
    const start = indexHtml.indexOf("addEventListener('controllerchange'");
    expect(start, 'controllerchange handler not found in index.html').toBeGreaterThan(-1);
    const handler = indexHtml.slice(start, indexHtml.indexOf('});', start));
    expect(handler).toContain('location.reload()');
    expect(
      handler,
      'controllerchange must NOT be gated on __HOLD_SW_RELOAD__ — by then the old bundle is gone',
    ).not.toContain('__HOLD_SW_RELOAD__');
  });

  // 🔒 THE ARTIFACT, NOT THE CONFIG (E2, 2026-09-20).
  //
  // Every assertion above reads `vite.config.ts` — and CLAUDE.md's own warning
  // on this surface is that the config can read as FIXED and SHIP AS BROKEN:
  // vite-plugin-pwa forces `skipWaiting` and `clientsClaim` back to true
  // whenever `registerType` is 'autoUpdate' and `injectRegister` is auto/unset
  // (dist/index.js:874-876). So a gate that only reads the source answers
  // "does the config say false" while the question is "does the SHIPPED worker
  // have them off" — a nearby question, returning a confident answer to the
  // wrong one. This reads the built worker.
  //
  // The two-deploy half (does an old page actually survive a new deploy) stays
  // BLOCKED — it needs two real deploys and cannot be asserted here. This is
  // the half that can be.
  describe('the BUILT worker (dist/sw.js), not the config that generated it', () => {
    const swPath = resolve(process.cwd(), 'dist/sw.js');
    const built = existsSync(swPath) ? readFileSync(swPath, 'utf8') : null;

    it('a build exists to check — ship-check builds before the gates run', () => {
      // Not skipped when absent: a gate that quietly passes on a missing
      // artifact is the vacuity this whole file exists to prevent. Run
      // `npm run build` (ship-check does it automatically, before this gate).
      expect(built, `no built worker at ${swPath} — run \`npm run build\` first`).toBeTruthy();
      expect((built ?? '').length, 'built worker is implausibly small').toBeGreaterThan(1000);
    });

    it('never calls clientsClaim() — a new worker may not seize a live page', () => {
      expect(built ?? '').not.toMatch(/clientsClaim\s*\(/);
    });

    it('calls skipWaiting ONLY from the SKIP_WAITING message handler, never unconditionally', () => {
      const src = built ?? '';
      const hits = [...src.matchAll(/skipWaiting\s*\(/g)];
      // Non-vacuous in BOTH directions: the gated handler must EXIST (a build
      // that dropped it would otherwise pass this by having zero hits), and
      // every hit must be that handler rather than a top-level activation.
      expect(src, 'the SKIP_WAITING message handler is missing from the built worker')
        .toMatch(/["']SKIP_WAITING["']/);
      expect(hits.length, 'expected the one message-gated skipWaiting call').toBeGreaterThan(0);
      for (const h of hits) {
        const before = src.slice(Math.max(0, (h.index ?? 0) - 160), h.index ?? 0);
        expect(
          before,
          `skipWaiting( at offset ${h.index} is not gated on a SKIP_WAITING message — ` +
          'vite-plugin-pwa has forced autoUpdate back on, and a deploy will take over live pages',
        ).toMatch(/SKIP_WAITING/);
      }
    });
  });
});

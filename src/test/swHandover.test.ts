import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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
});

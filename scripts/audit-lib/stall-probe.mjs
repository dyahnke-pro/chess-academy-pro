/**
 * STALL PROBE — names the JavaScript that holds a page's main thread, while it
 * holds it.
 *
 * A trace or CPU profile is saved only when the run ends, and a run whose main
 * thread never comes back never ends: the 2026-10-21 Campaign game sat 30
 * minutes on one task with nothing saved. This probe asks the page a trivial
 * question every few seconds; when it does not answer in `busyMs`, it pauses
 * the debugger (V8 takes the pause on its next statement, mid-task), records
 * the call stack, and resumes. Each stall is logged as it happens, mapped to
 * source when `dist` holds the build's `.map` files.
 *
 *   const probe = await startStallProbe(page, { dist: '/tmp/dist-new', t0 });
 *   …drive the page…
 *   const stalls = await probe.stop();
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

export async function startStallProbe(page, { dist = null, t0 = Date.now(), busyMs = 2500, everyMs = 3000, log = console.log } = {}) {
  const cdp = await page.context().newCDPSession(page);
  // A paused frame carries only its scriptId (its `url` is deprecated and
  // empty in current Chrome), so learn each script's url as it is parsed.
  const scriptUrl = new Map();
  cdp.on('Debugger.scriptParsed', (ev) => { if (ev.url) scriptUrl.set(ev.scriptId, ev.url); });
  await cdp.send('Debugger.enable');
  const require = createRequire(import.meta.url);
  let Consumer = null;
  try { Consumer = require('source-map-js').SourceMapConsumer; } catch { Consumer = null; }
  const maps = new Map();
  const where = (f) => {
    const url = f.url || scriptUrl.get(f.location?.scriptId) || '';
    const m = /\/assets\/([^?#]+\.js)/.exec(url);
    const line = f.location?.lineNumber ?? 0;
    const col = f.location?.columnNumber ?? 0;
    if (m && dist && Consumer) {
      if (!maps.has(m[1])) {
        const p = `${dist}/assets/${m[1]}.map`;
        maps.set(m[1], existsSync(p) ? new Consumer(JSON.parse(readFileSync(p, 'utf8'))) : null);
      }
      const c = maps.get(m[1]);
      const o = c?.originalPositionFor({ line: line + 1, column: col });
      if (o?.source) return `${o.name ?? (f.functionName || '(anon)')} ${o.source.replace(/^.*?(src\/|node_modules\/)/, '$1')}:${o.line}`;
    }
    return `${f.functionName || '(anon)'} ${url.replace(/^.*\//, '') || '(native)'}:${line + 1}`;
  };
  const stalls = [];
  let pausing = false;
  let busySince = null;
  cdp.on('Debugger.paused', (ev) => {
    const stack = (ev.callFrames ?? []).map(where);
    const at = Math.round((Date.now() - t0) / 1000);
    stalls.push({ at, busyMs: busySince ? Date.now() - busySince : null, stack });
    log(`[stall] ${at}s, busy ≥ ${busySince ? Math.round((Date.now() - busySince) / 1000) : '?'}s:\n${stack.slice(0, 18).map((s) => `    ${s}`).join('\n')}`);
    cdp.send('Debugger.resume').catch(() => {}).finally(() => { pausing = false; });
  });
  const timer = setInterval(async () => {
    if (pausing) return;
    const answered = await Promise.race([
      cdp.send('Runtime.evaluate', { expression: '1' }).then(() => true, () => true),
      new Promise((r) => setTimeout(() => r(false), busyMs)),
    ]);
    if (answered) { busySince = null; return; }
    busySince ??= Date.now() - busyMs;
    pausing = true;
    cdp.send('Debugger.pause').catch(() => { pausing = false; });
  }, everyMs);
  return {
    async stop() {
      clearInterval(timer);
      await cdp.send('Debugger.disable').catch(() => {});
      await cdp.detach().catch(() => {});
      return stalls;
    },
  };
}

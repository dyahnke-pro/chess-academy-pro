// OS-level `sample` of the audit browser's RENDERER processes — the one
// instrument that still answers when the page's main thread is blocked and no
// CDP command (Runtime.evaluate, Debugger.pause, Profiler.stop) can land
// (PLAN §B #21). macOS only (`/usr/bin/sample`).
//
// The first cut picked "the hottest process matching chrom(e|ium)" and sampled
// the Claude desktop app (its path contains "chromium") at 0.3% CPU while the
// wedge was live — so the selector is now the Playwright browser's own
// renderers, by executable path + `--type=renderer`, and EVERY one is sampled:
// the wedged page may be idle-blocked (0% CPU), not spinning.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The renderer processes of the Playwright Chromium (pw-browsers / ms-playwright). */
export function playwrightRenderers() {
  try {
    const ps = execSync("ps -eo pid=,%cpu=,rss=,command=", { encoding: 'utf8' });
    return ps.split('\n')
      .filter((l) => /--type=renderer/.test(l) && /(pw-browsers|ms-playwright|chromium-\d+|Chromium Helper)/.test(l))
      .map((l) => { const [pid, cpu, rss] = l.trim().split(/\s+/); return { pid, cpu: Number(cpu), rssMB: Math.round(Number(rss) / 1024) }; });
  } catch { return []; }
}

/** The main-thread stack of a `sample` file: the header line plus the deepest
 *  frames (the last lines of the first thread block are the innermost). */
function mainThreadStack(txt, lines = 18) {
  const rows = txt.split('\n');
  const i = rows.findIndex((l) => /com\.apple\.main-thread/.test(l));
  if (i < 0) return [];
  const block = [];
  for (let k = i; k < rows.length && block.length < 400; k += 1) {
    if (k > i && /^\s{4}\d+ Thread_/.test(rows[k])) break;
    block.push(rows[k]);
  }
  const deepest = block.slice(-lines);
  return [block[0], ...deepest].map((l) => l.replace(/^\s+/, '').slice(0, 170));
}

/**
 * Sample every Playwright renderer for `secs` seconds. Returns one entry per
 * renderer with its cpu/rss and the deepest main-thread frames. Never throws.
 */
export function sampleRenderers(outPrefix, secs = 5) {
  const out = [];
  for (const r of playwrightRenderers().slice(0, 4)) {
    const file = `${outPrefix}-${r.pid}.txt`;
    try {
      execSync(`sample ${r.pid} ${secs} -file ${file} >/dev/null 2>&1 || true`);
      const txt = readFileSync(file, 'utf8');
      out.push({ ...r, file, main: mainThreadStack(txt) });
    } catch (e) {
      out.push({ ...r, file, main: [], error: String(e).slice(0, 120) });
    }
  }
  return out;
}

// OS-level `sample` of the hottest Chromium process — the one instrument that
// still answers when the page's MAIN THREAD is spinning in native code and no
// CDP command (Runtime.evaluate, Debugger.pause, Profiler.stop) can land
// (PLAN §B #21: five reopened-review wedges, every one "JS heap UNREADABLE",
// Chromium at 100% for up to 50 min, engines fine). macOS only (`/usr/bin/sample`).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Sample the highest-CPU chrome/chromium process for `secs` seconds and return
 * its pid, cpu and the hottest stack lines (sample's "count  frame" rows with a
 * three-digit-or-more count — the frames the thread actually sat in).
 * Never throws: an audit must not die on its own diagnostic.
 */
export function sampleHotChromium(outFile, secs = 8) {
  try {
    const ps = execSync("ps -eo pid=,%cpu=,command= | grep -E 'chrom(e|ium)' | grep -v grep | sort -k2 -n -r | head -1", { encoding: 'utf8' }).trim();
    const [pid, cpu] = ps.split(/\s+/);
    if (!pid) return { pid: null, cpu: null, hot: [], error: 'no chromium process' };
    execSync(`sample ${pid} ${secs} -file ${outFile} >/dev/null 2>&1 || true`);
    const txt = readFileSync(outFile, 'utf8');
    const hot = txt.split('\n').filter((l) => /^\s+\d{3,}\s/.test(l)).slice(0, 16).map((l) => l.trim().slice(0, 160));
    return { pid, cpu, hot, file: outFile };
  } catch (e) {
    return { pid: null, cpu: null, hot: [], error: String(e).slice(0, 160) };
  }
}

// Every request to a server route or an origin-served file must go through
// `withWebOrigin` (src/utils/webOrigin.ts).
//
// Inside the native app the page is served from the app bundle, so a relative
// `/api/...` resolves against the bundle — no server, the request fails, and
// the caller falls back silently. That is how the bell never delivered a single
// Redis broadcast to an App Store user (2026-10-01: 0 native deliveries of
// `b_mtq2g8vn`, 49 on web), and how replies, referrals, the tablebase and the
// puzzle proxy were dead on native with every test green.
//
// Blames by STATEMENT: a `fetch(` / `new URL(` whose argument is a bare
// `/api/` literal, or a constant holding one, fails unless the same statement
// routes it through `withWebOrigin`.
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');
const EXEMPT = new Set(['utils/webOrigin.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** One request statement: from `fetch(` / `new URL(` to the end of its first argument's line. */
function requestStatements(code: string): string[] {
  const out: string[] = [];
  const re = /\b(fetch|new URL)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) out.push(code.slice(m.index, code.indexOf('\n', m.index) + 1 || undefined));
  return out;
}

function findBareServerRequests(files: string[]): string[] {
  const offenders: string[] = [];
  for (const file of files) {
    const rel = relative(SRC, file);
    if (EXEMPT.has(rel)) continue;
    const code = stripComments(readFileSync(file, 'utf8'));
    const consts = [...code.matchAll(/const\s+([A-Z_a-z]\w*)\s*=\s*['"`](\/api\/[^'"`]*|\/announcements\.json)['"`]/g)].map((x) => x[1]);
    for (const stmt of requestStatements(code)) {
      const bareLiteral = /^(fetch|new URL)\(\s*[`'"]\/api\//.test(stmt);
      const bareConst = consts.some((c) => new RegExp(`^(fetch|new URL)\\(\\s*(\`\\$\\{${c}\\}|${c}\\b)`).test(stmt));
      if ((bareLiteral || bareConst) && !stmt.includes('withWebOrigin(')) offenders.push(`${rel}: ${stmt.trim()}`);
    }
  }
  return offenders;
}

describe('native API origin', () => {
  it('every server request routes through withWebOrigin', () => {
    expect(findBareServerRequests(walk(SRC))).toEqual([]);
  });

  it('negative control: the pre-fix bell and referral code is caught', () => {
    const dir = mkdtempSync(join(tmpdir(), 'native-origin-'));
    const files = ['announcementsService.ts', 'referralService.ts'].map((name) => {
      const out = join(dir, name);
      const code = readFileSync(join(SRC, 'services', name), 'utf8').replace(/withWebOrigin\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, '$1');
      writeFileSync(out, code);
      return out;
    });
    const offenders = findBareServerRequests(files);
    rmSync(dir, { recursive: true, force: true });
    expect(offenders.length).toBeGreaterThanOrEqual(13);
  });
});

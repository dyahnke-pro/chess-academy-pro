// A call-site event prop may never share a name with a posthog SUPER-PROPERTY.
//
// 🚨 WHY. posthog-js merges call-site props OVER super-properties. `ImportPage`
// passed `platform` meaning "chess.com vs lichess", which overwrote
// `platform: 'native'` on all four import-funnel events. The LOCKED
// native-only user analysis (`properties.platform = 'native'`) therefore
// deleted the entire import funnel from every report, and three separate
// sessions read the empty result as "manual import is uninstrumented". It was
// fully instrumented. The filter was eating it.
//
// The damage is invisible in both directions: the event still lands, the
// dashboard still renders, and the number is simply wrong. So the gate is a
// source scan, not a runtime check — a collision must fail the build before it
// can ever silently corrupt a dimension again.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { RESERVED_SUPER_PROPS, sanitizeEventProps, resolvePlatformSuperProps } from './analytics';

const SRC_ROOT = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'test') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Top-level keys of the props object literal in each `captureEvent(...)` call.
 *  Depth-aware on purpose: a nested `context: { platform }` is NOT a top-level
 *  event prop and posthog never merges it over a super-property, so flagging it
 *  would be a false positive — and a gate that cries wolf gets disabled. */
function topLevelPropKeys(source: string): { key: string; snippet: string }[] {
  const found: { key: string; snippet: string }[] = [];
  const call = /captureEvent\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = call.exec(source)) !== null) {
    let i = m.index + m[0].length;
    let depth = 1;
    let buf = '';
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth > 0) buf += ch;
      i++;
    }
    // Keys sitting at exactly one object level deep inside the call args.
    let d = 0;
    let line = '';
    for (const ch of buf) {
      if (ch === '{') { d++; line = ''; continue; }
      if (ch === '}') { d--; line = ''; continue; }
      if (ch === ',' && d === 1) { collect(line, found, buf); line = ''; continue; }
      if (d === 1) line += ch;
    }
    if (d >= 0) collect(line, found, buf);
  }
  return found;
}

function collect(line: string, found: { key: string; snippet: string }[], snippet: string): void {
  const stripped = line.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!stripped) return;
  // `foo: bar` (explicit) or `foo` (shorthand) — the shorthand is how the bug
  // shipped, because `{ platform }` does not read as a name collision.
  const key = /^([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(stripped)?.[1];
  if (key) found.push({ key, snippet: snippet.slice(0, 120) });
}

describe('posthog super-property collisions', () => {
  it('no captureEvent call site uses a reserved super-property name', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC_ROOT)) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('captureEvent(')) continue;
      for (const { key, snippet } of topLevelPropKeys(src)) {
        if (RESERVED_SUPER_PROPS.has(key)) {
          offenders.push(`${file.replace(SRC_ROOT, 'src')}: "${key}" in ${snippet.replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(
      offenders,
      `These event props overwrite a device/platform super-property and will erase\n` +
        `those events from any analysis that filters on it. Rename to local_<name>\n` +
        `or something specific (e.g. import_source):\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every platform super-property is covered by the reserved list', () => {
    // Drift guard: a new key added to resolvePlatformSuperProps is reserved the
    // moment it exists, rather than the next time someone loses a funnel.
    for (const key of Object.keys(resolvePlatformSuperProps())) {
      expect(RESERVED_SUPER_PROPS.has(key), `${key} is a super-property but not reserved`).toBe(true);
    }
  });

  it('every device-identity super-property is covered by the reserved list', () => {
    const identity = readFileSync(resolve(SRC_ROOT, 'services/deviceIdentity.ts'), 'utf8');
    // The object literal returned by resolveDeviceIdentity — registered wholesale
    // as super-properties in App.tsx.
    const block = /\n {2}return \{\n([\s\S]*?)\n {2}\};/.exec(identity)?.[1] ?? '';
    expect(block, 'could not read resolveDeviceIdentity return shape').not.toBe('');
    for (const raw of block.split('\n')) {
      const key = /^\s*(?:\.\.\.\(\w+ \? \{ )?([a-z_][\w]*)\s*[:,]/.exec(raw)?.[1];
      if (!key) continue;
      expect(RESERVED_SUPER_PROPS.has(key), `${key} is a device super-property but not reserved`).toBe(true);
    }
  });

  it('re-keys a collision instead of dropping it', () => {
    const out = sanitizeEventProps({ platform: 'chesscom', game_count: 12 });
    expect(out).toEqual({ local_platform: 'chesscom', game_count: 12 });
  });

  it('leaves a clean payload untouched', () => {
    const clean = { import_source: 'lichess', game_count: 3 };
    expect(sanitizeEventProps(clean)).toBe(clean);
  });
});

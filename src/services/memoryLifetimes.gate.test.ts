/**
 * Gate: every accumulating ref in src/components and src/hooks is named in
 * MEMORY_LIFETIMES with a lifetime (persistent-memory plan, rule 2). Blamed by
 * STATEMENT — comments are stripped before scanning, so a comment describing a
 * ref never counts and never hides one.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MEMORY_LIFETIMES } from './memoryLifetimes';

const ROOTS = ['src/components', 'src/hooks'];

function stripComments(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, a: string) => a + ' '.repeat(m.length - a.length));
}

/** `const X = useRef<…>(new Set|new Map|[…]|{…})`, generics matched by depth. */
function findAccumulatingRefs(src: string): Array<{ name: string; line: number }> {
  const s = stripComments(src);
  const out: Array<{ name: string; line: number }> = [];
  const re = /\bconst\s+(\w+)\s*=\s*useRef\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    let i = re.lastIndex;
    if (s[i] === '<') {
      let d = 0;
      for (; i < s.length; i++) {
        const c = s[i];
        if (c === '<') d++;
        else if (c === '>' && s[i - 1] !== '=') { d--; if (d === 0) { i++; break; } }
      }
    }
    while (/\s/.test(s[i] ?? '')) i++;
    if (s[i] !== '(') continue;
    i++;
    while (/\s/.test(s[i] ?? '')) i++;
    if (!/^(new\s+(Set|Map)\b|\[|\{)/.test(s.slice(i, i + 12))) continue;
    out.push({ name: m[1], line: s.slice(0, m.index).split('\n').length });
  }
  return out;
}

function walk(dir: string, acc: string[]): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) acc.push(p);
  }
  return acc;
}

const found = ROOTS.flatMap((r) => walk(r, [])).flatMap((file) =>
  findAccumulatingRefs(fs.readFileSync(file, 'utf8')).map((r) => ({ ...r, file, key: `${file}::${r.name}` })));

describe('every in-page memory declares its lifetime', () => {
  it('the scanner sees the shapes it must (negative control)', () => {
    const src = `const a = useRef<Map<string, Set<number>>>(new Map());
// const b = useRef(new Set());
const c = useRef<() => void>(() => {});
const d = useRef<number[]>([]);
const e = useRef({ x: 1 });
const f = useRef<HTMLDivElement>(null);`;
    expect(findAccumulatingRefs(src).map((r) => r.name)).toEqual(['a', 'd', 'e']);
  });

  it('no accumulating ref is missing from MEMORY_LIFETIMES', () => {
    const missing = found.filter((r) => !(r.key in MEMORY_LIFETIMES)).map((r) => `${r.file}:${r.line} ${r.name}`);
    expect(missing, `declare a lifetime in src/services/memoryLifetimes.ts for:\n${missing.join('\n')}`).toEqual([]);
  });

  it('no row names a ref that no longer exists', () => {
    const keys = new Set(found.map((r) => r.key));
    expect(Object.keys(MEMORY_LIFETIMES).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('every persisted row names its store', () => {
    expect(Object.entries(MEMORY_LIFETIMES).filter(([, r]) => r.lifetime === 'persisted' && !r.via).map(([k]) => k)).toEqual([]);
  });
});

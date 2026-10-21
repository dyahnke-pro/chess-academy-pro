import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// A HAND-WRITTEN ARTICLE BEFORE A COMPUTED NOUN IS A GUESS (Learn tape
// 2026-10-21: "You have a overloaded defender"; earlier "a inaccuracy", "land
// a overloaded defender"). The template cannot know what word arrives, so the
// article is the noun's: `withArticle` (utils/andList) says "a" or "an" by
// sound. This fails on any template that writes "a ${…}" or "an ${…}" itself.
const ROOT = join(__dirname, '..');
const HAND_ARTICLE = /(^|[^A-Za-z0-9_$.'])(?:[Aa]n?) \$\{/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('no template writes its own article before a computed noun', () => {
  it('every "a ${…}" goes through withArticle', () => {
    const hits: string[] = [];
    for (const file of sources(ROOT)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        // A comment describing the bug is not a template.
        if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
        if (HAND_ARTICLE.test(line)) hits.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it('the negative control: the gate sees the line that shipped', () => {
    expect(HAND_ARTICLE.test('return `You have a ${word}.`;')).toBe(true);
    expect(HAND_ARTICLE.test('return `You have ${withArticle(word)}.`;')).toBe(false);
  });
});

/**
 * G8.5 — NOTHING BUILT BUT UNWIRED (David 2026-10-20: "make sure you're
 * removing old code"). An exported value in src/ that no production code reads
 * is parked, not shipped: its test keeps it alive and nothing a student meets
 * ever runs it. The 2026-10-20 sweep deleted nine dead modules and ~70 such
 * exports — among them two answer VALIDATORS (the shape G0 bans) and a
 * borrowed-teaching gate that had not run since its lane closed.
 *
 * The scanner (`scripts/test-only-exports.mjs`) counts every reference in the
 * code the app, API, workers and scripts run, comments stripped. Three things
 * may still be test-only:
 *   1. A TEST SEAM named as one: a `_` / `__` prefix or a `ForTest(s)` suffix.
 *   2. A TEST-SUPPORT MODULE named below with its reason.
 *   3. The BACKLOG in `testOnlyExports.baseline.json`, which only shrinks: a
 *      new test-only export fails here, and an entry that is deleted or gains a
 *      reader must leave the baseline in the same commit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globbedFiles, scan, stripComments } from '../../scripts/test-only-exports.mjs';

const BASELINE_PATH = 'src/test/testOnlyExports.baseline.json';
const BASELINE: string[] = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as string[];

/** Modules that exist to serve tests or build gates. Each says why. */
const TEST_SUPPORT: Record<string, string> = {
  'src/coach/ask/realQuestions.test.fixture.ts': 'fixture: real typed questions the routing tests replay',
  'src/coach/chatTurnEval.corpus.ts': 'held-out phrasings for the live chat-turn eval',
  'src/data/contentConsistency.ts': 'the opening-tab content gate (contentConsistency.test)',
  'src/data/grounding/groundingLib.ts': 'shared loader for the grounding gate tests',
  'src/data/narrationBoardClaims.sources.ts': 'source collector for the narration board-claims gate',
  'src/data/narrationSources.ts': 'the narration sources[] resolver the content gates call',
  'src/data/openingWalkthroughs/auditMoveQuality.ts': 'offline Stockfish move-quality audit of the walkthrough data',
  'src/services/memoryLifetimes.ts': 'the memory-lifetimes table its gate test checks (ship-check lists it)',
  'src/utils/dbAnchor.ts': 'the G3 DB-anchor rule the gem and lesson gates apply (mirrored in mine-punish-gems)',
};

const isSeam = (name: string): boolean => /^_/.test(name) || /ForTests?$/.test(name);
const key = (u: { file: string; name: string }): string => `${u.file}::${u.name}`;

describe('no exported value is read only by tests (G8.5)', () => {
  const { unused, deadModules } = scan();
  const findings = unused.filter((u) => !isSeam(u.name) && !(u.file in TEST_SUPPORT)).map(key);

  it('the scanner is not vacuous: it still sees the backlog it was built on', () => {
    expect(unused.length).toBeGreaterThanOrEqual(BASELINE.length);
    // A comment naming a function never keeps it alive.
    expect(stripComments('// keepMe()\n/* keepMe */ const x = 1;')).not.toMatch(/keepMe/);
    expect(stripComments("const s = '// not a comment';")).toMatch(/not a comment/);
  });

  it('every module no production file imports is a named test-support module', () => {
    expect(deadModules.filter((m) => !(m in TEST_SUPPORT))).toEqual([]);
  });

  it('every test-support entry still exists and is still test-only', () => {
    expect(Object.keys(TEST_SUPPORT).filter((m) => !deadModules.includes(m))).toEqual([]);
  });

  it('no NEW test-only export: delete it with its test, or wire it', () => {
    const known = new Set(BASELINE);
    expect(findings.filter((f) => !known.has(f))).toEqual([]);
  });

  it('the backlog only shrinks: a deleted or now-read entry leaves the baseline', () => {
    const now = new Set(findings);
    expect(BASELINE.filter((b) => !now.has(b))).toEqual([]);
  });

  it('a module loaded by import.meta.glob is imported (the scorer folder registers itself)', () => {
    const files = ['/r/src/s/greed.ts', '/r/src/s/index.ts', '/r/src/s/greed.test.ts', '/r/src/p/index.ts'];
    expect(globbedFiles('/r/src/s/index.ts', "import.meta.glob(['./*.ts', '!./index.ts', '!./*.test.ts'], { eager: true });", files)).toEqual(['/r/src/s/greed.ts']);
    expect(globbedFiles('/r/src/b/index.ts', "import.meta.glob<{ P: Record<A, B> }>('../p/index.ts', { eager: true })", files)).toEqual(['/r/src/p/index.ts']);
    expect(scan().deadModules.filter((m) => m.startsWith('src/missions/scorers/'))).toEqual([]);
  });
});

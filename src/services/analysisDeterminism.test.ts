import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { reviewBudget, deterministicAnalysisForAudit, DETERMINISTIC_BUDGET_MS, AUDIT_DETERMINISTIC_KEY, __resetAnalysisDeterminismForTests } from './analysisDeterminism';

describe('analysisDeterminism — the audit-only depth-only switch (PLAN #70)', () => {
  beforeEach(() => { __resetAnalysisDeterminismForTests(); try { window.localStorage.removeItem(AUDIT_DETERMINISTIC_KEY); } catch { /* none */ } delete (globalThis as { __auditDeterministicAnalysis?: unknown }).__auditDeterministicAnalysis; });

  it('is OFF by default: a review site gets its own budget', () => {
    expect(deterministicAnalysisForAudit()).toBe(false);
    expect(reviewBudget(8_000)).toBe(8_000);
    expect(reviewBudget(200)).toBe(200);
  });

  it('the in-memory flag works too (the harness may set either)', () => {
    (globalThis as { __auditDeterministicAnalysis?: unknown }).__auditDeterministicAnalysis = true;
    expect(reviewBudget(200)).toBe(DETERMINISTIC_BUDGET_MS);
  });

  it('under the harness flag every review budget becomes the depth-binding ceiling', () => {
    // A deterministic storage double: jsdom's own localStorage is origin-
    // dependent under vitest, and a test that silently skipped on it would be
    // vacuous. The module reads `window.localStorage`; give it exactly that.
    const map = new Map<string, string>();
    const fake = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
    const desc = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', { value: fake, configurable: true });
    try {
      __resetAnalysisDeterminismForTests();
      fake.setItem(AUDIT_DETERMINISTIC_KEY, '1');
      expect(deterministicAnalysisForAudit()).toBe(true);
      expect(reviewBudget(8_000)).toBe(DETERMINISTIC_BUDGET_MS);
      expect(reviewBudget(200)).toBe(DETERMINISTIC_BUDGET_MS);
    } finally {
      if (desc) Object.defineProperty(window, 'localStorage', desc); else delete (window as { localStorage?: unknown }).localStorage;
    }
  });

  it('is OFF for a normal user — nothing in the app sets the flag', () => {
    // Only the audit harness's init script writes it. A product writer would
    // silently turn every user's review into a ten-minute-per-position search.
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(p) || /\.test\.tsx?$/.test(p)) continue;
        const src = readFileSync(p, 'utf8');
        for (const [i, line] of src.split('\n').entries()) {
          const code = line.trim();
          if (code.startsWith('*') || code.startsWith('//') || code.startsWith('/*')) continue;
          if (/setItem\(\s*['"]auditDeterministicAnalysis['"]/.test(code) || /__auditDeterministicAnalysis\s*=\s*true/.test(code)) hits.push(`${p}:${i + 1}`);
        }
      }
    };
    walk('src');
    expect(hits, `product code must never enable deterministic analysis: ${hits.join(', ')}`).toEqual([]);
  });

  it('every review budget site routes through reviewBudget (no bare REVIEW_POSITION_BUDGET_MS reaches an engine call)', () => {
    const src = readFileSync('src/services/gameAnalysisService.ts', 'utf8');
    const bare = src.split('\n').filter((l) => /analyzePosition\(|analyzeWithBudget\(|budgetMs: number =|curveBudgetMs =/.test(l) && /REVIEW_POSITION_BUDGET_MS|BATCH_SHALLOW_BUDGET_MS/.test(l) && !/reviewBudget\(/.test(l));
    expect(bare, 'a review engine call with a raw budget').toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

/**
 * THE LLM CHOKEPOINT GATE — the mechanical guarantee behind the wire census.
 *
 * The grounding inversion only works if there is exactly ONE place a model call
 * can happen, and EVERY such call is tagged (grounded vs not) by construction.
 * Hand-enumerating the wires failed twice (the misconception classifier + the
 * tool-use entry point both slipped a memory-based audit). This gate removes
 * the memory step:
 *
 *   1. The provider SDKs (`openai`, `@anthropic-ai/sdk`) and the `/api/llm`
 *      proxy may be imported/used in `coachApi.ts` ONLY. Anywhere else = a new
 *      wire that bypasses the chokepoint → build RED.
 *   2. Every SDK instantiation in `coachApi.ts` (= every network primitive)
 *      must sit in the same file as the leak-audit emit, and there must be at
 *      least as many `emitCoachLlmCallAudit(` calls as `new OpenAI(` /
 *      `new Anthropic(` sites — so you cannot add a primitive without tagging
 *      it. (A new untagged primitive pushes instantiations past emits → RED.)
 *
 * Together: one file holds every wire, every wire is tagged at the primitive,
 * and adding a wire anywhere else — or an untagged primitive here — fails the
 * build. "What else are we missing?" becomes a closed, enforced question.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..'); // src/
const COACH_API = join(here, 'coachApi.ts');

// The only file allowed to touch a provider SDK / the LLM proxy.
const SDK_SIGNATURES = [
  /from\s+['"]openai['"]/,
  /from\s+['"]@anthropic-ai\/sdk['"]/,
  /\bnew\s+OpenAI\s*\(/,
  /\bnew\s+Anthropic\s*\(/,
  /\/api\/llm\//,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '__snapshots__') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('LLM chokepoint gate — every model wire funnels through coachApi.ts', () => {
  it('no provider SDK or /api/llm proxy is touched outside coachApi.ts', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file === COACH_API) continue; // the one sanctioned home
      if (/\.test\.tsx?$/.test(file)) continue; // tests may reference the names
      const src = readFileSync(file, 'utf8');
      for (const re of SDK_SIGNATURES) {
        if (re.test(src)) {
          offenders.push(`${relative(SRC, file)} :: ${re}`);
          break;
        }
      }
    }
    expect(
      offenders,
      `A provider SDK / LLM proxy is used outside coachApi.ts — that's a model wire bypassing the chokepoint. Route it through coachApi's primitives (which are leak-audited). Offenders:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it('every network primitive in coachApi.ts is leak-audited (emits >= SDK instantiations)', () => {
    const src = readFileSync(COACH_API, 'utf8');
    const instantiations =
      (src.match(/\bnew\s+OpenAI\s*\(/g)?.length ?? 0) +
      (src.match(/\bnew\s+Anthropic\s*\(/g)?.length ?? 0);
    const emits = src.match(/emitCoachLlmCallAudit\s*\(/g)?.length ?? 0;
    // The 6 primitives each instantiate once and each emit once. If someone
    // adds a 7th primitive (a new instantiation) without an emit, this trips.
    expect(
      emits,
      `Found ${instantiations} SDK instantiation(s) but only ${emits} emitCoachLlmCallAudit() call(s). Every network primitive must call emitCoachLlmCallAudit() so the leak audit stays exhaustive by construction.`,
    ).toBeGreaterThanOrEqual(instantiations);
    // Sanity floor — the 6 known primitives.
    expect(instantiations).toBeGreaterThanOrEqual(6);
  });
});

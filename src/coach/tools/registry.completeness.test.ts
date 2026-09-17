import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COACH_TOOLS, getTool, getToolDefinitions } from './registry';

vi.mock('../../services/appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

const HERE = join(process.cwd(), 'src/coach/tools');

/**
 * THE COMPLETENESS GATE (unified-coach Phase 7).
 *
 * The plan's last Phase-7 item: "a test that every fact-computer and every tool
 * is REACHABLE by the selector/spine — proof, not an import check."
 *
 * Until now the only claim was a COMMENT at the top of registry.ts: "all 23
 * registered + reachable — verified 2026-09-08". Nothing imported COACH_TOOLS
 * in the whole test suite, so that line was a promise, and this repo's own
 * doctrine is that a convention rots while a gate does not. A tool built and
 * never registered is exactly the "built but mounted nowhere" class that hid
 * the model-games renderer.
 */
describe('the coach toolbelt is COMPLETE and INVOCABLE', () => {
  const toolFiles = (dir: string): string[] =>
    readdirSync(join(HERE, dir))
      .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
      .map((f) => join(HERE, dir, f));

  it('no tool is built and left unregistered', () => {
    const files = [...toolFiles('cerebellum'), ...toolFiles('cerebrum')];
    expect(files.length, 'found no tool files — vacuous').toBeGreaterThan(15);
    const registered = new Set(COACH_TOOLS.map((t) => t.name));
    const orphans: string[] = [];
    for (const f of files) {
      // The tool's own `name:` literal is its identity — read it from the file
      // rather than the export, so a file that is never IMPORTED is still seen.
      const m = /^\s*name:\s*'([a-z0-9_]+)'/m.exec(readFileSync(f, 'utf-8'));
      if (!m) continue;                       // not a Tool module
      if (!registered.has(m[1])) orphans.push(`${m[1]} (${f.split('/').slice(-2).join('/')})`);
    }
    expect(orphans, 'these tools exist but the spine can never call them').toEqual([]);
  });

  it('every registered tool is resolvable BY NAME — the dispatcher can reach it', () => {
    expect(COACH_TOOLS.length).toBeGreaterThanOrEqual(23);
    for (const t of COACH_TOOLS) {
      const found = getTool(t.name);
      expect(found, `getTool('${t.name}') returned nothing`).toBeDefined();
      expect(found).toBe(t);
    }
    const names = COACH_TOOLS.map((t) => t.name);
    expect(new Set(names).size, 'two tools share a name — one shadows the other').toBe(names.length);
  });

  it('every registered tool ships its contract to the LLM, without its executor', () => {
    const defs = getToolDefinitions();
    expect(defs.map((d) => d.name).sort()).toEqual(COACH_TOOLS.map((t) => t.name).sort());
    for (const d of defs) {
      expect('execute' in d, `${d.name} leaked its executor into the prompt`).toBe(false);
      expect(d.description.length, `${d.name} has no description for the LLM`).toBeGreaterThan(20);
      expect(d.parameters, `${d.name} has no parameter schema`).toBeTruthy();
    }
  });

  it('NO FAKE SUCCESS — every tool invoked with nothing returns a structured result, never a throw', async () => {
    // This is the "proof, not an import check" half. Each tool is actually
    // CALLED, with no args and no surface context — the worst case a spine
    // dispatch can hand it.
    //
    // The contract splits by CATEGORY, and the first cut of this test got that
    // wrong. An ACTUATOR (cerebrum) with no surface to act on must return
    // {ok:false} — "don't claim the board was reset on a surface that has none"
    // (registry.ts, David 2026-09-08). A READ tool (cerebellum) has no surface
    // to fake: `lookup_player_games` with no filter honestly means "the best
    // games we have", reads the real reference corpus, and succeeding is
    // CORRECT. Flagging that was the test being wrong, not the tool.
    //
    // So a read tool that succeeds must prove it returned DATA — which is a
    // stronger check than the one it replaced, not a looser one.
    const failures: string[] = [];
    let readsThatSucceeded = 0;
    for (const t of COACH_TOOLS) {
      try {
        const r = await t.execute({}, undefined);
        if (typeof r !== 'object' || r === null || typeof r.ok !== 'boolean') {
          failures.push(`${t.name} returned ${JSON.stringify(r)} — not a ToolExecutionResult`);
          continue;
        }
        if (r.ok && t.category === 'cerebrum') {
          failures.push(`${t.name} reported ok:true with NO args and NO surface — synthetic success`);
        }
        if (r.ok && t.category === 'cerebellum') {
          readsThatSucceeded += 1;
          expect(r.result, `${t.name} reported ok:true with no payload`).toBeTruthy();
        }
        if (!r.ok) {
          expect(r.error, `${t.name} failed without telling the coach why`).toBeTruthy();
        }
      } catch (e) {
        failures.push(`${t.name} THREW: ${String(e).slice(0, 120)}`);
      }
    }
    expect(failures).toEqual([]);
    // Non-vacuity for the branch above: at least one read tool must actually
    // have run its real code path, or the payload assertion never executed.
    expect(readsThatSucceeded, 'no read tool produced data — the payload check never ran').toBeGreaterThan(0);
  });

  // ── THE OTHER HALF: every fact-computer must be REACHABLE too ──────────────
  //
  // A tool nothing can call and a computer nothing calls are the same defect.
  // Measured 2026-09-17: FOUR spine modules have ZERO production importers —
  // nothing in the app can reach them, whatever their tests say.
  //
  //   coachChatService.ts        10 exports. CoachChatPage does NOT import it;
  //                              only its own test and a test-mock of that page.
  //   tacticDrillService.ts       3 exports, and NO test either. A second drill
  //                              queue builder sitting beside the live one —
  //                              TacticDrillPage builds from puzzlesByOpening.
  //   threatCheck.ts              2 exports. The computer behind the threat-check
  //                              card David removed from Learn on 2026-08-05
  //                              ("annoying AF"). The UI went; this stayed.
  //   openingNameClaimValidator   1 export, only its own test.
  //
  // NOT deleted here. CLAUDE.md: prove it is actually dead, grep every consumer,
  // dry-run the removal — and two of this sweep's own first candidates were
  // FALSE (coachsCall is reached by a DYNAMIC import in CoachTeachPage; a static
  // regex missed it). The ceiling stops the class GROWING while each is retired
  // deliberately. It only ever shrinks.
  it('no NEW spine computer becomes unreachable', () => {
    const ORPHAN_CEILING = 4;
    const SPINE = /^src\/services\/(coach|narration|teaching|voice|weakness|review|tactic|position|concept|note|corpus|curated|method|fact|ply|opening|refuted|plan|grounded|mistake|drill|explain|pin|threat|importance|need|selector|decider|lookahead|dna|principle|exchange|criticality|attribut|transfer|foresight|habit|misconception|rating|amateur|theory|board|causal|skill|standing|endgame|mate)[A-Za-z]*\.ts$/;
    const walk = (d: string, o: string[] = []): string[] => {
      for (const e of readdirSync(d)) {
        const f = join(d, e);
        if (statSync(f).isDirectory()) walk(f, o);
        else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) o.push(f);
      }
      return o;
    };
    const prod = walk('src');
    expect(prod.length, 'the walk found nothing — vacuous').toBeGreaterThan(400);
    const bodies = new Map(prod.map((f) => [f, readFileSync(f, 'utf-8')]));
    const orphans: string[] = [];
    for (const f of prod) {
      if (!SPINE.test(f)) continue;
      if (!/^export (?:async )?function /m.test(bodies.get(f) ?? '')) continue;
      const base = f.split('/').pop()!.replace(/\.ts$/, '');
      // Match BOTH static `from '.../base'` and dynamic `import('.../base')`.
      const reach = new RegExp(`(?:from|import\\()\\s*'[^']*/${base}'`);
      const reachable = prod.some((g) => g !== f && reach.test(bodies.get(g) ?? ''));
      if (!reachable) orphans.push(f);
    }
    expect(
      orphans.length,
      `${orphans.length} spine modules nothing in production can reach:\n  ${orphans.join('\n  ')}\n` +
      'This ceiling only SHRINKS. Retire one (prove it dead first — grep every ' +
      'consumer, including dynamic imports) and lower the number. Never raise it.',
    ).toBeLessThanOrEqual(ORPHAN_CEILING);
  });
});

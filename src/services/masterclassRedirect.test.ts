import { describe, it, expect } from 'vitest';
import { resolveMasterclassRedirect } from './masterclassRedirect';
import ecoData from '../data/openings-lichess.json';
import repertoireData from '../data/repertoire.json';
import openingManifests from '../data/opening-manifests.json';

interface Eco { eco: string; name: string; pgn?: string; moves?: string }
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const eco = (ecoData as unknown as Eco[]).filter((e) => e && (e.pgn || e.moves));
const rec = (e: Eco) => ({ id: slug(`${e.eco}-${e.name}`), pgn: e.pgn ?? e.moves ?? '', isRepertoire: false });
const first = (pgn: string) => (pgn.trim().split(/\s+/)[0] ?? '');
const MC_IDS = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
const mcById = new Map((repertoireData as Array<{ id: string; pgn: string }>).map((o) => [o.id, o]));

describe('masterclass redirect resolver', () => {
  it('does NOT redirect a masterclass entry itself', () => {
    for (const id of MC_IDS) {
      const m = mcById.get(id);
      if (!m) continue;
      expect(resolveMasterclassRedirect({ id, pgn: m.pgn, isRepertoire: true }), `${id} redirected`).toBeNull();
    }
  });

  it('routes the Glek ECO twin to the glek-system masterclass', () => {
    const twin = eco.find((e) => e.eco === 'C47' && /Glek System/i.test(e.name) && /g3$/.test((e.pgn ?? '').trim()));
    expect(twin, 'Glek twin not found in ECO data').toBeTruthy();
    const r = resolveMasterclassRedirect(rec(twin!));
    expect(r?.to).toBe('glek-system');
  });

  it('never redirects across the first move (no e4→d4 mis-routes)', () => {
    const offenders: string[] = [];
    for (const e of eco) {
      const r = resolveMasterclassRedirect(rec(e));
      if (!r) continue;
      const target = mcById.get(r.to);
      if (target && first(target.pgn) !== first(e.pgn ?? e.moves ?? '')) {
        offenders.push(`${e.eco} ${e.name} → ${r.to} (${first(e.pgn ?? '')} vs ${first(target.pgn)})`);
      }
    }
    expect(offenders.slice(0, 20), `cross-first-move redirects:\n${offenders.slice(0, 20).join('\n')}`).toEqual([]);
  });

  it('every redirect target is a real masterclass', () => {
    for (const e of eco.slice(0, 4000)) {
      const r = resolveMasterclassRedirect(rec(e));
      if (r) expect(MC_IDS.has(r.to), `${r.to} not a masterclass`).toBe(true);
    }
  });

  it('[report] coverage + samples per masterclass (hand-check the mappings)', () => {
    const byTarget = new Map<string, string[]>();
    let total = 0;
    for (const e of eco) {
      const r = resolveMasterclassRedirect(rec(e));
      if (!r) continue;
      total++;
      const key = `${r.to}${r.line ? ` :: ${r.line}` : ' :: (main)'}`;
      const arr = byTarget.get(key) ?? [];
      if (arr.length < 3) arr.push(`${e.eco} ${e.name}`);
      byTarget.set(key, arr);
    }
    console.log(`\n=== ${total} ECO entries redirect to a masterclass tab ===`);
    for (const key of [...byTarget.keys()].sort()) {
      console.log(`  ${key}`);
      for (const s of byTarget.get(key)!) console.log(`      ${s}`);
    }
    expect(total).toBeGreaterThan(0);
  });
});

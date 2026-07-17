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

  it('routes the Accelerated Panov (2.c4 transposition) to the Caro Panov tab', () => {
    // `e4 c6 c4…` shares only 2 plies with the taught Panov spine
    // (`e4 c6 d4 d5 exd5 cxd5 c4…`) so the prefix matcher can't see it — the
    // curated transposition alias carries it to the Panov tab instead of a
    // half-built 2-move stub.
    const accel = eco.filter(
      (e) => /Accelerated Panov/i.test(e.name) && /^e4 c6 c4 d5/.test((e.pgn ?? '').trim()),
    );
    expect(accel.length, 'no Accelerated Panov …d5 entries in ECO data').toBeGreaterThan(0);
    for (const e of accel) {
      const r = resolveMasterclassRedirect(rec(e));
      expect(r?.to, `${e.name} did not route to caro-kann`).toBe('caro-kann');
      expect(r?.line).toBe('Panov');
    }
  });

  it('routes the bare `e4 c6 c4` Accelerated parent to the Caro Panov tab', () => {
    const r = resolveMasterclassRedirect({ id: 'x', pgn: 'e4 c6 c4', isRepertoire: false });
    expect(r).toEqual({ to: 'caro-kann', line: 'Panov' });
  });

  it('does NOT route the Accelerated Panov Open Variation (…e5 is a different structure)', () => {
    // `e4 c6 c4 e5` is NOT the Panov — it must not land on the Panov tab.
    const r = resolveMasterclassRedirect({ id: 'x', pgn: 'e4 c6 c4 e5', isRepertoire: false });
    expect(r?.to === 'caro-kann' && r?.line === 'Panov').toBe(false);
  });

  it('still routes the standard Panov Attack (2.d4) to the Caro Panov tab', () => {
    const std = eco.find(
      (e) => /Panov Attack/i.test(e.name) && /^e4 c6 d4 d5 exd5 cxd5 c4/.test((e.pgn ?? '').trim()),
    );
    expect(std, 'standard Panov entry not found').toBeTruthy();
    const r = resolveMasterclassRedirect(rec(std!));
    expect(r?.to).toBe('caro-kann');
    expect(r?.line).toBe('Panov');
  });

  it('does NOT mis-redirect the Scandi Panov Transfer to the Icelandic Gambit tab', () => {
    // The 6-ply Panov Transfer (…exd5 Nf6 c4 c6) shares 5 plies with the
    // Icelandic Gambit (…exd5 Nf6 c4 e6) then diverges (c6 vs e6). It's a
    // terminal-short stub, so it must NOT loosely grab the Icelandic tab — it
    // falls to the coach, which teaches its real line (David 2026-07-16).
    const r = resolveMasterclassRedirect({
      id: 'x', pgn: 'e4 d5 exd5 Nf6 c4 c6', isRepertoire: false,
    });
    expect(r).toBeNull();
  });

  it('STILL redirects the real Icelandic Gambit + deep Panov sub-lines', () => {
    // Regression guard: the terminal-short rule must not break legit matches.
    const ice = resolveMasterclassRedirect({
      id: 'x', pgn: 'e4 d5 exd5 Nf6 c4 e6', isRepertoire: false,
    });
    expect(ice?.to).toBe('scandinavian-defence');
    const carlsbad = resolveMasterclassRedirect({
      id: 'x', pgn: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 Nc6 Bg5 e6', isRepertoire: false,
    });
    expect(carlsbad?.to).toBe('caro-kann');
    expect(carlsbad?.line).toBe('Panov');
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

// GEMS ARE BUILT INTO THE TREE, NOT WAITED FOR.
//
// David 2026-08-20: *"The walkthrough prebuilds the lesson so they need to be
// built in at run time."*
//
// `tree.punish` was filled only by background stage generation, so gems landed
// after the lesson had already walked past the positions they fire at. A gem
// needs no LLM and no network — it is curated, engine-verified at mining time,
// and chess.js-validated on conversion — so it is a synchronous local lookup
// that belongs on the tree the moment the tree exists.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { sanitizeTreeStages } from './openingGenerator';
import { _findMatchingTraps } from '../hooks/useTeachWalkthrough';
import type { WalkthroughTree } from '../types/walkthroughTree';

const bareTree = (openingName: string): WalkthroughTree => ({
  openingName,
  eco: '',
  studentSide: 'white',
  intro: '',
  outro: '',
  root: { san: null, movedBy: null, idea: '', children: [] },
} as WalkthroughTree);

describe('gems on the prebuilt tree', () => {
  it('attaches gems to a tree that arrived with no punish stage at all', () => {
    const tree = sanitizeTreeStages(bareTree('Caro-Kann Defence'));
    expect(tree.punish?.length ?? 0, 'no gems attached — the lesson would walk past them').toBeGreaterThan(0);
  });

  it('the attached gems fire at their own positions', () => {
    const tree = sanitizeTreeStages(bareTree('Caro-Kann Defence'));
    const gems = tree.punish ?? [];
    const fired = gems.filter((g) => _findMatchingTraps(g.setupMoves, gems).some((m) => m.name === g.name));
    expect(fired.length, 'gems attached but none match at their own setup position').toBeGreaterThan(0);
  });

  it('every attached gem is playable at the board it fires at', () => {
    const bad: string[] = [];
    for (const name of ['Caro-Kann Defence', 'Vienna Game', 'Italian Game']) {
      for (const g of sanitizeTreeStages(bareTree(name)).punish ?? []) {
        const b = new Chess();
        let ok = true;
        for (const san of g.setupMoves) { try { if (!b.move(san)) { ok = false; break; } } catch { ok = false; break; } }
        if (!ok) { bad.push(`${g.name}: setup illegal`); continue; }
        try { if (!b.move(g.inaccuracy)) bad.push(`${g.name}: ${g.inaccuracy} illegal`); }
        catch { bad.push(`${g.name}: ${g.inaccuracy} illegal`); }
      }
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  it('does not duplicate gems already present on the tree', () => {
    const once = sanitizeTreeStages(bareTree('Caro-Kann Defence'));
    const n = once.punish?.length ?? 0;
    const twice = sanitizeTreeStages(once);
    expect(twice.punish?.length).toBe(n);
  });
});

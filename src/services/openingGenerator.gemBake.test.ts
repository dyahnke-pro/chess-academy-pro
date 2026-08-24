/**
 * Gate for the BAKED gem picker in the "teach me X opening" walkthrough
 * (David 2026-08-23: "bake gem teaching into the teach me x opening"). The gem
 * teaching is an interactive PICKER detour, sourced from the opening tab's own
 * gem builder (`gemToPlayableLine`). This proves the baking layer without the
 * LLM generation path (integration-level): a real gem's position produces a
 * played-out detour with narration + arrows, the generator attaches it to the
 * node, and the tree-wide dedupe never bakes the same gem twice.
 */
import { describe, it, expect } from 'vitest';
import { attachBakedGems } from './openingGenerator';
import { buildGemDetour, gemsForPosition, bakeGemsIntoTree } from './gemCrushLines';
import { getPunishGemsForOpening, isSurfaceableGem } from '../data/lessons/punishGems';
import type { WalkthroughTree, WalkthroughTreeNode } from '../types/walkthroughTree';
import { Chess } from 'chess.js';

function bareNode(san: string): WalkthroughTreeNode {
  return { san, movedBy: 'white', idea: 'placeholder', children: [] };
}

function firstSurfaceableGem() {
  return getPunishGemsForOpening('caro-kann').filter(isSurfaceableGem)[0] ?? null;
}

describe('buildGemDetour', () => {
  it('builds a legal played-out detour from a real gem, with narration + arrows', () => {
    const gem = firstSurfaceableGem();
    expect(gem, 'expected a surfaceable Caro-Kann gem').not.toBeNull();
    const detour = buildGemDetour(gem)!;
    expect(detour).toBeTruthy();
    expect(detour.gemId).toBeTruthy();
    expect(detour.title).toBeTruthy();
    expect(detour.steps.length).toBeGreaterThan(0);

    // The first detour move is the opponent's inaccuracy, and every step is
    // legal from the previous position (the detour plays cleanly from baseFen).
    const board = new Chess(detour.baseFen);
    for (const step of detour.steps) {
      const mv = board.move(step.san);
      expect(mv, `illegal detour move ${step.san}`).toBeTruthy();
      expect(step.fen).toBe(board.fen());
      // Arrows carry a valid narration color union member.
      for (const a of step.arrows) {
        expect(a.from).toMatch(/^[a-h][1-8]$/);
        expect(a.to).toMatch(/^[a-h][1-8]$/);
      }
    }
    // The inaccuracy the picker names is the first detour ply.
    expect(detour.steps[0].san.replace(/[!?]+$/g, '')).toBe(detour.inaccuracy);
  });
});

describe('gemsForPosition', () => {
  it('classifies a gem as a WEAPON for the punisher side, a WARNING for the other', () => {
    const gem = firstSurfaceableGem();
    const path = gem.lineMoves.split(/\s+/).filter(Boolean);
    // Caro-Kann student punishes as Black → weapon; the same gem for a White
    // student is a trap to avoid → warning (David 2026-08-24 "add warnings too").
    const asBlack = gemsForPosition(path, 'black');
    expect(asBlack.length).toBeGreaterThan(0);
    expect(asBlack.every((g) => g.kind === 'weapon')).toBe(true);
    const asWhite = gemsForPosition(path, 'white');
    expect(asWhite.length).toBeGreaterThan(0);
    expect(asWhite.every((g) => g.kind === 'warning')).toBe(true);
  });

  it('is empty on a position no gem knows', () => {
    expect(gemsForPosition(['e4'])).toHaveLength(0);
  });
});

describe('buildGemDetour warnings', () => {
  it('frames a warning with computed, careful narration (not the weapon prose)', () => {
    const gem = firstSurfaceableGem();
    const w = buildGemDetour(gem, 'warning');
    expect(w).toBeTruthy();
    expect(w!.kind).toBe('warning');
    expect(w!.title.toLowerCase()).toContain('careful');
    expect(w!.steps[0].idea.toLowerCase()).toContain('careful');
    // Still a legal played-out line from the base.
    const board = new Chess(w!.baseFen);
    for (const s of w!.steps) expect(board.move(s.san)).toBeTruthy();
  });
});

describe('attachBakedGems', () => {
  it('attaches the gem detour(s) onto node.gems', () => {
    const gem = firstSurfaceableGem();
    const path = gem.lineMoves.split(/\s+/).filter(Boolean);
    const node = bareNode(path[path.length - 1]);
    attachBakedGems(node, path, new Set<string>(), 'black');
    expect(node.gems?.length).toBeGreaterThan(0);
    expect(node.gems![0].steps.length).toBeGreaterThan(0);
  });

  it('dedupes: the same gem never bakes twice across a tree', () => {
    const gem = firstSurfaceableGem();
    const path = gem.lineMoves.split(/\s+/).filter(Boolean);
    const spliced = new Set<string>();
    const a = bareNode(path[path.length - 1]);
    attachBakedGems(a, path, spliced, 'black');
    const firstCount = a.gems?.length ?? 0;
    expect(firstCount).toBeGreaterThan(0);
    // A second node reaching the same board gets nothing new.
    const b = bareNode(path[path.length - 1]);
    attachBakedGems(b, path, spliced, 'black');
    expect(b.gems ?? []).toHaveLength(0);
  });

  it('is a no-op where no surfaceable gem sits', () => {
    const node = bareNode('e4');
    attachBakedGems(node, ['e4'], new Set<string>(), 'white');
    expect(node.gems).toBeUndefined();
  });
});

describe('bakeGemsIntoTree — the static masterclass path', () => {
  it('attaches gems onto the node whose position sits on a gem (David 2026-08-24)', () => {
    const gem = firstSurfaceableGem();
    const spine = gem.lineMoves.split(/\s+/).filter(Boolean);
    // Build a linear tree along the gem's spine (as the static masterclass walk).
    let child: WalkthroughTreeNode = { san: spine[spine.length - 1], movedBy: 'white', idea: '', children: [] };
    for (let i = spine.length - 2; i >= 0; i -= 1) {
      child = { san: spine[i], movedBy: i % 2 === 0 ? 'white' : 'black', idea: '', children: [{ node: child }] };
    }
    const tree = {
      openingName: 'Caro-Kann Defense', eco: 'B10', intro: '', outro: '',
      root: { san: null, movedBy: null, idea: '', children: [{ node: child }] },
    } as WalkthroughTree;

    const attached = bakeGemsIntoTree(tree, 'black');
    expect(attached).toBeGreaterThan(0);
    // The deepest node (the gem's terminus) carries the weapon.
    let cur = tree.root;
    while (cur.children.length) cur = cur.children[0].node;
    expect(cur.gems?.some((g) => g.kind === 'weapon')).toBe(true);
  });

  it('is idempotent — a second bake adds nothing', () => {
    const gem = firstSurfaceableGem();
    const spine = gem.lineMoves.split(/\s+/).filter(Boolean);
    let child: WalkthroughTreeNode = { san: spine[spine.length - 1], movedBy: 'white', idea: '', children: [] };
    for (let i = spine.length - 2; i >= 0; i -= 1) {
      child = { san: spine[i], movedBy: i % 2 === 0 ? 'white' : 'black', idea: '', children: [{ node: child }] };
    }
    const tree = {
      openingName: 'Caro-Kann Defense', eco: 'B10', intro: '', outro: '',
      root: { san: null, movedBy: null, idea: '', children: [{ node: child }] },
    } as WalkthroughTree;
    expect(bakeGemsIntoTree(tree, 'black')).toBeGreaterThan(0);
    expect(bakeGemsIntoTree(tree, 'black')).toBe(0);
  });
});

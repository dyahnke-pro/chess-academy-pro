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
import { buildGemDetour, gemsForPosition } from './gemCrushLines';
import { getPunishGemsForOpening, isSurfaceableGem } from '../data/lessons/punishGems';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';
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
  it('returns weapon detours only for the punisher side', () => {
    const gem = firstSurfaceableGem();
    const path = gem.lineMoves.split(/\s+/).filter(Boolean);
    // Caro-Kann student punishes as Black.
    expect(gemsForPosition(path, 'black').length).toBeGreaterThan(0);
    // Asking as White (the slipping side here) yields nothing — that's a warning.
    expect(gemsForPosition(path, 'white').length).toBe(0);
  });

  it('is empty on a position no gem knows', () => {
    expect(gemsForPosition(['e4'])).toHaveLength(0);
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

/**
 * WO-STANDARD-01 F1 — the "teach me X" walkthrough's beats are COMPUTED.
 *
 * Until 2026-09-22 `generateOpeningFromDbNarration` asked the model to AUTHOR
 * every ply's idea, the intro, the branch teasers and the extension ideas
 * (one 65k-token structured call, retried at 131k), reworded the result in a
 * second call, and baked the lot into the cached tree. This gate runs the
 * REAL generator with the `openai` wire 401ing on every call and proves, on
 * OUTPUT, that the lesson still teaches:
 *
 *   - the spine's plies carry seat-stamped, board-computed beats
 *     ("You play …" / "They play …" — buildReviewMoveBriefing, teach register);
 *   - the Brief-register cue is computed too (narrateContinuationMove);
 *   - the intro is the computed thesis or the plain frame — never a model
 *     hook, never the template-fallback prose the old path shipped when the
 *     model failed ("book moves from the Lichess opening database");
 *   - no call ever carried the old authoring prompt.
 *
 * NEGATIVE CONTROL: on the pre-inversion generator this exact run produces
 * the template-fallback intro and empty ideas (`narrationFallback: true`),
 * and the `create` spy sees the HOUSE VOICE prompt.
 */
import { describe, it, expect, vi } from 'vitest';

type Params = { messages: Array<{ role: string; content: string }> };
const created: Params[] = [];
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: async (params: Params) => {
          created.push(params);
          throw Object.assign(new Error('401 degraded-audit'), { status: 401 });
        },
      },
    };
  },
}));

vi.mock('./explorerTeachLine', () => ({
  buildExplorerTeachLine: vi.fn(async (fen: string) => ({ sans: [], segments: [], endFen: fen })),
}));

import { generateOpening } from './openingGenerator';
import type { WalkthroughTreeNode } from '../types/walkthroughTree';

function spine(root: WalkthroughTreeNode): WalkthroughTreeNode[] {
  const out: WalkthroughTreeNode[] = [];
  let node: WalkthroughTreeNode | undefined = root.children[0]?.node;
  while (node) {
    out.push(node);
    node = node.children.length === 1 ? node.children[0].node : undefined;
  }
  return out;
}

describe('the taught line with the provider dead', () => {
  it('every spine ply is a computed, seat-stamped beat; the intro is computed; no authoring call was made', async () => {
    const result = await generateOpening('Scandinavian Defense: Panov Transfer', {
      mode: 'learn',
      entryOverride: {
        canonicalName: 'Scandinavian Defense: Panov Transfer',
        eco: 'B01',
        moves: ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'c6'],
      },
    });
    expect(result.ok).toBe(true);
    const tree = result.tree!;
    // Never the old model-failure template.
    expect(tree.narrationFallback).toBeUndefined();
    expect(tree.intro).not.toMatch(/book moves from the Lichess/);
    expect(tree.intro).toMatch(/^Scandinavian Defense: Panov Transfer/);

    const plies = spine(tree.root);
    expect(plies.length).toBeGreaterThanOrEqual(6);
    const spoken = plies.map((n) => n.idea);
    // Seat-stamped computed beats, replayed from the board: the student's own
    // plies carry "You play <san>,", the opponent's "They play <san>,". The
    // seat is whatever the generator resolved (tree.studentSide) — the stamp
    // must agree with it on every one of the first four plies. NOT anchored
    // to the start: where a corpus note or the authored variation prose
    // teaches this ply, that note LEADS and the computed beat fills behind
    // it (PASS 1's two-beat contract).
    const own = (n: WalkthroughTreeNode): RegExp => new RegExp(`${n.movedBy === tree.studentSide ? 'You' : 'They'} play ${n.san},`);
    for (const n of plies.slice(0, 4)) expect(n.idea, `ply ${n.san}`).toMatch(own(n));
    expect(spoken[0]).toMatch(/play e4,/);
    expect(spoken[3]).toMatch(/play Nf6,/);
    // The Brief cue is computed too (≤ 60 chars, names the move).
    expect(plies[0].shortIdea).toMatch(/^e4 — /);
    expect(plies[3].shortIdea).toMatch(/^Nf6 — /);
    // Every spoken beat is a segment the player can reveal.
    for (const n of plies) if (n.idea) expect(n.narration?.[0]?.text).toBeTruthy();

    // No call carried the old authoring prompt — the model was never asked
    // to write chess. (Stage generation may still have tried and 401'd; that
    // is out of this bucket and never reaches the spine.)
    const authoring = created.filter((c) => c.messages.some((m) => /HOUSE VOICE|emit_walkthrough_narration|NARRATION SCRIPT/.test(m.content)));
    expect(authoring).toHaveLength(0);
  }, 60_000);
});

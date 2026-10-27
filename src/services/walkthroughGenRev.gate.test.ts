// WALKTHROUGH_GEN_REV moves with the "teach me X opening" lesson's words (the
// rev fingerprint gate — src/test/revFingerprint.ts). Beats are baked into the
// cached tree at generation, so a beat change with the rev still leaves every
// device teaching from its old tree. Two lessons, generated for real with the
// provider dead (the beats are computed — openingGenerator.computedBeats.test).
import { describe, it, expect, vi } from 'vitest';
import { checkRevFingerprint, fingerprint } from '../test/revFingerprint';

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: async () => { throw Object.assign(new Error('401 rev-gate'), { status: 401 }); } } };
  },
}));
vi.mock('./explorerTeachLine', () => ({
  buildExplorerBranches: vi.fn(async () => ({ branches: [], source: null, results: null, incomplete: false })),
  resultsLine: () => null,
}));

import { generateOpening, WALKTHROUGH_GEN_REV } from './openingGenerator';

const LESSONS = [
  { canonicalName: 'Scandinavian Defense: Panov Transfer', eco: 'B01', moves: ['e4', 'd5', 'exd5', 'Nf6', 'c4', 'c6'] },
  { canonicalName: 'Ponziani Opening', eco: 'C44', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'] },
];

/** The tree minus what changes run to run (stamps, ids). */
const stable = (tree: unknown): unknown => JSON.parse(JSON.stringify(tree, (k, v: unknown) => (/(?:At|Ms|^id)$/.test(k) || k === 'timings' ? undefined : v)));

describe('WALKTHROUGH_GEN_REV moves with the lesson beats', () => {
  it('the committed (rev, fingerprint) pair matches the generator', async () => {
    const parts: Record<string, string> = {};
    for (const entry of LESSONS) {
      const r = await generateOpening(entry.canonicalName, { mode: 'learn', entryOverride: entry });
      expect(r.ok).toBe(true);
      parts[entry.canonicalName] = fingerprint(stable(r.tree));
    }
    expect(checkRevFingerprint('walkthrough-gen', WALKTHROUGH_GEN_REV, parts, 'src/services/walkthroughGenRev.gate.test.ts')).toBeNull();
  }, 600_000);
});

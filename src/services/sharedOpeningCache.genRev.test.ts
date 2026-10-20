// ONE REV FOR EVERY COPY OF A LESSON (2026-10-20). The shared cache was keyed
// only by PROMPT_VERSION, which no longer moves with the beats, so another
// user's old tree came back and was cached locally as current.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// The tree's SHAPE is not what is under test — only its generation.
vi.mock('../data/openingWalkthroughs/validate', () => ({ validateWalkthroughTree: () => [], validateTreeMoveLegality: () => [] }));
import { db } from '../db/schema';
import { readSharedCache, writeSharedCache } from './sharedOpeningCache';
import { WALKTHROUGH_GEN_REV } from './walkthroughGenRev';
import type { WalkthroughTree } from '../types/walkthroughTree';

const tree = (genRev?: string): WalkthroughTree => ({ openingName: 'Ponziani Opening', eco: 'C44', ...(genRev ? { genRev } : {}), root: { san: null, movedBy: null, idea: '', children: [] } } as unknown as WalkthroughTree);

describe('the shared lesson cache reads only the current generation', () => {
  beforeEach(async () => {
    await db.delete(); await db.open();
    await db.profiles.put({ id: 'main', preferences: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'k' } } as never);
  });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('a tree from an older generation (or none stamped) is a miss', async () => {
    for (const old of [undefined, '2026-09-01-old']) {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ tree: tree(old), prompt_version: 10, generated_at: 'x' }]), { status: 200 })));
      expect(await readSharedCache('Ponziani Opening')).toBeNull();
    }
  });
  it('a tree of the current generation is served', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ tree: tree(WALKTHROUGH_GEN_REV), prompt_version: 10, generated_at: 'x' }]), { status: 200 })));
    expect((await readSharedCache('Ponziani Opening'))?.openingName).toBe('Ponziani Opening');
  }, 60_000); // the read lazy-imports the generator to sanitize stages
  it('a write stamps the tree with the current generation', async () => {
    const f = vi.fn(async () => new Response('', { status: 201 }));
    vi.stubGlobal('fetch', f);
    await writeSharedCache('Ponziani Opening', tree());
    const body = JSON.parse((f.mock.calls[0] as unknown as [string, { body: string }])[1].body) as { tree: { genRev?: string } };
    expect(body.tree.genRev).toBe(WALKTHROUGH_GEN_REV);
  });
});

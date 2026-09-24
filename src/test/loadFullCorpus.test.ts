import { describe, it, expect } from 'vitest';
import { unprimedCorpora } from './loadFullCorpus';
import registry from '../data/corpora.json';

// The corpus-primed check is derived from the registry. NEGATIVE CONTROLS: an
// empty load, and a corpus that came back with zero notes, must both fail it.
describe('unprimedCorpora — every registered fetched corpus must load', () => {
  const fetched = registry.corpora.filter((c) => c.load === 'fetch').length
    + registry.corpora.filter((c) => typeof (c as { floatingPath?: string }).floatingPath === 'string').length;

  it('nothing loaded → every registered corpus is reported', () => {
    expect(fetched).toBeGreaterThan(0);
    expect(unprimedCorpora([])).toHaveLength(fetched);
  });

  it('a corpus that loaded empty is reported, by name', () => {
    const r = unprimedCorpora([{ key: 'voiced', notes: 0 }]);
    expect(r.some((x) => x.startsWith('voiced '))).toBe(true);
  });
});

// An auto-appended tab's pill label is whole words of its name, never cut
// mid-word. The label was sliced at 20 characters, so the Two Knights showed
// "Traxler Counterattac" and the Trompowsky "2...Ne4 3.Bf4 c5 4.f".
import { describe, expect, it } from 'vitest';
import repertoire from '../data/repertoire.json';
import { autoLabel } from './variationTabs';

interface Entry { variations?: Array<{ name: string }> }

describe('auto tab labels', () => {
  const names = (repertoire as Entry[]).flatMap((o) => (o.variations ?? []).map((v) => v.name));

  it('are whole words of the tab name, at most 20 characters', () => {
    const bad = names.filter((name) => {
      const label = autoLabel(name);
      const words = new Set(name.split(/\s+/));
      return label.length > 20 || label.split(' ').some((w) => !words.has(w));
    });
    expect(bad.map((n) => `${n} -> ${autoLabel(n)}`)).toEqual([]);
  });

  it('keeps the words that fit', () => {
    expect(autoLabel('Two Knights: Traxler Counterattack')).toBe('Traxler');
    expect(autoLabel('2...Ne4 3.Bf4 c5 4.f3 Sideline')).toBe('2...Ne4 3.Bf4 c5');
    expect(names.length).toBeGreaterThan(200);
  });
});

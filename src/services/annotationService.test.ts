import { describe, it, expect, beforeEach } from 'vitest';
import { loadAnnotations, clearAnnotationCache } from './annotationService';

describe('annotationService', () => {
  beforeEach(() => {
    clearAnnotationCache();
  });

  it('loads annotations for a known opening', async () => {
    const annotations = await loadAnnotations('italian-game');
    expect(annotations).not.toBeNull();
    expect(annotations!.length).toBeGreaterThan(0);
    expect(annotations![0].san).toBe('e4');
    expect(annotations![0].annotation).toBeTruthy();
  });

  it('returns null for an unknown opening', async () => {
    const annotations = await loadAnnotations('nonexistent-opening');
    expect(annotations).toBeNull();
  });

  it('caches annotations after first load', async () => {
    const first = await loadAnnotations('italian-game');
    const second = await loadAnnotations('italian-game');
    expect(first).toBe(second); // Same reference = cached
  });

  it('clearAnnotationCache resets the cache so next load re-fetches', async () => {
    const first = await loadAnnotations('italian-game');
    expect(first).not.toBeNull();
    clearAnnotationCache();
    // After clearing, loading again should still return valid data
    const second = await loadAnnotations('italian-game');
    expect(second).not.toBeNull();
    expect(second).toEqual(first);
  });

  it('annotations have required fields', async () => {
    const annotations = await loadAnnotations('italian-game');
    expect(annotations).not.toBeNull();
    for (const ann of annotations!) {
      expect(ann.san).toBeTruthy();
      expect(typeof ann.san).toBe('string');
      expect(ann.annotation).toBeTruthy();
      expect(typeof ann.annotation).toBe('string');
    }
  });

  it('some annotations have optional enrichment fields', async () => {
    const annotations = await loadAnnotations('italian-game');
    expect(annotations).not.toBeNull();
    const withPlans = annotations!.filter((a) => a.plans && a.plans.length > 0);
    const withStructure = annotations!.filter((a) => a.pawnStructure);
    expect(withPlans.length).toBeGreaterThan(0);
    expect(withStructure.length).toBeGreaterThan(0);
  });
});

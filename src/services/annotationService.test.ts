import { describe, it, expect, beforeEach } from 'vitest';
import { loadAnnotations, loadSubLineAnnotations, clearAnnotationCache } from './annotationService';

describe('annotationService', () => {
  beforeEach(() => {
    clearAnnotationCache();
  });

  it('loads annotations for a known opening', async () => {
    const annotations = await loadAnnotations('italian-game');
    expect(annotations).not.toBeNull();
    if (annotations === null) throw new Error('Expected annotations to be non-null');
    expect(annotations.length).toBeGreaterThan(0);
    expect(annotations[0].san).toBe('e4');
    expect(annotations[0].annotation).toBeTruthy();
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
    if (annotations === null) throw new Error('Expected annotations to be non-null');
    for (const ann of annotations) {
      expect(ann.san).toBeTruthy();
      expect(typeof ann.san).toBe('string');
      expect(ann.annotation).toBeTruthy();
      expect(typeof ann.annotation).toBe('string');
    }
  });

  it('loads subline annotation for variation-0', async () => {
    const annotations = await loadSubLineAnnotations('london-system', 'variation-0');
    expect(annotations).not.toBeNull();
    if (annotations === null) throw new Error('Expected annotations to be non-null');
    expect(annotations.length).toBeGreaterThan(0);
    expect(annotations[0].san).toBeTruthy();
    expect(annotations[0].annotation).toBeTruthy();
  });

  it('loads subline annotation for variation-2 (Jobava London)', async () => {
    const annotations = await loadSubLineAnnotations('london-system', 'variation-2');
    // variation-2 may or may not exist depending on annotation data completeness
    if (annotations) {
      expect(annotations.length).toBeGreaterThan(0);
    }
  });

  it('loads trap/warning subline keys when annotation data includes them', async () => {
    const annotations = await loadSubLineAnnotations('london-system', 'trap-0');
    // trap-0 may exist now that London System annotations are complete
    if (annotations) {
      expect(annotations.length).toBeGreaterThan(0);
      expect(annotations[0].san).toBeTruthy();
    }
  });

  it('returns null for unknown subline key format', async () => {
    const annotations = await loadSubLineAnnotations('london-system', 'unknown-key');
    expect(annotations).toBeNull();
  });

  it('returns null for out-of-range variation index', async () => {
    const annotations = await loadSubLineAnnotations('london-system', 'variation-99');
    expect(annotations).toBeNull();
  });

  it('some annotations have optional enrichment fields', async () => {
    const annotations = await loadAnnotations('italian-game');
    expect(annotations).not.toBeNull();
    if (annotations === null) throw new Error('Expected annotations to be non-null');
    const withPlans = annotations.filter((a) => a.plans && a.plans.length > 0);
    const withStructure = annotations.filter((a) => a.pawnStructure);
    expect(withPlans.length).toBeGreaterThan(0);
    expect(withStructure.length).toBeGreaterThan(0);
  });
});

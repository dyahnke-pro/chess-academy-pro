import { describe, it, expect, beforeEach } from 'vitest';
import { loadAnnotations, loadAnnotationsForPgn, loadSubLineAnnotations, clearAnnotationCache } from './annotationService';

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
    // `annotation` is allowed to be empty per CLAUDE.md Narration Voice
    // rules ("silence is acceptable" — routine opening moves play without
    // speech). What matters is that the loader returns substantive
    // annotation entries — at least one move on the line must carry a
    // non-empty annotation or plan.
    const hasContent = annotations.some(
      (m) => m.annotation || (m.plans && m.plans.length > 0),
    );
    expect(hasContent).toBe(true);
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

  describe('loadAnnotationsForPgn — cross-line drift guard', () => {
    // 2026-05-18 deep-walk audit caught this class. Pro repertoire
    // openings reuse a parent opening's annotation file via
    // `PRO_SUFFIX_TO_BASE` (e.g. Ponziani → italian-game.json,
    // Sveshnikov → sicilian-defense-lasker-pelikan-...json). When the
    // pro line's PGN diverges from the parent's PGN after a few
    // shared opening moves, the loader used to return annotations
    // whose tail described a DIFFERENT continuation. Worst case the
    // narration claimed Black played a move that White actually made.
    //
    // The fix: when the annotation set's SAN multiset overlaps the
    // PGN's SAN multiset by less than 70 %, trim to the strict
    // matching prefix (or return null if the prefix is too short).
    //
    // Note: these tests use REAL data files so the assertions are
    // about behavior rather than exact return values. The contract:
    // every returned annotation's `san` must equal the PGN's SAN at
    // the same index.

    it('Ponziani variation-0 PGN: returned annotations are a strict prefix of the PGN', async () => {
      const ponziPgn = 'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Bc5 dxc6 Bxf2+ Ke2 bxc6';
      const sans = ponziPgn.trim().split(/\s+/);
      // The pro repertoire's opening id is `pro-gothamchess-ponziani`
      // but loadAnnotationsForPgn takes an opening id at the
      // annotation-file level, so we use the resolved base id.
      const annotations = await loadAnnotationsForPgn('pro-gothamchess-ponziani', ponziPgn);
      if (annotations) {
        for (let i = 0; i < annotations.length; i++) {
          expect(annotations[i].san).toBe(sans[i]);
        }
      }
    });

    it('returns annotations whose every SAN matches the PGN at the same index', async () => {
      // Pick an opening that resolves cleanly (same line as its
      // annotation file). The italian-game's main PGN should fully
      // match its own annotations.
      const itPgn = 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4';
      const sans = itPgn.trim().split(/\s+/);
      const annotations = await loadAnnotationsForPgn('italian-game', itPgn);
      expect(annotations).not.toBeNull();
      if (annotations === null) throw new Error('Expected non-null');
      // The annotations may be longer than the PGN (italian-game
      // covers more plies than we test). The leading plies must
      // match the PGN sans.
      for (let i = 0; i < Math.min(sans.length, annotations.length); i++) {
        expect(annotations[i].san).toBe(sans[i]);
      }
    });

    it('Ponziani-style cross-line: no annotation describes a different ply', async () => {
      // This is the regression test for the audit finding. Even if
      // some annotations are returned, none should describe a SAN
      // that doesn't match the PGN at the same index.
      const proPgns = [
        'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Bc5 dxc6 Bxf2+ Ke2 bxc6', // Ponziani variation-0
      ];
      for (const pgn of proPgns) {
        const sans = pgn.trim().split(/\s+/);
        const annotations = await loadAnnotationsForPgn('pro-gothamchess-ponziani', pgn);
        if (annotations === null) continue;
        for (let i = 0; i < Math.min(annotations.length, sans.length); i++) {
          expect(annotations[i].san).toBe(sans[i]);
        }
      }
    });
  });
});

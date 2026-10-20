import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/davidRecord.recordTerms.json';
import type { MisconceptionTagRecord } from '../types';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { capabilityProven, summariseEvidence, type CapabilityEvidenceRecord } from './capabilityEvidence';
import { studentRecordFrom } from './studentRecord';
import { fadeLevelsFrom } from './fadeText';

// OS-1 §C1 on David's real record (data drop 2026-10-19, sliced by
// scripts/extract-record-terms-fixture.mjs). The fade used to read ONLY the
// capability profile, so his recorded misses never reached it and these
// skills read "short" — the coach clipped the teaching of the exact skills he
// keeps missing. It now reads the heat tiles (slips AND capabilities).

type EvidenceTuple = [number, string, string, number, number, number, number];
type SlipTuple = [number, string, number, number | null, string | null];
const tags = fixture.tags as MisconceptionTagId[];
const game = (i: number): string | undefined => (i < 0 ? undefined : fixture.games[i]);
const evidence = (fixture.evidence as EvidenceTuple[]).map(([t, o, origin, prompted, imp, g, at], i) => ({
  id: `e${i}`, tag: tags[t], outcome: o === 'h' ? 'held' : 'broken', origin, prompted: prompted === 1,
  posedImportance: imp, sourceGameId: game(g), recordedAt: at, fen: '', playedSan: '',
})) as unknown as CapabilityEvidenceRecord[];
const slips = (fixture.slips as SlipTuple[]).map(([t, source, g, dueAt, grade], i) => ({
  id: `s${i}`, tag: tags[t], source, sourceGameId: game(g), dueAt: dueAt ?? undefined, grade: grade ?? undefined,
})) as unknown as MisconceptionTagRecord[];
const now = Date.parse(fixture.exportedAt);
const caps = summariseEvidence(evidence);
const record = studentRecordFrom([], caps, slips, now);
const fade = fadeLevelsFrom(record.heat);

describe('the fade reads the whole record (David\'s drop)', () => {
  it.each(['hung-material', 'missed-tactic', 'missed-opponents-threat'] as const)('%s: proven by answers alone, but his open misses keep it in full', (tag) => {
    // The old input: the capability profile alone said proven → "short".
    expect(capabilityProven(caps.get(tag))).toBe(true);
    // The record holds open misses for it…
    expect(record.heat.get(tag)?.openWeight ?? 0).toBeGreaterThanOrEqual(1);
    // …so the fade teaches it in full.
    expect(fade.get(tag)).toBeUndefined();
  });
  it('a skill with no record stays full (grey teaches)', () => {
    expect(fade.get('poisoned-pawn')).toBeUndefined();
  });
  it('a proven skill with no open miss still fades short', () => {
    const cleanSlips = slips.filter((s) => s.tag !== 'missed-tactic');
    expect(fadeLevelsFrom(studentRecordFrom([], caps, cleanSlips, now).heat).get('missed-tactic')).toBe('short');
  });
});

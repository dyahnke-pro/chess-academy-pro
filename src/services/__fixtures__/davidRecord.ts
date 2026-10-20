// David's real record (data drop 2026-10-19, sliced by
// scripts/extract-record-terms-fixture.mjs), expanded back into rows. Shared
// by every test that reads his record, so one fixture has one reader.
import fixture from './davidRecord.recordTerms.json';
import type { MisconceptionTagRecord } from '../../types';
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import type { CapabilityEvidenceRecord } from '../capabilityEvidence';

type EvidenceTuple = [number, string, string, number, number, number, number, number];
type SlipTuple = [number, string, number, number | null, string | null, number, number, number | null];
const tags = fixture.tags as MisconceptionTagId[];
const game = (i: number): string | undefined => (i < 0 ? undefined : fixture.games[i]);
const fen = (i: number): string => (i < 0 ? '' : fixture.plies[i]);

export const davidEvidence = (fixture.evidence as unknown as EvidenceTuple[]).map(([t, o, origin, prompted, imp, g, at, p], i) => ({
  id: `e${i}`, tag: tags[t], outcome: o === 'h' ? 'held' : 'broken', origin, prompted: prompted === 1,
  posedImportance: imp, sourceGameId: game(g), recordedAt: at, fen: fen(p), playedSan: '',
})) as unknown as CapabilityEvidenceRecord[];

export const davidSlips = (fixture.slips as unknown as SlipTuple[]).map(([t, source, g, dueAt, grade, createdAt, p, playedAt], i) => ({
  id: `s${i}`, tag: tags[t], source, sourceGameId: game(g), dueAt: dueAt ?? undefined, grade: grade ?? undefined,
  createdAt, fen: fen(p), ...(playedAt !== null ? { playedAt } : {}),
})) as unknown as MisconceptionTagRecord[];

export const davidNow = Date.parse(fixture.exportedAt);

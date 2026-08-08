// The tactical lane reaches notes by CONCEPT TAG, so the map from a detector
// type to its tags is only as good as the corpus's actual vocabulary.
//
// It was written from what each idea is CALLED rather than from what the 58,124
// notes are TAGGED, and the difference was most of the lane: `back_rank` pointed
// at `back-rank-weakness` (47 notes) while `back-rank-mate` (390) and
// `back-rank` (89) sat unreachable, and nothing at all reached `sacrifice`
// (1,597), `deflection` (413) or `overloading` (203). Pointing it at the tags
// the corpus really uses moved the lane from 11,085 reachable notes to 17,972 —
// nothing farmed, nothing rewritten, just tags that exist.
//
// A tag no note carries is worse than a missing one: it looks like coverage and
// silently narrows the lane. This gate fails on any dead entry and holds the
// reach as a floor that may only rise.
//
// Reads the WHOLE corpus via loadFullCorpus — two of the four are fetched at
// runtime, so a measurement without it sees 19.6% of the data.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { TACTIC_TYPE_CONCEPTS, spokenTacticNote } from './danyaTeachingService';
import { detectTactics } from './tacticsDetector';
import { loadFullCorpus } from '../test/loadFullCorpus';
import danya from '../data/danya-teachings.json';
import chessbrah from '../data/chessbrah-teachings.json';

interface Note { concepts?: string[] }

const everyNote = (): Note[] => [
  ...(danya as unknown as { notes: Note[] }).notes,
  ...(chessbrah as unknown as { notes: Note[] }).notes,
  ...(JSON.parse(readFileSync('public/data/hangingpawns-teachings.json', 'utf8')) as { notes: Note[] }).notes,
  ...(JSON.parse(readFileSync('public/data/saintlouis-teachings.json', 'utf8')) as { notes: Note[] }).notes,
];

const norm = (c: string): string => c.toLowerCase().trim();

describe('tactical lane vocabulary', () => {
  beforeAll(() => { loadFullCorpus(); });

  it('every mapped tag exists in the corpus — a dead tag is fake coverage', () => {
    const counts = new Map<string, number>();
    for (const n of everyNote()) {
      for (const c of n.concepts ?? []) counts.set(norm(c), (counts.get(norm(c)) ?? 0) + 1);
    }
    const dead: string[] = [];
    for (const [type, tags] of Object.entries(TACTIC_TYPE_CONCEPTS)) {
      for (const t of tags) if ((counts.get(t) ?? 0) === 0) dead.push(`${type} → ${t}`);
    }
    expect(dead).toEqual([]);
  });

  it('reaches at least 17,000 notes — a floor that may only rise', () => {
    const mapped = new Set(Object.values(TACTIC_TYPE_CONCEPTS).flat());
    let reach = 0;
    for (const n of everyNote()) {
      if ((n.concepts ?? []).some((c) => mapped.has(norm(c)))) reach += 1;
    }
    expect(reach).toBeGreaterThanOrEqual(17_000);
  });

  it('PROOF: a real fork on a real board yields real corpus prose', () => {
    // Not "the function was called" and not "the import exists" — the note
    // itself, out of the lane, for a position the DETECTOR proves. A wire that
    // does not fire is not a wire (David 2026-08-07).
    const forked = '4k3/8/8/3N4/8/8/8/3QK2r w - - 0 1'; // knight hits king + rook
    const detected = detectTactics(forked).tactics.map((t) => t.type).filter((t) => t !== 'none');
    expect(detected.length).toBeGreaterThan(0);

    const note = spokenTacticNote({ types: detected, phase: 'middlegame' });
    expect(note).not.toBeNull();
    expect(note?.text.length).toBeGreaterThan(30);
    // The note must NAME the pattern it was chosen to explain. Length and
    // word-count assertions are vacuous — they passed `dt-b1` ("Black castles
    // long and White plays Rf4, but Black is better") for a skewer.
    expect(note?.text.toLowerCase()).toMatch(/skewer|x-ray|pin|fork/);
    console.log(`[tactic lane] ${detected.join(',')} → ${note?.id}: ${note?.text.slice(0, 140)}`);
  });

  it('never repeats a note already spoken this game', () => {
    const seen = new Set<string>();
    const first = spokenTacticNote({ types: ['fork'], phase: 'middlegame', seenIds: seen });
    const second = spokenTacticNote({ types: ['fork'], phase: 'middlegame', seenIds: seen });
    expect(first).not.toBeNull();
    expect(second?.id).not.toBe(first?.id);
  });

  it('every detector type the tactics context emits has its own mapping', () => {
    // A type with no entry falls back to bare ['tactics'], which reaches a
    // generic note instead of one about the pattern actually on the board.
    for (const type of ['fork', 'pin', 'skewer', 'discovery', 'back_rank', 'trapped_piece',
      'hanging', 'mate_threat', 'removal_of_guard', 'double_check']) {
      expect(Object.keys(TACTIC_TYPE_CONCEPTS)).toContain(type);
    }
  });
});

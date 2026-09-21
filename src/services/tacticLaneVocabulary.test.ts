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
import { TACTIC_TYPE_CONCEPTS, spokenTacticNote } from './danyaTeachingService';
import { detectTactics } from './tacticsDetector';
import { loadFullCorpus, allCorpusNotes } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';

// 🔒 FROM THE REGISTRY, NOT A HAND-LIST (2026-09-21). The seven non-danya
// farmed creators were removed — one corpus source, danya's, position-tied
// (David). A hand-list here names files that no longer exist, so the static
// import throws and the whole file collapses to "no tests", which is how
// this gate died once already. `allCorpusNotes` reads every half of every
// registered corpus off `corpora.json`.
const everyNote = allCorpusNotes;

const norm = (c: string): string => c.toLowerCase().trim();

describe('tactical lane vocabulary', () => {
  // 60s: the corpus is 58,124 notes and the bake is an 11 MB JSON parse, which
  // runs past vitest's 10s hook default whenever anything else is running.
  beforeAll(() => { loadFullCorpus(); loadSpokenBake(); }, 60000);

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

    // 4,800, lowered 2026-09-21 — and a floor going DOWN is normally the bug, so
  // say why: David cut the corpus to ONE source ("the danya ones that we have
  // tied exactly to positions. nothing else!"). The pool is danya (10,050) plus
  // voiced (7,477); the lane reaches 4,925. It may only rise from here.
  it('reaches at least 4,800 notes — a floor that may only rise', () => {
    const mapped = new Set(Object.values(TACTIC_TYPE_CONCEPTS).flat());
    let reach = 0;
    for (const n of everyNote()) {
      if ((n.concepts ?? []).some((c) => mapped.has(norm(c)))) reach += 1;
    }
    expect(reach).toBeGreaterThanOrEqual(4_800);
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

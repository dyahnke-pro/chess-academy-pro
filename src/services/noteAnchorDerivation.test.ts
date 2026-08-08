// The gate on derived anchors.
//
// A derived anchor decides WHICH POSITION a piece of teaching is about, and a
// wrong one is the worst failure this app has: fluent, confident prose about a
// board the student is not looking at. `noteSelectionDeterminism` guarantees a
// note is only spoken where its anchor lands; that guarantee is only as good as
// the anchors, and 1,203 of them are now computed rather than authored.
//
// So this gate does not check the sidecar — it RE-DERIVES every entry from the
// corpus and requires the same answer. A hand-edited `note-anchors.json` fails
// here, which is the property that matters: the file is output, not input.
//
// Read `scripts/derive-note-anchors.mjs` for the derivation and, more
// importantly, for the approach that was measured and REJECTED (anchoring by
// the note's `opening` tag — 8,423 notes that survive every runtime filter and
// are still about the wrong board). That rejection is the reason these rules
// are as narrow as they are; do not widen one without re-reading it.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { deriveAnchor, sanRuns } from '../../scripts/derive-note-anchors.mjs';
import { allDerivedAnchors, applyDerivedAnchors, derivedAnchorsWentUnmatched } from './noteAnchorOverrides';
import { noteDescribesPosition } from './noteAnchorIntegrity';
import { noteAtPosition } from './danyaTeachingService';
import type { DanyaNote } from './danyaTeachingService';
import { loadFullCorpus } from '../test/loadFullCorpus';
import dbRaw from '../data/openings-lichess.json';

const CORPORA = [
  'src/data/danya-teachings.json',
  'src/data/chessbrah-teachings.json',
  'public/data/hangingpawns-teachings.json',
  'public/data/saintlouis-teachings.json',
];

function allNotes(): DanyaNote[] {
  const out: DanyaNote[] = [];
  for (const f of CORPORA) {
    for (const n of JSON.parse(readFileSync(f, 'utf8')).notes ?? []) out.push(n);
  }
  return out;
}

const DB_PREFIX_PLIES = 4;
const dbPrefixes = (() => {
  const set = new Set<string>();
  for (const e of dbRaw as Array<{ pgn: string }>) {
    const s = e.pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (s.length >= DB_PREFIX_PLIES) set.add(s.slice(0, DB_PREFIX_PLIES).join(' '));
  }
  return set;
})();

const fenAfter = (line: string[]): string | null => {
  const c = new Chess();
  for (const san of line) {
    try { c.move(san); } catch { return null; }
  }
  return c.fen();
};

describe('derived note anchors', () => {
  let notes: DanyaNote[];
  let byId: Map<string, DanyaNote>;
  beforeAll(() => {
    loadFullCorpus();
    notes = allNotes();
    byId = new Map(notes.map((n) => [n.id, n]));
  }, 120_000);

  it('the sidecar is exactly what the corpus derives — it is output, not input', () => {
    const shipped = allDerivedAnchors();
    const fresh: Record<string, string[]> = {};
    for (const n of notes) {
      const line = deriveAnchor(n, dbPrefixes);
      if (line) fresh[n.id] = line;
    }
    expect(Object.keys(shipped).sort()).toEqual(Object.keys(fresh).sort());
    for (const id of Object.keys(fresh)) expect(shipped[id], id).toEqual(fresh[id]);
  }, 120_000);

  it('every derived anchor is a legal line', () => {
    for (const [id, line] of Object.entries(allDerivedAnchors())) {
      expect(fenAfter(line), `${id}: ${line.join(' ')}`).toBeTruthy();
    }
  });

  it('every derived anchor is a REAL line — its opening is in the DB (G3)', () => {
    // The rule that refuses a mid-game fragment which merely happens to replay
    // from move one. `dt-bl` produced "c4 a5 b4" from a sentence about a
    // position where "Black has castled queenside" — nonsense three plies in.
    for (const [id, line] of Object.entries(allDerivedAnchors())) {
      expect(line.length, id).toBeGreaterThanOrEqual(DB_PREFIX_PLIES);
      expect(dbPrefixes.has(line.slice(0, DB_PREFIX_PLIES).join(' ')), `${id}: ${line.join(' ')}`).toBe(true);
    }
  });

  it('a derived anchor only ever DEEPENS — it never shortens or relocates blindly', () => {
    // 198 of these replace a recorded anchor. That is intended: the recorded
    // value is a truncation of the same line the prose spells out. What must
    // never happen is a derivation that makes a note LESS specific.
    for (const [id, line] of Object.entries(allDerivedAnchors())) {
      const note = byId.get(id);
      expect(note, `${id} not found in any corpus — stale sidecar`).toBeDefined();
      expect(line.length, id).toBeGreaterThan(note!.lineSan?.length ?? 0);
    }
  });

  it('RULE 5: every derived anchor is self-describing on its own board', () => {
    // The same integrity gate an authored anchor faces. Enforced here rather
    // than in the .mjs because the predicate is TypeScript and a second copy
    // would drift into being a second rule.
    const bad: string[] = [];
    for (const [id, line] of Object.entries(allDerivedAnchors())) {
      const note = byId.get(id);
      if (!note) continue;
      const fen = fenAfter(line);
      if (!fen) continue;
      if (!noteDescribesPosition({ ...note, lineSan: line }, fen)) bad.push(id);
    }
    expect(bad, `not self-describing: ${bad.slice(0, 10).join(', ')}`).toEqual([]);
  });

  it('the derivation is deterministic — same corpus in, same anchors out', () => {
    const a = notes.map((n) => deriveAnchor(n, dbPrefixes)?.join(' ') ?? '');
    const b = notes.map((n) => deriveAnchor(n, dbPrefixes)?.join(' ') ?? '');
    expect(a).toEqual(b);
  }, 120_000);

  it('the sidecar actually MATCHES the loaded corpus (a re-farm would silently orphan it)', () => {
    expect(derivedAnchorsWentUnmatched()).toBe(false);
    const applied = applyDerivedAnchors(notes);
    const changed = applied.filter((n, i) => n.lineSan !== notes[i].lineSan);
    expect(changed.length).toBe(Object.keys(allDerivedAnchors()).length);
  });

  it('THE POINT: a newly-anchored note is now reachable at the position it teaches', () => {
    // dt-g6: "After e4 d5 exd5 Nf6 Bb5+ Bd7, the bishop on d7 is poorly placed
    // because it blocks the b8 knight…" — shipped with NO anchor, so no student
    // could ever hear it. The line is in its first sentence.
    const line = ['e4', 'd5', 'exd5', 'Nf6', 'Bb5+', 'Bd7'];
    expect(allDerivedAnchors()['dt-g6']).toEqual(line);
    const fen = fenAfter(line)!;
    const note = noteAtPosition(line, fen, 'Scandinavian Defense');
    expect(note, 'no note selected at a position the corpus demonstrably teaches').toBeTruthy();
  });

  it('sanRuns reads a line out of prose and stops where the recitation stops', () => {
    const runs = sanRuns('In the Traxler, after e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5, the natural Nxf7? is wild.');
    expect(runs[0]).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'Bc5']);
  });

  it('REJECTED BY DESIGN: the opening TAG is never used as an anchor', () => {
    // The guard on the mistake this work made first. A note tagged with an
    // opening but whose prose names no line stays unanchored — the tag is a
    // video-level label, and six notes tagged "French Defense" all resolve to
    // e4 e6 d4 d5 while teaching six different boards.
    const tagged: DanyaNote = {
      id: 'probe-tag-only', lineSan: [], opening: 'French Defense', phase: 'opening',
      explains: 'White has a space advantage and should play on the kingside.',
      teaches: 'Play where you have more space.', plans: 'Advance the f-pawn.',
      concepts: [], sources: [],
    };
    expect(deriveAnchor(tagged, dbPrefixes)).toBeNull();
  });

  it('REJECTED BY DESIGN: prose naming two different lines is ambiguous, so silent', () => {
    const two: DanyaNote = {
      id: 'probe-ambiguous', lineSan: [], opening: null, phase: 'opening',
      explains: 'Compare e4 e5 Nf3 Nc6 Bb5 a6 with e4 c5 Nf3 d6 d4 cxd4 — different worlds.',
      teaches: '', plans: '', concepts: [], sources: [],
    };
    expect(deriveAnchor(two, dbPrefixes)).toBeNull();
  });
});

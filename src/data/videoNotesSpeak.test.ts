// A VIDEO NOTE THAT IS NEVER SELECTED IS NOT WIRED.
//
// CLAUDE.md, after an integration audit found three surfaces "wired" to the
// corpus that returned nothing: *"A WIRE THAT DOES NOT FIRE IS NOT A WIRE. I
// don't want to run an audit and find nothing working."* Every integration ships
// with a test that proves a real note comes OUT for a real position — not that
// the import exists, not that the function was called.
//
// That is exactly the risk here. These notes are hand-written and correct, and
// they still reach the student only if they survive the whole selection filter:
// verified position, phase matching the board, prose that describes THIS board,
// opening in scope. Any one of those silently drops a note, and the symptom is
// nothing at all — the lesson simply says less, which looks like a corpus with
// no coverage rather than a note being rejected.
//
// So this asks the REAL selector at each note's own position, exactly as the
// lesson runtime does.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { noteAtPosition, notesForFen } from '../services/danyaTeachingService';

interface VideoNote {
  id: string; lineSan: string[]; opening: string | null;
  teaches: string; explains: string; sources: string[];
}

const bundle = JSON.parse(
  readFileSync(join(process.cwd(), 'src/data/video-teachings.json'), 'utf8'),
) as { notes: VideoNote[] };

const fenAfter = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

describe('video-derived teaching notes', () => {
  it('has notes to check', () => {
    expect(bundle.notes.length).toBeGreaterThan(0);
  });

  it('every note sits on a legal position its own moves produce', () => {
    for (const n of bundle.notes) {
      expect(() => fenAfter(n.lineSan), `${n.id}: illegal line`).not.toThrow();
    }
  });

  it('every note cites the video it was written from', () => {
    // Provenance is the claim that makes these notes trustworthy — a note that
    // cannot name its lesson cannot be checked against it.
    for (const n of bundle.notes) {
      expect(n.sources.some((s) => s.startsWith('yt:')), `${n.id}: no yt: source`).toBe(true);
    }
  });

  it('is reachable by POSITION, not only by the move order the video used', () => {
    // This is the assertion that decides whether these notes work for a real
    // student. The tracker reads occupancy, which cannot distinguish move
    // ORDERS that reach the same board, so it legitimately returns a
    // permutation — the Alapin came back as "c3 c5 e4 d5 …" where a player
    // types "e4 c5 c3 d5 …". Matching on the move string alone, every one of
    // these notes would be silent in the app while passing every other check
    // here. The transposition index is what saves it, so it is pinned.
    for (const n of bundle.notes) {
      const fen = fenAfter(n.lineSan);
      const ids = notesForFen(fen).map((x) => x.id);
      expect(ids, `${n.id}: not indexed by its own position`).toContain(n.id);
    }
  });

  it('is SELECTED by the real selector at its own position', () => {
    // The whole point. A note the selector rejects teaches nobody.
    const silent: string[] = [];
    for (const n of bundle.notes) {
      const got = noteAtPosition(n.lineSan, fenAfter(n.lineSan), n.opening);
      if (got?.id !== n.id) {
        silent.push(`${n.id} @ ${n.lineSan.join(' ')} -> ${got ? `selector chose ${got.id}` : 'nothing'}`);
      }
    }
    // Another note winning at the same board is a legitimate outcome only if it
    // is ALSO a video note — the corpus can hold two notes for one position.
    // Anything else means this note is unreachable.
    expect(silent, `video notes that never speak:\n${silent.join('\n')}`).toEqual([]);
  });
});

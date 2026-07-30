// The SECONDARY teaching-corpus gate. Same bar as the Danya corpus — legal
// (chess.js replays lineSan from the start, G3), anchored, sourced, original in
// register, bounded — because these notes reach the coach through the same
// grounding block and nothing about being a fallback tier lowers the standard.
//
// The depersonalization ban is per-creator: this corpus must not leak the
// second creator's name or medium either, since the app's voice is one voice.

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import teachings from './chessbrah-teachings.json';

interface Note {
  id: string;
  lineSan: string[];
  opening: string | null;
  phase: string;
  explains: string;
  teaches: string;
  plans: string;
  sources: string[];
}

const notes = (teachings as { notes: Note[] }).notes;

const BANNED = /\b(naroditsky|danya|aman|hambleton|chessbrah|eric hansen|building habits|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUMBER_PREFIX = /\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

describe('chessbrah-teachings corpus gate', () => {
  it('has notes', () => {
    expect(notes.length).toBeGreaterThan(0);
  });

  it('every position-keyed note replays legally from the start position (G3)', () => {
    for (const n of notes) {
      if (n.lineSan.length === 0) continue;
      const c = new Chess();
      for (const san of n.lineSan) {
        let ok = false;
        try { ok = !!c.move(san); } catch { ok = false; }
        expect(ok, `${n.id}: illegal move "${san}" in [${n.lineSan.join(' ')}]`).toBe(true);
      }
    }
  });

  it('every note is anchored: position-keyed or opening-named', () => {
    for (const n of notes) {
      expect(n.lineSan.length > 0 || !!n.opening, `${n.id}: unanchored note`).toBe(true);
    }
  });

  it('every note carries a yt: source', () => {
    for (const n of notes) {
      expect(n.sources.some((s) => /^yt:[\w-]{6,}$/.test(s)), `${n.id}: missing yt source`).toBe(true);
    }
  });

  it('prose is present, bounded, and free of attribution / medium leaks', () => {
    for (const n of notes) {
      expect(n.explains.trim().length, `${n.id}: empty explains`).toBeGreaterThan(0);
      expect(n.teaches.trim().length, `${n.id}: empty teaches`).toBeGreaterThan(0);
      expect(n.explains.length, `${n.id}: explains too long`).toBeLessThanOrEqual(600);
      expect(n.teaches.length, `${n.id}: teaches too long`).toBeLessThanOrEqual(400);
      expect((n.plans ?? '').length, `${n.id}: plans too long`).toBeLessThanOrEqual(400);
      for (const field of [n.explains, n.teaches, n.plans]) {
        expect(BANNED.test(field), `${n.id}: attribution/medium leak in "${field.slice(0, 60)}"`).toBe(false);
      }
    }
  });

  it('spoken prose carries no move-number prefixes (G9.4)', () => {
    for (const n of notes) {
      for (const field of [n.explains, n.teaches, n.plans]) {
        expect(MOVE_NUMBER_PREFIX.test(field), `${n.id}: move-number prefix in "${field.slice(0, 60)}"`).toBe(false);
      }
    }
  });

  it('phases are valid', () => {
    for (const n of notes) {
      expect(['opening', 'middlegame', 'endgame', 'concept']).toContain(n.phase);
    }
  });

  it('note ids do not collide with the primary corpus', async () => {
    const primary = (await import('./danya-teachings.json')) as unknown as { notes: Note[] };
    const primaryIds = new Set(primary.notes.map((n) => n.id));
    const collisions = notes.filter((n) => primaryIds.has(n.id)).map((n) => n.id);
    // Both corpora are deduped by id downstream (`seen` in the block builder),
    // so a shared id would silently drop one corpus's note.
    expect(collisions.slice(0, 5)).toEqual([]);
  });
});

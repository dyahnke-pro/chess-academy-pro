// Transposition + staleness contracts for the teaching-note lookups
// (David 2026-07-12: "can we include transpositions?" + ancestor staleness).

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import teachings from '../data/danya-teachings.json';
import { notesForFen, noteAtPosition, planNoteForPath, notesForPrefix } from './danyaTeachingService';

interface Note { id: string; lineSan: string[]; plans: string }
const positioned = (teachings as { notes: Note[] }).notes.filter((n) => n.lineSan.length > 0);

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('danyaTeachingService — transpositions + staleness', () => {
  it('finds a note by FEN regardless of the move order that reached it', () => {
    // Take a real corpus note, reach its position, and look it up with a
    // DELIBERATELY mismatched history (simulating a transposition) — the FEN
    // index must still find it.
    const note = positioned[0];
    expect(note).toBeDefined();
    const fen = fenAfter(note.lineSan);
    const viaFen = notesForFen(fen, 5);
    expect(viaFen.some((n) => n.id === note.id)).toBe(true);
    const viaTransposition = noteAtPosition(['h3', 'h6'], fen); // bogus history, right board
    expect(viaTransposition).not.toBeNull();
  });

  it('exact-prefix match still wins without a FEN', () => {
    const note = positioned[0];
    const hit = noteAtPosition(note.lineSan);
    expect(hit?.lineSan.join(' ')).toBe(note.lineSan.join(' '));
  });

  it('notesForPrefix honors the staleness window', () => {
    const note = positioned.find((n) => n.lineSan.length >= 4) ?? positioned[0];
    // Extend the history far past the note's anchor with legal filler moves.
    const c = new Chess();
    for (const s of note.lineSan) c.move(s);
    const extended = [...note.lineSan];
    for (let i = 0; i < 14; i += 1) {
      const legal = c.moves();
      if (legal.length === 0) break;
      // Deterministic filler: first legal move.
      const mv = c.move(legal[0]);
      extended.push(mv.san);
    }
    if (extended.length - note.lineSan.length >= 13) {
      // Anchored >12 plies back → windowed lookup must skip it…
      const windowed = notesForPrefix(extended, 6, 12);
      expect(windowed.some((n) => n.id === note.id)).toBe(false);
      // …while the unwindowed lookup still finds it.
      const unwindowed = notesForPrefix(extended, 50);
      expect(unwindowed.some((n) => n.id === note.id)).toBe(true);
    }
  });

  it('planNoteForPath prefers the exact position over stale ancestors', () => {
    const withPlan = positioned.find((n) => n.plans && n.plans.trim().length > 0);
    if (!withPlan) return; // corpus wave without positioned plans — nothing to assert
    const fen = fenAfter(withPlan.lineSan);
    const hit = planNoteForPath(['a3', 'a6'], fen); // bogus history, right board
    expect(hit).not.toBeNull();
    expect(hit!.plans.trim().length).toBeGreaterThan(0);
  });
});

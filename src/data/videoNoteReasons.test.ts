/**
 * videoNoteReasons — the reasons must SURVIVE THE BAKE, and must still be TRUE.
 *
 * The field was dropped for its entire life. 24 note files carried structured
 * reasons, `check-notes.mjs` verified every one against the board at authoring
 * time, and then `emit-notes.mjs` rebuilt each note without the field — so the
 * shipped corpus contained ZERO occurrences of "reasons" and `reasonCheck.ts`,
 * the module written to test them against a live board, had no runtime importer
 * at all. The multi-reason rule (David 2026-08-17) was therefore build-time
 * only: it proved the prose was true the day it was written and handed the app
 * nothing it could re-check.
 *
 * A DROPPED FIELD IS INVISIBLE. Nothing failed, no audit went red, every note
 * still spoke — it simply spoke unverifiable prose at every position that was
 * not its exact anchor. That is the failure mode this file exists to make loud.
 *
 * Two assertions, and the second is the one that matters:
 *   1. the field reaches the shipped corpus at all;
 *   2. every shipped reason STILL HOLDS on the board its own line produces.
 *
 * (2) is not redundant with the authoring check. A note's line can be edited, a
 * re-anchor can move it, a re-bake can pick up a changed track — and a reason
 * that was true in August is then false in the shipped file with nobody
 * looking. Re-checking here means a reason is true every time we build, not
 * once.
 */
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { checkReasons, type Reason } from '../services/reasonCheck';
import teachings from './video-teachings.json';

interface Note {
  id: string;
  lineSan: string[];
  reasons?: Reason[];
  options?: { san: string; reasons?: Reason[] }[];
  structural?: string;
}

const notes = (teachings as { notes: Note[] }).notes;
const withReasons = notes.filter((n) => (n.reasons?.length ?? 0) > 0);

describe('video note reasons', () => {
  it('reach the shipped corpus', () => {
    // A floor, not an equality: notes gain reasons as the backlog is written
    // down, and this may only ever go up.
    expect(withReasons.length).toBeGreaterThanOrEqual(44);
  });

  it('hold on the board their own line produces', () => {
    const broken: string[] = [];
    for (const note of withReasons) {
      const game = new Chess();
      let legal = true;
      for (const san of note.lineSan.slice(0, -1)) {
        try { game.move(san); } catch { legal = false; break; }
      }
      if (!legal) { broken.push(`${note.id}: line is not legal`); continue; }
      const san = note.lineSan[note.lineSan.length - 1];
      for (const v of checkReasons(game.fen(), san, note.reasons ?? [])) {
        if (!v.holds) broken.push(`${note.id} [${v.reason.kind}]: ${v.note}`);
      }
    }
    expect(broken).toEqual([]);
  });

  // ── EVERY NOTE DECLARES A SHAPE ─────────────────────────────────────────
  //
  // Retrofitting reasons onto the 27 notes that lacked them was the wrong
  // repair, and `move-facts` said so before a word was written: for most of
  // them the computed facts came back empty or unclaimed. Reading all 27 showed
  // why — they are COMPARISONS ("two bishop developments come into
  // consideration"), which assert nothing about the move they sit on. Adding a
  // reason there would make the checker pass on a claim nobody made.
  //
  // So a note declares one of three shapes and every one is verifiable:
  // `reasons` (claims about its move, re-checked above), `options` (the
  // candidate moves it compares, each legal here), or `structural` (a judgement
  // about the position, with the justification recorded). What is banned is the
  // fourth state — carrying none of them silently, which is where all 27 sat.
  it('every note declares reasons, options, or a structural judgement', () => {
    const undeclared = notes
      .filter((n) => !n.reasons?.length && !n.options?.length && !n.structural)
      .map((n) => n.id);
    expect(undeclared).toEqual([]);
  });

  it('every option is legal at the note position', () => {
    const bad: string[] = [];
    for (const note of notes.filter((n) => n.options?.length)) {
      const game = new Chess();
      try { for (const san of note.lineSan) game.move(san); } catch {
        bad.push(`${note.id}: line is not legal`); continue;
      }
      // A fork is only teaching if the moves it names can actually be played —
      // "here are three other tries" is a claim about the board, so it is
      // checked like one.
      for (const o of note.options ?? []) {
        const probe = new Chess(game.fen());
        try { probe.move(o.san); } catch { bad.push(`${note.id}: ${o.san} is not legal here`); }
      }
      if ((note.options?.length ?? 0) < 2) bad.push(`${note.id}: a fork needs at least two options`);
    }
    expect(bad).toEqual([]);
  });

  // ── AN OPTION'S OWN REASONS ──────────────────────────────────────────────
  //
  // A fork note's prose is about the CHOICE, not about the move it sits on —
  // which is why these notes carry no reasons of their own. The reasoning that
  // belongs to them is what each candidate DOES: "Bb5 hits the knight that
  // holds the centre" is the teaching a bare list of SANs is missing.
  //
  // Verified at the FORK position, not at the note's own — the option has not
  // been played, so its claims are about the board the student is choosing
  // from. That is the same rule as everywhere else, applied one ply forward.
  it('every option reason holds at the fork position', () => {
    const broken: string[] = [];
    for (const note of notes.filter((n) => n.options?.some((o) => o.reasons?.length))) {
      const game = new Chess();
      try { for (const san of note.lineSan) game.move(san); } catch {
        broken.push(`${note.id}: line is not legal`); continue;
      }
      for (const o of note.options ?? []) {
        if (!o.reasons?.length) continue;
        for (const v of checkReasons(game.fen(), o.san, o.reasons)) {
          if (!v.holds) broken.push(`${note.id} [${o.san} ${v.reason.kind}]: ${v.note}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('name only kinds reasonCheck can verify', () => {
    const KINDS = new Set([
      'attacks', 'defends', 'controls', 'deprives',
      'prevents', 'meets', 'blocks', 'opens', 'traps',
    ]);
    const unknown = withReasons
      .flatMap((n) => (n.reasons ?? []).map((r) => ({ id: n.id, kind: r.kind })))
      .filter((r) => !KINDS.has(r.kind));
    // An uncheckable claim is exactly the kind that slips through — the whole
    // reason the type is a closed union rather than a free string.
    expect(unknown).toEqual([]);
  });
});

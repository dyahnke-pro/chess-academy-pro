// noteAnchorOverrides — apply the derived anchors at load, in ONE place.
//
// 88% of the farmed teaching (51,356 of 58,124 notes) carries no position, and
// selection requires one: a note is chosen for a ply only when its own taught
// line PRODUCES that ply's position. So most of the corpus was unreachable —
// not refused, just invisible.
//
// `scripts/derive-note-anchors.mjs` recovers the position from the note's OWN
// PROSE, which frequently names the line the distiller failed to record
// ("In the Traxler Counterattack, after e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5, the
// natural Nxf7?…" on a note anchored four plies in). Read that script's header
// before changing anything here — in particular for why the note's `opening`
// TAG is NOT a usable anchor, which is the trap this work fell into first.
//
// This module exists so the sidecar is applied identically to the primary
// corpus and to every secondary one. Applying it in two places would be two
// rules, and the second would drift.
//
// WHAT THIS DOES NOT DO: it does not change how notes are SELECTED. A note with
// a derived anchor faces every filter an authored one faces — the ≥3-ply
// minimum, phase match, opening-conflict, scope, board grading. This grows the
// pool of notes that HAVE a position; it adds no new way to reach one.
import anchorData from '../data/note-anchors.json';
import type { DanyaNote } from './danyaTeachingService';

const DERIVED: Record<string, string[]> = (anchorData as { anchors: Record<string, string[]> }).anchors;

/**
 * Return `notes` with derived anchors applied. Notes without a derived anchor
 * pass through by identity.
 *
 * A derived anchor REPLACES a recorded one when it is deeper, which is the
 * point: the recorded value is a truncation of the same line (198 of the 1,203
 * cases). It is never applied to shorten an anchor — the derivation only emits
 * a line longer than what was recorded.
 */
export function applyDerivedAnchors(notes: DanyaNote[]): DanyaNote[] {
  let hits = 0;
  let overlaps = 0; // notes this corpus shares with the sidecar
  const out = notes.map((n) => {
    const line = DERIVED[n.id];
    if (line) overlaps += 1;
    if (!line || line.length <= (n.lineSan?.length ?? 0)) return n;
    hits += 1;
    return { ...n, lineSan: line };
  });
  // Cheap, and it makes a silently-empty sidecar visible. A corpus whose ids
  // stopped matching the sidecar (a re-farm that RENUMBERED notes) would
  // otherwise look exactly like "no derivation needed".
  //
  // 🔒 Only a corpus that OVERLAPS the sidecar can be stale (David 2026-08-26):
  // the sidecar is scanned from four corpora, so a corpus it never covered
  // (voiced, gothamchess, …) legitimately gets zero hits — that is "not
  // covered", not "renumbered", and must not read as a stale sidecar.
  if (hits === 0 && overlaps > 0 && Object.keys(DERIVED).length > 0) {
    lastMissReported ||= true;
  }
  return out;
}

/** True when a corpus was loaded and NOT ONE derived anchor matched — the
 *  signature of a re-farm that renumbered note ids while the sidecar went
 *  stale. `noteAnchorDerivation.test.ts` asserts this stays false. */
let lastMissReported = false;
export const derivedAnchorsWentUnmatched = (): boolean => lastMissReported;

/** The derived anchor for a note id, or undefined. For the gate. */
export const derivedAnchorFor = (id: string): string[] | undefined => DERIVED[id];

/** Every derived anchor, for the gate to re-verify. */
export const allDerivedAnchors = (): Record<string, string[]> => DERIVED;

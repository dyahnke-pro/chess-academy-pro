// The masterclass beats, reachable from a live game.
//
// David 2026-08-08: "Don't we have coverage on the copycat lines? What do the
// opening tabs have to say about it? Don't we pull narrations from there if
// corpus is empty?" We did not — this is the wire, and these are its proofs.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { curatedBeatAt, curatedBeatStats, warmCuratedBeatIndex, warmCuratedBeatIndexSync } from './curatedBeatSource';

const walk = (sans: string[]) => {
  const chess = new Chess();
  const out: Array<{ prefix: string[]; fen: string; san: string }> = [];
  const prefix: string[] = [];
  for (const san of sans) { chess.move(san); prefix.push(san); out.push({ prefix: [...prefix], fen: chess.fen(), san }); }
  return out;
};

describe('curatedBeatAt', () => {
  // The index is built OFF the critical path in the app (5.0s of chess.js).
  // Tests take the synchronous path so every case sees a complete index.
  beforeAll(() => { warmCuratedBeatIndexSync(); }, 60_000);

  it('THE REGRESSION: the Copycat speaks on the ply that was silent', () => {
    // `viennaVariations.ts` teaches this exact position and the live game
    // could not see it. Move 4 of the Copycat was silent in a ply-by-ply walk.
    const line = ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4'];
    const chess = new Chess();
    for (const san of line) chess.move(san);
    const beat = curatedBeatAt(line, chess.fen());
    expect(beat, 'no curated beat at the Copycat position').toBeTruthy();
    expect(beat!.text.toLowerCase()).toContain('copycat');
  });

  it('teaches across a whole Copycat game, not just one ply', () => {
    const seen = new Set<string>();
    let taught = 0;
    for (const { prefix, fen } of walk(['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4', 'Qf6', 'Nd5'])) {
      const beat = curatedBeatAt(prefix, fen, seen);
      if (beat) { seen.add(beat.id); taught += 1; }
    }
    expect(taught, 'the Copycat taught nothing across the line').toBeGreaterThan(1);
  });

  it('finds a beat through a TRANSPOSITION, not just the authored move order', () => {
    // The index is keyed by position, so a student who reaches the same board
    // by another order still gets the teaching.
    const authored = ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4'];
    const transposed = ['e4', 'e5', 'Bc4', 'Bc5', 'Nc3', 'Nc6', 'Qg4'];
    const a = new Chess(); for (const s of authored) a.move(s);
    const b = new Chess(); for (const s of transposed) b.move(s);
    expect(b.fen().split(' ').slice(0, 4)).toEqual(a.fen().split(' ').slice(0, 4));
    expect(curatedBeatAt(transposed, b.fen())).toBeTruthy();
  });

  it('says nothing on a position no lesson teaches', () => {
    const chess = new Chess();
    for (const san of ['a3', 'a6', 'h3', 'h6', 'a4', 'a5']) chess.move(san);
    expect(curatedBeatAt(['a3', 'a6', 'h3', 'h6', 'a4', 'a5'], chess.fen())).toBeNull();
  });

  it('never repeats a beat the game already spoke', () => {
    const line = ['e4', 'e5', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'Qg4'];
    const chess = new Chess();
    for (const san of line) chess.move(san);
    const first = curatedBeatAt(line, chess.fen());
    expect(first).toBeTruthy();
    expect(curatedBeatAt(line, chess.fen(), new Set([first!.id]))).toBeNull();
  });

  it('THE SECOND REGRESSION: a shared-prefix beat does not teach another opening', () => {
    // Wiring beats in, ply 2 of EVERY 1.e4 e5 line spoke the Ruy's opening
    // beat: "Today we study the oldest opening still played at the very top —
    // the Ruy Lopez, written down by a Spanish priest in 1561." After `e4 e5`
    // the board is consistent with the Ruy, the Italian, the Vienna and the
    // Scotch alike, so the position cannot separate them — only depth and the
    // lesson's own opening can.
    const chess = new Chess();
    for (const san of ['e4', 'e5']) chess.move(san);
    expect(curatedBeatAt(['e4', 'e5'], chess.fen(), undefined, 'Vienna Game')).toBeNull();
  });

  it('refuses a beat whose lesson teaches a DIFFERENT opening', () => {
    // The Ruy's own deep beats are real teaching — in a Ruy. Walking a Vienna,
    // nothing the coach says may come from the Ruy Lopez lesson.
    const line = ['e4', 'e5', 'Nc3', 'Nf6', 'Bc4', 'Nc6'];
    const chess = new Chess();
    const prefix: string[] = [];
    const seen = new Set<string>();
    for (const san of line) {
      chess.move(san);
      prefix.push(san);
      const beat = curatedBeatAt([...prefix], chess.fen(), seen, 'Vienna Game');
      if (!beat) continue;
      seen.add(beat.id);
      expect(beat.id.toLowerCase(), `${beat.id} taught inside a Vienna`).not.toContain('ruy');
      expect(beat.text.toLowerCase()).not.toContain('spanish priest');
    }
  });

  it('never narrates lesson scaffolding over a live game', () => {
    // "Welcome. Today we study…" is written for the start of a class. Heard
    // over move four of somebody's game it is nonsense.
    const chess = new Chess();
    const prefix: string[] = [];
    const seen = new Set<string>();
    for (const san of ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4']) {
      chess.move(san);
      prefix.push(san);
      const beat = curatedBeatAt([...prefix], chess.fen(), seen, 'Vienna Game');
      if (!beat) continue;
      seen.add(beat.id);
      expect(beat.text.toLowerCase()).not.toMatch(/^welcome\b|today we (?:study|look at|learn)/);
    }
  });

  it('indexes the whole masterclass, and the floor only goes up', () => {
    const { beats, positions } = curatedBeatStats();
    expect(beats).toBeGreaterThanOrEqual(1600);
    expect(positions).toBeGreaterThanOrEqual(1400);
  });
});

describe('the chunked warm', () => {
  it('reaches the same index as a single pass', async () => {
    // The whole risk of the chunked pattern is the cursor: two entry points
    // walking one cursor can double-index or skip. The prewarm ran (sync) in
    // beforeAll; the async warm must find nothing left to do and change
    // nothing — that is what "safe to race a lookup" actually means.
    const before = curatedBeatStats();
    expect(before.built).toBe(true);
    await warmCuratedBeatIndex();
    expect(curatedBeatStats()).toEqual(before);
  }, 60_000);
});

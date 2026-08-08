// Every line in the shipped bake still has to pass the gate that let it in.
//
// THE 2026-08-08 CONTAMINATION — why this file exists. The first bake's prompt
// showed the model two fully-written example rewrites. 342 notes came back
// echoing them: 68 sharing "the rest of the army", 65 opening "the bishop hits
// queen and knight at once". A Philidor prophylaxis note (dt-sw) and a Czech
// Benoni pawn-break note (hp-1tl) both came back as skewer prose — my own
// exemplar, reflected off the model, about to be spoken to a student as corpus
// teaching. The skewer note I had earlier taken as proof the tactical lane
// worked was the same echo.
//
// The offline gate never looked, for two reasons, and both are now closed in
// `scripts/bake-spoken-notes.mjs`:
//   1. `longestSharedRun` compared the output only against the SOURCE NOTE, so
//      a phrase lifted from the PROMPT was invisible to it.
//   2. Nothing checked that the rewrite was about the same chess as the note.
//
// The gate is only worth what it is RUN against. A bake is committed data, so
// the file that ships can drift from the gate that produced it — an edit, a
// merge, a shard resumed from a pre-fix output. This test re-runs the real gate
// over the real committed bake, which is the only check that stays true.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The gate itself, imported from the bake script — never a reimplementation.
// A copy would drift from the thing it is meant to pin.
import { gateSpoken, fidelityBreach } from '../../scripts/bake-spoken-notes.mjs';

const ROOT = resolve(__dirname, '../..');
const read = (rel: string) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));

interface Baked { spoken?: string; kind?: string; unspeakable?: string }

const CORPORA = [
  'src/data/danya-teachings.json',
  'src/data/chessbrah-teachings.json',
  'public/data/hangingpawns-teachings.json',
  'public/data/saintlouis-teachings.json',
];

const sources = (): Map<string, string> => {
  const out = new Map<string, string>();
  for (const rel of CORPORA) {
    const raw = read(rel);
    for (const n of (Array.isArray(raw) ? raw : raw.notes) as Array<{ id: string; explains?: string }>) {
      if (n.explains) out.set(n.id, n.explains);
    }
  }
  return out;
};

describe('the shipped bake', () => {
  const bake = read('public/data/corpus-spoken.json') as Record<string, Baked>;
  const src = sources();

  it('every baked line still passes the gate that admitted it', () => {
    const failures: string[] = [];
    for (const [id, entry] of Object.entries(bake)) {
      if (!entry.spoken) continue;
      const source = src.get(id);
      if (!source) continue;                    // note dropped from the corpus; harmless
      const reason = gateSpoken(source, entry.spoken, entry.kind ?? 'floating');
      if (reason) failures.push(`${id}: ${reason}`);
    }
    // Zero, not a baseline. A line that fails the gate is one the coach speaks
    // and should not; there is no acceptable count of those.
    expect(failures.slice(0, 20)).toEqual([]);
  }, 120_000);

  it('THE REGRESSION: no baked line is about different chess than its note', () => {
    // dt-sw is the case, kept by id: a note about meeting ...c6 with a4 in the
    // Philidor, which the first bake returned as bishop-queen-knight-rook-skewer
    // prose. Fluent, internally consistent, and true of somebody else's board —
    // the same lie the position-selection rule exists to prevent.
    const philidor = src.get('dt-sw');
    expect(philidor).toBeDefined();
    expect(fidelityBreach(
      philidor as string,
      'The bishop attacks queen and knight together. When the queen steps away to shield the knight, the rook slides behind her, and the skewer wins material.',
    )).toMatch(/different subject/);

    // …and what actually shipped for it teaches the note's own idea.
    expect(fidelityBreach(philidor as string, bake['dt-sw']?.spoken ?? '')).toBeNull();
  });

  it('a faithful reword is NOT flagged, however differently it is worded', () => {
    // The guard has to survive the thing it looks most like. This rewrite shares
    // almost no wording with its source and is completely faithful.
    expect(fidelityBreach(
      'Moving the queen to a5 to regain the pawn immediately gives White tempi and neglects development.',
      'Sending the queen out to grab the pawn back hands the attacker free tempi and falls behind in development.',
    )).toBeNull();
  });

  it('a short line is never judged on too little evidence', () => {
    // Psychology notes carry one or two chess words, so a "foreign term" ratio
    // over them is noise. Under three asserted terms the check abstains rather
    // than guessing — a guard that guesses is worse than one that admits scope.
    expect(fidelityBreach(
      'Players at this level find good moves but collapse facing several threats at once.',
      'The mind handles one threat, but three or four at once turn it to mush.',
    )).toBeNull();
  });

  it('no baked line echoes a retired prompt exemplar', () => {
    // Kept as its own assertion because it is the failure that actually shipped,
    // and it is invisible to every board-truth check: the sentence is true
    // chess, just not this note's chess.
    const echoes = Object.entries(bake).filter(([, e]) =>
      /the rest of the army|hits queen and knight at once|rook lines up behind her|a gift, not a debt/i
        .test(e.spoken ?? ''));
    expect(echoes.map(([id]) => id)).toEqual([]);
  });
});

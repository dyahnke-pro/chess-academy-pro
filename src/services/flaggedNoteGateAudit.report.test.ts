// What the app ACTUALLY does with the notes the sweep condemned.
//
// David 2026-08-14: "run the 756 through the new gate pipeline." The sweep's
// verdict came from a script that re-implements the claim check. That is one
// step removed from the truth, and being one step removed is exactly how the
// first pass condemned 323 notes that were fine. So this runs them through
// `gradeNarrationText` — the real gate, the one that decides what a student
// hears — and reports what SURVIVES rather than what a script predicts.
//
// The distinction that matters, and that a strip/keep decision turns on:
//
//   GUTTED    every sentence disproven; the gate returns nothing. The note is
//             already silent at this position today. Stripping its lineSan
//             costs nothing and frees the exact-position slot it currently
//             occupies (noteAtPosition returns ONE note per ply, so a note
//             that wins the slot and then says nothing silences that ply).
//   PARTIAL   some sentences drop, some survive. Stripping is a REAL LOSS —
//             the student is hearing the surviving half right now.
//   INTACT    the gate takes nothing. The sweep was wrong about this note and
//             it must not be touched.
//
// Reports, never asserts. This is an instrument for a decision, not a gate.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { gradeNarrationText } from './coachAnswerGates';
import type { DanyaNote } from './danyaTeachingService';

interface Corpus { notes: DanyaNote[] }

const CORPORA: Array<[string, string, string]> = [
  ['naroditsky', 'src/data/danya-teachings.json', 'audit-reports/naroditsky-anchor/report.json'],
  ['chessbrah', 'src/data/chessbrah-teachings.json', 'audit-reports/chessbrah-anchor/report.json'],
  ['hangingpawns', 'public/data/hangingpawns-teachings.json', 'audit-reports/hangingpawns-anchor/report.json'],
  ['saintlouis', 'public/data/saintlouis-teachings.json', 'audit-reports/saintlouis-anchor/report.json'],
  ['hikaru', 'public/data/hikaru-teachings.json', 'audit-reports/hikaru-anchor/report.json'],
];

/** The FEN a note is filed at, or null when its line will not replay. */
function fenOf(lineSan: string[]): string | null {
  const b = new Chess();
  for (const san of lineSan) {
    try { b.move(san); } catch { return null; }
  }
  return b.fen();
}

const proseOf = (n: DanyaNote): string =>
  [n.explains, n.teaches, n.plans].filter(Boolean).join(' ').trim();

describe('flagged notes — what the real gate does with them', () => {
  beforeAll(() => {
    loadFullCorpus();
  }, 120_000);

  it('grades every flagged positioned note and writes the report', () => {
    const tally = { judged: 0, intact: 0, partial: 0, gutted: 0, unreplayable: 0, empty: 0 };
    const perCorpus: Record<string, { judged: number; intact: number; partial: number; gutted: number }> = {};
    const samples: Array<{ verdict: string; id: string; before: string; after: string }> = [];

    for (const [key, corpusPath, reportPath] of CORPORA) {
      let corpus: Corpus;
      let report: { results: Array<{ id: string; was: number; outcome: string }> };
      try {
        corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as Corpus;
        report = JSON.parse(readFileSync(reportPath, 'utf8'));
      } catch {
        continue; // farm-time artefact absent on this clone
      }
      const flagged = new Set(
        report.results.filter((r) => r.was > 0 && r.outcome !== 'anchored').map((r) => r.id),
      );
      perCorpus[key] = { judged: 0, intact: 0, partial: 0, gutted: 0 };

      for (const n of corpus.notes) {
        if (!flagged.has(n.id) || !n.lineSan?.length) continue;
        const prose = proseOf(n);
        if (!prose) { tally.empty += 1; continue; }
        const fen = fenOf(n.lineSan);
        if (!fen) { tally.unreplayable += 1; continue; }

        // THE REAL GATE. Same call the walkthrough splice makes.
        const graded = (gradeNarrationText(prose, fen, 'flaggedNoteGateAudit') ?? '').trim();

        tally.judged += 1;
        perCorpus[key].judged += 1;
        let verdict: 'intact' | 'partial' | 'gutted';
        if (graded.length === 0) verdict = 'gutted';
        else if (graded.length === prose.length) verdict = 'intact';
        else verdict = 'partial';
        tally[verdict] += 1;
        perCorpus[key][verdict] += 1;

        if (samples.length < 12 && verdict !== 'intact') {
          samples.push({
            verdict,
            id: n.id,
            before: prose.slice(0, 190),
            after: graded.slice(0, 190) || '(nothing survives)',
          });
        }
      }
    }

    const pct = (n: number): number => (tally.judged === 0 ? 0 : Number((n / tally.judged).toFixed(4)));
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'Of the notes the sweep flagged, what does gradeNarrationText actually leave for the student?',
      gate: 'coachAnswerGates.gradeNarrationText (board claims + material direction)',
      judged: tally.judged,
      intact: tally.intact,
      partial: tally.partial,
      gutted: tally.gutted,
      unreplayable: tally.unreplayable,
      emptyProse: tally.empty,
      shareGutted: pct(tally.gutted),
      sharePartial: pct(tally.partial),
      shareIntact: pct(tally.intact),
      /** Safe to strip: already silent at this position, and the slot it holds
       *  is denied to every other candidate at that ply. */
      strippingCostsNothing: tally.gutted,
      /** Stripping these REMOVES teaching the student hears today. */
      strippingLosesTeaching: tally.partial + tally.intact,
      perCorpus,
      samples,
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/flagged-note-gate.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, samples: `${samples.length} in the report file` }, null, 2));
  }, 900_000);
});

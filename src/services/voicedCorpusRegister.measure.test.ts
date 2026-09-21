// C15 / #22 — WHAT REGISTER IS THE VOICED CORPUS ACTUALLY IN? (2026-09-20)
//
// The board carries this as "1,146 he/his, 521 first-person, 81 fragments" and
// no diagnosis. Those are RAW STRING COUNTS over the prose; they are not the
// question the app asks. The app asks whether a note is safe to speak onto a
// LIVE board, and the thing that answers it is `beatRegister` — which
// CLASSIFIES the source and deliberately never rewrites it, because turning
// "White does" into "you does" is the obvious wrong answer (English verb
// agreement; CLAUDE.md is explicit).
//
// So this measures the corpus THROUGH THE REAL CLASSIFIER, per seat, per prose
// field, and writes the distribution. It is a MEASUREMENT, not a gate: the only
// assertions are non-vacuity. Pinning a live-safe RATE would gate in whatever
// the corpus happens to be tonight.
//
// Deliberately NOT here: any substitution table. The closeable half is
// classification and coverage; a rewrite is an offline bake (BACKLOG §4.6).
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { beatRegister } from './curatedBeatSource';

interface VoicedNote {
  id: string;
  explains?: string;
  teaches?: string;
  plans?: string;
  studentSide?: 'white' | 'black' | null;
}

const FIELDS = ['explains', 'teaches', 'plans'] as const;

describe('C15 — the voiced corpus, measured through the register classifier', () => {
  it('classifies every voiced note per field and records the distribution', () => {
    const raw = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as { notes: VoicedNote[] };
    const notes = raw.notes ?? [];
    expect(notes.length, 'voiced corpus did not load — every number below would be vacuous').toBeGreaterThan(1000);

    let withSeat = 0, noSeat = 0;
    const perField: Record<string, { total: number; spectator: number; liveSafe: number }> = {};
    const spectatorExamples: { id: string; field: string; seat: string; text: string }[] = [];
    // Raw string counts too, so the board's own numbers can be reconciled
    // against the classifier's rather than compared to a different question.
    let heHis = 0, firstPerson = 0, fragments = 0, proseUnits = 0;

    for (const n of notes) {
      const seat = n.studentSide === 'white' || n.studentSide === 'black' ? n.studentSide : null;
      if (seat) withSeat++; else noSeat++;
      for (const f of FIELDS) {
        const text = (n[f] ?? '').trim();
        if (!text) continue;
        proseUnits++;
        if (/\b(he|his|him)\b/i.test(text)) heHis++;
        if (/\b(I|I'm|I'll|my|we|our|us)\b/.test(text)) firstPerson++;
        if (!/[.!?]["')\]]?$/.test(text)) fragments++;
        if (!seat) continue;                 // the classifier REQUIRES a seat
        perField[f] ??= { total: 0, spectator: 0, liveSafe: 0 };
        perField[f].total++;
        if (beatRegister(text, seat) === 'spectator') {
          perField[f].spectator++;
          if (spectatorExamples.length < 12) spectatorExamples.push({ id: n.id, field: f, seat, text: text.slice(0, 160) });
        } else perField[f].liveSafe++;
      }
    }

    const total = Object.values(perField).reduce((a, b) => a + b.total, 0);
    const liveSafe = Object.values(perField).reduce((a, b) => a + b.liveSafe, 0);
    expect(total, 'no note carried a seat — the classifier never ran').toBeGreaterThan(0);

    const report = {
      measuredAt: new Date().toISOString(),
      notes: notes.length,
      notesWithSeat: withSeat,
      notesWithoutSeat: noSeat,
      proseUnits,
      classified: total,
      liveSafe,
      spectator: total - liveSafe,
      liveSafePct: Math.round((liveSafe / total) * 1000) / 10,
      perField,
      rawStringCounts: { heHis, firstPerson, fragments },
      spectatorExamples,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/voiced-register.json', JSON.stringify(report, null, 2));

    console.log(`[C15] ${notes.length} notes, ${proseUnits} prose units, ${withSeat} carry a seat (${noSeat} do not)`);
    console.log(`[C15] through beatRegister: ${liveSafe}/${total} LIVE-SAFE (${report.liveSafePct}%), ${total - liveSafe} spectator`);
    for (const [f, v] of Object.entries(perField)) console.log(`   ${f.padEnd(9)} ${v.liveSafe}/${v.total} live-safe`);
    console.log(`[C15] raw string counts (the board's numbers): he/his=${heHis} first-person=${firstPerson} fragments=${fragments}`);
    for (const e of spectatorExamples.slice(0, 5)) console.log(`   spectator [${e.seat}] ${e.field}: ${e.text}`);
  });
});

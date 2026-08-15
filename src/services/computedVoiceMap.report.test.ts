// THE MAP of the computed voice — every clause it can emit, measured.
//
// David 2026-08-15: "Did you map the computations?" The honest answer was no:
// the previous map was written by READING the fact computers, which says what
// they are capable of and nothing about what they do. A computer that cannot
// fire on any real position is dead code wearing a feature's name, and reading
// it will never tell you that.
//
// So this walks every line in the repertoire through the same call the
// walkthrough makes, classifies each emitted clause by its shape, and counts.
// The output is the map: what the voice says, how often, and what never fires.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { assembleMovePurpose } from './groundedAnswer';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { detectOpening } from './openingDetectionService';
import { gradeNarrationText } from './coachAnswerGates';

interface Entry { name?: string; pgn?: string }
const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** Every clause SHAPE the computers can produce, matched against real output.
 *  The patterns are deliberately anchored to the wording in the source so a
 *  clause that gets rephrased shows up here as an unclassified line rather
 *  than silently merging into another bucket. */
const SHAPES: Array<[string, RegExp]> = [
  ['castling', /castles (kingside|queenside)/],
  ['sacrifice', /sacrifices itself/],
  ['capture (defended)', /captures on [a-h][1-8], taking a \w+\.$/m],
  ['capture (unanswered)', /that nothing recaptures/],
  ['geometry: fork', /forks the/],
  ['geometry: pin', /pins the/],
  ['geometry: wins', /wins the \w+ on/],
  ['geometry: attacks', /attacks the \w+ on/],
  ['gives check', /gives check/],
  ['pawn: centre', /staking out space in the cent/],
  ['pawn: wing', /grabbing space on the (kingside|queenside)/],
  ['develops + eyes centre', /develops to [a-h][1-8], eyeing/],
  ['develops (plain)', /develops to [a-h][1-8]\./],
  ['outpost (piece)', /It's an outpost on/],
  ['tactic created', /The point:/],
  ['structure: passed pawn', /creates a passed pawn/],
  ['structure: file opens', /-file opens/],
  ['structure: half-open', /half-open [a-h]-file/],
  ['structure: outpost', /as an outpost/],
  ['structure: doubled (theirs)', /is left with doubled pawns/],
  ['structure: doubled (ours)', /The cost is doubled pawns/],
  ['structure: isolated', /is isolated now/],
  ['structure: king shield', /loses a pawn from its shield/],
  ['structure: endgame arrives', /This is an endgame now/],
  ['structure: queens off', /With the queens off/],
  ['plan (engine PV)', /The plan is to follow with/],
  ['assessment (eval)', /^(White|Black) is /m],
  ['opening named', /^This is the .+\./m],
];

describe('computed voice map', () => {
  beforeAll(() => { /* no corpus needed — every computer here is board-only */ });

  it('counts every clause the voice can emit across the whole repertoire', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const counts = new Map<string, number>();
    const examples = new Map<string, string>();
    const unclassified: string[] = [];
    let plies = 0;
    let spoke = 0;
    let refusedByGate = 0;

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];

      for (const san of sans) {
        const fenBefore = board.fen();
        const moverColor: 'white' | 'black' = board.turn() === 'w' ? 'white' : 'black';
        try { board.move(san); } catch { break; }
        history.push(san);
        plies += 1;
        const side = moverColor === 'white' ? 'w' : 'b';

        let tactics = null;
        try {
          const after = buildTacticsLiveContext(board.fen(), null, side, 1500);
          const before = buildTacticsLiveContext(fenBefore, null, side, 1500);
          const was = new Set([...before.immediate, ...before.opportunities].map((t) => t.description));
          tactics = {
            ...after,
            immediate: after.immediate.filter((t) => !was.has(t.description)),
            opportunities: after.opportunities.filter((t) => !was.has(t.description)),
          };
        } catch { /* board-only fallback */ }

        const purpose = assembleMovePurpose({ fenBefore, san, moverColor, tactics });
        if (!purpose?.facts) continue;
        const graded = gradeNarrationText(purpose.facts, board.fen(), 'voiceMap');
        if (!graded?.trim()) { refusedByGate += 1; continue; }
        spoke += 1;

        // The opening name is added by the generator, not the computer, so it
        // is reproduced here to map the voice the student actually hears.
        let named = '';
        try {
          const now = detectOpening(history)?.name ?? null;
          const prev = history.length === 1
            ? null
            : detectOpening(history.slice(0, -1))?.name ?? null;
          if (now && now !== prev) named = `This is the ${now}. `;
        } catch { /* naming is a bonus */ }
        const full = `${named}${graded}`;

        for (const clause of full.split(/(?<=[.!?])\s+/)) {
          const text = clause.trim();
          if (!text) continue;
          const hit = SHAPES.find(([, re]) => re.test(text));
          if (!hit) { unclassified.push(text); continue; }
          counts.set(hit[0], (counts.get(hit[0]) ?? 0) + 1);
          if (!examples.has(hit[0])) examples.set(hit[0], text);
        }
      }
    }

    const rows = SHAPES.map(([name]) => ({
      clause: name,
      fired: counts.get(name) ?? 0,
      example: examples.get(name) ?? null,
    })).sort((a, b) => b.fired - a.fired);

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'Which computed clauses actually fire, and how often?',
      pliesWalked: plies,
      pliesThatSpoke: spoke,
      refusedByBoardGate: refusedByGate,
      /** A clause with 0 here is a computer that never fires on any line the
       *  app teaches — dead in practice, whatever the code can do. */
      clauses: rows,
      neverFires: rows.filter((r) => r.fired === 0).map((r) => r.clause),
      unclassifiedSample: [...new Set(unclassified)].slice(0, 15),
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/computed-voice-map.json', JSON.stringify(report, null, 2));
    console.log(`plies ${plies} | spoke ${spoke} | refused ${refusedByGate}\n`);
    for (const r of rows) {
      console.log(`${String(r.fired).padStart(6)}  ${r.clause.padEnd(28)} ${r.example ? `e.g. ${r.example.slice(0, 76)}` : '— NEVER FIRES'}`);
    }
    if (report.unclassifiedSample.length) {
      console.log('\nunclassified:');
      for (const u of report.unclassifiedSample) console.log(`  ${u.slice(0, 100)}`);
    }
  }, 900_000);
});

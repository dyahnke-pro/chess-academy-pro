// noteFilterFunnel — WHY the corpus goes quiet, attributed to a specific filter.
//
// David 2026-08-14: "I never hear the corpus fire." Coverage measurement said
// 17.3% of teach-path plies get a note against a 90.5% ceiling if scoping were
// dropped — so ~73 points are burned by the eight filters inside
// `noteAtPosition.onThisLine`. Which ones, and where, was unknown: the coverage
// report counts OUTCOMES, not causes, and "it's the filters" is a theory until
// a filter has a number next to it.
//
// This walks the same 1,310 plies of `repertoire.json` the coverage report uses
// (so the two are directly comparable), and at every ply asks:
//   - how many notes does RETRIEVAL offer for this board at all?
//   - of those, which exported filter rejects them, and how many?
//   - how many survive every exported filter yet still are not selected?
//     (that residue is attributable to the three module-private filters —
//     anchorTeachesItsPosition, noteContradictsLine, notePhaseMismatchesBoard —
//     and is reported as such rather than silently folded into "other")
//
// A filter's rejection count is NOT by itself a verdict. Every one of these
// exists because it caught a real defect (see noteAnchorIntegrity). The point
// is to know the PRICE of each, so a conversation about relaxing one is held
// over data instead of intuition.
//
// Reports, never asserts a threshold: this is an instrument, and a gate that
// fails when teaching coverage changes would just get baselined away.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import {
  noteAtPosition,
  notesForPrefix,
  notesForFen,
  noteOpeningConflicts,
  type DanyaNote,
} from './danyaTeachingService';
import { secondaryNotesForPosition, secondaryNotesForFen } from './secondaryCorpora';
import {
  noteDescribesPosition,
  noteTeachesChessNotItsSource,
  noteStaysInScope,
} from './noteAnchorIntegrity';

interface RepertoireEntry { name?: string; pgn?: string }

const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** Phase by ply, matching how a student experiences a game rather than any
 *  engine definition — the question is "when does it go quiet on me". */
const phaseOfPly = (ply: number): 'opening' | 'middlegame' | 'endgame' =>
  ply <= 20 ? 'opening' : ply <= 60 ? 'middlegame' : 'endgame';

describe('note filter funnel — where candidate notes die', () => {
  beforeAll(() => {
    // Synchronous: reads the fetched corpora from disk and primes the same
    // cache the browser loader fills. Without it this measures 19.6% of the data.
    loadFullCorpus();
  }, 120_000);

  it('attributes every rejection to a named filter and writes the report', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | RepertoireEntry[]
      | Record<string, RepertoireEntry[]>;
    const entries: RepertoireEntry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const tally = {
      plies: 0,
      pliesWithAnyCandidate: 0,
      pliesWithSelection: 0,
      candidatesSeen: 0,
      rejected: {
        noteDescribesPosition: 0,
        noteTeachesChessNotItsSource: 0,
        noteStaysInScope: 0,
        noteOpeningConflicts: 0,
        /** Survived every filter this harness can call, yet the note was still
         *  not the one selected — the three private filters plus the
         *  single-winner rule (noteAtPosition returns ONE note per ply). */
        survivedExportedFiltersButUnselected: 0,
      },
    };
    const byPhase: Record<string, { plies: number; withCandidate: number; selected: number }> = {
      opening: { plies: 0, withCandidate: 0, selected: 0 },
      middlegame: { plies: 0, withCandidate: 0, selected: 0 },
      endgame: { plies: 0, withCandidate: 0, selected: 0 },
    };
    const blankFilterTally = {
      noteDescribesPosition: 0,
      noteTeachesChessNotItsSource: 0,
      noteStaysInScope: 0,
      noteOpeningConflicts: 0,
      survivedExportedFiltersButUnselected: 0,
    };
    /** Plies that went silent, blamed on the filter that rejected EVERY
     *  candidate there ('mixed' when no single filter accounts for all). */
    const silencedBy: Record<string, number> = {};
    const silencedByPhase: Record<string, Record<string, number>> = {
      opening: {}, middlegame: {}, endgame: {},
    };

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (sans.length === 0) continue;
      const board = new Chess();
      const history: string[] = [];
      for (const san of sans) {
        try {
          board.move(san);
        } catch {
          break; // line diverges from legality — stop walking this entry
        }
        history.push(san);
        const fen = board.fen();
        const ply = history.length;
        const phase = phaseOfPly(ply);
        tally.plies += 1;
        byPhase[phase].plies += 1;

        // Everything retrieval will even consider for this board.
        const candidates: DanyaNote[] = [
          ...notesForPrefix(history),
          ...notesForFen(fen),
          ...secondaryNotesForPosition(history),
          ...secondaryNotesForFen(fen),
        ];
        const uniq = new Map(candidates.map((n) => [n.id, n]));
        if (uniq.size === 0) continue;

        tally.pliesWithAnyCandidate += 1;
        byPhase[phase].withCandidate += 1;
        tally.candidatesSeen += uniq.size;

        const selected = noteAtPosition(history, fen, entry.name ?? null);
        if (selected) {
          tally.pliesWithSelection += 1;
          byPhase[phase].selected += 1;
        }

        // Per-ply blame: a ply only goes SILENT if every candidate it had was
        // rejected. Candidate counts alone overstate any filter's cost, because
        // `noteAtPosition` returns ONE note per ply — with ~8 candidates per
        // ply, most "unselected" notes lost the tie, they were not rejected.
        // This is the number that can actually justify relaxing a filter.
        const survivorsPerFilter = { ...blankFilterTally };
        for (const n of uniq.values()) {
          if (selected && n.id === selected.id) continue;
          // FIRST failing filter wins the attribution, so the counts sum to the
          // number of unselected candidates instead of double-counting a note
          // that trips several.
          if (!noteDescribesPosition(n, fen)) { tally.rejected.noteDescribesPosition += 1; survivorsPerFilter.noteDescribesPosition += 1; continue; }
          if (!noteTeachesChessNotItsSource(n)) { tally.rejected.noteTeachesChessNotItsSource += 1; survivorsPerFilter.noteTeachesChessNotItsSource += 1; continue; }
          if (!noteStaysInScope(n, entry.name ?? null)) { tally.rejected.noteStaysInScope += 1; survivorsPerFilter.noteStaysInScope += 1; continue; }
          if (noteOpeningConflicts(n.opening, entry.name ?? null)) { tally.rejected.noteOpeningConflicts += 1; survivorsPerFilter.noteOpeningConflicts += 1; continue; }
          tally.rejected.survivedExportedFiltersButUnselected += 1;
          survivorsPerFilter.survivedExportedFiltersButUnselected += 1;
        }
        if (!selected) {
          // Which filter accounts for the WHOLE ply's silence? When one filter
          // rejected every candidate here, it owns this ply outright.
          const total = uniq.size;
          let sole: string | null = null;
          for (const [k, v] of Object.entries(survivorsPerFilter)) {
            if (v === total) { sole = k; break; }
          }
          const key = sole ?? 'mixed';
          silencedBy[key] = (silencedBy[key] ?? 0) + 1;
          silencedByPhase[phase][key] = (silencedByPhase[phase][key] ?? 0) + 1;
        }
      }
    }

    const pct = (n: number, d: number): number => (d === 0 ? 0 : Number((n / d).toFixed(4)));
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      note: 'Attributes unselected candidate notes to the first filter that rejects them. Instrument, not a gate.',
      source: 'repertoire.json — the same 1,310-ply walk as teaching-coverage.json',
      plies: tally.plies,
      pliesWithAnyCandidate: tally.pliesWithAnyCandidate,
      pliesWithSelection: tally.pliesWithSelection,
      retrievalReach: pct(tally.pliesWithAnyCandidate, tally.plies),
      selectionRate: pct(tally.pliesWithSelection, tally.plies),
      /** Of the plies retrieval COULD serve, how many actually speak. The gap
       *  between this and 1.0 is the entire cost of scoping. */
      survivalOfRetrievedPlies: pct(tally.pliesWithSelection, tally.pliesWithAnyCandidate),
      candidatesSeen: tally.candidatesSeen,
      rejected: tally.rejected,
      /** THE ACTIONABLE NUMBER: plies that had material and still said nothing,
       *  blamed on the filter that rejected every candidate there. */
      pliesSilencedBy: silencedBy,
      pliesSilencedByPhase: silencedByPhase,
      byPhase: Object.fromEntries(
        Object.entries(byPhase).map(([k, v]) => [
          k,
          { ...v, selectionRate: pct(v.selected, v.plies), reach: pct(v.withCandidate, v.plies) },
        ]),
      ),
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/note-filter-funnel.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 600_000);
});

// WHICH NOTE IDS DOES A STUDENT ACTUALLY HEAR?
//
// PLAN.md's guarantee rests on an order: measure which notes are SELECTED
// before writing a word of prose for them. Wording has zero effect on
// selection — that runs on the note's position metadata — so hand-writing a
// beautiful spoken form for a note that is never chosen is the same wasted
// motion as every other bug this session found.
//
// This is the measurement half. It walks every line the app teaches
// (repertoire.json main lines + variations) through the REAL splice —
// `noteAtPosition` then the board-truth grade over `spokenBeatText`, which is
// literally what `noteArrowSourceAt` does at the lesson-generation site — and
// records the note id that spoke at each ply, whether it has a bake entry, and
// what the student hears today.
//
// A note with NO bake entry falls through to raw distilled transcript. That is
// the set to hand-write, and this report is what names it. `dt-48c` (heard on
// prod 2026-08-15) is the known member; the point of the walk is to find the
// rest before writing rather than after.
//
// A REPORT, not a wall. Writes audit-reports/selected-notes.json.
import { describe, it, expect, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { noteAtPosition, spokenBeatText, type DanyaNote } from './danyaTeachingService';
import { gradeNarrationText } from './coachAnswerGates';
import { bakedSpoken } from './spokenNoteBake';
import repertoireRaw from '../data/repertoire.json';
import registry from '../data/corpora.json';

interface RepertoireEntry {
  id: string;
  name: string;
  pgn: string;
  color?: string;
  variations?: Array<{ name: string; pgn: string }>;
}

const REPERTOIRE = repertoireRaw as unknown as RepertoireEntry[];

const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

interface Selection {
  id: string;
  corpus: string;
  lesson: string;
  openingTag: string;
  ply: number;
  san: string;
  anchored: boolean;
  baked: boolean;
  /** What the student hears at this ply, today. */
  spoken: string;
  /** The unpruned source, so a hand-written form can be judged against it. */
  explains: string;
}

/** `dt-48c` → `dt`; `sl-1a2b` → `sl`. The farm a note came from. */
const corpusOf = (id: string): string => id.split('-')[0] ?? '?';

describe('selected notes', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('names every note id the taught lines actually speak', () => {
    const selections: Selection[] = [];
    let pliesWalked = 0;
    let pliesWithANote = 0;

    const walk = (lesson: string, sans: string[]): void => {
      const chess = new Chess();
      const history: string[] = [];
      // Per-LESSON, exactly as the generator scopes it: a note may be spoken
      // once in a lesson, and the exclude set is what lets retrieval hand back
      // the next one rather than the same one forever.
      const seen = new Set<string>();
      for (const san of sans) {
        let move;
        try { move = chess.move(san); } catch { return; }
        if (!move) return;
        history.push(move.san);
        pliesWalked += 1;
        const fen = chess.fen();
        const note = noteAtPosition(history, fen, lesson, seen);
        if (!note) continue;
        const graded = gradeNarrationText(spokenBeatText(note), fen, 'report.selectedNotes');
        if (!graded?.trim()) continue;
        seen.add(note.id);
        pliesWithANote += 1;
        selections.push({
          id: note.id,
          corpus: corpusOf(note.id),
          lesson,
          openingTag: note.opening ?? '',
          ply: history.length,
          san: move.san,
          anchored: (note.lineSan?.length ?? 0) > 0,
          baked: Boolean(bakedSpoken(note.id)?.spoken),
          spoken: graded.trim(),
          explains: (note.explains ?? '').trim(),
        });
      }
    };

    for (const entry of REPERTOIRE) {
      if (entry.pgn) walk(entry.name, sansOf(entry.pgn));
      for (const v of entry.variations ?? []) {
        if (v.pgn) walk(`${entry.name}: ${v.name}`, sansOf(v.pgn));
      }
    }

    // One row per NOTE, not per ply — the same note speaks in several lessons
    // and it is written once.
    const byId = new Map<string, Selection & { plies: number; lessons: string[] }>();
    for (const s of selections) {
      const prev = byId.get(s.id);
      if (prev) {
        prev.plies += 1;
        if (!prev.lessons.includes(s.lesson)) prev.lessons.push(s.lesson);
        continue;
      }
      byId.set(s.id, { ...s, plies: 1, lessons: [s.lesson] });
    }
    const notes = [...byId.values()].sort((a, b) => b.plies - a.plies);
    const unbaked = notes.filter((n) => !n.baked);

    const perCorpus: Record<string, { selected: number; unbaked: number }> = {};
    for (const n of notes) {
      const row = perCorpus[n.corpus] ?? { selected: 0, unbaked: 0 };
      row.selected += 1;
      if (!n.baked) row.unbaked += 1;
      perCorpus[n.corpus] = row;
    }

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      pliesWalked,
      pliesWithANote,
      plyCoverage: Number((pliesWithANote / Math.max(1, pliesWalked)).toFixed(3)),
      distinctNotesSelected: notes.length,
      unbakedSelected: unbaked.length,
      perCorpus,
      // THE WRITE LIST: selected, heard, and speaking raw transcript.
      unbaked,
      notes,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/selected-notes.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, unbaked: undefined, notes: undefined }, null, 2));

    expect(pliesWalked).toBeGreaterThan(0);
  }, 600_000);

  // ── THE SECOND HALF OF THE WRITE LIST ──────────────────────────────────────
  // The repertoire walk above covers the lines the app ships. It is not the
  // whole surface: `teach me <opening>` resolves against the whole Lichess DB,
  // so a note anchored to any position a student can reach will speak there.
  // `dt-48c` — the one note PROVEN on prod — is exactly that case: Englund
  // Gambit, which no repertoire entry plays, so the walk above never sees it.
  //
  // The honest bound is therefore "would this note be CHOSEN if a student stood
  // on its own anchor?" — the same selector, asked at the position the note was
  // authored at. A note that fails there can never be heard anywhere, and a
  // note that passes is one hand-written form away from being heard well.
  it('names every note that will speak the moment its own position is reached', () => {
    const corpora = (registry as { corpora: Array<{ path: string }> }).corpora;
    const rows: Array<{
      id: string; corpus: string; opening: string; line: string;
      baked: boolean; spoken: string; explains: string;
    }> = [];
    let anchored = 0;

    for (const c of corpora) {
      const raw = JSON.parse(readFileSync(join(process.cwd(), c.path), 'utf8')) as
        | DanyaNote[] | { notes: DanyaNote[] };
      const notes = Array.isArray(raw) ? raw : raw.notes ?? [];
      for (const note of notes) {
        const line = note.lineSan ?? [];
        if (line.length === 0) continue;
        anchored += 1;
        const chess = new Chess();
        let legal = true;
        for (const san of line) {
          try { if (!chess.move(san)) { legal = false; break; } } catch { legal = false; break; }
        }
        if (!legal) continue;
        const fen = chess.fen();
        // The selector, asked at the note's own board, with the lesson scoped
        // to the note's own opening — the friendliest case that can occur.
        const picked = noteAtPosition([...line], fen, note.opening ?? null, new Set());
        if (picked?.id !== note.id) continue;
        const graded = gradeNarrationText(spokenBeatText(picked), fen, 'report.anchorReach');
        if (!graded?.trim()) continue;
        rows.push({
          id: note.id,
          corpus: corpusOf(note.id),
          opening: note.opening ?? '',
          line: line.join(' '),
          baked: Boolean(bakedSpoken(note.id)?.spoken),
          spoken: graded.trim(),
          explains: (note.explains ?? '').trim(),
        });
      }
    }

    const unbaked = rows.filter((r) => !r.baked);
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      anchoredNotes: anchored,
      selectableAtOwnAnchor: rows.length,
      unbaked: unbaked.length,
      rows: unbaked,
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/anchor-reachable-notes.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));

    expect(rows.length).toBeGreaterThan(0);
  }, 600_000);
});

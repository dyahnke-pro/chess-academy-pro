// GATE: the club replies the app fetches (public/data/club-replies/, WO-COURSE-01
// D) are still true against the CURRENT course. Each was a reply no taught line
// covered when it was built; a course rebuild can teach it, transpose into it,
// or move the board out of reach — and then the file must be rebuilt
// (`build-club-replies.mjs --assemble`), never left to show a stale line. Every
// line is legal from its board, ends on the student's move in a middlegame, and
// leaves the student no worse than the course's bar unless it is a gambit's.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { courseOpenings, taughtBoards } from './course-lines.mjs';
import { classifyReply, isGambitReply, LOSING_CP } from './club-replies-lib.mjs';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = `${process.cwd()}/`;
const DIR = join(root, 'public/data/club-replies');
const present = existsSync(DIR) ? readdirSync(DIR).filter((n) => n.endsWith('.json') && n !== 'index.json') : [];
const index = existsSync(join(DIR, 'index.json')) ? JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) : { bands: [], openings: {} };
const course = new Map(courseOpenings(root).map((o: { id: string }) => [o.id, o]));

interface Rec { board: string; san: string; cont: string[]; endCp: number | null; middlegame: boolean; gambit?: boolean }

describe('club replies are true against the current course', () => {
  it('ships the files (not vacuous)', () => {
    expect(present.length).toBeGreaterThan(0);
  });

  it('the index lists exactly the files, with their counts', () => {
    expect(Object.keys(index.openings).sort()).toEqual(present.map((n) => n.slice(0, -5)).sort());
    for (const n of present) {
      const f = JSON.parse(readFileSync(join(DIR, n), 'utf8'));
      expect(f.openingId).toBe(n.slice(0, -5));
      expect(index.openings[f.openingId]).toBe(f.replies.length);
      expect(f.bands).toEqual(index.bands);
    }
  });

  for (const n of present) {
    const file = JSON.parse(readFileSync(join(DIR, n), 'utf8')) as { openingId: string; replies: Rec[] };
    it(`${file.openingId}: every reply is new, legal, walked to a middlegame and sound`, () => {
      const o = course.get(file.openingId) as { id: string; color: 'white' | 'black'; lines: string[][] } | undefined;
      expect(o, 'an opening the course no longer has').toBeDefined();
      if (!o) return;
      const taught = taughtBoards(o.lines);
      const bad: string[] = [];
      for (const r of file.replies) {
        const cls = classifyReply(taught, { fen: `${r.board} 0 1`, san: r.san });
        if (cls.status !== 'candidate') { bad.push(`${r.san} @ ${r.board}: ${cls.status}`); continue; }
        const line = [...cls.path, cls.san, ...r.cont];
        const c = new Chess();
        try { for (const m of line) c.move(m); } catch { bad.push(`${r.san}: illegal continuation`); continue; }
        if (r.cont.length === 0) bad.push(`${r.san}: no continuation`);
        const lastBy = (line.length - 1) % 2 === 0 ? 'white' : 'black';
        if (lastBy !== o.color) bad.push(`${r.san}: ends on the opponent's move`);
        if (!r.middlegame || !reachesMiddlegame(line.join(' ')).pass) bad.push(`${r.san}: never reaches a middlegame`);
        const gambit = isGambitReply(o, cls.line);
        if (Boolean(r.gambit) !== gambit) bad.push(`${r.san}: gambit flag ${Boolean(r.gambit)} but the rule says ${gambit}`);
        if (!gambit && (r.endCp === null || r.endCp < LOSING_CP)) bad.push(`${r.san}: ends at ${r.endCp} for the student`);
      }
      expect(bad).toEqual([]);
    });
  }
});

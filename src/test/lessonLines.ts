// THE LINES AN OPENING'S LESSON PLAYS (WO-OPENINGS-REWRITE-01), read one way by
// the lesson writer and the fact sheet, so the two always walk the same lines in
// the same order (the writer's input sheet is cut from both). An opening comes
// from `repertoire.json` or `pro-repertoires.json`; each line is its PGN, or the
// existing lesson's own moves when they run past the PGN on the same path. A file
// of extra tabs (`LESSON_EXTRA`, `{ [openingId]: [{ name, moves }] }`) adds lines
// the repertoire does not carry yet — Levy's taught lines for his openings (R4).
import { existsSync, readFileSync } from 'node:fs';

export interface LessonOpening {
  id: string;
  name: string;
  eco: string;
  color: 'white' | 'black';
  pgn: string;
  variations?: Array<{ name: string; pgn: string }>;
}

export interface LessonLine {
  name: string;
  moves: string[];
}

export const sansOf = (pgn: string): string[] =>
  pgn.split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t)).map((t) => t.replace(/^\d+\.+/, '')).filter(Boolean);

/** The line Watch plays: the existing lesson's own moves when they run past
 *  the PGN on the same path, else the PGN. */
export function watchLine(pgnMoves: string[], lessonMoves: readonly string[] | undefined): string[] {
  if (!lessonMoves?.length || lessonMoves.length <= pgnMoves.length) return pgnMoves;
  return pgnMoves.every((m, k) => lessonMoves[k] === m) ? [...lessonMoves] : pgnMoves;
}

/** An opening by id, from the masterclass repertoire or the pro repertoires. */
export function findLessonOpening(id: string): LessonOpening | null {
  const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as LessonOpening[];
  const pro = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf8')) as LessonOpening[] | { openings: LessonOpening[] };
  const pros = Array.isArray(pro) ? pro : pro.openings;
  return rep.find((o) => o.id === id) ?? pros.find((o) => o.id === id) ?? null;
}

/** Extra tabs for an opening from the `LESSON_EXTRA` file, or none. */
export function extraLines(id: string, path: string | undefined): LessonLine[] {
  if (!path || !existsSync(path)) return [];
  const all = JSON.parse(readFileSync(path, 'utf8')) as Record<string, LessonLine[]>;
  return (all[id] ?? []).map((l) => ({ name: l.name, moves: [...l.moves] }));
}

/** Every line of the opening, main line first: its tabs, then the extra tabs
 *  whose name no tab already has. */
export function lessonLines(
  op: LessonOpening,
  lessonMoves: (tab: string | null) => readonly string[] | undefined,
  extra: readonly LessonLine[],
): LessonLine[] {
  const lines: LessonLine[] = [
    { name: op.name, moves: watchLine(sansOf(op.pgn), lessonMoves(null)) },
    ...(op.variations ?? []).map((v) => ({ name: v.name, moves: watchLine(sansOf(v.pgn), lessonMoves(v.name)) })),
  ];
  const names = new Set(lines.map((l) => l.name));
  return [...lines, ...extra.filter((l) => !names.has(l.name))];
}

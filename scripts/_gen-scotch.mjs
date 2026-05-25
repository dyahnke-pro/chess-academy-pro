// Generate the Italian masterclass .ts files from the validated content JSON.
// Run AFTER scripts/_check-beats.mjs is clean.
import { readFileSync, writeFileSync } from 'node:fs';

const lessons = JSON.parse(readFileSync('scripts/_scotch-content.json', 'utf-8'));
const COLOR = {
  ATK: 'ATK', VIS: 'VIS', INTENT: 'INTENT', KEY: 'KEY', SOFT: 'SOFT',
};
const j = (s) => JSON.stringify(s);

function beatLines(beats) {
  return beats.map((bt) => {
    const parts = [`id: ${j(bt.id)}`, `moves: ${j(bt.moves)}`];
    parts.push(`say: ${j(bt.say)}`);
    if (bt.sayShort) parts.push(`sayShort: ${j(bt.sayShort)}`);
    if (bt.arrows?.length) parts.push(`arrows: [${bt.arrows.map((a) => `A(${j(a.from)}, ${j(a.to)}, ${COLOR[a.color]})`).join(', ')}]`);
    if (bt.highlights?.length) parts.push(`highlights: [${bt.highlights.map((h) => `H(${j(h.square)}, ${COLOR[h.color]})`).join(', ')}]`);
    return `    b({ ${parts.join(', ')} }),`;
  }).join('\n');
}

const COLOR_DEFS = {
  ATK: "const ATK = 'rgba(40,185,95,0.92)';",
  VIS: "const VIS = 'rgba(40,185,95,0.92)';",
  INTENT: "const INTENT = 'rgba(40,185,95,0.92)';",
  SOFT: "const SOFT = 'rgba(80,140,255,0.32)';",
};

// Build a header that only declares the colour constants the file actually
// uses (lint: no-unused-vars). KEY is always used (H's default).
function header(body) {
  const used = Object.keys(COLOR_DEFS).filter((c) => new RegExp(`\\b${c}\\b`).test(body));
  const colorLines = used.map((c) => COLOR_DEFS[c]).join('\n');
  return `import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_scotch-content.json (validated against the gate
// suite). Edit the JSON + regenerate, or edit here and keep the JSON in sync.
const KEY = 'rgba(255,214,0,0.88)';
${colorLines}

const A = (from: string, to: string, color: string): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\\s+/) };
}
`;
}

function lessonObj(l, extraKind) {
  const fields = [
    `  openingId: ${j(l.openingId)}`,
    `  title: ${j(l.title)}`,
    `  minutes: ${l.minutes}`,
    `  orientation: ${j(l.orientation)}`,
  ];
  if (extraKind) fields.push(`  kind: ${j(extraKind)}`);
  fields.push(`  beats: [\n${beatLines(l.beats)}\n  ]`);
  return `{\n${fields.join(',\n')},\n}`;
}

// ── main ──
const main = lessons.find((l) => l._out === 'main');
const mainBody = `export const SCOTCH_GAME_LESSON: LessonScript = ${lessonObj(main)};\n`;
writeFileSync('src/data/lessons/scotchGame.ts', `${header(mainBody)}\n${mainBody}`);

// ── variations ──
const variations = lessons.filter((l) => l._out === 'variation');
const varEntries = variations.map((v) => `  ${j(`${v.openingId}::${v._key}`)}: ${lessonObj(v)},`).join('\n\n');
const varBody = `export const SCOTCH_GAME_VARIATION_LESSONS: Record<string, LessonScript> = {\n${varEntries}\n};\n`;
writeFileSync('src/data/lessons/scotchGameVariations.ts', `${header(varBody)}\n${varBody}`);

// ── traps ──
const traps = lessons.filter((l) => l._out === 'trap');
const sq = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
const trapLessonEntries = traps.map((t) => `  ${j(t._trapId)}: ${lessonObj(t, 'trap')},`).join('\n\n');
const trapDefs = traps.map((t) => `  { id: ${sq(t._trapId)}, name: ${sq(t._name)}, kind: ${sq(t._kind)}, appliesTo: [${t._appliesTo.map(sq).join(', ')}] },`).join('\n');
const trapsBody = `${trapLessonEntries}\n${trapDefs}`;
const trapsFile = `${header(trapsBody)}
import type { PlayableMiddlegameLine } from '../../types';

export const SCOTCH_GAME_TRAP_LESSONS: Record<string, LessonScript> = {
${trapLessonEntries}
};

export type ScotchTrapKind = 'weapon' | 'warning';
export interface ScotchTrapDef {
  id: string;
  name: string;
  kind: ScotchTrapKind;
  /** Hand-picked tab labels (lower-case) this trap appears on. */
  appliesTo: string[];
}

export const SCOTCH_GAME_TRAP_DEFS: ScotchTrapDef[] = [
${trapDefs}
];

export function getScotchTrapsForTab(tabKey: string): ScotchTrapDef[] {
  return SCOTCH_GAME_TRAP_DEFS.filter(
    (t) => t.appliesTo.includes(tabKey) && t.id in SCOTCH_GAME_TRAP_LESSONS,
  );
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export function getScotchTrapPlayableLine(id: string): PlayableMiddlegameLine | null {
  const lesson = SCOTCH_GAME_TRAP_LESSONS[id];
  if (!lesson || lesson.beats.length === 0) return null;
  const lineBeat = lesson.beats[lesson.beats.length - 1];
  const moves = lineBeat.moves;
  const annotations: string[] = moves.map(() => '');
  const arrows: AnnotationArrow[][] = moves.map(() => []);
  const highlights: AnnotationHighlight[][] = moves.map(() => []);
  for (const beat of lesson.beats) {
    if (beat.moves.length > moves.length) continue;
    if (!beat.moves.every((m, i) => m === moves[i])) continue;
    const ply = beat.moves.length - 1;
    annotations[ply] = beat.say;
    if (beat.arrows) arrows[ply] = beat.arrows;
    if (beat.highlights) highlights[ply] = beat.highlights;
  }
  return { fen: START_FEN, moves, annotations, arrows, highlights, title: lesson.title };
}
`;
writeFileSync('src/data/lessons/scotchGameTrapLessons.ts', trapsFile);

console.log('generated: scotchGame.ts, scotchGameVariations.ts, scotchGameTrapLessons.ts');

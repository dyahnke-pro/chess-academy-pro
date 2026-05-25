// Generate the Sicilian Najdorf masterclass .ts files from the validated
// content JSON. Run AFTER scripts/_check-beats.mjs is clean. Mirrors
// _gen-scotch.mjs (main + variation lessons; traps added later if any).
import { readFileSync, writeFileSync } from 'node:fs';

const lessons = JSON.parse(readFileSync('scripts/_najdorf-content.json', 'utf-8'));
const COLOR = { ATK: 'ATK', VIS: 'VIS', INTENT: 'INTENT', KEY: 'KEY', SOFT: 'SOFT' };
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

function header(body) {
  const used = Object.keys(COLOR_DEFS).filter((c) => new RegExp(`\\b${c}\\b`).test(body));
  const colorLines = used.map((c) => COLOR_DEFS[c]).join('\n');
  return `import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Lead-the-eye colour language (playbook §5a): arrows GREEN (vision / threat /
// intent), highlights YELLOW (key square named in narration) and SOFT BLUE
// (secondary context). Move squares are auto-painted orange by the player.
// GENERATED from scripts/_najdorf-content.json (validated against the gate
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

function lessonObj(l) {
  const fields = [
    `  openingId: ${j(l.openingId)}`,
    `  title: ${j(l.title)}`,
    `  minutes: ${l.minutes}`,
    `  orientation: ${j(l.orientation)}`,
  ];
  fields.push(`  beats: [\n${beatLines(l.beats)}\n  ]`);
  return `{\n${fields.join(',\n')},\n}`;
}

// ── main ──
const main = lessons.find((l) => l._out === 'main');
const mainBody = `export const SICILIAN_NAJDORF_LESSON: LessonScript = ${lessonObj(main)};\n`;
writeFileSync('src/data/lessons/sicilianNajdorf.ts', `${header(mainBody)}\n${mainBody}`);

// ── variations ──
const variations = lessons.filter((l) => l._out === 'variation');
const varEntries = variations.map((v) => `  ${j(`${v.openingId}::${v._key}`)}: ${lessonObj(v)},`).join('\n\n');
const varBody = `export const SICILIAN_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {\n${varEntries}\n};\n`;
writeFileSync('src/data/lessons/sicilianNajdorfVariations.ts', `${header(varBody)}\n${varBody}`);

console.log(`generated: sicilianNajdorf.ts (main, ${main.beats.length} beats), sicilianNajdorfVariations.ts (${variations.length} variations)`);

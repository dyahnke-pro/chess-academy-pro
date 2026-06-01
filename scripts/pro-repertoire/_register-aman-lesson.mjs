#!/usr/bin/env node
// Idempotently register an Aman pro-rep lesson + variations in lessons/index.ts.
// Usage: node _register-aman-lesson.mjs <CONST_BASE> <fileBase>
import fs from 'node:fs';
const FILE = 'src/data/lessons/index.ts';
const [, , CONST, fileBase] = process.argv;
let src = fs.readFileSync(FILE, 'utf8');

const lessonImport = `import { ${CONST}_LESSON } from './${fileBase}';`;
const varImport = `import { ${CONST}_VARIATION_LESSONS } from './${fileBase}Variations';`;
const lessonEntry = `  [${CONST}_LESSON.openingId]: ${CONST}_LESSON,`;
const varSpread = `  ...${CONST}_VARIATION_LESSONS,`;

if (src.includes(lessonImport)) { console.log(`already registered: ${CONST}`); process.exit(0); }

const importAnchor = `import { PRO_HIKARU_CARO_KANN_LESSON } from './proHikaruCaroKann';`;
src = src.replace(importAnchor, `${importAnchor}\n${lessonImport}\n${varImport}`);
const lessonAnchor = `  [PRO_HIKARU_CARO_KANN_LESSON.openingId]: PRO_HIKARU_CARO_KANN_LESSON,`;
src = src.replace(lessonAnchor, `${lessonAnchor}\n${lessonEntry}`);
const varAnchor = `  ...PRO_HIKARU_CARO_KANN_VARIATION_LESSONS,`;
src = src.replace(varAnchor, `${varAnchor}\n${varSpread}`);

fs.writeFileSync(FILE, src);
console.log(`registered: ${CONST}`);

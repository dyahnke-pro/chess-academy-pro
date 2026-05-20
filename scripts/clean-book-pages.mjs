// One-shot cleaner for src/data/opening-book-pages.json.
//
// The "From the Books" passages were mined from Project Gutenberg OCR.
// Two artifacts make them unreadable (David, 2026-05-20, screenshot):
//   1. ASCII board diagrams dumped inline as noise — a run of dashes
//      through the "A B C D E F G H" file footer, full of #Kt/^P cells.
//   2. A MARC "$b" subfield delimiter left in one book title.
// This strips both and recomputes wordCount. It does NOT touch the
// historical descriptive notation (P-Kt5, QB1-KR6) — converting that to
// algebraic would mean guessing squares without game context (G3: never
// invent chess content).
//
// Run: node scripts/clean-book-pages.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/opening-book-pages.json';

// A board blob: a 4+ dash/em-dash run through the file-letter footer.
// Non-greedy, and 4+ dash runs only occur in these diagrams (prose uses
// single em-dashes), so this never eats real text. Verified: 0 residual
// board tokens (#Kt/^P) and 0 stray footers across all pages after strip.
const BOARD_BLOB = /[-—]{4,}[\s\S]*?A\s*B\s*C\s*D\s*E\s*F\s*G\s*H\s*/g;

function cleanText(text) {
  let t = text.replace(BOARD_BLOB, '\n\n');
  // Collapse the blank-line gap the strip leaves behind.
  t = t.replace(/\n{3,}/g, '\n\n');
  // Tidy stray double spaces created by removals.
  t = t.replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

function cleanTitle(title) {
  // MARC "$b" subfield delimiter: "Main : $b subtitle" -> "Main: subtitle".
  return title
    .replace(/\s*:\s*\$b\s*/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
let pagesCleaned = 0;
let boardsStripped = 0;
let titlesFixed = 0;

for (const opening of Object.keys(data.pages)) {
  for (const page of data.pages[opening]) {
    const hadBoard = BOARD_BLOB.test(page.text);
    BOARD_BLOB.lastIndex = 0; // reset stateful global regex after .test
    const newText = cleanText(page.text);
    if (newText !== page.text) {
      page.text = newText;
      page.wordCount = wordCount(newText);
      pagesCleaned++;
      if (hadBoard) boardsStripped++;
    }
    const newTitle = cleanTitle(page.bookTitle);
    if (newTitle !== page.bookTitle) {
      page.bookTitle = newTitle;
      titlesFixed++;
    }
  }
}

// Also clean titles in the top-level sources list for consistency.
if (Array.isArray(data.sources)) {
  for (const s of data.sources) {
    if (typeof s.bookTitle === 'string') {
      const fixed = cleanTitle(s.bookTitle);
      if (fixed !== s.bookTitle) {
        s.bookTitle = fixed;
        titlesFixed++;
      }
    }
    if (typeof s.title === 'string') {
      const fixed = cleanTitle(s.title);
      if (fixed !== s.title) {
        s.title = fixed;
        titlesFixed++;
      }
    }
  }
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Cleaned ${pagesCleaned} page(s); stripped ${boardsStripped} board diagram(s); fixed ${titlesFixed} title(s).`);

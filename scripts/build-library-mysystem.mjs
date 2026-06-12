// Ingest the ENTIRE public-domain "My System" (Nimzowitsch, 1930 Hereford
// edition, Internet Archive) into a Library book: every chapter, paginated for
// read-aloud, with diagram points marked so live boards slot in as the
// illustrations. Emits src/data/library/my-system.json.
//
// Source text is the PD 1930 Harcourt Brace edition OCR (archive.org item
// mysystemchesstre0000aron). We reproduce the book's own words; the LLM writes
// nothing. Move-notation/diagram spots become live boards (added + validated
// separately), so the garbled OCR notation is never read aloud.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC_URL =
  'https://ia800809.us.archive.org/11/items/mysystemchesstre0000aron/mysystemchesstre0000aron_djvu.txt';
const CACHE = 'data/sources/my-system-1930.txt';
const OUT = 'src/data/library/my-system.json';

async function ensureSource() {
  if (existsSync(CACHE)) return readFileSync(CACHE, 'utf8');
  mkdirSync(dirname(CACHE), { recursive: true });
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`fetch ${SRC_URL} -> ${res.status}`);
  const txt = await res.text();
  writeFileSync(CACHE, txt);
  return txt;
}

// ── cleanup heuristics ───────────────────────────────────────────────────────
const CHAPTER_RE = /^\s*(PART|Chapter|CHAPTER)\b/;
const DIAGRAM_RE = /^\s*Diagram\s+[IVXLC0-9]/i;
// A line that is mostly OCR noise (random punctuation / few letters).
function isNoise(line) {
  const t = line.trim();
  if (!t) return false;
  if (t.length <= 2) return true;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (letters / t.length < 0.45) return true; // move-lines, page furniture
  if (/^[0-9 .,;:—-]+$/.test(t)) return true; // bare page numbers
  return false;
}
// Running heads like "THE PAWN-CHAIN 119" / "MY SYSTEM".
function isRunningHead(line) {
  const t = line.trim();
  return /^[A-Z][A-Z0-9 .,'’&-]{4,}$/.test(t) && t.split(' ').length <= 6 && !CHAPTER_RE.test(t);
}
const SECTION_RE = /^\s*§\s*\d/;
function fix(s) {
  return s
    .replace(/réle|rdle/g, 'rôle')
    .replace(/\btvoops\b/g, 'troops')
    .replace(/\bMid\.-Point\b/g, 'mid-point')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/§\s*/g, 'Section ')
    .replace(/[“”]/g, '"')
    .replace(/([A-Za-z])-\s+([a-z])/g, '$1$2') // rejoin line-break hyphenation
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
}

const raw = await ensureSource();
const lines = raw.split('\n');

// Body begins at Part I, Chapter I, §1 — skip the front matter (TOC, game
// index, prefaces). Anchor on the §1 opening sentence.
let start = 0;
for (let i = 0; i < lines.length; i++) {
  if (/By development is to be understood the strategic advance/i.test(lines[i])) { start = i; break; }
}

let currentChapter = 'Part I, Chapter I — On the Centre and on Development';
let currentSection = 'Section 1';
const paragraphs = []; // { heading, text, diagram }
let buf = [];
let sawDiagram = false;
const heading = () => `${currentChapter} · ${currentSection}`;
const flush = () => {
  const text = fix(buf.join(' '));
  if (text && (text.match(/[A-Za-z]/g) || []).length > 30) {
    paragraphs.push({ heading: heading(), text, diagram: sawDiagram });
  }
  buf = [];
  sawDiagram = false;
};

for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  const t = line.trim();
  if (/END OF (THE|THIS) PROJECT GUTENBERG|Transcriber|BIOGRAPHICAL/i.test(t)) break;
  if (CHAPTER_RE.test(t) && t.length < 60) {
    flush();
    const m = t.match(/CHAPTER\s+([IVXL]+)\b/i);
    currentChapter = m ? `Chapter ${m[1].toUpperCase()}` : 'My System';
    continue;
  }
  if (SECTION_RE.test(t)) {
    // Section line is a heading, not body — don't read its number aloud.
    flush();
    const sm = t.match(/§\s*([0-9a-z]+)\s*\.?\s*(.*)$/i);
    currentSection = sm ? `Section ${sm[1]}${sm[2] ? ' — ' + fix(sm[2]).replace(/\.$/, '') : ''}` : fix(t);
    continue;
  }
  if (DIAGRAM_RE.test(t)) { sawDiagram = true; continue; }
  if (!t) { flush(); continue; }
  if (isRunningHead(t) || isNoise(t)) continue;
  buf.push(t);
}
flush();

// ── paginate: group paragraphs into read-aloud pages (~900 char cap) ─────────
// One page per section/chapter (book-faithful). Sentence-level TTS means page
// length doesn't matter for the cap, so we don't split mid-section.
const pages = [];
let cur = { heading: '', paras: [], diagram: false };
let pi = 0;
for (const p of paragraphs) {
  const headingChanged = cur.heading && p.heading !== cur.heading;
  if (cur.paras.length && headingChanged) {
    pages.push({ id: `ms-${pi++}`, heading: cur.heading, text: cur.paras.join('\n\n'), diagram: cur.diagram });
    cur = { heading: p.heading, paras: [], diagram: false };
  }
  cur.heading = p.heading;
  cur.paras.push(p.text);
  cur.diagram = cur.diagram || p.diagram;
}
if (cur.paras.length) pages.push({ id: `ms-${pi++}`, heading: cur.heading, text: cur.paras.join('\n\n'), diagram: cur.diagram });

// Keep only clean teaching prose; drop garbled move-analysis lines (they belong
// on the live boards, not read aloud). A sentence survives if it's mostly
// letters and not dominated by move tokens.
function isProse(s) {
  const compact = s.replace(/\s/g, '');
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 14) return false;
  if (letters / Math.max(1, compact.length) < 0.78) return false;
  // Reject sentences still carrying move-notation / OCR garble residue.
  if (/[A-Za-z]x[A-Za-z]/.test(s)) return false; // PxP, KtxKt
  if (/[A-Za-z]*\d[A-Za-z0-9]*\d/.test(s)) return false; // multi-digit garble
  if (/[—-][KQRBN]\d/.test(s)) return false; // -K4 residue
  if (/\bK[A-Z]\b|\bP\d|\bKt\b.*\bKt\b.*\bKt\b/.test(s)) return false;
  return true;
}
// Strip move notation + OCR garble tokens (they belong on the boards). Keeps
// single square refs (Q4, K5) that appear in legit prose; removes multi-digit
// garble (P2037, 650x0, K37) and move runs (PxP, P-K4, Kt-B3, 4.....).
function stripNotation(t) {
  return t
    .replace(/\b\d{1,2}\.{2,}\s*/g, ' ')
    .replace(/\b\d{1,2}\.\s*(?=[PKQRBNO0-9(])/g, ' ')
    .replace(/\b[A-Za-z]*\d[A-Za-z0-9]*\d[A-Za-z0-9]*\b/g, ' ')
    .replace(/\b(P|Kt|B|R|Q|K)x[A-Za-z0-9]{1,4}\b/g, ' ')
    .replace(/\bP-[KQRBN][A-Za-z0-9]{0,3}\b/g, ' ')
    .replace(/\bKt-[A-Za-z0-9]{1,3}\b/g, ' ')
    .replace(/\(\s*[),;]?\s*\)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1');
}
function proseOnly(text) {
  return text
    .split('\n\n')
    .map((para) =>
      stripNotation(para)
        .split(/(?<=[.!?])\s+/)
        .filter(isProse)
        .join(' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n');
}

const cleanedPages = pages
  .map((p) => ({ ...p, text: proseOnly(p.text) }))
  .filter((p) => (p.text.match(/[A-Za-z]/g) || []).length > 60);

const book = {
  id: 'nimzowitsch-my-system',
  bookTitle: 'My System',
  author: 'Aron Nimzowitsch',
  citation: {
    edition: 'Harcourt, Brace and Company, New York, 1930',
    translator: 'Philip Hereford',
    rights: 'Published 1930. In the public domain in the United States (since 1 January 2026).',
    sourceLabel: 'Internet Archive',
    sourceUrl: 'https://archive.org/details/mysystemchesstre0000aron',
  },
  pages: cleanedPages.map(({ id, heading, text }) => ({ id, heading, text })),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(book, null, 2));
console.log(`Ingested My System -> ${OUT}`);
console.log(`pages: ${book.pages.length} | diagram-bearing pages: ${pages.filter((p) => p.diagram).length}`);
console.log(`first page heading: ${book.pages[0]?.heading}`);
console.log(`sample page 5 text: ${book.pages[5]?.text.slice(0, 200)}…`);

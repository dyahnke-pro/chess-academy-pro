// Ingest the ENTIRE "Chess Fundamentals" (Capablanca, 1921, public domain) into
// a Library book — every chapter read aloud. Capablanca's diagrams are printed
// as IMAGES (not ASCII), so boards can't be auto-extracted; the full text goes
// in now, and the hand-validated boards (Examples 11 & 13) are merged onto their
// pages. More boards get added as their Fig images are transcribed + validated.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SRC_URL = 'https://www.gutenberg.org/cache/epub/33870/pg33870-images.html';
const CACHE = 'data/sources/chess-fundamentals-1921.html';
const OUT = 'src/data/library/chess-fundamentals.json';

async function ensureSource() {
  if (existsSync(CACHE)) return readFileSync(CACHE, 'utf8');
  mkdirSync(dirname(CACHE), { recursive: true });
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`fetch ${SRC_URL} -> ${res.status}`);
  const txt = await res.text();
  writeFileSync(CACHE, txt);
  return txt;
}

const html = await ensureSource();
// Mark figure images so we can split pages at diagram points, then strip tags.
let h = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
h = h.replace(/<img[^>]*images\/(Fig\d+\.jpg)[^>]*>/g, ' $1 ');
let text = h.replace(/<[^>]+>/g, ' ');
text = text
  .replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8212;|&mdash;/g, '—')
  .replace(/&#8211;|&ndash;/g, '–').replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
  .replace(/&[a-z#0-9]+;/g, ' ');
const lines = text.split('\n');

const CHAPTER_RE = /^\s*(PART|CHAPTER)\b/;
function isNoise(t) {
  if (t.length <= 2) return true;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  return letters / t.length < 0.45;
}
function fix(s) {
  return s
    .replace(/Fig\d+\.jpg/g, " ")
    .replace(/\b\d{1,2}\.{2,}\s*/g, " ") // move-number leaders
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}
// Drop move-analysis / garble sentences from the spoken prose (they belong on
// the boards): reject sentences carrying descriptive-notation residue.
function isProse(s) {
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters < 16) return false;
  if (/\b(Kt|B|R|Q|K|P)\s?[-x]\s?(Kt|B|R|Q|K|P|R?\d|[KQ]?[KQRB]?\d)/.test(s)) return false; // P-K4, KtxKt, Q-R6
  if (/\b[KQRBN]?x[KQRBNP]\b/.test(s)) return false; // BxKt, QxP
  if (/\(Q\)|\bch\b|\bmate\b\s*\./.test(s) && (s.match(/[KQRBNP]/g) || []).length > 6) return false;
  const caps = (s.match(/\b[KQRBN]t?\b/g) || []).length;
  if (caps >= 4) return false; // dense with piece letters → analysis
  return true;
}
function proseOnly(t) {
  return t.split(/(?<=[.!?])\s+/).filter(isProse).join(' ').trim();
}

// Body begins at the first chapter ("FIRST PRINCIPLES" / Chapter I). Find the
// start of real prose after the front matter.
// Skip the front matter (license, cover, contents). "Some Simple Mates" is both
// a contents line and the first body heading — the LAST occurrence is the body.
let start = 0;
for (let i = 0; i < lines.length; i++) if (/SOME SIMPLE MATES/i.test(lines[i])) start = i;

let chapter = 'Chess Fundamentals';
const paras = [];
let buf = [];
let sawFig = false;
const flush = () => {
  const text = proseOnly(fix(buf.join(' ')));
  if ((text.match(/[A-Za-z]/g) || []).length > 60) paras.push({ heading: chapter, text, fig: sawFig });
  buf = [];
  sawFig = false;
};
for (let i = start; i < lines.length; i++) {
  const t = lines[i].trim();
  if (/Transcriber.s Note|END OF (THE|THIS) PROJECT GUTENBERG/i.test(t)) break;
  if (/Fig\d+\.jpg/.test(t)) sawFig = true;
  if (CHAPTER_RE.test(t) && t.length < 60) { flush(); chapter = fix(t); continue; }
  // section heads like "5. RELATIVE VALUE OF THE PIECES"
  if (/^\d+\.\s+[A-Z][A-Z ]{5,}$/.test(t)) { flush(); chapter = fix(t); continue; }
  if (!t) { flush(); continue; }
  if (isNoise(t)) continue;
  buf.push(t);
}
flush();

// one page per heading-group
const pages = [];
let cur = { heading: '', paras: [] };
let pi = 0;
for (const p of paras) {
  if (cur.paras.length && cur.heading !== p.heading) {
    pages.push({ id: `cf-${pi++}`, heading: cur.heading, text: cur.paras.join('\n\n') });
    cur = { heading: p.heading, paras: [] };
  }
  cur.heading = p.heading;
  cur.paras.push(p.text);
}
if (cur.paras.length) pages.push({ id: `cf-${pi++}`, heading: cur.heading, text: cur.paras.join('\n\n') });

const book = {
  id: 'capablanca-chess-fundamentals',
  bookTitle: 'Chess Fundamentals',
  author: 'José Raúl Capablanca',
  citation: {
    edition: 'Harcourt, Brace and Company, New York, 1921',
    rights: 'Published 1921. In the public domain in the United States.',
    sourceLabel: 'Project Gutenberg (ebook #33870)',
    sourceUrl: 'https://www.gutenberg.org/ebooks/33870',
  },
  pages,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(book, null, 2));
console.log(`Ingested Chess Fundamentals -> ${OUT}`);
console.log(`pages: ${pages.length}`);
console.log(`first: ${pages[0]?.heading}\n${pages[0]?.text.slice(0, 200)}`);

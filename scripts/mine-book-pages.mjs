#!/usr/bin/env node
/**
 * Mines FULLER "book pages" (multi-paragraph excerpts) about each
 * opening from the 7 Project Gutenberg classics, for the Understand
 * tab's "From the Books" reading panel.
 *
 * Unlike scripts/parse-chess-books.mjs (which tags single paragraphs
 * for narration grounding), this builds a readable PAGE: the paragraph
 * that names an opening plus the following instructional paragraphs,
 * up to ~550 words, never crossing a chapter boundary. Output:
 *
 *   src/data/opening-book-pages.json
 *     { generatedAt, sources[], pages: { [openingId]: BookPage[] } }
 *
 * Reuses the same strip / split / heading / opening-tag logic as the
 * parser so openingIds stay in sync with chess-concepts.json.
 */
import { readFile, writeFile } from 'node:fs/promises';

const RAW_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';
const OUT_PATH = 'src/data/opening-book-pages.json';
const MAX_PAGE_WORDS = 550;
const MIN_PAGE_WORDS = 90;
const MAX_WINDOW_PARAS = 5;
const PAGES_PER_OPENING = 4;

const OPENINGS = [
  { id: 'italian-game', phrases: ['Italian Game', 'Giuoco Piano', 'Giuoco Pianissimo'] },
  { id: 'ruy-lopez', phrases: ['Ruy Lopez', 'Spanish Game', 'Spanish opening', 'Morphy Defence', 'Berlin Defence'] },
  { id: 'two-knights-defence', phrases: ["Two Knights' Defence", 'Two Knights Defence', 'Two Knights'] },
  { id: 'evans-gambit', phrases: ['Evans Gambit'] },
  { id: 'scotch-game', phrases: ['Scotch Game', 'Scotch Opening'] },
  { id: 'vienna-game', phrases: ['Vienna Game', 'Vienna Opening'] },
  { id: 'kings-gambit', phrases: ["King's Gambit", 'Kings Gambit'] },
  { id: 'four-knights-game', phrases: ['Four Knights'] },
  { id: 'philidor-defence', phrases: ["Philidor's Defence", 'Philidor Defence'] },
  { id: 'petrov-defence', phrases: ['Petroff', 'Petrov', 'Russian Defence'] },
  { id: 'french-defence', phrases: ['French Defence', 'French Opening', 'French Game'] },
  { id: 'caro-kann', phrases: ['Caro-Kann', 'Caro Kann'] },
  { id: 'sicilian-najdorf', phrases: ['Najdorf', 'Sicilian Najdorf'] },
  { id: 'sicilian-dragon', phrases: ['Dragon Variation', 'Sicilian Dragon'] },
  { id: 'sicilian-sveshnikov', phrases: ['Sveshnikov', 'Lasker-Pelikan'] },
  { id: 'sicilian-alapin', phrases: ['Sicilian Alapin', 'Alapin Sicilian'] },
  { id: 'scandinavian-defence', phrases: ['Scandinavian Defence', 'Center Counter', 'Centre Counter'] },
  { id: 'alekhine-defence', phrases: ["Alekhine's Defence", 'Alekhine Defence'] },
  { id: 'pirc-defence', phrases: ['Pirc Defence', 'Pirc-Ufimtsev'] },
  { id: 'queens-gambit', phrases: ["Queen's Gambit"] },
  { id: 'qgd', phrases: ["Queen's Gambit Declined", 'QGD', 'Orthodox Defence', 'Tarrasch Defence'] },
  { id: 'qga', phrases: ["Queen's Gambit Accepted", 'QGA'] },
  { id: 'slav-defence', phrases: ['Slav Defence', 'Slav Opening'] },
  { id: 'semi-slav', phrases: ['Semi-Slav', 'Meran'] },
  { id: 'london-system', phrases: ['London System', 'London Variation'] },
  { id: 'catalan-opening', phrases: ['Catalan Opening', 'Catalan System'] },
  { id: 'trompowsky-attack', phrases: ['Trompowsky', 'Trompovsky'] },
  { id: 'kings-indian-defence', phrases: ["King's Indian Defence", "King's Indian"] },
  { id: 'nimzo-indian', phrases: ['Nimzo-Indian', 'Nimzowitsch Defence (Indian)'] },
  { id: 'grunfeld-defence', phrases: ['Grünfeld', 'Grunfeld'] },
  { id: 'dutch-defence', phrases: ['Dutch Defence', 'Dutch Opening', 'Stonewall Dutch'] },
  { id: 'benoni-defence', phrases: ['Benoni'] },
  { id: 'benko-gambit', phrases: ['Benko Gambit', 'Volga Gambit'] },
  { id: 'queens-indian', phrases: ["Queen's Indian"] },
  { id: 'budapest-gambit', phrases: ['Budapest Gambit', 'Budapest Defence'] },
  { id: 'old-indian-defence', phrases: ['Old Indian'] },
  { id: 'english-opening', phrases: ['English Opening', 'English Game'] },
  { id: 'reti-opening', phrases: ['Reti Opening', "Réti's Opening", 'Zukertort'] },
  { id: 'kings-indian-attack', phrases: ["King's Indian Attack", 'KIA'] },
  { id: 'birds-opening', phrases: ["Bird's Opening", 'Bird Opening'] },
];

const BOOK_PREFERENCE = {
  'capablanca-chess-fundamentals': 10,
  'edward-lasker-chess-strategy': 8,
  'edward-lasker-chess-and-checkers': 7,
  'staunton-blue-book-of-chess': 5,
  'young-chess-generalship': 4,
  'edge-paul-morphy-exploits': 3,
  'bird-chess-history-reminiscences': 2,
};

const BOOKS = JSON.parse(await readFile(`${RAW_DIR}/manifest.json`, 'utf-8'))
  .books.filter((b) => b.status === 'fetched');

function stripGutenberg(text) {
  const startRe = /\*\*\*\s*START OF (?:THE\s+)?(?:PROJECT GUTENBERG )?(?:E[BO]+OOK).*?\*\*\*/i;
  const endRe = /\*\*\*\s*END OF (?:THE\s+)?(?:PROJECT GUTENBERG )?(?:E[BO]+OOK).*?\*\*\*/i;
  const sm = text.match(startRe);
  let body = text;
  if (sm) body = body.slice(sm.index + sm[0].length);
  const idx = body.search(endRe);
  if (idx >= 0) body = body.slice(0, idx);
  return body.trim();
}

function splitParagraphs(body) {
  return body
    .split(/\n\s*\n+/)
    .map((p) => p.trim().replace(/\s+/g, ' '))
    .filter((p) => p.length > 0);
}

function detectHeading(p) {
  let m = p.match(/^(\d+)\.\s+([A-Z][A-Z\s\-,'":;_]{4,80})$/);
  if (m) return { kind: 'section', title: m[2].trim() };
  m = p.match(/^CHAPTER\s+([IVXLC]+|\d+)\s*$/i);
  if (m) return { kind: 'chapter', label: m[1] };
  if (p.length < 80 && /^[A-Z][A-Z\s\-,'":;_]+$/.test(p) && p.split(' ').length <= 12) {
    return { kind: 'heading', title: p };
  }
  return null;
}

function isInstructional(text) {
  if (text.length < 60) return false;
  if (/^[A-Z\s\-,'":;_\d]+$/.test(text)) return false;
  if (/^\[Illustration/.test(text)) return false;
  if (/^\[Footnote/i.test(text)) return false;
  if (/^Page\s+\d+/.test(text)) return false;
  const moveTokens = (text.match(/\b[KQRBN]\s*-\s*[KQR]?\s*[KQRBN]?\s*\d/g) || []).length;
  const totalWords = text.split(/\s+/).length;
  if (moveTokens > 0 && moveTokens / totalWords > 0.2) return false;
  return true;
}

function tagOpenings(text) {
  const hit = [];
  for (const o of OPENINGS) {
    for (const phrase of o.phrases) {
      const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(text)) { hit.push(o.id); break; }
    }
  }
  return [...new Set(hit)];
}

function openingMentionCount(text, openingId) {
  const o = OPENINGS.find((x) => x.id === openingId);
  if (!o) return 0;
  let n = 0;
  for (const phrase of o.phrases) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    n += (text.match(re) || []).length;
  }
  return n;
}

function wc(t) { return t.split(/\s+/).filter(Boolean).length; }

function pageQuality(page, openingId) {
  let score = BOOK_PREFERENCE[page.bookSlug] || 0;
  score += openingMentionCount(page.text, openingId) * 4;
  if (page.wordCount >= 180 && page.wordCount <= MAX_PAGE_WORDS) score += 6;
  if (page.wordCount < MIN_PAGE_WORDS) score -= 8;
  if (/^[A-Z][a-z]/.test(page.text)) score += 3;
  const moveTokens = (page.text.match(/\b[KQRBN]\s*-\s*[KQR]?\s*[KQRBN]?\s*\d/g) || []).length;
  score -= moveTokens * 0.5;
  return score;
}

function parseBook(book, raw) {
  const paragraphs = splitParagraphs(stripGutenberg(raw));
  // Annotate each paragraph with chapter/section context + instructional flag.
  const items = [];
  let chapter = null, section = null;
  for (const p of paragraphs) {
    const h = detectHeading(p);
    if (h?.kind === 'chapter') { chapter = h.label; section = null; continue; }
    if (h?.kind === 'section' || h?.kind === 'heading') { section = h.title; continue; }
    items.push({ text: p, chapter, section, instructional: isInstructional(p) });
  }

  const pages = [];
  for (let i = 0; i < items.length; i++) {
    const seed = items[i];
    if (!seed.instructional) continue;
    const seedOpenings = tagOpenings(seed.text);
    if (seedOpenings.length === 0) continue;
    // Build a forward window of instructional paragraphs in the same chapter.
    const chunks = [seed.text];
    let words = wc(seed.text);
    let consumed = i;
    for (let j = i + 1; j < items.length && chunks.length < MAX_WINDOW_PARAS; j++) {
      const nxt = items[j];
      if (nxt.chapter !== seed.chapter) break;
      if (!nxt.instructional) continue;
      if (words >= MAX_PAGE_WORDS) break;
      chunks.push(nxt.text);
      words += wc(nxt.text);
      consumed = j;
    }
    const text = chunks.join('\n\n');
    pages.push({
      bookSlug: book.slug,
      bookTitle: book.title,
      author: book.authors,
      gutenbergId: book.gutenbergId,
      chapter: seed.chapter,
      section: seed.section,
      text,
      wordCount: wc(text),
      _seedOpenings: seedOpenings,
      _start: i,
      _end: consumed,
    });
    i = consumed; // skip past the window so pages don't overlap heavily
  }
  return pages;
}

const sources = BOOKS.map((b) => ({ slug: b.slug, gutenbergId: b.gutenbergId, title: b.title, author: b.authors }));
const byOpening = {};
for (const book of BOOKS) {
  const raw = await readFile(`${RAW_DIR}/${book.path}`, 'utf-8');
  const pages = parseBook(book, raw);
  for (const pg of pages) {
    for (const oid of pg._seedOpenings) {
      (byOpening[oid] ??= []).push(pg);
    }
  }
}

const out = { generatedAt: new Date().toISOString(), sources, pages: {} };
let total = 0;
for (const oid of Object.keys(byOpening)) {
  // Precision gate: keep a page only if it contains the opening's
  // PRIMARY (unambiguous canonical) name — drops alias-only false
  // positives like "Spanish game" meaning Alquerque in the checkers
  // book, not the Ruy Lopez.
  const primary = OPENINGS.find((o) => o.id === oid).phrases[0];
  const primaryRe = new RegExp(`\\b${primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const ranked = byOpening[oid]
    .filter((p) => p.wordCount >= MIN_PAGE_WORDS && primaryRe.test(p.text))
    .sort((a, b) => pageQuality(b, oid) - pageQuality(a, oid))
    .slice(0, PAGES_PER_OPENING)
    .map(({ _seedOpenings, _start, _end, ...keep }) => keep);
  if (ranked.length) { out.pages[oid] = ranked; total += ranked.length; }
}

await writeFile(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
console.log(`openings with pages: ${Object.keys(out.pages).length} / ${OPENINGS.length}`);
console.log(`total pages: ${total}`);
console.log(`ruy-lopez pages: ${(out.pages['ruy-lopez'] || []).length}`);
for (const p of out.pages['ruy-lopez'] || []) {
  console.log(`  - ${p.author.split(/[;,]/)[0]} / ${p.bookTitle} (${p.wordCount}w, ch ${p.chapter ?? '?'})`);
}

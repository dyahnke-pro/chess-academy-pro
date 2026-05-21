#!/usr/bin/env node
/**
 * Fetches the seven public-domain chess instruction / history books
 * verified to exist on Project Gutenberg (per the list-gutendex-chess
 * diagnostic). IDs are hardcoded after manual review — no more guessing.
 *
 * Run on David's laptop (gutenberg.org is sandbox-blocked):
 *   node scripts/fetch-chess-books.mjs
 *
 * Output:
 *   docs/audit-runs/2026-05-19-chess-books-raw/<slug>.txt
 *   docs/audit-runs/2026-05-19-chess-books-raw/manifest.json
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';

const OUT_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';

const BOOKS = [
  {
    id: 33870,
    slug: 'capablanca-chess-fundamentals',
    expectedTitleRe: /chess.*fundamentals/i,
    expectedAuthorRe: /capablanca/i,
    focus: 'positional principles, endgame technique, pawn structures',
  },
  {
    id: 5614,
    slug: 'edward-lasker-chess-strategy',
    expectedTitleRe: /chess.*strategy/i,
    expectedAuthorRe: /edward.*lasker|lasker.*edward/i,
    focus: 'opening systems, planning, classical principles',
  },
  {
    id: 16377,
    slug: 'staunton-blue-book-of-chess',
    expectedTitleRe: /blue.*book.*chess/i,
    expectedAuthorRe: /staunton/i,
    focus: 'classical opening analysis, rudiments of play',
  },
  {
    id: 4913,
    slug: 'edward-lasker-chess-and-checkers',
    expectedTitleRe: /chess.*checkers/i,
    expectedAuthorRe: /edward.*lasker|lasker.*edward/i,
    focus: 'mastership progression, beginner-to-advanced theory',
  },
  {
    id: 55278,
    slug: 'young-chess-generalship',
    expectedTitleRe: /chess.*generalship/i,
    expectedAuthorRe: /young/i,
    focus: 'middlegame planning, strategic principles',
  },
  {
    id: 34180,
    slug: 'edge-paul-morphy-exploits',
    expectedTitleRe: /morphy/i,
    expectedAuthorRe: /edge/i,
    focus: 'attacking play, romantic era game collection',
  },
  {
    id: 4902,
    slug: 'bird-chess-history-reminiscences',
    expectedTitleRe: /chess.*history|history.*chess/i,
    expectedAuthorRe: /bird/i,
    focus: 'historical context for opening + style attribution',
  },
];

// CANDIDATES — hand-picked public-domain chess classics to ADD to the
// corpus (David 2026-05-21: "get as many chess books as we can"). These
// have NO hardcoded id: the fetcher discovers it via gutendex search and
// the expectedTitle/Author regexes REJECT any wrong match — so this is
// curation, not guessing. A candidate that isn't on Gutenberg simply
// reports "search-no-match" and is skipped (no fabrication, no harm).
// Réti leads the list: "Modern Ideas in Chess" is the hypermodern
// manifesto — the philosophical roots of the Pirc/KID/Grünfeld families
// that the current pre-1930s corpus doesn't reach by name.
const CANDIDATES = [
  {
    slug: 'reti-modern-ideas-in-chess',
    search: 'Modern Ideas in Chess Reti',
    expectedTitleRe: /modern ideas in chess/i,
    expectedAuthorRe: /r[eé]ti/i,
    focus: 'HYPERMODERN principles — control the centre from a distance, the fianchetto, undermining the pawn centre (the Pirc/KID philosophical roots)',
  },
  {
    slug: 'emanuel-lasker-common-sense-in-chess',
    search: 'Common Sense in Chess Lasker',
    expectedTitleRe: /common sense in chess/i,
    expectedAuthorRe: /lasker,?\s*emanuel|emanuel\s+lasker/i,
    focus: 'classical attacking + positional principles, development, the centre',
  },
  {
    slug: 'mason-art-of-chess',
    search: 'The Art of Chess Mason',
    expectedTitleRe: /art of chess/i,
    expectedAuthorRe: /mason/i,
    focus: 'classical middlegame artistry, combinations, planning',
  },
  {
    slug: 'mason-principles-of-chess',
    search: 'The Principles of Chess Mason',
    expectedTitleRe: /principles of chess/i,
    expectedAuthorRe: /mason/i,
    focus: 'positional principles in theory and practice',
  },
  {
    slug: 'freeborough-ranken-chess-openings',
    search: 'Chess Openings Ancient and Modern',
    expectedTitleRe: /chess openings/i,
    expectedAuthorRe: /freeborough|ranken/i,
    focus: 'comprehensive classical opening analysis',
  },
  {
    slug: 'gossip-chess-players-manual',
    search: "The Chess-Player's Manual Gossip",
    expectedTitleRe: /chess.?player.?s manual/i,
    expectedAuthorRe: /gossip/i,
    focus: 'opening theory + classical lines, instructional manual',
  },
  {
    slug: 'steinitz-modern-chess-instructor',
    search: 'The Modern Chess Instructor Steinitz',
    expectedTitleRe: /modern chess instructor/i,
    expectedAuthorRe: /steinitz/i,
    focus: 'the scientific/positional school — the roots of modern strategy',
  },
];

async function fetchWithTimeout(url, ms = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'chess-academy-pro/1.0' },
    });
  } finally {
    clearTimeout(t);
  }
}

/** Resolve a candidate's Gutenberg id by searching gutendex, accepting
 *  only a result whose title AND author match the candidate's regexes.
 *  Returns the id or null (no match → the book is skipped, never faked). */
async function resolveBookId(book) {
  const url = `https://gutendex.com/books/?search=${encodeURIComponent(book.search)}`;
  console.log(`\n[${book.slug}] searching gutendex for "${book.search}"`);
  const r = await fetchWithTimeout(url);
  if (!r.ok) { console.log(`  search fetch ${r.status}`); return null; }
  const data = await r.json();
  for (const res of data.results || []) {
    const authors = (res.authors || []).map(a => a.name).join('; ');
    if (book.expectedTitleRe.test(res.title || '') && book.expectedAuthorRe.test(authors)) {
      console.log(`  matched #${res.id}: "${res.title}" — ${authors}`);
      return res.id;
    }
  }
  console.log(`  no PD match (checked ${(data.results || []).length} results)`);
  return null;
}

async function fetchBook(book) {
  // Candidates carry no id — discover it (and verify identity) via search.
  if (!book.id) {
    const id = await resolveBookId(book);
    if (!id) return { ...book, status: 'search-no-match' };
    book = { ...book, id };
  }
  // Pull metadata first to verify author + title match
  const metaUrl = `https://gutendex.com/books/${book.id}`;
  console.log(`\n[${book.slug}] verifying #${book.id}`);
  const mr = await fetchWithTimeout(metaUrl);
  if (!mr.ok) {
    console.log(`  metadata fetch ${mr.status}`);
    return { ...book, status: 'meta-fail' };
  }
  const meta = await mr.json();
  const authors = (meta.authors || []).map(a => a.name).join('; ');
  console.log(`  title: "${meta.title}"`);
  console.log(`  authors: ${authors}`);
  if (!book.expectedTitleRe.test(meta.title || '')) {
    console.log(`  TITLE MISMATCH expected ${book.expectedTitleRe} got "${meta.title}"`);
    return { ...book, status: 'title-mismatch', actualTitle: meta.title };
  }
  if (!book.expectedAuthorRe.test(authors)) {
    console.log(`  AUTHOR MISMATCH expected ${book.expectedAuthorRe} got "${authors}"`);
    return { ...book, status: 'author-mismatch', actualAuthors: authors };
  }
  // Pull the plain-text body
  const formats = meta.formats || {};
  const textKey = Object.keys(formats).find(k =>
    k === 'text/plain; charset=utf-8' ||
    k === 'text/plain; charset=us-ascii' ||
    k.startsWith('text/plain')
  );
  if (!textKey) {
    console.log(`  NO PLAIN-TEXT FORMAT`);
    return { ...book, status: 'no-text-format' };
  }
  const textUrl = formats[textKey];
  const tr = await fetchWithTimeout(textUrl, 60000);
  if (!tr.ok) {
    console.log(`  body fetch ${tr.status}`);
    return { ...book, status: 'body-fetch-fail' };
  }
  const text = await tr.text();
  console.log(`  fetched ${(text.length / 1024).toFixed(0)}KB`);
  const path = `${OUT_DIR}/${book.slug}.txt`;
  await writeFile(path, text, 'utf-8');
  return {
    slug: book.slug,
    gutenbergId: book.id,
    title: meta.title,
    authors,
    focus: book.focus,
    subjects: (meta.subjects || []).slice(0, 5),
    bytes: text.length,
    path: path.replace(`${OUT_DIR}/`, ''),
    textUrl,
    status: 'fetched',
  };
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  const all = [...BOOKS, ...CANDIDATES];
  console.log(`Fetching ${BOOKS.length} verified + ${CANDIDATES.length} candidate chess books from Gutenberg → ${OUT_DIR}/`);
  const manifest = [];
  for (const book of all) {
    try {
      manifest.push(await fetchBook(book));
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      manifest.push({ ...book, status: 'error', error: e.message });
    }
  }
  await writeFile(
    `${OUT_DIR}/manifest.json`,
    JSON.stringify({ fetchedAt: new Date().toISOString(), books: manifest }, null, 2)
  );
  console.log(`\n=== SUMMARY ===`);
  const ok = manifest.filter(b => b.status === 'fetched');
  console.log(`fetched: ${ok.length}/${all.length}`);
  for (const b of ok) console.log(`  #${String(b.gutenbergId).padEnd(6)} ${b.title} — ${b.authors}`);
  const failed = manifest.filter(b => b.status !== 'fetched');
  if (failed.length) {
    console.log(`\nNOT fetched:`);
    for (const b of failed) console.log(`  ${b.slug}: ${b.status}`);
  }
  console.log(`\nManifest at ${OUT_DIR}/manifest.json`);
}
main().catch(e => { console.error(e); process.exit(1); });

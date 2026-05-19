#!/usr/bin/env node
/**
 * Fetches public-domain chess instruction books from Project Gutenberg.
 *
 * Run from David's laptop (NOT the Claude sandbox — gutenberg.org is
 * blocked). The fetched .txt files commit to
 * docs/audit-runs/2026-05-19-chess-books-raw/ and a subsequent
 * sandbox-side script parses + tags them into
 * src/data/chess-concepts.json.
 *
 *   node scripts/fetch-chess-books.mjs
 *
 * All books are confirmed US public domain (pre-1929) and freely
 * mirrored by Project Gutenberg. URLs use Gutenberg's stable
 * /cache/epub/<id>/pg<id>.txt pattern; falls back to /files/<id>/
 * if the cache URL 404s.
 */

import { mkdir, writeFile } from 'node:fs/promises';

const OUT_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';

const BOOKS = [
  // Capablanca — World Champion 1921-1927, considered the most natural
  // positional player ever. Chess Fundamentals (1921) is THE classic
  // intro to positional principles + endgame technique.
  {
    id: 45474,
    slug: 'capablanca-chess-fundamentals-1921',
    author: 'José Raúl Capablanca',
    title: 'Chess Fundamentals',
    year: 1921,
    focus: 'positional principles, endgame technique, pawn structures',
  },
  // Lasker — World Champion 1894-1921. Common Sense in Chess is his
  // 1895 London lecture series, distilled. Carries the "fight for the
  // initiative, every move has a purpose" ethos.
  {
    id: 25888,
    slug: 'lasker-common-sense-in-chess-1896',
    author: 'Emanuel Lasker',
    title: 'Common Sense in Chess',
    year: 1896,
    focus: 'opening principles, middlegame strategy, tempo',
  },
  // Edward Lasker — strong master + popularizer. Chess Strategy is a
  // very practical 1915 book; covers opening + middlegame planning at
  // a level a student can actually use.
  {
    id: 1564,
    slug: 'edward-lasker-chess-strategy-1915',
    author: 'Edward Lasker',
    title: 'Chess Strategy',
    year: 1915,
    focus: 'opening systems, planning, classical principles',
  },
  // Mason — late-1800s strong master, instructional writer. Principles
  // of Chess (1894) carries Steinitz-era positional theory in plain
  // prose; a good source for early formulations of "centre", "weak
  // squares", "open files".
  {
    id: 50469,
    slug: 'mason-principles-of-chess-1894',
    author: 'James Mason',
    title: 'The Principles of Chess in Theory and Practice',
    year: 1894,
    focus: 'classical positional principles',
  },
  // Pillsbury — American master, brilliant attacker. Pillsbury's Chess
  // Career (1922 ed.) collects his attacking games with notes.
  {
    id: 38445,
    slug: 'pillsbury-chess-career-1922',
    author: 'Harry Nelson Pillsbury / P. W. Sergeant',
    title: "Pillsbury's Chess Career",
    year: 1922,
    focus: 'attacking play, sacrificial themes',
  },
];

async function fetchOne(book) {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`,
    `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`,
    `https://www.gutenberg.org/files/${book.id}/${book.id}.txt`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': 'chess-academy-pro/1.0 (research; david@yahnke.pro)' },
      });
      if (!r.ok) {
        console.log(`  ${url} -> ${r.status}, trying next`);
        continue;
      }
      const text = await r.text();
      if (text.length < 10000) {
        console.log(`  ${url} -> too short (${text.length} bytes), trying next`);
        continue;
      }
      return { text, url };
    } catch (e) {
      console.log(`  ${url} -> error ${e.message}, trying next`);
    }
  }
  return null;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Fetching ${BOOKS.length} chess books to ${OUT_DIR}/\n`);
  const manifest = [];
  for (const book of BOOKS) {
    console.log(`[${book.slug}] ${book.author} — ${book.title} (${book.year})`);
    const result = await fetchOne(book);
    if (!result) {
      console.log(`  FAILED — could not fetch from any URL`);
      manifest.push({ ...book, status: 'failed' });
      continue;
    }
    const path = `${OUT_DIR}/${book.slug}.txt`;
    await writeFile(path, result.text, 'utf-8');
    console.log(`  ✓ ${(result.text.length / 1024).toFixed(0)}KB from ${result.url}`);
    manifest.push({
      ...book,
      status: 'fetched',
      sourceUrl: result.url,
      bytes: result.text.length,
      path: path.replace(`${OUT_DIR}/`, ''),
    });
  }
  await writeFile(
    `${OUT_DIR}/manifest.json`,
    JSON.stringify({ fetchedAt: new Date().toISOString(), books: manifest }, null, 2)
  );
  console.log(`\nManifest at ${OUT_DIR}/manifest.json`);
  const ok = manifest.filter(b => b.status === 'fetched').length;
  console.log(`Done: ${ok}/${BOOKS.length} books fetched.`);
}

main().catch(e => { console.error(e); process.exit(1); });

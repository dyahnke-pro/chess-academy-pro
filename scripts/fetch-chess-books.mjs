#!/usr/bin/env node
/**
 * Fetches public-domain chess instruction books from Project Gutenberg
 * by SEARCHING the catalog — no hardcoded IDs (the previous version
 * had memory-guessed IDs that turned out to be unrelated books).
 *
 * Uses gutendex.com, a stable open JSON API mirror of Gutenberg's
 * catalog (https://gutendex.com/). Searches by author+title, picks
 * the best match, fetches the .txt body from Gutenberg.
 *
 * Run on David's laptop:
 *   node scripts/fetch-chess-books.mjs
 *
 * Output:
 *   docs/audit-runs/2026-05-19-chess-books-raw/<slug>.txt
 *   docs/audit-runs/2026-05-19-chess-books-raw/manifest.json
 *
 * The script LOGS each match — verify the fetched title/author
 * before relying on the content.
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';

const OUT_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';

// Each entry tries a CHAIN of search queries until one returns
// a result matching the author regex. The wider the chain, the more
// likely to find the book — but also more chance of picking the
// wrong edition. Author regex is the safety net.
const BOOKS = [
  {
    slug: 'capablanca-chess-fundamentals',
    queryChain: ['Chess Fundamentals Capablanca', 'Capablanca chess', 'Capablanca'],
    titleMatch: /chess.*fundamentals|fundamentals.*chess/i,
    authorMatch: /capablanca/i,
    focus: 'positional principles, endgame technique',
  },
  {
    slug: 'capablanca-my-chess-career',
    queryChain: ['My Chess Career Capablanca', 'Capablanca career', 'Capablanca'],
    titleMatch: /chess career|my chess/i,
    authorMatch: /capablanca/i,
    focus: 'annotated games, attacking + positional play',
  },
  {
    slug: 'emanuel-lasker-common-sense-in-chess',
    queryChain: ['Common Sense in Chess', 'Lasker chess', 'Emanuel Lasker'],
    titleMatch: /common.*sense.*chess/i,
    authorMatch: /^(?!.*edward).*lasker/i,
    focus: 'opening principles, middlegame strategy',
  },
  {
    slug: 'edward-lasker-chess-strategy',
    queryChain: ['Edward Lasker Chess Strategy', 'Chess Strategy', 'Edward Lasker'],
    titleMatch: /chess.*strategy/i,
    authorMatch: /edward.*lasker|lasker.*edward/i,
    focus: 'opening systems, planning',
  },
  {
    slug: 'mason-principles-of-chess',
    queryChain: ['Mason Principles Chess', 'James Mason chess', 'Mason chess'],
    titleMatch: /principles.*chess|chess.*practice/i,
    authorMatch: /mason/i,
    focus: 'classical positional principles',
  },
  {
    slug: 'pillsbury-chess-career',
    queryChain: ['Pillsbury chess', "Pillsbury's chess career", 'Sergeant chess'],
    titleMatch: /pillsbury/i,
    authorMatch: /sergeant|pillsbury/i,
    focus: 'attacking play, sacrificial themes',
  },
  {
    slug: 'staunton-chess-players-handbook',
    queryChain: ["Chess Player's Handbook", 'Staunton chess', 'Staunton'],
    titleMatch: /chess.*player.*handbook|handbook.*chess/i,
    authorMatch: /staunton/i,
    focus: 'classical opening theory',
  },
  {
    slug: 'morphy-games-of-chess',
    queryChain: ['Morphy chess games', 'Paul Morphy', 'Morphy'],
    titleMatch: /morphy|chess/i,
    authorMatch: /morphy|lange|maroczy/i,
    focus: 'attacking play, romantic era',
  },
];

async function searchGutendexOnce(query, authorMatch, titleMatch) {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}&languages=en`;
  const r = await fetch(url, { headers: { 'user-agent': 'chess-academy-pro/1.0' } });
  if (!r.ok) throw new Error(`gutendex ${r.status}`);
  const data = await r.json();
  if (!data.results || data.results.length === 0) return { matches: [], total: 0 };
  const matches = data.results.filter(b => {
    const authors = (b.authors || []).map(a => a.name).join(' ');
    const title = b.title || '';
    const authorOk = authorMatch.test(authors);
    const titleOk = !titleMatch || titleMatch.test(title);
    return authorOk && titleOk;
  });
  matches.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  return { matches, total: data.results.length };
}

async function searchGutendex(queryChain, authorMatch, titleMatch) {
  for (const query of queryChain) {
    console.log(`  trying query: "${query}"`);
    const { matches, total } = await searchGutendexOnce(query, authorMatch, titleMatch);
    if (matches.length > 0) {
      console.log(`  ${matches.length}/${total} results matched author+title`);
      return matches[0];
    }
    console.log(`  ${total} raw results, 0 matched filters`);
  }
  return null;
}

function pickTextUrl(formats) {
  // Gutenberg formats include text/plain in multiple encodings.
  // Prefer plain UTF-8.
  const keys = Object.keys(formats);
  const utf8 = keys.find(k => k === 'text/plain; charset=utf-8');
  if (utf8) return formats[utf8];
  const ascii = keys.find(k => k === 'text/plain; charset=us-ascii');
  if (ascii) return formats[ascii];
  const plain = keys.find(k => k.startsWith('text/plain'));
  if (plain) return formats[plain];
  return null;
}

async function fetchBookText(book) {
  console.log(`\n[${book.slug}]`);
  const match = await searchGutendex(book.queryChain, book.authorMatch, book.titleMatch);
  if (!match) {
    console.log(`  NO MATCH FOUND on gutendex after ${book.queryChain.length} queries`);
    return null;
  }
  const authors = (match.authors || []).map(a => a.name).join('; ');
  console.log(`  MATCH: #${match.id} "${match.title}" — ${authors}`);
  console.log(`  downloads: ${match.download_count}, subjects: ${(match.subjects || []).slice(0, 3).join(' / ')}`);
  const textUrl = pickTextUrl(match.formats || {});
  if (!textUrl) {
    console.log(`  NO PLAIN-TEXT FORMAT on this book`);
    return null;
  }
  const tr = await fetch(textUrl, { headers: { 'user-agent': 'chess-academy-pro/1.0' } });
  if (!tr.ok) {
    console.log(`  fetch ${textUrl} -> ${tr.status}`);
    return null;
  }
  const text = await tr.text();
  console.log(`  fetched ${(text.length / 1024).toFixed(0)}KB`);
  return { match, textUrl, text, authors };
}

async function main() {
  // Wipe the previous wrong fetch
  try {
    await rm(OUT_DIR, { recursive: true, force: true });
  } catch {}
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Fetching chess books via gutendex.com search → ${OUT_DIR}/`);
  const manifest = [];
  for (const book of BOOKS) {
    try {
      const result = await fetchBookText(book);
      if (!result) {
        manifest.push({ ...book, status: 'no-match' });
        continue;
      }
      const path = `${OUT_DIR}/${book.slug}.txt`;
      await writeFile(path, result.text, 'utf-8');
      manifest.push({
        slug: book.slug,
        gutenbergId: result.match.id,
        title: result.match.title,
        authors: result.authors,
        queryChain: book.queryChain,
        focus: book.focus,
        textUrl: result.textUrl,
        bytes: result.text.length,
        path: path.replace(`${OUT_DIR}/`, ''),
        subjects: (result.match.subjects || []).slice(0, 5),
        status: 'fetched',
      });
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
  console.log(`fetched: ${ok.length}/${BOOKS.length}`);
  for (const b of ok) console.log(`  #${b.gutenbergId.toString().padEnd(6)} ${b.title} — ${b.authors}`);
  const failed = manifest.filter(b => b.status !== 'fetched');
  if (failed.length) {
    console.log(`\nNOT fetched (re-check on gutenberg.org and update searchTerms/authorMatch):`);
    for (const b of failed) console.log(`  ${b.slug}: ${b.status}`);
  }
  console.log(`\nManifest at ${OUT_DIR}/manifest.json`);
}
main().catch(e => { console.error(e); process.exit(1); });

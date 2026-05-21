#!/usr/bin/env node
/**
 * Diagnostic — lists PUBLIC-DOMAIN chess texts on the Internet Archive,
 * so we curate corpus additions from the real catalogue (and only PD
 * ones) instead of guessing. Internet Archive is far larger than
 * Gutenberg but the texts are OCR scans, so anything we eventually
 * ingest needs heavier cleaning — this is the SCOUT step, not the fetch.
 *
 * Run on David's laptop (archive.org is sandbox-blocked):
 *   node scripts/list-archive-chess.mjs
 *
 * Filters HARD on copyright: only `possible-copyright-status =
 * NOT_IN_COPYRIGHT`. Still eyeball each before ingesting — IA's metadata
 * is crowd-sourced and occasionally wrong. Writes the full JSON for review.
 */

import { mkdir, writeFile } from 'node:fs/promises';

const OUT_DIR = 'docs/audit-runs/2026-05-19-chess-books-raw';

const FIELDS = ['identifier', 'title', 'creator', 'year', 'possible-copyright-status', 'licenseurl', 'downloads'];
const Q = 'subject:(chess) AND mediatype:texts AND possible-copyright-status:NOT_IN_COPYRIGHT AND language:(English OR eng)';

function buildUrl(page) {
  const params = new URLSearchParams();
  params.set('q', Q);
  for (const f of FIELDS) params.append('fl[]', f);
  params.append('sort[]', 'year asc');
  params.set('rows', '200');
  params.set('page', String(page));
  params.set('output', 'json');
  return `https://archive.org/advancedsearch.php?${params.toString()}`;
}

async function fetchWithTimeout(url, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'chess-academy-pro/1.0' } });
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Scouting Internet Archive for PUBLIC-DOMAIN chess texts...\n');
  const docs = [];
  let page = 1;
  let numFound = 0;
  while (page <= 10) {
    process.stdout.write(`page ${page} ... `);
    let r;
    try { r = await fetchWithTimeout(buildUrl(page)); }
    catch (e) { console.log(`error: ${e.message}`); break; }
    if (!r.ok) { console.log(`HTTP ${r.status}`); break; }
    const data = await r.json();
    numFound = data.response?.numFound ?? 0;
    const batch = data.response?.docs ?? [];
    console.log(`${batch.length} (catalog total: ${numFound})`);
    docs.push(...batch);
    if (docs.length >= numFound || batch.length === 0) break;
    page++;
  }

  console.log(`\n=== ${docs.length} PD chess texts on Internet Archive (total ${numFound}) ===`);
  console.log('(identifier — year — creator — title; download with <id>_djvu.txt)\n');
  for (const d of docs) {
    const yr = String(d.year || '????').padStart(4);
    const who = (Array.isArray(d.creator) ? d.creator.join('; ') : d.creator || '(anon)').slice(0, 30).padEnd(30);
    console.log(`${yr} | ${who} | ${d.identifier} — ${(d.title || '').slice(0, 70)}`);
  }

  const outPath = `${OUT_DIR}/archive-chess-pd-list.json`;
  await writeFile(outPath, JSON.stringify(docs, null, 2));
  console.log(`\nFull JSON written to ${outPath}`);
  console.log('Paste the list back; I curate the instructional ones, you confirm, THEN we build the OCR fetch+clean.');
}

main().catch((e) => { console.error('\nERROR:', e.message); process.exit(1); });

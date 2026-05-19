#!/usr/bin/env node
/**
 * Diagnostic — lists EVERY chess-subject book on gutendex.com.
 * Uses topic=chess (filters by subject), much more efficient than
 * search-string roulette. Prints each page as it arrives + a 10s
 * fetch timeout so the script can't silently hang.
 */

async function fetchWithTimeout(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'chess-academy-pro/1.0' },
    });
    return r;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log('Listing every chess-subject book on gutendex.com...\n');
  let url = 'https://gutendex.com/books?topic=chess&languages=en';
  let pageNum = 0;
  let total = 0;
  const all = [];
  while (url) {
    pageNum++;
    process.stdout.write(`page ${pageNum} ... `);
    let r;
    try {
      r = await fetchWithTimeout(url, 15000);
    } catch (e) {
      console.log(`TIMEOUT/error: ${e.message}`);
      break;
    }
    if (!r.ok) { console.log(`HTTP ${r.status}`); break; }
    const data = await r.json();
    total = data.count || 0;
    const results = data.results || [];
    console.log(`${results.length} books (catalog total: ${total})`);
    for (const b of results) all.push(b);
    url = data.next;
    if (pageNum >= 10) { console.log('hit 10-page cap'); break; }
  }
  console.log(`\n=== ${all.length} chess-subject books (catalog total ${total}) ===\n`);
  all.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  for (const b of all) {
    const authors = (b.authors || []).map(a => a.name).join('; ');
    const dl = String(b.download_count || 0).padStart(5);
    console.log(`#${String(b.id).padEnd(6)} ${dl} dl | ${authors.padEnd(35).slice(0, 35)} | ${b.title}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });

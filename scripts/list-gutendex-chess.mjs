#!/usr/bin/env node
/**
 * Diagnostic — lists EVERY chess-tagged book on gutendex.com so we
 * know what's actually fetchable. Paginates through the full set.
 *
 * Run on David's laptop, paste output back. We'll pick the actual
 * available books from the result instead of guessing IDs / titles.
 */

const MAX_PAGES = 5;

async function main() {
  const queries = ['chess', 'chess strategy', 'chess fundamentals', 'chess opening'];
  const seen = new Map();
  for (const q of queries) {
    let url = `https://gutendex.com/books?search=${encodeURIComponent(q)}&languages=en`;
    let page = 0;
    while (url && page < MAX_PAGES) {
      const r = await fetch(url, { headers: { 'user-agent': 'chess-academy-pro/1.0' } });
      if (!r.ok) { console.error(`${url} -> ${r.status}`); break; }
      const data = await r.json();
      for (const b of data.results || []) {
        if (seen.has(b.id)) continue;
        const subjects = (b.subjects || []).join(' / ').toLowerCase();
        const title = (b.title || '').toLowerCase();
        // Keep only chess-related
        if (subjects.includes('chess') || title.includes('chess')) {
          seen.set(b.id, b);
        }
      }
      url = data.next;
      page++;
    }
  }
  const all = [...seen.values()].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  console.log(`=== ${all.length} chess-tagged books on gutendex ===\n`);
  for (const b of all) {
    const authors = (b.authors || []).map(a => a.name).join('; ');
    const subj = (b.subjects || []).slice(0, 3).join(' | ');
    const dl = String(b.download_count || 0).padStart(5);
    console.log(`#${String(b.id).padEnd(6)} ${dl} dl | ${authors.padEnd(40).slice(0, 40)} | ${b.title}`);
    if (subj) console.log(`         subjects: ${subj}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });

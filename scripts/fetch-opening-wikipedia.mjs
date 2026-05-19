#!/usr/bin/env node
/**
 * Fetches Wikipedia opening intros for the 24 openings that don't
 * have public-domain book passages tagged. Output is parsed into
 * chess-concepts.json's existing openingDefinitions slot.
 *
 * Run on David's laptop — sandbox blocks Wikipedia. From repo root:
 *   node scripts/fetch-opening-wikipedia.mjs
 *
 * Output: docs/audit-runs/wikipedia-openings-<iso>/
 *   - <opening>.json  per-opening API response (cached)
 *   - manifest.json   summary
 *
 * Wikipedia content is CC BY-SA 4.0 — attribution required.
 * Output JSON includes `attribution` and `url` for each entry so
 * the UI / parser can credit Wikipedia.
 *
 * After running:
 *   node scripts/parse-wikipedia-openings.mjs <output-dir>
 *   → merges into src/data/chess-concepts.json's openingDefinitions
 *     replacing the modern-definition fallback I hand-wrote with
 *     real Wikipedia-attributed prose.
 */

import { writeFileSync, mkdirSync } from 'node:fs';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `docs/audit-runs/wikipedia-openings-${stamp}`;
mkdirSync(OUT_DIR, { recursive: true });

// Each opening: { id, wikipediaTitle }
// wikipediaTitle is the exact title slug Wikipedia uses (with underscores).
// Validated by manual lookup at en.wikipedia.org/wiki/<title>.
const OPENINGS = [
  { id: 'alekhine-defence', wikipediaTitle: "Alekhine's_Defence" },
  { id: 'benko-gambit', wikipediaTitle: 'Benko_Gambit' },
  { id: 'benoni-defence', wikipediaTitle: 'Benoni_Defense' },
  { id: 'birds-opening', wikipediaTitle: "Bird's_Opening" },
  { id: 'budapest-gambit', wikipediaTitle: 'Budapest_Gambit' },
  { id: 'catalan-opening', wikipediaTitle: 'Catalan_Opening' },
  { id: 'english-opening', wikipediaTitle: 'English_Opening' },
  { id: 'grunfeld-defence', wikipediaTitle: 'Grünfeld_Defence' },
  { id: 'kings-indian-attack', wikipediaTitle: "King's_Indian_Attack" },
  { id: 'kings-indian-defence', wikipediaTitle: "King's_Indian_Defence" },
  { id: 'london-system', wikipediaTitle: 'London_System' },
  { id: 'nimzo-indian', wikipediaTitle: 'Nimzo-Indian_Defence' },
  { id: 'pirc-defence', wikipediaTitle: 'Pirc_Defence' },
  { id: 'qga', wikipediaTitle: "Queen's_Gambit_Accepted" },
  { id: 'queens-indian', wikipediaTitle: "Queen's_Indian_Defence" },
  { id: 'scandinavian-defence', wikipediaTitle: 'Scandinavian_Defense' },
  { id: 'scotch-game', wikipediaTitle: 'Scotch_Game' },
  { id: 'semi-slav', wikipediaTitle: 'Semi-Slav_Defense' },
  { id: 'sicilian-alapin', wikipediaTitle: 'Alapin_Variation' },
  { id: 'sicilian-dragon', wikipediaTitle: 'Sicilian_Defence,_Dragon_Variation' },
  { id: 'sicilian-najdorf', wikipediaTitle: 'Sicilian_Defence,_Najdorf_Variation' },
  { id: 'sicilian-sveshnikov', wikipediaTitle: 'Sicilian_Defence,_Sveshnikov_Variation' },
  { id: 'slav-defence', wikipediaTitle: 'Slav_Defense' },
  { id: 'trompowsky-attack', wikipediaTitle: 'Trompowsky_Attack' },
];

// Wikipedia REST API — returns plain-text intro section. CC BY-SA 4.0.
function buildUrl(title) {
  return `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
}

async function fetchOne(opening) {
  const url = buildUrl(opening.wikipediaTitle);
  console.log(`\n[${opening.id}] ${opening.wikipediaTitle}`);
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'user-agent': 'chess-academy-pro/1.0 (opening-content-fetcher)',
        accept: 'application/json',
      },
    });
  } catch (e) {
    console.log(`  fetch error: ${e.message}`);
    return { ...opening, status: 'fetch-error', error: e.message };
  }
  if (!response.ok) {
    console.log(`  HTTP ${response.status}`);
    return { ...opening, status: 'http-error', code: response.status };
  }
  const data = await response.json();
  console.log(`  title: ${data.title}`);
  console.log(`  extract length: ${(data.extract ?? '').length} chars`);
  const out = {
    id: opening.id,
    status: 'fetched',
    wikipediaTitle: data.title,
    extract: data.extract,
    extractHtml: data.extract_html,
    canonicalUrl: data.content_urls?.desktop?.page,
    pageId: data.pageid,
    attribution: 'CC BY-SA 4.0 — Wikipedia',
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(`${OUT_DIR}/${opening.id}.json`, JSON.stringify(out, null, 2));
  return out;
}

async function main() {
  console.log(`Fetching ${OPENINGS.length} Wikipedia opening intros → ${OUT_DIR}/`);
  const manifest = [];
  for (const opening of OPENINGS) {
    const result = await fetchOne(opening);
    manifest.push(result);
    // 1-second courtesy delay between Wikipedia requests
    await new Promise((r) => setTimeout(r, 1000));
  }
  writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'Wikipedia (en.wikipedia.org REST API)',
    license: 'CC BY-SA 4.0',
    count: manifest.length,
    fetched: manifest.filter((m) => m.status === 'fetched').length,
    failed: manifest.filter((m) => m.status !== 'fetched').length,
    entries: manifest,
  }, null, 2));
  const okCount = manifest.filter((m) => m.status === 'fetched').length;
  console.log(`\n=== DONE: ${okCount}/${OPENINGS.length} fetched ===`);
  console.log(`Output: ${OUT_DIR}/`);
  console.log(`Next: commit + push, then in sandbox: node scripts/merge-wikipedia-openings.mjs ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

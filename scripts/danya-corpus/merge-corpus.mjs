#!/usr/bin/env node
/**
 * merge-corpus — all distilled per-video notes → src/data/danya-teachings.json,
 * the SHIPPED corpus every coach surface grounds on (via danyaTeachingService).
 *
 * Dedup: same lineSan key + near-identical `teaches` (normalized 0.8 token
 * overlap) keeps the longer note. Prose bounds enforced. Sources required.
 * Re-run after every distill wave — the corpus only grows (and prints
 * coverage so each wave's gain is visible).
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolveCreator } from './creator.mjs';

const CREATOR = resolveCreator();
const DDIR = CREATOR.distilled;
const OUT = CREATOR.corpus;

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
function similar(a, b) {
  const A = new Set(norm(a).split(' '));
  const B = new Set(norm(b).split(' '));
  if (A.size === 0 || B.size === 0) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / Math.min(A.size, B.size) >= 0.8;
}

/** G9.4 voice-register normalization: "1.e4" → "e4", "1...g6" → "…g6" —
 *  Polly reads "1." as "one". Stats/decimals never match (the regex requires
 *  a SAN token right after the number+dot). */
function stripMoveNumbers(s) {
  return s
    .replace(/\b\d{1,2}(?:\.\.\.|…)(?=[NBRQKO]|[a-h][1-8x])/g, '…')
    .replace(/\b\d{1,2}\.(?=[NBRQKO]|[a-h][1-8x])/g, '');
}

const DDIR_V2 = CREATOR.distilledV2;

// Mirrors src/data/<creator>Teachings.test.ts BANNED — keep in sync. The base
// list is shared; each creator adds its own name + medium terms (creator.mjs),
// so adding a creator never changes what another creator's merge drops.
const BANNED_BASE = ['naroditsky', 'danya', 'in this video', 'in the video', 'the streamer', 'chat', 'subscribe', 'this stream'];
const BANNED = new RegExp(`\\b(${[...BANNED_BASE, ...(CREATOR.bannedExtra ?? [])].join('|')})\\b`, 'i');

async function main() {
  // v2 (chunked distiller, ~5x denser, code-stamped opening) REPLACES v1
  // per-video; v1 fills in every video v2 hasn't re-distilled yet, so breadth
  // never regresses while the re-distill rolls through the catalog.
  let v1Files = [];
  try { v1Files = (await readdir(DDIR)).filter((f) => f.endsWith('.json')); } catch { /* v1 intermediates absent */ }
  let v2Files = [];
  try { v2Files = (await readdir(DDIR_V2)).filter((f) => f.endsWith('.json')); } catch { /* no v2 yet */ }
  const v2Ids = new Set(v2Files.map((f) => f.replace(/\.json$/, '')));
  const files = [
    ...v2Files.map((f) => `${DDIR_V2}/${f}`),
    ...v1Files.filter((f) => !v2Ids.has(f.replace(/\.json$/, ''))).map((f) => `${DDIR}/${f}`),
  ];
  const all = [];
  // Per-video intermediates are gitignored and the container is ephemeral, so
  // v1's distilled dir usually does NOT exist here. The v1 notes' durable home
  // is the SHIPPED corpus — carry forward every shipped note whose source
  // video hasn't been re-distilled by v2, so breadth never regresses.
  let carried = 0;
  if (v1Files.length === 0) {
    try {
      const shipped = JSON.parse(await readFile(OUT, 'utf8'));
      for (const n of shipped.notes ?? []) {
        const vid = (n.sources?.[0] ?? '').replace(/^yt:/, '');
        if (v2Ids.has(vid)) continue;
        // Carried notes get the same depersonalization ban as fresh ones —
        // the v1 corpus shipped with at least one "(Naroditsky vs. …)" leak
        // that predates the gate's enforcement here.
        if (BANNED.test(n.explains ?? '') || BANNED.test(n.teaches ?? '') || BANNED.test(n.plans ?? '') || BANNED.test(n.opening ?? '')) continue;
        const { id, ...rest } = n; // ids are reassigned at the end
        all.push(rest);
        carried += 1;
      }
    } catch { /* no shipped corpus either — fresh build */ }
    console.log(`[merge] carried ${carried} shipped v1 notes (videos not yet re-distilled)`);
  }
  for (const path of files) {
    const d = JSON.parse(await readFile(path, 'utf8'));
    for (const n of d.notes ?? []) {
      if (!n.explains || !n.teaches || !Array.isArray(n.sources) || n.sources.length === 0) continue;
      // ANCHORING — three ways a note can be selectable, not two.
      //
      // A position key or an opening name were the only anchors, on the
      // assumption that all teaching hangs off an opening. Most does not.
      // 11,921 Saint Louis notes were dropped here — "in endgames the king is
      // an attacking piece", "do not trade pieces just to trade", "target the
      // weakness in the pawn structure" — universal principles that belong to
      // a PHASE and a CONCEPT and to no opening at all. Forcing them under an
      // opening label is what produced generic endgame advice tagged
      // Caro-Kann (2026-08-02); dropping them threw the teaching away.
      // So a note also anchors when it says WHEN it applies (phase) and WHAT
      // it is about (concepts) — the runtime selects on those instead.
      const conceptAnchored = !!n.phase && Array.isArray(n.concepts) && n.concepts.length > 0;
      if ((n.lineSan ?? []).length === 0 && !n.opening && !conceptAnchored) continue;
      // An opening NAME alone is not enough to be worth keeping. A note with no
      // position and no concepts has nothing in it a caller could select on
      // except a label — and the one note in 28,797 that fits that description
      // is the distiller reporting "No chess ideas are present in this
      // excerpt", which is an empty chunk, not teaching.
      if ((n.lineSan ?? []).length === 0 && !conceptAnchored) continue;
      n.explains = stripMoveNumbers(n.explains);
      n.teaches = stripMoveNumbers(n.teaches);
      n.plans = stripMoveNumbers(n.plans ?? '');
      if (n.explains.length > 600 || n.teaches.length > 400 || (n.plans ?? '').length > 400) continue;
      // Depersonalization ban (mirrors danyaTeachings.test.ts BANNED) — the
      // distill prompt forbids naming the teacher/medium, but one leak per few
      // thousand notes still gets through the model. Drop mechanically here so
      // the gate never trips on a merge output.
      if (BANNED.test(n.explains) || BANNED.test(n.teaches) || BANNED.test(n.plans ?? '') || BANNED.test(n.opening ?? '')) continue;
      all.push(n);
    }
  }

  // Dedup within each position key.
  const byKey = new Map();
  for (const n of all) {
    const key = (n.lineSan ?? []).join(' ');
    if (!byKey.has(key)) byKey.set(key, []);
    const bucket = byKey.get(key);
    const dupIdx = bucket.findIndex((m) => similar(m.teaches, n.teaches));
    if (dupIdx >= 0) {
      if ((n.explains.length + n.teaches.length) > (bucket[dupIdx].explains.length + bucket[dupIdx].teaches.length)) {
        bucket[dupIdx] = n;
      }
    } else {
      bucket.push(n);
    }
  }

  const notes = [...byKey.values()].flat().map((n, i) => ({ id: `${CREATOR.idPrefix}-${i.toString(36)}`, ...n }));
  const positioned = notes.filter((n) => n.lineSan.length > 0);
  const openings = new Set(notes.map((n) => n.opening).filter(Boolean));
  const phases = notes.reduce((acc, n) => { acc[n.phase] = (acc[n.phase] ?? 0) + 1; return acc; }, {});

  // v2VideoIds makes the distill DURABLE across ephemeral containers: the
  // shipped corpus records which videos already went through the v2 chunked
  // distiller, so distill-v2 skips them even when the gitignored per-video
  // intermediates are gone. Union with any prior marker — the set only grows.
  let priorV2 = [];
  try { priorV2 = JSON.parse(await readFile(OUT, 'utf8')).v2VideoIds ?? []; } catch { /* fresh */ }
  const v2VideoIds = [...new Set([...priorV2, ...v2Ids])].sort();

  await writeFile(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    videosDistilled: new Set(notes.map((n) => n.sources?.[0])).size,
    v2VideoIds,
    noteCount: notes.length,
    notes,
  }, null, 1));

  console.log(`[merge] ${files.length} videos → ${notes.length} notes (${positioned.length} position-keyed) → ${OUT}`);
  console.log(`[merge] phases: ${JSON.stringify(phases)}`);
  console.log(`[merge] named openings covered: ${openings.size}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

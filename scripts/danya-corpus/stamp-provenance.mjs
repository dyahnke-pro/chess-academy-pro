#!/usr/bin/env node
/**
 * stamp-provenance — record HOW each note's position was established.
 *
 * THE PROBLEM. A note ships a `lineSan` whether that position was verified or
 * merely guessed, and the runtime cannot tell the two apart. Walking the Ruy
 * through the real selector, five of the ten notes that spoke carried a
 * position the anchor pass either could not confirm or had actively DISPROVED:
 *
 *     ply 4  Nc6  no-spine  "the early d-pawn locks the bishop"  (no d-pawn moved)
 *     ply 5  Bb5  no-spine  "the bishop's fianchetto"            (nothing fianchettoed)
 *     ply 8  Nf6  rejected  describes another position entirely
 *
 * That is the G0 violation stated exactly: the position is the fact that
 * decides whether a note may describe this board, and it was an INFERENCE the
 * chunk aligner made, not something computed. `distill-v2` documents why audio
 * cannot do better — "no amount of parsing separates the line played from a
 * line merely discussed".
 *
 * THE FIX IS NOT ANOTHER CLAIM-STRIPPER. CLAUDE.md is explicit: "The problem is
 * NOT the gate. Gates are back ups that should never fire. Fix the package or
 * how the position is chosen." The anchor pass ALREADY knows which positions it
 * verified; that verdict was computed at farm time and then thrown away. This
 * carries it into the shipped corpus so selection can honour it.
 *
 * The tier is preserved rather than flattened to a boolean, because 'high' and
 * 'medium' are genuinely different evidence and the right cut-off is a tuning
 * decision the data should make, not this script.
 *
 *   node scripts/danya-corpus/stamp-provenance.mjs [--apply]
 *
 * Dry by default: it rewrites the primary narration corpora, so the numbers
 * come first.
 */
import { readFile, writeFile } from 'node:fs/promises';

const APPLY = process.argv.includes('--apply');
const REGISTRY = 'src/data/corpora.json';

/** anchor outcome -> what the position is worth.
 *  high/medium  the pass re-derived the position and checked the note's own
 *               claims against that board.
 *  inferred     no-spine (no matching line could be found at all) or rejected
 *               (a line was found and it DISPROVED the filed position). Both
 *               mean the shipped position is the aligner's guess. */
function provenanceOf(outcome, tier) {
  if (outcome === 'anchored') return tier === 'high' || tier === 'medium' ? tier : 'medium';
  return 'inferred';
}

const registry = JSON.parse(await readFile(REGISTRY, 'utf8'));
const totals = { high: 0, medium: 0, inferred: 0, unrecorded: 0, positioned: 0 };

for (const c of registry.corpora) {
  let report;
  try {
    report = JSON.parse(await readFile(`audit-reports/${c.key}-anchor/report.json`, 'utf8'));
  } catch {
    console.log(`${c.key.padEnd(14)} no anchor report — skipped (positions stay unstamped)`);
    continue;
  }
  const verdict = new Map(report.results.map((r) => [r.id, provenanceOf(r.outcome, r.tier)]));

  const corpus = JSON.parse(await readFile(c.path, 'utf8'));
  const per = { high: 0, medium: 0, inferred: 0, unrecorded: 0 };
  for (const n of corpus.notes) {
    if (!(n.lineSan?.length > 0)) continue;
    totals.positioned += 1;
    const p = verdict.get(n.id);
    if (!p) {
      // No record at all. Treated as INFERRED, deliberately: an unverified
      // position must never inherit the authority of a verified one just
      // because the farm artefact went missing.
      per.unrecorded += 1;
      totals.unrecorded += 1;
      n.positionSource = 'inferred';
      continue;
    }
    per[p] += 1;
    totals[p] += 1;
    n.positionSource = p;
  }

  if (APPLY) {
    corpus.generatedAt = new Date().toISOString();
    await writeFile(c.path, JSON.stringify(corpus, null, 1));
  }
  console.log(
    `${c.key.padEnd(14)} high ${String(per.high).padStart(5)}  medium ${String(per.medium).padStart(5)}`
    + `  inferred ${String(per.inferred).padStart(5)}  no-record ${String(per.unrecorded).padStart(4)}`,
  );
}

const verified = totals.high + totals.medium;
console.log(`\npositioned notes: ${totals.positioned}`);
console.log(`  verified (high+medium): ${verified}  (${((100 * verified) / totals.positioned).toFixed(1)}%)`);
console.log(`  high only:              ${totals.high}  (${((100 * totals.high) / totals.positioned).toFixed(1)}%)`);
console.log(`  inferred:               ${totals.inferred + totals.unrecorded}`);
console.log(APPLY ? '\nAPPLIED.' : '\nDRY RUN — nothing written. Re-run with --apply.');

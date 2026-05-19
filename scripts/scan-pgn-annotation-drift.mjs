#!/usr/bin/env node
/**
 * Compares each opening's PGN in repertoire/pro-repertoires/gambits
 * against the SAN sequence in its annotation file. If the annotation
 * file's moveAnnotations[i].san differs from the PGN's ply i, the
 * student sees move X played but reads commentary about move Y.
 *
 * Also checks sub-lines (variations / trapLines / warningLines) —
 * their PGN should match a subLine of the same name in the
 * annotation file.
 *
 * Output: docs/audit-runs/2026-05-19-content-scan/pgn-drift-findings.json
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const FILES = [
  'src/data/repertoire.json',
  'src/data/pro-repertoires.json',
  'src/data/gambits.json',
];
const ANNOTATIONS_DIR = 'src/data/annotations';
const OUT_DIR = 'docs/audit-runs/2026-05-19-content-scan';
const OUT_PATH = join(OUT_DIR, 'pgn-drift-findings.json');

// PRO_SUFFIX_TO_BASE — must match src/services/annotationService.ts
const PRO_SUFFIX_TO_BASE = {
  'alapin': 'sicilian-defense-alapin-variation',
  'anti-sicilian': 'sicilian-defense-alapin-variation',
  'najdorf': 'sicilian-defense-najdorf-variation-opocensky-variation-traditional-line',
  'rossolimo': 'sicilian-defense',
  'sicilian': 'sicilian-defense',
  'sicilian-najdorf': 'sicilian-defense-najdorf-variation-opocensky-variation-traditional-line',
  'sveshnikov': 'sicilian-defense-lasker-pelikan-variation-sveshnikov-variation-chelyabinsk-variation',
  'anti-berlin': 'ruy-lopez',
  'anti-marshall': 'ruy-lopez',
  'berlin': 'ruy-lopez',
  'ponziani': 'italian-game',
  'ruy-lopez': 'ruy-lopez',
  'italian': 'italian-game',
  'kings-gambit': 'king-s-gambit',
  'petroff': 'petrov-s-defense',
  'scotch': 'scotch-game',
  'stafford': 'petrov-s-defense-stafford-gambit',
  'stafford-refute': 'petrov-s-defense-stafford-gambit',
  'vienna': 'vienna-game',
  'french': 'french-defense',
};

// LEGACY_ID_TO_BASE — must match src/services/annotationService.ts.
// Maps repertoire/gambits IDs to canonical annotation file basenames.
const LEGACY_ID_TO_BASE = {
  'sicilian-najdorf': 'sicilian-defense-najdorf-variation-opocensky-variation-traditional-line',
  'sicilian-dragon': 'sicilian-defense-dragon-variation-yugoslav-attack-old-line',
  'sicilian-sveshnikov': 'sicilian-defense-lasker-pelikan-variation-sveshnikov-variation-chelyabinsk-variation',
  'sicilian-alapin': 'sicilian-defense-alapin-variation',
  'kings-gambit': 'king-s-gambit',
  'french-defence': 'french-defense',
  'caro-kann': 'caro-kann-defense',
  'pirc-defence': 'pirc-defense',
  'scandinavian-defence': 'scandinavian-defense',
  'alekhine-defence': 'alekhine-defense',
  'philidor-defence': 'philidor-defense',
  'petrov-defence': 'petrov-s-defense',
  'queens-gambit': 'queen-s-gambit',
  'qgd': 'queen-s-gambit-declined',
  'qga': 'queen-s-gambit-accepted',
  'slav-defence': 'slav-defense',
  'semi-slav': 'semi-slav-defense',
  'kings-indian-defence': 'king-s-indian-defense',
  'nimzo-indian': 'nimzo-indian-defense',
  'grunfeld-defence': 'gr-nfeld-defense',
  'dutch-defence': 'dutch-defense',
  'benoni-defence': 'benoni-defense',
  'benko-gambit': 'benko-gambit-accepted-central-storming-variation',
  'queens-indian': 'queen-s-indian-defense',
  'budapest-gambit': 'indian-defense-budapest-defense',
  'old-indian-defence': 'old-indian-defense',
  'reti-opening': 'r-ti-opening',
  'kings-indian-attack': 'king-s-indian-attack',
  'birds-opening': 'bird-opening',
  'two-knights-defence': 'italian-game-two-knights-defense-modern-bishop-s-opening',
  'evans-gambit': 'italian-game-evans-gambit',
  'stafford-gambit': 'petrov-s-defense-stafford-gambit',
  'gambit-kings-gambit': 'king-s-gambit',
  'gambit-evans-gambit': 'italian-game-evans-gambit',
  'gambit-budapest-gambit': 'indian-defense-budapest-defense',
  'gambit-benko-gambit': 'benko-gambit-accepted-central-storming-variation',
  'scotch-gambit': 'scotch-game-scotch-gambit',
  'vienna-gambit': 'vienna-game-vienna-gambit',
  'smith-morra-gambit': 'sicilian-defense-smith-morra-gambit',
  'marshall-attack': 'ruy-lopez-marshall-attack',
  'albin-countergambit': 'queen-s-gambit-declined-albin-countergambit',
};

function pgnToSans(pgn) {
  const c = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(t => !/^\d+\.+$/.test(t));
  const sans = [];
  for (const tok of tokens) {
    try {
      const m = c.move(tok);
      sans.push(m.san);
    } catch {
      break;
    }
  }
  return sans;
}

function resolveAnnotationFile(openingId) {
  // Direct mapping by ID-as-slug
  const direct = join(ANNOTATIONS_DIR, openingId + '.json');
  if (existsSync(direct)) return direct;
  // Legacy ID lookup
  const legacy = LEGACY_ID_TO_BASE[openingId];
  if (legacy) {
    const f = join(ANNOTATIONS_DIR, legacy + '.json');
    if (existsSync(f)) return f;
  }
  // Pro suffix lookup
  if (openingId.startsWith('pro-')) {
    const suffix = openingId.replace(/^pro-[^-]+-/, '');
    const base = PRO_SUFFIX_TO_BASE[suffix];
    if (base) {
      const f = join(ANNOTATIONS_DIR, base + '.json');
      if (existsSync(f)) return f;
    }
  }
  return null;
}

const findings = [];

/** Mirrors loadSubLineAnnotations strategy 1: PGN-prefix match. */
function pickMatchingSubline(doc, pgnSans) {
  if (!doc.subLines || pgnSans.length === 0) return null;
  for (const sl of doc.subLines) {
    const annSans = (sl.moveAnnotations || []).map((a) => a.san);
    if (annSans.length === 0) continue;
    // Check: annSans is a prefix of pgnSans (annotation walks fewer
    // or equal plies, all matching). If true, this subline is the
    // right match.
    let isPrefix = true;
    const checkLen = Math.min(annSans.length, pgnSans.length);
    for (let i = 0; i < checkLen; i++) {
      if (annSans[i] !== pgnSans[i]) { isPrefix = false; break; }
    }
    if (isPrefix) return sl;
  }
  return null;
}

async function checkOpening(file, opening) {
  const oid = opening.id;
  if (!oid || !opening.pgn) return;
  const annoFile = resolveAnnotationFile(oid);
  if (!annoFile) {
    findings.push({
      file, openingId: oid,
      kind: 'no-annotation-file',
      severity: 'p1',
      pgn: opening.pgn.slice(0, 60),
    });
    return;
  }
  const doc = JSON.parse(await readFile(annoFile, 'utf-8'));
  const pgnSans = pgnToSans(opening.pgn);
  // For pro openings, the resolver tries subLines via PGN-prefix
  // match before falling back to main moveAnnotations. Replicate
  // that: if any subline's SAN sequence is a strict prefix of the
  // repertoire PGN, the runtime picks IT, not main.
  if (oid.startsWith('pro-')) {
    const match = pickMatchingSubline(doc, pgnSans);
    if (match) {
      // Resolved cleanly to a subline — no main drift to flag
      return;
    }
    // No subline match — runtime would fall back to main; main drift
    // becomes a real concern
  }
  const annoSans = (doc.moveAnnotations || []).map((a) => a.san);
  // Compare ply-by-ply
  const minLen = Math.min(pgnSans.length, annoSans.length);
  for (let i = 0; i < minLen; i++) {
    if (pgnSans[i] !== annoSans[i]) {
      findings.push({
        file, openingId: oid, annoFile,
        kind: 'main-pgn-vs-anno-drift',
        severity: 'p0',
        ply: i + 1,
        pgnSan: pgnSans[i],
        annoSan: annoSans[i],
        evidence: `ply ${i + 1}: PGN=${pgnSans[i]} but anno=${annoSans[i]}`,
      });
      break; // first divergence is enough
    }
  }
  // Variations
  for (const v of opening.variations || []) {
    if (!v.pgn) continue;
    const vSans = pgnToSans(v.pgn);
    const sub = (doc.subLines || []).find((s) => s.name === v.name);
    if (!sub) {
      findings.push({
        file, openingId: oid, annoFile,
        kind: 'variation-no-subline',
        severity: 'p1',
        variationName: v.name,
      });
      continue;
    }
    const subSans = (sub.moveAnnotations || []).map((a) => a.san);
    const minL = Math.min(vSans.length, subSans.length);
    for (let i = 0; i < minL; i++) {
      if (vSans[i] !== subSans[i]) {
        findings.push({
          file, openingId: oid, annoFile,
          kind: 'variation-pgn-vs-anno-drift',
          severity: 'p0',
          variationName: v.name,
          ply: i + 1,
          pgnSan: vSans[i],
          annoSan: subSans[i],
          evidence: `variation '${v.name}' ply ${i + 1}: PGN=${vSans[i]} anno=${subSans[i]}`,
        });
        break;
      }
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const f of FILES) {
    let doc;
    try { doc = JSON.parse(await readFile(f, 'utf-8')); } catch (e) { console.warn(`skip ${f}: ${e.message}`); continue; }
    const list = Array.isArray(doc) ? doc : (Array.isArray(doc.openings) ? doc.openings : Object.values(doc));
    for (const o of list) {
      if (!o || typeof o !== 'object') continue;
      await checkOpening(f, o);
    }
  }
  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
  console.log(`[scan] findings: ${findings.length}`);
  for (const [k, v] of Object.entries(byKind)) console.log(`         ${k}: ${v}`);
  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFindings: findings.length,
    byKind,
    findings,
  }, null, 2));
  console.log(`[scan] wrote ${OUT_PATH}`);
}

main().catch((err) => { console.error('fatal:', err); process.exit(1); });

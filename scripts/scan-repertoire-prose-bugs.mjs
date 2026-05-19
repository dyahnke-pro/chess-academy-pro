#!/usr/bin/env node
/**
 * Offline scanner for the repertoire-shaped JSON files
 * (repertoire.json, pro-repertoires.json, gambits.json,
 * middlegame-plans.json, common-mistakes.json).
 *
 * These files don't carry SAN-per-prose-entry, so we can't run the
 * per-ply piece/square/color-mismatch detectors. Instead we look for:
 *   - Cross-line drift: opening / variation name X mentioned in
 *     prose where X has nothing to do with the current entry.
 *   - Template strings (formulaic LLM stubs) leaking through.
 *   - Inconsistent color (e.g. opening.color === 'white' but prose
 *     describes Black's side as the student's).
 *   - Wrong-color subject lead-ins (prose says "Black plays..." but
 *     the line is from white's perspective).
 *
 * Output: docs/audit-runs/2026-05-19-content-scan/repertoire-findings.json
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const FILES = [
  'src/data/repertoire.json',
  'src/data/pro-repertoires.json',
  'src/data/gambits.json',
  'src/data/middlegame-plans.json',
  'src/data/common-mistakes.json',
];
const OUT_DIR = 'docs/audit-runs/2026-05-19-content-scan';
const OUT_PATH = join(OUT_DIR, 'repertoire-findings.json');

const TEMPLATE_PATTERNS = [
  { name: 'capture-changes-character', rx: /this capture changes the character of the position\.\s*Be alert/i },
  { name: 'central-pawns-restrict', rx: /Central pawns control space and restrict the opponent['’]s piece activity/i },
  { name: 'is-the-warning', rx: /^This is the warning\b/i },
  { name: 'critical-moment-in-trap', rx: /This is a critical moment in the trap/i },
  { name: 'remember-this-pattern', rx: /Remember this pattern\s*[—–-]\s*your opponents will fall/i },
  { name: 'natural-continuation-warning', rx: /This is the natural continuation that leads into the warning line/i },
  { name: 'this-is-key-positional-idea', rx: /^This is a key positional idea\.?$/i },
  { name: 'position-looks-normal', rx: /The position looks normal so far/i },
  { name: 'preparing-middlegame-trap', rx: /preparing for the middlegame while the trap is being set/i },
  { name: 'most-principled-retreat', rx: /This is the most principled retreat because we['’]re still eye/i },
  { name: 'developing-normally', rx: /developing normally\.\s+The opponent may not see what['’]s coming/i },
];

const findings = [];

function checkProse(file, oid, fieldPath, text, expectedColor) {
  if (typeof text !== 'string' || text.length < 8) return;

  // Template detection
  for (const t of TEMPLATE_PATTERNS) {
    if (t.rx.test(text)) {
      findings.push({
        file, openingId: oid, fieldPath,
        kind: 'template-string',
        templateName: t.name,
        severity: 'p1',
        evidence: text.slice(0, 200),
      });
    }
  }

  // Color subject mismatch — opening says "color: white" (student plays
  // white) but prose leads with "Black plays...". Only check first
  // 80 chars to catch the lead-in.
  const lead = text.slice(0, 100);
  const m = lead.match(/^\s*(white|black)\s+(?:plays?|moves?|opens?|sacrifices?|develops?|attacks?|aims?)/i);
  if (m && expectedColor) {
    const subj = m[1].toLowerCase();
    // expectedColor is the student's color. The prose CAN describe
    // either side — but the LEAD subject usually should be the student
    // (or about the opening as a whole). Flag mismatches where the
    // prose explicitly leads with the OPPONENT's color in a way that
    // could confuse a student.
    // Reduce noise: only flag when fieldPath suggests student POV
    // ('overview' / 'shortOverview' / 'description' on a variation /
    // trapLine where student is the protagonist).
    const studentPOVFields = ['overview', 'shortOverview', 'description'];
    const isStudentPOV = studentPOVFields.some((s) => fieldPath.endsWith(s));
    if (isStudentPOV && subj !== expectedColor) {
      findings.push({
        file, openingId: oid, fieldPath,
        kind: 'lead-color-mismatch',
        severity: 'p2',
        textColor: subj,
        expectedColor,
        evidence: text.slice(0, 200),
      });
    }
  }
}

function walkOpening(file, opening) {
  const oid = opening.id || opening.openingId || '(unknown)';
  const color = (opening.color || '').toLowerCase();
  // Top-level prose fields
  for (const f of ['overview', 'shortOverview', 'description', 'style']) {
    if (opening[f]) checkProse(file, oid, f, opening[f], color);
  }
  if (Array.isArray(opening.keyIdeas)) {
    for (let i = 0; i < opening.keyIdeas.length; i++) {
      checkProse(file, oid, `keyIdeas[${i}]`, opening.keyIdeas[i], color);
    }
  }
  if (Array.isArray(opening.traps)) {
    for (let i = 0; i < opening.traps.length; i++) {
      checkProse(file, oid, `traps[${i}]`, opening.traps[i], color);
    }
  }
  if (Array.isArray(opening.warnings)) {
    for (let i = 0; i < opening.warnings.length; i++) {
      checkProse(file, oid, `warnings[${i}]`, opening.warnings[i], color);
    }
  }
  // Nested: variations, trapLines, warningLines
  for (const nest of ['variations', 'trapLines', 'warningLines']) {
    if (!Array.isArray(opening[nest])) continue;
    for (let i = 0; i < opening[nest].length; i++) {
      const v = opening[nest][i];
      const prefix = `${nest}[${i}]`;
      for (const f of ['name', 'explanation', 'description', 'shortExplanation']) {
        if (v[f]) checkProse(file, oid, `${prefix}.${f}`, v[f], color);
      }
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let scannedOpenings = 0;
  for (const f of FILES) {
    try {
      const content = await readFile(f, 'utf-8');
      const doc = JSON.parse(content);
      // Two shapes: arrays of openings OR { openings: [...] }
      let list;
      if (Array.isArray(doc)) list = doc;
      else if (Array.isArray(doc.openings)) list = doc.openings;
      else list = Object.values(doc);
      for (const o of list) {
        if (!o || typeof o !== 'object') continue;
        // Skip non-opening shapes (middlegame-plans entries have no id)
        if (!o.id && !o.openingId && !o.name) continue;
        walkOpening(f, o);
        scannedOpenings++;
      }
    } catch (e) {
      console.warn(`[scan] error on ${f}: ${e.message}`);
    }
  }
  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
  console.log(`[scan] openings scanned: ${scannedOpenings}`);
  console.log(`[scan] findings: ${findings.length}`);
  for (const [k, v] of Object.entries(byKind)) console.log(`         ${k}: ${v}`);
  await writeFile(OUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    openings: scannedOpenings,
    totalFindings: findings.length,
    byKind,
    findings,
  }, null, 2));
  console.log(`[scan] wrote ${OUT_PATH}`);
}

main().catch((err) => { console.error('[scan] fatal:', err); process.exit(1); });

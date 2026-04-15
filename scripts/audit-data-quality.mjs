#!/usr/bin/env node
/**
 * audit-data-quality.mjs
 * ----------------------
 * Scans the curated opening / middlegame / annotation JSON data for
 * quality issues and prints a report. Reports only — does not mutate.
 *
 * Exits with code 1 when critical issues are found (empty annotations,
 * missing SAN, malformed structure) so CI can surface regressions.
 *
 * Run with:
 *   npm run data:audit
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data');

const SHORT_ANNOT_THRESHOLD = 40;   // chars
const SHORT_OVERVIEW_THRESHOLD = 100; // chars
const SHORT_EXPLANATION_THRESHOLD = 100; // chars

let criticalIssues = 0;
let warnings = 0;
const report = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function auditAnnotations() {
  const dir = join(DATA, 'annotations');
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  let moves = 0;
  let emptyText = 0;
  let shortText = 0;
  let missingSan = 0;
  let truncated = 0;

  for (const f of files) {
    let data;
    try {
      data = readJson(join(dir, f));
    } catch (err) {
      criticalIssues++;
      report.push(`[annotations/${f}] JSON parse error: ${err.message}`);
      continue;
    }
    const list = data.moveAnnotations ?? [];
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      moves++;
      if (!m.san) {
        missingSan++;
        criticalIssues++;
        report.push(`[annotations/${f}#${i}] missing SAN`);
        continue;
      }
      const text = (m.annotation ?? '').trim();
      if (text.length === 0) {
        emptyText++;
        criticalIssues++;
        report.push(`[annotations/${f}#${i} ${m.san}] empty annotation text`);
      } else if (text.length < SHORT_ANNOT_THRESHOLD) {
        shortText++;
        warnings++;
      } else if (!/[.!?"')\]]$/.test(text)) {
        truncated++;
        warnings++;
      }
    }
  }
  report.push('');
  report.push(`=== annotations/ ===`);
  report.push(`Files: ${files.length}, moves: ${moves}`);
  report.push(`Empty: ${emptyText}, short: ${shortText}, truncated: ${truncated}, missing SAN: ${missingSan}`);
}

function auditGambits() {
  const path = join(DATA, 'gambits.json');
  if (!existsSync(path)) return;
  const data = readJson(path);
  let shortOverviews = 0;
  let missingExpl = 0;
  let shortExpl = 0;
  for (const op of data) {
    const overview = op.overview ?? '';
    if (overview.length < SHORT_OVERVIEW_THRESHOLD) {
      shortOverviews++;
      warnings++;
      report.push(`[gambits/${op.id}] overview too short (${overview.length} chars)`);
    }
    for (const v of op.variations ?? []) {
      if (!v.explanation) {
        missingExpl++;
        criticalIssues++;
        report.push(`[gambits/${op.id}/${v.name}] missing explanation`);
      } else if (v.explanation.length < SHORT_EXPLANATION_THRESHOLD) {
        shortExpl++;
        warnings++;
      }
    }
  }
  report.push('');
  report.push(`=== gambits.json ===`);
  report.push(`Openings: ${data.length}`);
  report.push(`Short overviews: ${shortOverviews}, missing explanations: ${missingExpl}, short explanations: ${shortExpl}`);
}

function auditRepertoire(name) {
  const path = join(DATA, name);
  if (!existsSync(path)) return;
  const raw = readJson(path);
  const arr = Array.isArray(raw) ? raw : Object.values(raw).flat();
  let shortOverviews = 0;
  let missingOverview = 0;
  for (const op of arr) {
    const overview = op.overview ?? op.description ?? '';
    if (!overview) {
      missingOverview++;
      warnings++;
      report.push(`[${name}/${op.id ?? op.name}] missing overview`);
    } else if (overview.length < 80) {
      shortOverviews++;
      warnings++;
      report.push(`[${name}/${op.id ?? op.name}] short overview (${overview.length} chars)`);
    }
  }
  report.push('');
  report.push(`=== ${name} ===`);
  report.push(`Entries: ${arr.length}, missing overview: ${missingOverview}, short overview: ${shortOverviews}`);
}

function auditMiddlegamePlans() {
  const path = join(DATA, 'middlegame-plans.json');
  if (!existsSync(path)) return;
  const data = readJson(path);
  let missingFen = 0;
  let missingTitle = 0;
  for (const p of data) {
    if (!p.criticalPositionFen) { missingFen++; criticalIssues++; report.push(`[middlegame/${p.id}] missing criticalPositionFen`); }
    if (!p.title) { missingTitle++; criticalIssues++; report.push(`[middlegame/${p.id}] missing title`); }
  }
  report.push('');
  report.push(`=== middlegame-plans.json ===`);
  report.push(`Plans: ${data.length}, missing FEN: ${missingFen}, missing title: ${missingTitle}`);
}

auditAnnotations();
auditGambits();
auditRepertoire('repertoire.json');
auditRepertoire('pro-repertoires.json');
auditMiddlegamePlans();

console.log(report.join('\n'));
console.log('');
console.log(`Critical issues: ${criticalIssues}`);
console.log(`Warnings: ${warnings}`);

process.exit(criticalIssues > 0 ? 1 : 0);

#!/usr/bin/env node
/**
 * narration-report — turn an audit's report.json into a NARRATION-ONLY markdown
 * file (David 2026-09-16: "I only want the narration report. Not the tool
 * calls.").
 *
 * Two shapes, one output:
 *   • REVIEW (audit-review-overhaul-prod) — carries `plies[]` (ply → banner
 *     text) plus `spoken[]` from the listener.
 *   • LEARN  (audit-concept-gameplay-prod) — carries `spokenLines` /
 *     `spokenProse` from the listener, with no ply mapping.
 *
 * 🔒 SPOKEN IS THE TRUTH, THE BANNER IS NOT. On a quiet ply the review banner
 * shows the MOVE as a placeholder (a deliberate replacement for "(passes
 * silently)" printing itself all game, David 2026-07-19). Scraping that
 * verbatim once reported a bare "a3" to David as if the coach had read a SAN
 * aloud when it had been correctly silent. A banner whose whole text is a SAN
 * is SILENCE and is dropped here too — belt and braces with the audit-side fix.
 *
 * Usage:
 *   node scripts/narration-report.mjs <report-dir-or-json> [outFile]
 *   node scripts/narration-report.mjs --latest review
 *   node scripts/narration-report.mjs --latest learn
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const SAN_ONLY = /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?$|^O-O(-O)?[+#]?$/;

/** The newest audit-reports/<prefix>-* directory. */
function latest(prefix) {
  const root = 'audit-reports';
  const dirs = readdirSync(root)
    .filter((d) => d.startsWith(prefix))
    .map((d) => ({ d, t: statSync(join(root, d)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (dirs.length === 0) throw new Error(`no audit-reports/${prefix}-* found`);
  return join(root, dirs[0].d);
}

function loadReport(arg) {
  const path = arg.endsWith('.json') ? arg : join(arg, 'report.json');
  return { path, json: JSON.parse(readFileSync(path, 'utf8')) };
}

function render(json, srcPath) {
  const lines = [];
  const title = json.ask
    ? `Learn narration — "${json.ask}"`
    : 'Review narration';
  lines.push(`# ${title}`, '');
  lines.push(`Source: \`${srcPath}\``);
  if (json.base || json.baseUrl) lines.push(`Target: ${json.base ?? json.baseUrl}`);
  if (json.verdict) lines.push(`Verdict: ${json.verdict}`);
  lines.push('', 'Every line below is computed in code and spoken verbatim — no LLM wrote any of it.', '', '---');

  // REVIEW: per-ply, when the report carries the mapping.
  const plies = (json.plies ?? [])
    .filter((p) => p.narr && !SAN_ONLY.test(String(p.narr).trim()))
    .sort((a, b) => a.ply - b.ply);
  if (plies.length > 0) {
    for (const p of plies) {
      lines.push('', `## Ply ${p.ply}${p.badge ? `  ·  ${String(p.badge).trim()}` : ''}`, '', String(p.narr).trim());
    }
  }

  // LEARN: what the voice actually said, in order. Only when there is NO ply
  // mapping — on a review report the same prose is already above, per ply, and
  // appending the tape simply doubled the file (46KB of half duplicate on the
  // first run). One narration, one place.
  const spoken = plies.length > 0 ? [] : (json.spokenProse ?? json.spokenLines ?? json.spoken ?? []);
  const texts = spoken
    .map((s) => (typeof s === 'string' ? s : s?.text ?? ''))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !SAN_ONLY.test(s));
  if (texts.length > 0) {
    lines.push('', '---', '', `## Spoken, in order (${texts.length} lines)`, '');
    texts.forEach((t, i) => lines.push(`${i + 1}. ${t}`, ''));
  }

  if (plies.length === 0 && texts.length === 0) {
    lines.push('', '**No narration captured.** That is a finding, not an empty file —',
      'either the surface said nothing, or the listener never attached.');
  }
  return lines.join('\n');
}

const [arg, outArg] = process.argv.slice(2);
if (!arg) {
  console.error('usage: narration-report.mjs <report-dir|report.json|--latest review|learn>');
  process.exit(1);
}
const target = arg === '--latest'
  ? latest(outArg === 'learn' ? 'concept-gameplay' : 'review-overhaul')
  : arg;
const { path, json } = loadReport(target);
const md = render(json, path);
const out = (arg === '--latest' ? null : outArg) ?? `${basename(target)}-narrations.md`;
writeFileSync(out, md);
console.log(`${out}  (${md.length} bytes)`);

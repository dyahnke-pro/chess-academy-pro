#!/usr/bin/env node
/**
 * triage-traps.mjs — reconcile pro-repertoires.json trap/warning lines with the
 * Stockfish verdict (David 2026-08-27: "trap-claims must be backed by the gem
 * finder"). The ENGINE decides each line's fate (G0/G3), by tier:
 *   trap (weapon):  studentEval ≥ +200 or mate → classify 'trap'
 *                   +50 .. +200                → classify 'mistake'
 *                   −50 .. +50                 → classify 'theme'  (positional, not a decisive weapon)
 *                   < −50                      → REMOVE (the claim is false — the student ends worse)
 *   warning:        studentEval ≤ −100         → keep (a real anti-trap: the student is punished)
 *                   > −100                     → REMOVE (toothless / inverted)
 *
 * Emits: rewritten pro-repertoires.json (losers removed), a fully-reconciled
 * trap-line-classifications.json (every kept trap tiered), and
 * src/data/trap-engine-verification.json (the manifest the fast gate reads).
 *
 *   TRAP_AUDIT_REPORT=audit-reports/traps-stockfish-<iso> node scripts/triage-traps.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const repDir = process.env.TRAP_AUDIT_REPORT
  ?? 'audit-reports/' + readdirSync('audit-reports').filter((d) => d.startsWith('traps-stockfish-')).sort().at(-1);
const report = JSON.parse(readFileSync(`${repDir}/report.json`, 'utf8')).results;

const evalCp = (e) => {
  const s = e.studentEval;
  if (!s) return null;
  return s.type === 'mate' ? (s.value > 0 ? 100000 : -100000) : s.value;
};

// The engine-tier decision for ONE FLAGGED entry. OK entries are never touched —
// a human already classified them correctly (a sacrificial 'mistake' like the
// Fishing Pole must not be auto-upgraded to 'trap' on eval alone). We also never
// UPGRADE a flagged entry to 'trap': a line the audit didn't already bless as a
// clean decisive trap gets at most 'mistake'/'theme', or removal.
function decide(e) {
  if (e.status === 'OK') return { action: 'keep', cp: evalCp(e) };
  const cp = evalCp(e);
  if (e.role === 'warning') return { action: cp != null && cp <= -100 ? 'keep' : 'remove', cp };
  if (cp == null) return { action: 'remove', cp };
  if (cp >= 50) return { action: 'classify', kind: 'mistake', cp };   // real but not decisive
  if (cp >= -50) return { action: 'classify', kind: 'theme', cp };     // near-equal → positional, not a weapon
  return { action: 'remove', cp };                                     // < −50 → the claim is false
}

// Build the decision map, keyed by openingId::name.
const decisions = new Map();
for (const e of report) decisions.set(`${e.openingId}::${e.name}`, { ...decide(e), role: e.role });

// ── Apply to pro-repertoires.json ──────────────────────────────────────────
const dataPath = 'src/data/pro-repertoires.json';
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const manifest = {};
let removedTraps = 0, removedWarns = 0, keptTraps = 0;
const tierCount = { trap: 0, mistake: 0, theme: 0 };

for (const op of data.openings) {
  if (Array.isArray(op.trapLines)) {
    op.trapLines = op.trapLines.filter((t) => {
      const d = decisions.get(`${op.id}::${t.name}`);
      if (!d) return true; // not audited (no legal final pos) → leave as-is
      manifest[`${op.id}::${t.name}`] = { role: 'trap', cp: d.cp, kind: d.kind ?? null, status: d.action };
      if (d.action === 'remove') { removedTraps += 1; return false; }
      keptTraps += 1;
      if (d.kind) tierCount[d.kind] += 1;
      return true;
    });
  }
  if (Array.isArray(op.warningLines)) {
    op.warningLines = op.warningLines.filter((t) => {
      const d = decisions.get(`${op.id}::${t.name}`);
      if (!d) return true;
      manifest[`${op.id}::${t.name}`] = { role: 'warning', cp: d.cp, kind: null, status: d.action };
      if (d.action === 'remove') { removedWarns += 1; return false; }
      return true;
    });
  }
}

// ── Reconcile the classification sidecar (every kept trap gets its tier) ─────
const clsPath = 'src/data/trap-line-classifications.json';
const cls = JSON.parse(readFileSync(clsPath, 'utf8'));
for (const [key, d] of decisions) {
  if (d.role === 'trap' && d.action === 'classify') cls.classifications[key] = d.kind;
  if (d.action === 'remove') delete cls.classifications[key];
}

// ── Write everything ────────────────────────────────────────────────────────
writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
writeFileSync(clsPath, JSON.stringify(cls, null, 2) + '\n');
writeFileSync('src/data/trap-engine-verification.json', JSON.stringify({
  _meta: {
    purpose: 'Stockfish verdict per pro-rep trap/warning line — the gate reads this so no unbacked trap is offered as a weapon. Regenerate with scripts/audit-traps-stockfish.mjs + scripts/triage-traps.mjs.',
    depth: JSON.parse(readFileSync(`${repDir}/report.json`, 'utf8')).summary?.depth ?? null,
    generated: repDir,
  },
  verification: manifest,
}, null, 2) + '\n');

console.log(`removed ${removedTraps} losing traps + ${removedWarns} toothless warnings`);
console.log(`kept ${keptTraps} traps → trap:${tierCount.trap} mistake:${tierCount.mistake} theme:${tierCount.theme}`);
console.log(`manifest: ${Object.keys(manifest).length} verified lines`);

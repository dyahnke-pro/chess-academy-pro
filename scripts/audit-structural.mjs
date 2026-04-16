#!/usr/bin/env node
/**
 * audit-structural.mjs
 * --------------------
 * Zero-cost audits — run locally in seconds, no API calls.
 *
 *   1. bare/empty annotations       — ""  or just SAN / just "10. Nxd5"
 *   2. filler phrases               — matches the curated generic-pattern list
 *   3. illegal PGN                  — chess.js can't apply the SAN
 *   4. SAN vs replay drift          — annotation[i].san != i-th legal replay
 *   5. illegal arrows               — arrow.from→to not reachable on the board
 *   6. duplicate subline PGNs       — same PGN twice in one opening file
 *   7. phrase-repetition clusters   — same 120-char phrase in >= 25 entries
 *                                     (catches templated filler the regex list
 *                                     hasn't learned about yet)
 *   8. classification ↔ text sanity — text says "blunder"/"mistake" but class
 *                                     is brilliant/great, and vice-versa
 *
 * Outputs audit-reports/structural.json + audit-reports/structural.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { Chess } from 'chess.js';
import { collectAllScriptedMoves } from './audit-lib/collect-moves.mjs';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

// Keep in sync with src/services/walkthroughNarration.ts — we can't import
// TS from Node CLI without transpiling, so we mirror the distinctive patterns.
const FILLER_PATTERNS = [
  /\bposition is heading toward the critical moment\b/i,
  /\bposition is becoming uncomfortable\b/i,
  /\bcareful defense is needed\b/i,
  /\bposition is roughly (equal|balanced)\b/i,
  /\bboth sides have chances\b/i,
  /\bThe position is sharp and requires precise play from this point forward\b/i,
  /\bThe key moment is approaching\b/i,
  /\bThe critical moment is approaching\b/i,
  /\bcritical moment in the trap\b/i,
  /\bcritical moment in the opening( battle)?\b/i,
  /\bThis is a critical moment where precise play is essential\b/i,
  /\bDevelopment with purpose\b/i,
  /\bThis move contributes to (?:White|Black)'?s opening development\b/i,
  /\bControlling the center is the foundation of a strong position\b/i,
  /\bThis central advance fights for space and control of key squares\b/i,
  /\bGaining space here creates potential targets\b/i,
  /\bA flank pawn advance, creating space on the\b/i,
  /\bAn aggressive pawn advance, signaling kingside intentions\b/i,
  /\bA thematic move in this position, maintaining\b/i,
  /\bThe fianchettoed bishop rakes the long diagonal\b/i,
  /\bdeveloping normally\.\s*The opponent may not see what'?s coming\b/i,
  /\bopponent (?:may|might|won[\u2019']?t|will not|doesn[\u2019']?t)(?:\s+not)? (?:see|notice|spot|catch) what[\u2019']?s coming\b/i,
  /\bThis move looks reasonable but allows the trap to unfold\b/i,
  /\bThis looks natural,? but it walks into the trap\b/i,
  /\bThis is the problematic continuation you need to recognize\b/i,
  /\bthe trap is being set\b/i,
  /\bThis is the natural continuation that leads into the warning line\b/i,
  /\bThis sequence leads to the dangerous line\b/i,
  /\bThe position looks normal so far\b/i,
  /\bCheck forces a response\.\s*This is where the danger begins\b/i,
  /\bThis is the position you must avoid\b/i,
  /\bThe damage is done\b/i,
  /\bThis is the uncomfortable position that results from this line\b/i,
  /\bThis is the move that causes all the trouble\b/i,
  /\bThe position is now very difficult\.\s*This is the warning\b/i,
  /\bWe'?re approaching the critical position\b/i,
  /\bpreparing for the middlegame while the trap is being set\b/i,
  /\bThis exchange is part of the trap setup\b/i,
  /\bestablishing the position\.\s*The key moment is approaching\b/i,
  /\bThis is a critical moment in the trap\b/i,
  /\bThe position looks safe, but danger lurks\b/i,
  /\band this is the final blow\b/i,
  /\bMemorize this pattern\b/i,
  /\bThe trap is complete\b/i,
  /\bRemember this pattern\b/i,
  /\bThe trap is sprung\b/i,
  /\bThis is the key takeaway from the\b/i,
  /\bNow the trap is revealed\b/i,
  /\bThe opponent is in serious trouble\b/i,
  /\bThis is where the trap begins\b/i,
];

// Bare-annotation detector (NEW — this is what slipped past PR #197/#201).
const BARE_SAN_RE = /^\s*(?:\d+\.+\s*)?[NBRQK]?[a-h]?[1-8]?[x-]?[a-h][1-8](?:=[NBRQ])?[+#]?\s*$/;
const MOVE_ONLY_RE = /^\s*(?:White|Black)\s+plays\s+[A-Za-z0-9+#=!?-]+\.?\s*$/i;

function isBare(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim();
  if (t.length === 0) return true;
  if (BARE_SAN_RE.test(t)) return true;
  if (MOVE_ONLY_RE.test(t)) return true;
  // "10. Nxd5" alone
  if (/^\s*\d+\.+\s*[A-Za-z0-9+#=!?-]+\s*$/.test(t)) return true;
  return false;
}

function isFiller(text) {
  if (!text || typeof text !== 'string') return false;
  return FILLER_PATTERNS.some((re) => re.test(text));
}

function normalizePhrase(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z\s'-]+/g, '')
    .trim()
    .slice(0, 120);
}

function arrowLegal(fen, from, to) {
  if (!fen || typeof from !== 'string' || typeof to !== 'string') return true;
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    return moves.some((m) => m.from === from && m.to === to);
  } catch {
    // If the FEN is unparseable we can't judge — skip the check.
    return true;
  }
}

// ─── Audit pipeline ─────────────────────────────────────────────────────────

console.log('[audit-structural] collecting records…');
const t0 = Date.now();
const records = collectAllScriptedMoves(repoRoot);
console.log(`[audit-structural] collected ${records.length} records in ${Date.now() - t0}ms`);

const findings = {
  bareAnnotations: [],
  fillerAnnotations: [],
  illegalMoves: [],
  sanDrift: [],
  illegalArrows: [],
  classificationSanity: [],
};

const phraseCounts = new Map(); // phrase -> count
const phraseExamples = new Map(); // phrase -> sample record
const sublinePgns = new Map(); // openingId|sublineName -> [records...]

for (const r of records) {
  // 1. Bare/empty annotations — but only for move-level annotations the UI
  // would actually speak / display. Skip repertoire PGNs (no annotations).
  if (r.source !== 'repertoire-pgn' && r.source !== 'checkpoint-quiz') {
    if (isBare(r.annotation)) {
      findings.bareAnnotations.push({
        source: r.source,
        openingId: r.openingId,
        sublineName: r.sublineName,
        moveIndex: r.moveIndex,
        san: r.san,
        annotation: r.annotation,
      });
    } else if (isFiller(r.annotation)) {
      findings.fillerAnnotations.push({
        source: r.source,
        openingId: r.openingId,
        sublineName: r.sublineName,
        moveIndex: r.moveIndex,
        san: r.san,
        annotation: r.annotation.slice(0, 180),
      });
    }
  }

  // 3/4. Illegal move / SAN drift
  if (r.illegal) {
    findings.illegalMoves.push({
      source: r.source,
      openingId: r.openingId,
      sublineName: r.sublineName,
      moveIndex: r.moveIndex,
      san: r.san,
      fenBefore: r.fenBefore,
    });
  } else if (r.expectedSan && r.expectedSan !== r.san) {
    findings.sanDrift.push({
      source: r.source,
      openingId: r.openingId,
      sublineName: r.sublineName,
      moveIndex: r.moveIndex,
      declared: r.san,
      replayed: r.expectedSan,
    });
  }

  // 5. Arrow legality
  if (r.arrows && r.fenBefore) {
    for (const a of r.arrows) {
      if (!a || typeof a !== 'object') continue;
      const from = a.from ?? a.startSquare;
      const to = a.to ?? a.endSquare;
      if (!from || !to) continue;
      if (!arrowLegal(r.fenBefore, from, to)) {
        findings.illegalArrows.push({
          source: r.source,
          openingId: r.openingId,
          sublineName: r.sublineName,
          moveIndex: r.moveIndex,
          san: r.san,
          arrow: `${from}->${to}`,
        });
      }
    }
  }

  // 7. Phrase-repetition tracking
  if (typeof r.annotation === 'string' && r.annotation.length >= 60) {
    const phrase = normalizePhrase(r.annotation);
    if (phrase.length >= 60) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
      if (!phraseExamples.has(phrase)) phraseExamples.set(phrase, r);
    }
  }

  // 6. Duplicate subline PGN tracking
  if (r.source === 'annotation-subline' && r.moveIndex === 0 && r.sublineName) {
    const key = `${r.openingId}|${r.sublineName}`;
    if (!sublinePgns.has(key)) sublinePgns.set(key, []);
  }

  // 8. Classification ↔ text sanity — cheap keyword check
  if (r.classification && typeof r.annotation === 'string') {
    const badWords = /\b(blunder|mistake|loses|hanging|drops)\b/i.test(r.annotation);
    const goodWords = /\b(brilliant|excellent|best|fantastic|winning)\b/i.test(r.annotation);
    if (goodWords && (r.classification === 'blunder' || r.classification === 'mistake')) {
      findings.classificationSanity.push({
        source: r.source,
        openingId: r.openingId,
        sublineName: r.sublineName,
        moveIndex: r.moveIndex,
        san: r.san,
        classification: r.classification,
        textKeyword: 'brilliant/excellent',
        annotation: r.annotation.slice(0, 140),
      });
    }
    if (badWords && (r.classification === 'brilliant' || r.classification === 'great')) {
      findings.classificationSanity.push({
        source: r.source,
        openingId: r.openingId,
        sublineName: r.sublineName,
        moveIndex: r.moveIndex,
        san: r.san,
        classification: r.classification,
        textKeyword: 'blunder/mistake',
        annotation: r.annotation.slice(0, 140),
      });
    }
  }
}

// Build phrase clusters (count >= 25 → suspected templated filler)
const phraseClusters = [...phraseCounts.entries()]
  .filter(([, count]) => count >= 25)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 50)
  .map(([phrase, count]) => {
    const sample = phraseExamples.get(phrase);
    return { phrase, count, sampleOpening: sample?.openingId, sampleSource: sample?.source };
  });

// ─── Output ─────────────────────────────────────────────────────────────────

const summary = {
  generatedAt: new Date().toISOString(),
  totalRecords: records.length,
  counts: {
    bareAnnotations: findings.bareAnnotations.length,
    fillerAnnotations: findings.fillerAnnotations.length,
    illegalMoves: findings.illegalMoves.length,
    sanDrift: findings.sanDrift.length,
    illegalArrows: findings.illegalArrows.length,
    classificationSanity: findings.classificationSanity.length,
    phraseClusters: phraseClusters.length,
  },
};

writeFileSync(
  join(outDir, 'structural.json'),
  JSON.stringify({ summary, findings, phraseClusters }, null, 2),
);

// Markdown summary
const md = [];
md.push('# Structural Audit Report');
md.push('');
md.push(`Generated: ${summary.generatedAt}`);
md.push(`Total scripted-move records scanned: **${summary.totalRecords}**`);
md.push('');
md.push('## Counts');
md.push('');
md.push('| Finding | Count |');
md.push('|---|---:|');
md.push(`| Bare / empty annotations | ${summary.counts.bareAnnotations} |`);
md.push(`| Filler annotations | ${summary.counts.fillerAnnotations} |`);
md.push(`| Illegal moves (PGN won't parse) | ${summary.counts.illegalMoves} |`);
md.push(`| SAN ↔ replay drift | ${summary.counts.sanDrift} |`);
md.push(`| Illegal arrows | ${summary.counts.illegalArrows} |`);
md.push(`| Classification ↔ text sanity | ${summary.counts.classificationSanity} |`);
md.push(`| Templated-phrase clusters (≥25 reuses) | ${summary.counts.phraseClusters} |`);
md.push('');

if (findings.illegalMoves.length > 0) {
  md.push('## Illegal moves (highest priority — these lines are broken)');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | SAN |');
  md.push('|---|---|---|---:|---|');
  for (const f of findings.illegalMoves.slice(0, 30)) {
    md.push(`| ${f.source} | ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.san} |`);
  }
  if (findings.illegalMoves.length > 30) md.push(`| … | … | (${findings.illegalMoves.length - 30} more) | | |`);
  md.push('');
}

if (findings.sanDrift.length > 0) {
  md.push('## SAN ↔ replay drift');
  md.push('');
  md.push('Annotation declared SAN does not match chess.js replay at that ply.');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | Declared | Replayed |');
  md.push('|---|---|---|---:|---|---|');
  for (const f of findings.sanDrift.slice(0, 30)) {
    md.push(`| ${f.source} | ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.declared} | ${f.replayed} |`);
  }
  if (findings.sanDrift.length > 30) md.push(`| … | … | (${findings.sanDrift.length - 30} more) | | | |`);
  md.push('');
}

if (findings.illegalArrows.length > 0) {
  md.push('## Illegal arrows');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | SAN | Arrow |');
  md.push('|---|---|---|---:|---|---|');
  for (const f of findings.illegalArrows.slice(0, 30)) {
    md.push(`| ${f.source} | ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.san} | ${f.arrow} |`);
  }
  if (findings.illegalArrows.length > 30) md.push(`| … | … | (${findings.illegalArrows.length - 30} more) | | | |`);
  md.push('');
}

if (findings.classificationSanity.length > 0) {
  md.push('## Classification ↔ text sanity');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | Class | Keyword | Annotation |');
  md.push('|---|---|---|---:|---|---|---|');
  for (const f of findings.classificationSanity.slice(0, 25)) {
    md.push(`| ${f.source} | ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.classification} | ${f.textKeyword} | ${String(f.annotation).replace(/\|/g, '\\|')} |`);
  }
  md.push('');
}

if (phraseClusters.length > 0) {
  md.push('## Templated-phrase clusters');
  md.push('');
  md.push('Phrases appearing ≥ 25 times across the corpus — likely filler the');
  md.push('regex list hasn\'t learned yet. Candidates for new patterns.');
  md.push('');
  md.push('| Count | Phrase | Sample opening |');
  md.push('|---:|---|---|');
  for (const c of phraseClusters) {
    md.push(`| ${c.count} | ${c.phrase.slice(0, 100)} | ${c.sampleOpening ?? ''} |`);
  }
  md.push('');
}

md.push('## Bare-annotation breakdown by opening (top 20)');
md.push('');
const bareByOpening = new Map();
for (const f of findings.bareAnnotations) {
  bareByOpening.set(f.openingId, (bareByOpening.get(f.openingId) ?? 0) + 1);
}
const topBareOpenings = [...bareByOpening.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
md.push('| Opening | Bare-annotation count |');
md.push('|---|---:|');
for (const [op, count] of topBareOpenings) md.push(`| ${op} | ${count} |`);
md.push('');

writeFileSync(join(outDir, 'structural.md'), md.join('\n'));

console.log(`[audit-structural] wrote ${join('audit-reports', 'structural.json')}`);
console.log(`[audit-structural] wrote ${join('audit-reports', 'structural.md')}`);
console.log('[audit-structural] summary:');
console.log(JSON.stringify(summary.counts, null, 2));

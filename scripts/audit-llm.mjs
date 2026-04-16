#!/usr/bin/env node
/**
 * audit-llm.mjs
 * -------------
 * Semantic audit — uses an LLM to compare each scripted annotation to
 * the board state it claims to describe. Catches:
 *
 *   - "bishop develops" where the SAN is a knight move
 *   - "captures on f7" where nothing is captured
 *   - annotation referencing a different opening
 *   - annotation for the wrong color to move
 *
 * Because every move needs an LLM call, this is expensive. Default is
 * a stratified sample (200 moves across openings). Override with:
 *
 *   AUDIT_LLM_SAMPLE=0        — scan every record (slow, pricey)
 *   AUDIT_LLM_SAMPLE=500      — 500 random records
 *
 * Provider: uses Anthropic SDK by default (ANTHROPIC_API_KEY) and
 * falls back to DEEPSEEK_API_KEY (baseURL https://api.deepseek.com)
 * via openai SDK. Aborts with a clear message if neither is set.
 *
 * Tuning:
 *   AUDIT_LLM_MODEL=...        — override model id
 *   AUDIT_LLM_RPS=3            — max requests/second
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { collectAllScriptedMoves } from './audit-lib/collect-moves.mjs';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const SAMPLE = parseInt(process.env.AUDIT_LLM_SAMPLE ?? '200', 10);
const RPS = parseInt(process.env.AUDIT_LLM_RPS ?? '3', 10);

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL =
  process.env.AUDIT_LLM_MODEL ??
  (ANTHROPIC_KEY ? 'claude-haiku-4-5-20251001' : 'deepseek-chat');

if (!ANTHROPIC_KEY && !DEEPSEEK_KEY) {
  console.error(
    '[audit-llm] No API key set. Export ANTHROPIC_API_KEY or DEEPSEEK_API_KEY first.',
  );
  process.exit(1);
}

// Lazy-load SDKs so the script doesn't fail at import when a key IS set.
async function buildAnthropicCaller() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  return async (prompt) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 240,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    return text;
  };
}

async function buildDeepseekCaller() {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: DEEPSEEK_KEY,
    baseURL: 'https://api.deepseek.com',
  });
  return async (prompt) => {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 240,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0]?.message?.content ?? '';
  };
}

function buildPrompt(r) {
  return `You are auditing chess-lesson annotations for accuracy.

Given the position (FEN) and the move played (SAN), decide whether the
annotation below accurately describes the move and resulting position.

FEN BEFORE move: ${r.fenBefore}
Move played (SAN): ${r.san}
FEN AFTER move: ${r.fenAfter}
Annotation text: "${r.annotation}"

Return JSON ONLY in this shape:
{
  "accurate": true | false,
  "issues": ["short reason 1", ...]
}

Consider inaccurate if the annotation:
  - names a piece that didn't move
  - describes a capture/check/castle that didn't happen
  - references a wrong square or file
  - refers to the wrong side (white/black)
  - describes a completely unrelated opening / position
  - mentions a threat that doesn't exist

Consider accurate even if the annotation is generic or templated as long
as it doesn't factually conflict with the move.`;
}

function parseJsonLoose(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function stratifiedSample(records, n) {
  if (n <= 0 || records.length <= n) return records;
  // Bucket by openingId and take round-robin
  const buckets = new Map();
  for (const r of records) {
    if (!buckets.has(r.openingId)) buckets.set(r.openingId, []);
    buckets.get(r.openingId).push(r);
  }
  const order = [...buckets.values()];
  for (const b of order) b.sort(() => Math.random() - 0.5);
  const out = [];
  let idx = 0;
  while (out.length < n) {
    let progressed = false;
    for (const b of order) {
      if (idx < b.length) {
        out.push(b[idx]);
        progressed = true;
        if (out.length >= n) break;
      }
    }
    if (!progressed) break;
    idx++;
  }
  return out;
}

async function main() {
  const all = collectAllScriptedMoves(repoRoot);
  const candidates = all.filter(
    (r) =>
      !r.illegal &&
      r.fenBefore &&
      r.fenAfter &&
      typeof r.annotation === 'string' &&
      r.annotation.trim().length >= 20,
  );
  const sample = stratifiedSample(candidates, SAMPLE);

  console.log(
    `[audit-llm] ${all.length} total → ${candidates.length} eligible → ${sample.length} sampled`,
  );

  const caller = ANTHROPIC_KEY ? await buildAnthropicCaller() : await buildDeepseekCaller();
  console.log(`[audit-llm] model: ${MODEL} @ ${RPS} rps`);

  const findings = { inaccurate: [], parseErrors: 0, apiErrors: 0 };
  const perReqMs = Math.ceil(1000 / RPS);
  let processed = 0;
  const t0 = Date.now();

  for (const r of sample) {
    processed++;
    if (processed % 20 === 0) {
      const min = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[audit-llm] ${processed}/${sample.length} (${min}min)`);
    }
    try {
      const raw = await caller(buildPrompt(r));
      const parsed = parseJsonLoose(raw);
      if (!parsed) {
        findings.parseErrors++;
      } else if (parsed.accurate === false) {
        findings.inaccurate.push({
          source: r.source,
          openingId: r.openingId,
          sublineName: r.sublineName,
          moveIndex: r.moveIndex,
          san: r.san,
          annotation: r.annotation.slice(0, 200),
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        });
      }
    } catch {
      findings.apiErrors++;
    }
    await sleep(perReqMs);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    processed,
    inaccurate: findings.inaccurate.length,
    parseErrors: findings.parseErrors,
    apiErrors: findings.apiErrors,
  };

  writeFileSync(
    join(outDir, 'llm.json'),
    JSON.stringify({ summary, findings }, null, 2),
  );

  const md = [];
  md.push('# LLM Semantic Audit Report');
  md.push('');
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Model: ${summary.model}`);
  md.push(`Processed: **${summary.processed}** (sample)`);
  md.push(`Flagged inaccurate: **${summary.inaccurate}**`);
  md.push(`LLM parse errors: ${summary.parseErrors}`);
  md.push(`API errors: ${summary.apiErrors}`);
  md.push('');
  md.push('## Flagged annotations');
  md.push('');
  md.push('| Source | Opening | Subline | Move# | SAN | Issues | Annotation |');
  md.push('|---|---|---|---:|---|---|---|');
  for (const f of findings.inaccurate.slice(0, 100)) {
    md.push(
      `| ${f.source} | ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.san} | ${f.issues.join('; ').replace(/\|/g, '\\|')} | ${f.annotation.replace(/\|/g, '\\|')} |`,
    );
  }

  writeFileSync(join(outDir, 'llm.md'), md.join('\n'));
  console.log('[audit-llm] wrote audit-reports/llm.{json,md}');
  console.log(JSON.stringify(summary, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('[audit-llm] fatal:', err);
  process.exit(1);
});

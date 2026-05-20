#!/usr/bin/env node
/**
 * Replaces template-stub annotation text with concrete narration via
 * Haiku 4.5. Currently 808 annotation entries match one of these
 * template patterns:
 *  - "<SAN> — this capture changes the character of the position. Be alert."
 *  - "Continuing <Opening>: <SAN> is a known theory move in this line."
 *  - "<SAN> stakes a claim in the center. Central pawns control space..."
 *  - several others
 *
 * Each is runtime-suppressed today (the AnnotationCard renders
 * nothing; the voice falls back to LLM enrichment). Replacing them
 * in the data with concrete content lets the user READ specific
 * narration on the card without runtime LLM latency.
 *
 * Output cache:
 *   docs/audit-runs/2026-05-19-content-scan/haiku-annotation-enrichments.json
 *
 * Apply step (run after): writes concrete annotation text back to
 * the source files where stub-template text was found.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const DIR = 'src/data/annotations';
const OUT_DIR = 'docs/audit-runs/2026-05-19-content-scan';
const CACHE_PATH = join(OUT_DIR, 'haiku-annotation-enrichments.json');
const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 8;

const STUB_PATTERNS = [
  /this capture changes the character of the position\.\s*Be alert/i,
  /Continuing\s+[A-Z][\w\s'-]+:\s+[A-Za-z][\w+#=!?-]*\s+is a known theory move in this line/i,
  /Central pawns control space and restrict the opponent['']s piece activity/i,
  /This is the natural continuation that leads into the warning line/i,
  /This sequence leads to the dangerous line/i,
  /^The position looks normal so far/i,
  /This is a critical moment in the trap/i,
  /The position looks safe, but danger lurks/i,
  /Remember this pattern\s*[—–-]\s*your opponents will fall/i,
  /This is the position you must avoid/i,
];

function isStubAnnotation(text) {
  if (!text || typeof text !== 'string') return false;
  return STUB_PATTERNS.some((rx) => rx.test(text));
}

const SYSTEM_PROMPT = `You are a chess teacher rewriting STUB annotation text with concrete, position-specific narration for an annotated opening study. The student reads the annotation as a move animates.

You will receive a batch of plies (half-moves) from a single opening line, each with a stub annotation that needs replacement. For each ply, write a concrete 1-2 sentence annotation that:
- Names a specific square, piece, or named chess concept relevant to THAT exact position.
- Tells the student WHY this move matters in this position (the idea, the tactical motif, the structural feature).
- Stays 18-35 words. Two short sentences max. Pure prose — NO move numbers, NO "1.e4" prefixes inside the prose.
- AVOIDS generic chess platitudes ("develop pieces", "fight for the center", "improve coordination", "look for tactical opportunities", "convert advantages"). These are BANNED.
- Doesn't restate what the board already shows (don't say "the rook moves to e1" when the student just saw the rook move there). Carry only what the picture doesn't.
- Doesn't reference the UI ("tap this", "click that", "next move").

Output JSON in this exact shape:
{
  "plies": [
    { "ply": <number>, "annotation": "concrete narration here" }
  ]
}`;

const key = process.env.ANTHROPIC_KEY;
if (!key) {
  console.error('ANTHROPIC_KEY env var required');
  process.exit(1);
}
const client = new Anthropic({ apiKey: key });

async function ensureCache() {
  await mkdir(OUT_DIR, { recursive: true });
  if (existsSync(CACHE_PATH)) {
    return JSON.parse(await readFile(CACHE_PATH, 'utf-8'));
  }
  return { entries: {}, totals: { calls: 0, inputTokens: 0, outputTokens: 0, costUSD: 0 } };
}

async function saveCache(cache) {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function entryKey(file, sublineName, plyIdx) {
  return `${file}::${sublineName}::${plyIdx}`;
}

function moneyForUsage(usage) {
  const inCost = (usage.input_tokens || 0) / 1_000_000 * 1.0;
  const outCost = (usage.output_tokens || 0) / 1_000_000 * 5.0;
  return inCost + outCost;
}

function fenAfterPly(sans, plyIdx) {
  const c = new Chess();
  for (let i = 0; i <= plyIdx; i++) {
    try { c.move(sans[i]); } catch { return null; }
  }
  return c.fen();
}

async function callHaiku(openingId, sublineName, color, contextPgn, ples) {
  const userMsg = `Opening: ${openingId}\nLine: ${sublineName}\nStudent plays: ${color}\nPGN so far: ${contextPgn}\n\nRewrite the stub annotation for each of these plies:\n${ples.map((p) => `  ply ${p.ply}: SAN=${p.san}  FEN=${p.fenAfter}\n  stub: ${p.stubText}`).join('\n')}\n\nReturn JSON only.`;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });
  const text = res.content?.[0]?.text ?? '';
  let parsed = null;
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    }
  } catch (e) {
    console.warn('parse err:', e.message);
  }
  return { parsed, usage: res.usage };
}

async function main() {
  const cache = await ensureCache();
  let totalSpend = cache.totals?.costUSD || 0;
  const COST_CAP = parseFloat(process.env.COST_CAP_USD || '2.0');
  console.log(`[enrich-anno] cost cap: $${COST_CAP.toFixed(2)} — start spend: $${totalSpend.toFixed(4)}`);

  const files = await readdir(DIR);
  const annotationFiles = files.filter((f) => f.endsWith('.json'));
  const queue = [];

  for (const fname of annotationFiles) {
    const fpath = join(DIR, fname);
    const doc = JSON.parse(await readFile(fpath, 'utf-8'));
    const openingId = doc.openingId;
    const color = (doc.color || 'white').toLowerCase();

    function processSubline(arr, sublineName) {
      const stubPlies = [];
      for (let i = 0; i < (arr || []).length; i++) {
        const a = arr[i];
        if (!isStubAnnotation(a.annotation)) continue;
        const key = entryKey(fname, sublineName, i);
        if (cache.entries[key]) continue;
        const sans = (arr || []).map((x) => x.san);
        const fenAfter = fenAfterPly(sans, i);
        if (!fenAfter) continue;
        stubPlies.push({ ply: i + 1, san: a.san, fenAfter, stubText: a.annotation.slice(0, 200), plyIdx: i });
      }
      if (stubPlies.length === 0) return;
      for (let start = 0; start < stubPlies.length; start += BATCH_SIZE) {
        const batch = stubPlies.slice(start, start + BATCH_SIZE);
        const sans = (arr || []).map((x) => x.san);
        const contextPgn = sans.slice(0, Math.min(sans.length, batch[0].plyIdx)).join(' ');
        queue.push({
          file: fname, fpath, openingId, sublineName, color,
          contextPgn, ples: batch,
        });
      }
    }

    processSubline(doc.moveAnnotations, '__main__');
    for (const s of doc.subLines || []) processSubline(s.moveAnnotations, s.name);
  }

  console.log(`[enrich-anno] ${queue.length} batches queued`);

  let totalCallsMade = 0;
  for (let i = 0; i < queue.length; i++) {
    if (totalSpend >= COST_CAP) {
      console.log(`[enrich-anno] cost cap reached ($${totalSpend.toFixed(4)})`);
      break;
    }
    const item = queue[i];
    console.log(`[${i+1}/${queue.length}] ${item.file.replace('.json','')} :: ${item.sublineName} :: ${item.ples.length} plies`);
    try {
      const { parsed, usage } = await callHaiku(item.openingId, item.sublineName, item.color, item.contextPgn, item.ples);
      const cost = moneyForUsage(usage);
      totalSpend += cost;
      cache.totals.calls = (cache.totals.calls || 0) + 1;
      cache.totals.inputTokens = (cache.totals.inputTokens || 0) + (usage.input_tokens || 0);
      cache.totals.outputTokens = (cache.totals.outputTokens || 0) + (usage.output_tokens || 0);
      cache.totals.costUSD = totalSpend;
      if (parsed?.plies) {
        for (const p of parsed.plies) {
          const matchingBatch = item.ples.find((b) => b.ply === p.ply);
          if (!matchingBatch) continue;
          const key = entryKey(item.file, item.sublineName, matchingBatch.plyIdx);
          cache.entries[key] = {
            ply: matchingBatch.ply,
            san: matchingBatch.san,
            annotation: p.annotation || null,
          };
        }
      }
      totalCallsMade++;
      if (totalCallsMade % 20 === 0) {
        await saveCache(cache);
        console.log(`  spend so far: $${totalSpend.toFixed(4)}`);
      }
    } catch (e) {
      console.warn(`  err on batch ${i+1}: ${e.message}`);
    }
  }
  await saveCache(cache);
  console.log(`\n[enrich-anno] DONE`);
  console.log(`  calls: ${cache.totals.calls}`);
  console.log(`  spend: $${cache.totals.costUSD.toFixed(4)}`);
  console.log(`  cached: ${Object.keys(cache.entries).length}`);
}

main().catch((err) => { console.error('fatal:', err); process.exit(1); });

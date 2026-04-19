/**
 * grade-narrations.ts — LLM-graded narration quality check.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... LIMIT=10 npx tsx scripts/grade-narrations.ts
 *
 * For each of LIMIT randomly-sampled annotation files, walks the move
 * list and asks Claude Haiku (cheap tier) whether each narration is
 * factually consistent with the chess position. Output:
 *   - Per-move verdict: "ok" | "nit" | "wrong"
 *   - Aggregate stats (total tokens, estimated $, files with issues)
 *
 * Rationale: deterministic validators (validate-openings.ts,
 * validate-narrations.ts) can catch stubs, placeholders, move
 * illegality. They cannot catch semantic errors in prose — e.g.
 * "White's knight on f3 attacks the queen" when f3 has no knight, or
 * "this threatens mate in 2" when no mate exists. Those require a
 * chess-literate grader — cheapest reliable option is Haiku.
 *
 * Dry-run first. $15 full-run budget is real money; confirm false-
 * positive rate with a small sample before kicking off the 1916-file
 * pass.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Chess } from 'chess.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface MoveAnnotation {
  san: string;
  annotation: string;
}
interface AnnotationFile {
  openingId: string;
  moveAnnotations?: MoveAnnotation[];
  moveAnalyses?: MoveAnnotation[];
}

interface Verdict {
  verdict: 'ok' | 'nit' | 'wrong';
  reason?: string;
}

const ROOT = '/home/user/chess-academy-pro';
const ANNOTATIONS_DIR = `${ROOT}/src/data/annotations`;
const LIMIT = parseInt(process.env.LIMIT ?? '10', 10);
const MODEL = process.env.MODEL ?? 'claude-haiku-4-5-20251001';

/** Haiku 4.5 pricing as of April 2026: $0.80/M input, $4/M output. */
const PRICE_PER_M_INPUT = 0.80;
const PRICE_PER_M_OUTPUT = 4.00;

function gradePrompt(fenBefore: string, san: string, fenAfter: string, narration: string): string {
  return `You are a chess expert reviewing a move-by-move walkthrough for factual accuracy.

[Position before the move]
FEN: ${fenBefore}

[Move played]
SAN: ${san}

[Position after]
FEN: ${fenAfter}

[Narration to grade]
"${narration}"

Rate the narration:
- "ok" — factually consistent with the position. No false claims about piece locations, tactics, threats, or legality.
- "nit" — minor issue (slight imprecision, mild overstatement) but core claim holds.
- "wrong" — factual error. Examples: names a piece that isn't on the claimed square, claims a tactic (pin / fork / mate) that doesn't exist in this position, says a side is "attacking" something that isn't there.

Do NOT grade prose style, opinion, or pedagogical choices. Only factual claims about the CURRENT position.

Respond with valid JSON only, no prose around it:
{ "verdict": "ok" | "nit" | "wrong", "reason": "<one sentence, only if nit or wrong>" }`;
}

async function gradeMove(
  client: Anthropic,
  fenBefore: string,
  san: string,
  fenAfter: string,
  narration: string,
): Promise<{ verdict: Verdict; inputTokens: number; outputTokens: number } | null> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: gradePrompt(fenBefore, san, fenAfter, narration) }],
    });
    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    // Strip any codeblock fences the model might have added
    const json = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(json) as Verdict;
    return {
      verdict: parsed,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    console.warn(`  [grade error] ${(err as Error).message}`);
    return null;
  }
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < Math.min(n, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Set ANTHROPIC_API_KEY (or VITE_ANTHROPIC_API_KEY) to run.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const files = readdirSync(ANNOTATIONS_DIR).filter((f) => f.endsWith('.json'));
  const sample = pickRandom(files, LIMIT);

  console.log(`\n=== LLM NARRATION QUALITY GRADER ===`);
  console.log(`Model: ${MODEL}`);
  console.log(`Files sampled: ${sample.length} / ${files.length}\n`);

  let totalIn = 0;
  let totalOut = 0;
  let graded = 0;
  const fileFindings: { file: string; issues: { moveIdx: number; san: string; verdict: Verdict }[] }[] = [];

  for (const fname of sample) {
    const data: AnnotationFile = JSON.parse(readFileSync(join(ANNOTATIONS_DIR, fname), 'utf-8'));
    const list = data.moveAnnotations ?? data.moveAnalyses ?? [];
    if (list.length === 0) continue;

    const chess = new Chess();
    const issues: { moveIdx: number; san: string; verdict: Verdict }[] = [];

    console.log(`[${fname}] ${list.length} moves`);

    for (let i = 0; i < list.length; i++) {
      const { san, annotation } = list[i];
      const fenBefore = chess.fen();
      let moved;
      try {
        moved = chess.move(san);
      } catch {
        moved = null;
      }
      if (!moved) break;
      const fenAfter = chess.fen();

      const result = await gradeMove(client, fenBefore, san, fenAfter, annotation);
      if (!result) continue;
      graded += 1;
      totalIn += result.inputTokens;
      totalOut += result.outputTokens;

      if (result.verdict.verdict !== 'ok') {
        issues.push({ moveIdx: i, san, verdict: result.verdict });
        console.log(`  [${i}] ${san} — ${result.verdict.verdict}: ${result.verdict.reason ?? ''}`);
      }
    }

    if (issues.length > 0) {
      fileFindings.push({ file: fname, issues });
    }
  }

  const inCost = (totalIn / 1_000_000) * PRICE_PER_M_INPUT;
  const outCost = (totalOut / 1_000_000) * PRICE_PER_M_OUTPUT;
  const sampleCost = inCost + outCost;

  console.log(`\n=== SUMMARY ===`);
  console.log(`Graded moves: ${graded}`);
  console.log(`Input tokens: ${totalIn.toLocaleString()}`);
  console.log(`Output tokens: ${totalOut.toLocaleString()}`);
  console.log(`Sample cost: $${sampleCost.toFixed(4)}`);
  const perFileCost = sampleCost / sample.length;
  const fullRunEstimate = perFileCost * files.length;
  console.log(`Estimated full-run cost (${files.length} files): $${fullRunEstimate.toFixed(2)}`);

  console.log(`\nFiles with findings: ${fileFindings.length} / ${sample.length}`);
  for (const ff of fileFindings) {
    console.log(`  ${ff.file}: ${ff.issues.length} issue(s)`);
  }
  console.log();
}

void main();

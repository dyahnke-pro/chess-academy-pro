#!/usr/bin/env node
/**
 * regen-narration.mjs
 * -------------------
 * Targeted narration regeneration for one opening's annotation file.
 * Uses the local `claude --print` CLI (cwd=/tmp to avoid CLAUDE.md
 * load) so it runs against the user's Claude Code subscription rather
 * than a separate API key.
 *
 *   1. Load src/data/annotations/<openingId>.json.
 *   2. Identify entries that need regen:
 *        - explicit overrides passed via --override <subline>:<index>
 *        - any subline annotation whose text is empty
 *   3. For each entry, build a chess.js ground-truth packet (FEN
 *      before/after, piece moved, from/to, captured, check/mate state)
 *      and ask Claude for a 2-3 sentence narration of THAT move only.
 *      The system prompt forbids scene-setting / future-move
 *      references that caused the original audit findings.
 *   4. Splice the new narration back into the JSON, preserving every
 *      other field. Writes the file in place; prints a summary.
 *
 * Usage:
 *   node scripts/regen-narration.mjs birds-opening
 *
 * Resume-safe: reads existing annotations and only regenerates entries
 * that are still empty / still listed in --override.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Chess } from 'chess.js';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_LETTER_TO_NAME = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/regen-narration.mjs <openingId> [--override <subline>:<index> ...]');
  process.exit(2);
}

// Parse --override flags into a Set of "<sublineName>:<moveIndex>"
const overrides = new Set();
for (let i = 3; i < process.argv.length; i++) {
  if (process.argv[i] === '--override' && process.argv[i + 1]) {
    overrides.add(process.argv[i + 1]);
    i++;
  }
}

// ─── Load + walk ───────────────────────────────────────────────────────────

const annPath = join(repoRoot, `src/data/annotations/${target}.json`);
const data = JSON.parse(readFileSync(annPath, 'utf-8'));

const SYSTEM_PROMPT = `You write a single short narration paragraph for one chess move in an opening study.

Hard rules:
1. Describe ONLY the move that was just played. The board's position AFTER this move is what the student is looking at.
2. Do NOT describe moves that haven't happened yet ("after fxe5...", "next comes Nf3", "the plan is to play d4 and Bg5"). The student will see those when they happen.
3. Do NOT claim a piece sits on a square unless it is actually there in the position you are given. Squares listed as "empty" must NOT be referenced as occupied.
4. Do NOT describe a capture, check, or castling unless the move data tells you it occurred.
5. Use the variation name only as light flavor — the narration is about the move, not the variation as a whole.
6. 2-3 sentences. Plain prose. No headers, no lists, no quotation marks around your output.
7. Output ONLY the narration text. No commentary, no JSON, no markdown.`;

function buildContext(record) {
  const m = record.move;
  const moverColor = m.color === 'w' ? 'white' : 'black';
  const piece = PIECE_LETTER_TO_NAME[m.piece];
  const captured = m.captured ? PIECE_LETTER_TO_NAME[m.captured] : null;
  const after = new Chess(record.fenAfter);
  const isCheck = after.inCheck();
  const isMate = after.isCheckmate();
  const flags = m.flags || '';
  const castled = flags.includes('k') ? 'kingside' :
                  flags.includes('q') ? 'queenside' : null;

  // Compact piece census so the model can't claim phantom pieces.
  const occupied = [];
  const board = after.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const c = sq.color === 'w' ? 'W' : 'B';
      occupied.push(`${c}${sq.type}@${sq.square}`);
    }
  }

  return `Variation: ${record.sublineName ?? 'main line'}
Move number: ${record.moveNumber} (${moverColor} to move)
Move played (SAN): ${m.san}
Piece moved: ${moverColor} ${piece}
From: ${m.from}    To: ${m.to}
Captured: ${captured ?? 'none'}
Check after move: ${isCheck ? 'yes' : 'no'}
Checkmate after move: ${isMate ? 'yes' : 'no'}
Castling: ${castled ?? 'no'}
Pieces on the board after this move (only these squares are occupied):
  ${occupied.join(' ')}`;
}

// ─── Entry collection ──────────────────────────────────────────────────────

// Patterns are loaded dynamically from src/services/walkthroughNarration.ts
// at startup so the regen script's "needs regeneration" criterion always
// matches the runtime's `isGenericAnnotationText` exactly. Manually
// mirroring the list drifted (mine was 45 patterns, the runtime had 83
// — 8 entries went un-regenerated until this changed).
function loadGenericPatterns() {
  const ts = readFileSync(join(repoRoot, 'src/services/walkthroughNarration.ts'), 'utf-8');
  const start = ts.indexOf('const GENERIC_ANNOTATION_PATTERNS');
  if (start < 0) return [];
  const end = ts.indexOf('];', start) + 2;
  const block = ts.slice(start, end);
  const out = [];
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*(\/.*\/[a-z]*),?\s*$/);
    if (!m) continue;
    try { out.push(eval(m[1])); } catch { /* skip malformed */ }
  }
  return out;
}

const GENERIC_PATTERNS = loadGenericPatterns();

function isGenericFiller(text) {
  return GENERIC_PATTERNS.some((re) => re.test(text));
}

function collectEntries() {
  const entries = [];

  function walkLine(target, sublineName) {
    const chess = new Chess(STARTING_FEN);
    for (let i = 0; i < target.length; i++) {
      const ann = target[i];
      let move;
      try { move = chess.move(ann.san); } catch { return; }
      const text = (ann.annotation ?? '').trim();
      const overrideKey = `${sublineName ?? 'main'}:${i}`;
      const isEmpty = text.length === 0;
      const isFiller = !isEmpty && isGenericFiller(text);
      const isOverride = overrides.has(overrideKey);
      if (sublineName == null && !isOverride) continue; // never auto-regen main line
      if (!isEmpty && !isFiller && !isOverride) continue;
      entries.push({
        sublineName,
        moveIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        ann,
        move,
        san: move.san,
        fenAfter: chess.fen(),
        reason: isOverride ? 'override' : isEmpty ? 'empty' : 'filler',
      });
    }
  }

  walkLine(data.moveAnnotations ?? [], null);
  for (const sl of data.subLines ?? []) {
    walkLine(sl.moveAnnotations ?? [], sl.name ?? null);
  }
  return entries;
}

// ─── CLI generator ─────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';

async function generateNarration(record) {
  const userMessage = buildContext(record);
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--tools', '',
      '--system-prompt', SYSTEM_PROMPT,
      '--output-format', 'json',
    ];
    const proc = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: '/tmp' });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`claude exit ${code}: ${stderr.slice(0, 200)}`));
      try {
        const env = JSON.parse(stdout);
        const text = String(env.result ?? '').trim();
        // Defensive cleanup — strip stray surrounding quotes and any
        // accidental "Narration:" prefix the model sometimes adds.
        const cleaned = text.replace(/^"|"$/g, '').replace(/^narration[:.]?\s*/i, '').trim();
        resolve({
          text: cleaned,
          cost: env.total_cost_usd ?? 0,
        });
      } catch (e) {
        reject(new Error(`parse error: ${e?.message ?? e}; stdout="${stdout.slice(0, 200)}"`));
      }
    });
    proc.stdin.write(userMessage);
    proc.stdin.end();
  });
}

// ─── Splicer ───────────────────────────────────────────────────────────────
//
// Mutate the loaded `data` in place: find each entry's annotation
// object by (sublineName, moveIndex) and assign new annotation text.
// All other fields (san, arrows, highlights, plans, pawnStructure)
// are preserved.

function spliceNarration(sublineName, moveIndex, newText) {
  if (sublineName == null) {
    data.moveAnnotations[moveIndex].annotation = newText;
    return;
  }
  const sl = (data.subLines ?? []).find((s) => s.name === sublineName);
  if (!sl) throw new Error(`subline "${sublineName}" not found`);
  sl.moveAnnotations[moveIndex].annotation = newText;
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  const entries = collectEntries();
  console.log(`[regen] ${target}: ${entries.length} entries to regenerate`);
  console.log(`  empty: ${entries.filter((e) => e.reason === 'empty').length}`);
  console.log(`  filler (runtime-suppressed): ${entries.filter((e) => e.reason === 'filler').length}`);
  console.log(`  override: ${entries.filter((e) => e.reason === 'override').length}`);

  if (entries.length === 0) {
    console.log('[regen] nothing to do');
    return;
  }

  const startedAt = Date.now();
  let totalCost = 0;
  let completed = 0;
  const failures = [];

  // Sequential to keep things simple; CLI is naturally rate-limited by
  // its ~5-10s per call. Save after every entry so a crash is recoverable.
  for (const e of entries) {
    try {
      const { text, cost } = await generateNarration(e);
      if (!text) throw new Error('empty narration returned');
      spliceNarration(e.sublineName, e.moveIndex, text);
      writeFileSync(annPath, JSON.stringify(data, null, 2) + '\n');
      totalCost += cost;
      completed++;
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
      console.log(
        `[regen] ${completed}/${entries.length} ` +
          `[${e.reason}] ${e.sublineName ?? 'main'} m${e.moveNumber} ${e.san} ` +
          `(+$${cost.toFixed(4)}, total $${totalCost.toFixed(4)}, ${elapsed}s)`,
      );
    } catch (err) {
      failures.push({ entry: e, error: String(err?.message ?? err) });
      console.error(
        `[regen] FAIL ${e.sublineName ?? 'main'} m${e.moveNumber} ${e.san}: ${err?.message ?? err}`,
      );
    }
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `\n[regen] done: ${completed}/${entries.length} succeeded, ` +
      `${failures.length} failed, total cost $${totalCost.toFixed(4)}, ${elapsedSec}s`,
  );
  if (failures.length > 0) {
    console.log('[regen] failures:');
    for (const f of failures) {
      console.log(`  - ${f.entry.sublineName ?? 'main'} m${f.entry.moveNumber} ${f.entry.san}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[regen] fatal:', e?.message ?? e);
  process.exit(1);
});

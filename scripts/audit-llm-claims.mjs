#!/usr/bin/env node
/**
 * audit-llm-claims.mjs
 * --------------------
 * LLM-extraction + deterministic-verification audit. The board is the
 * only ground truth — the LLM does language parsing only, never judges
 * accuracy. The script's deterministic verifier is what flags
 * mismatches.
 *
 *   1. Walk a target opening's main + sublines (skip empty annotations).
 *   2. For each move, build a chess.js ground-truth packet from the
 *      board (move details, post-FEN, piece census, attackers).
 *   3. Ask Haiku 4.5 to extract every concrete chess claim from the
 *      narration as structured JSON. NO accuracy judgment.
 *   4. Deterministically verify each claim against the ground truth.
 *      Anything that contradicts the board is a finding.
 *
 * Outputs audit-reports/llm-claims-<openingId>.{json,md}.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/audit-llm-claims.mjs birds-opening
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Chess } from 'chess.js';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECE_LETTER_TO_NAME = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/audit-llm-claims.mjs <openingId>');
  process.exit(2);
}

// ─── Record collection ─────────────────────────────────────────────────────

function readJson(rel) {
  return JSON.parse(readFileSync(join(repoRoot, rel), 'utf-8'));
}

function collectOpening(openingId) {
  const data = readJson(`src/data/annotations/${openingId}.json`);
  const records = [];

  function walkLine(source, sublineName, moveAnnotations) {
    const chess = new Chess(STARTING_FEN);
    for (let i = 0; i < moveAnnotations.length; i++) {
      const ann = moveAnnotations[i];
      const fenBefore = chess.fen();
      let move;
      try {
        move = chess.move(ann.san);
      } catch {
        return; // illegal — abort this line
      }
      const text = (ann.annotation ?? '').trim();
      if (!text) continue;
      records.push({
        source,
        openingId,
        sublineName,
        moveIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        sideToMove: i % 2 === 0 ? 'white' : 'black',
        san: move.san,
        move,
        fenBefore,
        fenAfter: chess.fen(),
        text,
        arrows: Array.isArray(ann.arrows) ? ann.arrows : null,
      });
    }
  }

  walkLine('main', null, data.moveAnnotations ?? []);
  for (const sl of data.subLines ?? []) {
    walkLine('subline', sl.name ?? null, sl.moveAnnotations ?? []);
  }
  return records;
}

// ─── Ground-truth packet builder ───────────────────────────────────────────

function pieceCensus(fen) {
  const chess = new Chess(fen);
  const board = chess.board();
  const pieces = [];
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      pieces.push({
        color: sq.color === 'w' ? 'white' : 'black',
        piece: PIECE_LETTER_TO_NAME[sq.type],
        square: sq.square,
      });
    }
  }
  return pieces;
}

function buildGroundTruth(r) {
  const m = r.move;
  const moverColor = m.color === 'w' ? 'white' : 'black';
  const piece = PIECE_LETTER_TO_NAME[m.piece];
  const captured = m.captured ? PIECE_LETTER_TO_NAME[m.captured] : null;

  const after = new Chess(r.fenAfter);
  const isCheck = after.inCheck();
  const isMate = after.isCheckmate();
  const flags = m.flags || '';
  const castled = flags.includes('k') ? 'kingside' :
                  flags.includes('q') ? 'queenside' : null;
  const isEnPassant = flags.includes('e');
  const promotion = m.promotion ? PIECE_LETTER_TO_NAME[m.promotion] : null;

  return {
    moveNumber: r.moveNumber,
    sideToMove: moverColor,
    san: m.san,
    uci: `${m.from}${m.to}${m.promotion ?? ''}`,
    piece,
    from: m.from,
    to: m.to,
    captured,
    capturedSquare: captured ? (isEnPassant ? null : m.to) : null,
    isCapture: Boolean(captured),
    isCheck,
    isCheckmate: isMate,
    castled,
    isEnPassant,
    promotion,
    // Side-to-move AFTER the move played (for color-to-move claims)
    sideToMoveNext: after.turn() === 'w' ? 'white' : 'black',
    piecesAfter: pieceCensus(r.fenAfter),
  };
}

// ─── Deterministic verifier ────────────────────────────────────────────────
//
// The LLM emits structured claims. THIS function decides truth — never
// the LLM. Every comparison is against chess.js facts derived from the
// board.
//
// Claim types the verifier understands:
//   piece_to_square       {piece, square, color?, from?}
//   piece_from_square     {piece, square, color?}
//   piece_on_square       {piece, square, color?}    -- post-move position
//   capture               {captured_piece?, square?, capturer_piece?}
//   check                 {color?}                   -- color in check
//   checkmate             {color?}
//   castles               {side: kingside|queenside, color?}
//   color_to_move         {color}                    -- color that just moved
//   move_number           {number}
//   en_passant            {}
//   promotion             {to_piece}
//
// Anything else is recorded as 'unverifiable' (not a finding — just
// outside the verifier's scope, e.g. strategic / thematic claims).

function normalizePiece(s) {
  if (typeof s !== 'string') return s;
  const t = s.toLowerCase().trim().replace(/s$/, '');
  return ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'].includes(t) ? t : s;
}

function normalizeSquare(s) {
  if (typeof s !== 'string') return s;
  const t = s.toLowerCase().trim();
  return /^[a-h][1-8]$/.test(t) ? t : s;
}

function normalizeColor(s) {
  if (typeof s !== 'string') return s;
  const t = s.toLowerCase().trim();
  return t === 'white' || t === 'black' ? t : s;
}

function normalizeClaim(c) {
  return {
    ...c,
    piece: normalizePiece(c.piece),
    captured_piece: normalizePiece(c.captured_piece),
    capturer_piece: normalizePiece(c.capturer_piece),
    to_piece: normalizePiece(c.to_piece),
    square: normalizeSquare(c.square),
    from: normalizeSquare(c.from),
    color: normalizeColor(c.color),
  };
}

function verifyClaim(rawClaim, gt, fenAfter) {
  const claim = normalizeClaim(rawClaim);
  const reason = (s) => ({ verdict: 'contradicted', reason: s });
  const ok = () => ({ verdict: 'verified' });
  const skip = (s) => ({ verdict: 'unverifiable', reason: s });

  switch (claim.type) {
    case 'piece_to_square': {
      if (claim.piece && claim.piece !== gt.piece) {
        return reason(`narration says ${claim.piece}, board says ${gt.piece} moved`);
      }
      if (claim.square && claim.square !== gt.to) {
        return reason(`narration says destination ${claim.square}, board says ${gt.to}`);
      }
      if (claim.from && claim.from !== gt.from) {
        return reason(`narration says origin ${claim.from}, board says ${gt.from}`);
      }
      if (claim.color && claim.color !== gt.sideToMove) {
        return reason(`narration says ${claim.color} moved, board says ${gt.sideToMove}`);
      }
      return ok();
    }
    case 'piece_from_square': {
      if (claim.piece && claim.piece !== gt.piece) {
        return reason(`narration says ${claim.piece} left ${claim.square}, board says ${gt.piece} left ${gt.from}`);
      }
      if (claim.square && claim.square !== gt.from) {
        return reason(`narration says origin ${claim.square}, board says ${gt.from}`);
      }
      return ok();
    }
    case 'piece_on_square': {
      if (!claim.square) return skip('no square specified');
      const chess = new Chess(fenAfter);
      const occ = chess.get(claim.square);
      if (!occ) return reason(`narration claims ${claim.piece ?? 'a piece'} on ${claim.square}, square is empty`);
      const occName = PIECE_LETTER_TO_NAME[occ.type];
      const occColor = occ.color === 'w' ? 'white' : 'black';
      if (claim.piece && claim.piece !== occName) {
        return reason(`narration claims ${claim.piece} on ${claim.square}, board has a ${occColor} ${occName}`);
      }
      if (claim.color && claim.color !== occColor) {
        return reason(`narration claims ${claim.color} ${claim.piece ?? 'piece'} on ${claim.square}, board has a ${occColor} ${occName}`);
      }
      return ok();
    }
    case 'capture': {
      if (!gt.isCapture) {
        return reason('narration claims a capture, no capture occurred');
      }
      if (claim.captured_piece && claim.captured_piece !== gt.captured) {
        return reason(`narration says captured ${claim.captured_piece}, board says ${gt.captured} was captured`);
      }
      if (claim.square && gt.capturedSquare && claim.square !== gt.capturedSquare) {
        return reason(`narration says capture on ${claim.square}, board says capture on ${gt.capturedSquare}`);
      }
      if (claim.capturer_piece && claim.capturer_piece !== gt.piece) {
        return reason(`narration says ${claim.capturer_piece} captured, board says ${gt.piece} captured`);
      }
      return ok();
    }
    case 'check': {
      if (!gt.isCheck) return reason('narration claims check, position is not in check');
      if (claim.color && claim.color !== gt.sideToMoveNext) {
        return reason(`narration says ${claim.color} is in check, board says ${gt.sideToMoveNext} is in check`);
      }
      return ok();
    }
    case 'checkmate': {
      if (!gt.isCheckmate) return reason('narration claims checkmate, position is not mate');
      return ok();
    }
    case 'castles': {
      if (!gt.castled) return reason('narration claims castling, no castling occurred');
      if (claim.side && claim.side !== gt.castled) {
        return reason(`narration says castled ${claim.side}, board says castled ${gt.castled}`);
      }
      if (claim.color && claim.color !== gt.sideToMove) {
        return reason(`narration says ${claim.color} castled, board says ${gt.sideToMove} castled`);
      }
      return ok();
    }
    case 'color_to_move': {
      if (claim.color !== gt.sideToMove) {
        return reason(`narration says ${claim.color} moved, board says ${gt.sideToMove} moved`);
      }
      return ok();
    }
    case 'move_number': {
      if (claim.number !== gt.moveNumber) {
        return reason(`narration says move ${claim.number}, board says move ${gt.moveNumber}`);
      }
      return ok();
    }
    case 'en_passant':
      return gt.isEnPassant ? ok() : reason('narration claims en passant, move is not en passant');
    case 'promotion': {
      if (!gt.promotion) return reason('narration claims promotion, no promotion occurred');
      if (claim.to_piece && claim.to_piece !== gt.promotion) {
        return reason(`narration says promoted to ${claim.to_piece}, board says promoted to ${gt.promotion}`);
      }
      return ok();
    }
    default:
      return skip(`unsupported claim type "${claim.type}"`);
  }
}

// ─── LLM extractor (Anthropic SDK, Haiku 4.5, prompt caching) ─────────────
//
// The LLM is asked ONLY to convert prose into structured claims. It
// must not judge accuracy. The system prompt is cached so per-record
// input cost is just the narration + a tiny header.

const EXTRACTION_SYSTEM_PROMPT = `You are a structured-information extractor for chess narrations.

You will be given a single chess narration that describes a move that
was played. Your ONLY job is to extract the concrete chess CLAIMS
made by the prose into structured JSON. You do NOT judge whether the
claims are accurate. You do NOT add anything that the prose doesn't
say. Skip strategic / thematic / vague language ("controls the
center", "creates pressure", "preserves the initiative").

Output JSON with this exact shape — no prose, no markdown:

{
  "claims": [
    { "type": "<one of the supported types>", ...fields }
  ]
}

Supported types and required/optional fields:

- piece_to_square      {piece, square, color?, from?}
    Use when prose says a piece "moves/goes/develops/jumps/slides to
    <square>", "places the <piece> on <square>" describing the move
    played, or "plays <piece> to <square>".
- piece_from_square    {piece, square, color?}
    Use when prose says "<piece> leaves <square>" or "from <square>".
- piece_on_square      {piece, square, color?}
    Use when prose claims a piece SITS ON a square in the resulting
    position ("the knight on c3 controls...", "the bishop on c4 eyes
    f7"). NOT for the move itself.
- capture              {captured_piece?, square?, capturer_piece?}
    Use when prose says something was captured / taken / exchanged off.
- check                {color?}     -- color in check
- checkmate            {color?}
- castles              {side: "kingside"|"queenside", color?}
- color_to_move        {color}      -- color that just moved
    Use ONLY when prose explicitly attributes the move (e.g. "White
    plays..."). Do not infer from move number.
- move_number          {number}
- en_passant           {}
- promotion            {to_piece}

Rules:
1. Use lowercase piece names: pawn, knight, bishop, rook, queen, king.
2. Use lowercase squares: a1..h8.
3. Use lowercase colors: white, black.
4. Omit fields the prose doesn't specify — do not invent.
5. If prose makes NO concrete chess claim (purely strategic / thematic),
   return {"claims": []}.
6. JSON only. No commentary.`;

const MODEL_ID = process.env.AUDIT_LLM_MODEL ?? (
  process.env.ANTHROPIC_API_KEY ? 'claude-haiku-4-5-20251001' : 'deepseek-chat'
);
const MAX_RECORDS = parseInt(process.env.AUDIT_LLM_LIMIT ?? '0', 10); // 0 = all
const RPS = parseInt(process.env.AUDIT_LLM_RPS ?? '4', 10);

async function buildAnthropicExtractor() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return async function extract(record, gt) {
    const userMessage = `Move played (SAN): ${gt.san}
Narration:
"""
${record.text}
"""`;
    const res = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 600,
      system: [
        {
          type: 'text',
          text: EXTRACTION_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });
    const raw = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    return {
      raw,
      usage: {
        input_tokens: res.usage?.input_tokens ?? 0,
        output_tokens: res.usage?.output_tokens ?? 0,
        cache_read_input_tokens: res.usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: res.usage?.cache_creation_input_tokens ?? 0,
      },
    };
  };
}

async function buildDeepseekExtractor() {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  });
  return async function extract(record, gt) {
    const userMessage = `Move played (SAN): ${gt.san}
Narration:
"""
${record.text}
"""`;
    const res = await client.chat.completions.create({
      model: MODEL_ID,
      max_tokens: 600,
      // DeepSeek's OpenAI-compatible API supports response_format json_object.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
    const raw = res.choices?.[0]?.message?.content ?? '';
    // DeepSeek reports cache hits via prompt_cache_hit_tokens.
    const u = res.usage ?? {};
    return {
      raw,
      usage: {
        input_tokens: u.prompt_tokens ?? 0,
        output_tokens: u.completion_tokens ?? 0,
        cache_read_input_tokens: u.prompt_cache_hit_tokens ?? 0,
        cache_creation_input_tokens: 0,
      },
    };
  };
}

async function buildExtractor() {
  if (process.env.ANTHROPIC_API_KEY) return buildAnthropicExtractor();
  if (process.env.DEEPSEEK_API_KEY) return buildDeepseekExtractor();
  throw new Error(
    'No LLM key set. Export ANTHROPIC_API_KEY or DEEPSEEK_API_KEY before running.',
  );
}

function parseClaims(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    if (!Array.isArray(obj.claims)) return null;
    return obj.claims;
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Per-million-token rates. Conservative (cache miss) prices for input;
// cached-read column applies when the provider reports cache hits.
const PRICING = {
  // Anthropic Haiku 4.5 — $1/M in, $5/M out, $1.25 cache write, $0.10 cache read
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0, cacheWrite: 1.25, cacheRead: 0.10 },
  // DeepSeek (deepseek-chat) — $0.27/M cache miss in, $0.07/M cache hit, $1.10/M out
  'deepseek-chat': { in: 0.27, out: 1.10, cacheWrite: 0.27, cacheRead: 0.07 },
};

function estimateCost(usage, model) {
  const p = PRICING[model] ?? { in: 1.0, out: 5.0, cacheWrite: 1.0, cacheRead: 0.10 };
  return (
    (usage.input * p.in) +
    (usage.cacheWrite * p.cacheWrite) +
    (usage.cacheRead * p.cacheRead) +
    (usage.output * p.out)
  ) / 1_000_000;
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  const allRecords = collectOpening(target);
  const records = MAX_RECORDS > 0 ? allRecords.slice(0, MAX_RECORDS) : allRecords;
  console.log(
    `[audit-llm-claims] ${target}: ${allRecords.length} content records` +
      (MAX_RECORDS > 0 ? ` (limiting to first ${records.length})` : ''),
  );

  const extract = await buildExtractor();
  console.log(`[audit-llm-claims] model: ${MODEL_ID} @ ${RPS} rps, prompt caching ON`);

  const audited = [];
  const findings = [];
  const errors = [];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  const perReqMs = Math.ceil(1000 / RPS);
  const t0 = Date.now();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const gt = buildGroundTruth(r);
    const reqStart = Date.now();
    let extracted;
    try {
      const { raw, usage: u } = await extract(r, gt);
      usage.input += u.input_tokens ?? 0;
      usage.output += u.output_tokens ?? 0;
      usage.cacheRead += u.cache_read_input_tokens ?? 0;
      usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
      const claims = parseClaims(raw);
      if (!claims) {
        errors.push({ index: i, kind: 'parse', raw: raw.slice(0, 240) });
        extracted = [];
      } else {
        extracted = claims;
      }
    } catch (e) {
      errors.push({ index: i, kind: 'api', message: String(e?.message ?? e) });
      extracted = [];
    }

    const verdicts = extracted.map((claim) => ({
      claim,
      ...verifyClaim(claim, gt, r.fenAfter),
    }));

    audited.push({
      source: r.source,
      sublineName: r.sublineName,
      moveIndex: r.moveIndex,
      moveNumber: r.moveNumber,
      san: r.san,
      sideToMove: gt.sideToMove,
      from: gt.from,
      to: gt.to,
      piece: gt.piece,
      text: r.text,
      claims: verdicts,
    });

    for (const v of verdicts) {
      if (v.verdict === 'contradicted') {
        findings.push({
          source: r.source,
          sublineName: r.sublineName,
          moveIndex: r.moveIndex,
          moveNumber: r.moveNumber,
          san: r.san,
          piece: gt.piece,
          to: gt.to,
          text: r.text,
          claim: v.claim,
          reason: v.reason,
        });
      }
    }

    if ((i + 1) % 10 === 0 || i === records.length - 1) {
      console.log(
        `[audit-llm-claims] ${i + 1}/${records.length} | ` +
          `findings=${findings.length} | errors=${errors.length} | ` +
          `tokens in=${usage.input}+cache(${usage.cacheRead}r/${usage.cacheWrite}w) out=${usage.output}`,
      );
    }

    const elapsed = Date.now() - reqStart;
    if (elapsed < perReqMs && i < records.length - 1) await sleep(perReqMs - elapsed);
  }

  const summary = {
    target,
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - t0,
    totalRecords: records.length,
    totalClaims: audited.reduce((a, r) => a + r.claims.length, 0),
    contradicted: findings.length,
    verified: audited.reduce(
      (a, r) => a + r.claims.filter((c) => c.verdict === 'verified').length,
      0,
    ),
    unverifiable: audited.reduce(
      (a, r) => a + r.claims.filter((c) => c.verdict === 'unverifiable').length,
      0,
    ),
    errors: errors.length,
    usage,
    estimatedCostUSD: estimateCost(usage, MODEL_ID),
    model: MODEL_ID,
  };

  const outBase = join(outDir, `llm-claims-${target}`);
  writeFileSync(`${outBase}.json`, JSON.stringify({ summary, findings, audited, errors }, null, 2));

  // Markdown report
  const md = [];
  md.push(`# LLM-Claims Audit — ${target}`);
  md.push('');
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Model: ${summary.model}`);
  md.push(`Elapsed: ${(summary.elapsedMs / 1000).toFixed(1)}s`);
  md.push(`Estimated cost: $${summary.estimatedCostUSD.toFixed(4)}`);
  md.push('');
  md.push('## Method');
  md.push('');
  md.push('1. chess.js replays each move and produces a ground-truth packet');
  md.push('   (piece, from, to, captured, check, mate, castled, …).');
  md.push('2. Haiku extracts every concrete chess claim from the narration');
  md.push('   into structured JSON. **The LLM does not judge accuracy.**');
  md.push('3. A deterministic verifier compares each claim to the ground');
  md.push('   truth. Contradictions are findings.');
  md.push('');
  md.push('The board is the only source of truth. The LLM only does language');
  md.push('parsing — turning prose into structured tokens.');
  md.push('');
  md.push('## Counts');
  md.push('');
  md.push('| | Count |');
  md.push('|---|---:|');
  md.push(`| Records audited | ${summary.totalRecords} |`);
  md.push(`| Claims extracted | ${summary.totalClaims} |`);
  md.push(`| Verified | ${summary.verified} |`);
  md.push(`| **Contradicted** | **${summary.contradicted}** |`);
  md.push(`| Unverifiable (out of verifier scope) | ${summary.unverifiable} |`);
  md.push(`| Extraction errors | ${summary.errors} |`);
  md.push('');

  if (findings.length === 0) {
    md.push('## Findings');
    md.push('');
    md.push('No contradictions detected.');
    md.push('');
  } else {
    md.push('## Findings');
    md.push('');
    for (const f of findings) {
      const where = f.source === 'main'
        ? `main, move ${f.moveNumber} ${f.san}`
        : `subline "${f.sublineName}", move ${f.moveNumber} ${f.san}`;
      md.push(`### ${where}`);
      md.push('');
      md.push(`**Board says:** ${f.piece} → ${f.to} (${f.san})`);
      md.push('');
      md.push(`**Narration:** "${f.text}"`);
      md.push('');
      md.push(`**Contradicted claim:** \`${JSON.stringify(f.claim)}\``);
      md.push('');
      md.push(`**Reason:** ${f.reason}`);
      md.push('');
    }
  }

  writeFileSync(`${outBase}.md`, md.join('\n'));
  console.log(
    `[audit-llm-claims] wrote ${outBase}.{json,md} | ` +
      `findings=${summary.contradicted}/${summary.totalClaims} claims | ` +
      `cost≈$${summary.estimatedCostUSD.toFixed(4)}`,
  );
}

main().catch((e) => {
  console.error('[audit-llm-claims] fatal:', e?.message ?? e);
  process.exit(1);
});

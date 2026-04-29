#!/usr/bin/env node
/**
 * audit-lichess-lines.mjs
 * -----------------------
 * Verifies every opening variation in repertoire.json + pro-repertoires.json
 * against the Lichess opening explorer (free, no auth). For each variation,
 * walks ply by ply and at every position confirms that the next move
 * actually appears in real Lichess games. A move with 0 games at its
 * position is a fabricated line; a variation that diverges from book is
 * flagged with the exact ply where it leaves theory.
 *
 * Sources audited:
 *   - src/data/repertoire.json — 40 openings × ~8 variations
 *   - src/data/pro-repertoires.json — 80 entries × ~5 variations
 *
 * Lichess explorer endpoint:
 *   https://explorer.lichess.ovh/lichess?fen=<fen>
 *
 * Output: audit-reports/lichess-lines.{json,md}
 *
 * Usage:
 *   node scripts/audit-lichess-lines.mjs            # full audit
 *   node scripts/audit-lichess-lines.mjs --limit 5  # first 5 variations
 *   node scripts/audit-lichess-lines.mjs --source masters  # masters DB only
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Chess } from 'chess.js';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ─── CLI args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function readFlag(name, defaultValue) {
  const i = args.indexOf(name);
  if (i < 0) return defaultValue;
  return args[i + 1] ?? defaultValue;
}

const LIMIT = parseInt(readFlag('--limit', '0'), 10); // 0 = all
const SOURCE = readFlag('--source', 'lichess'); // 'lichess' | 'masters' (online mode only)
const MIN_GAMES = parseInt(readFlag('--min-games', '5'), 10); // game-count threshold (online mode only)
const RPS = parseFloat(readFlag('--rps', '4')); // (online mode only)
// Mode: 'offline' = check against src/data/openings-lichess.json (3641 ECO entries, no network)
//       'online'  = walk each ply through explorer.lichess.ovh (real-game stats)
const MODE = readFlag('--mode', 'offline');

// ─── Variation collection ──────────────────────────────────────────────────

function readJson(rel) {
  return JSON.parse(readFileSync(join(repoRoot, rel), 'utf-8'));
}

function tokensToSans(pgn) {
  return pgn.trim().split(/\s+/).filter((t) => t.length > 0 && !/^\d+\.+$/.test(t));
}

function collectVariations() {
  const variations = [];

  // 40 main openings — each entry's top-level pgn (the main line) plus its variations[].
  const rep = readJson('src/data/repertoire.json');
  for (const op of rep) {
    variations.push({
      sourceFile: 'repertoire.json',
      openingId: op.id,
      openingName: op.name,
      eco: op.eco,
      variationName: '(main line)',
      pgn: op.pgn,
    });
    for (const v of op.variations ?? []) {
      variations.push({
        sourceFile: 'repertoire.json',
        openingId: op.id,
        openingName: op.name,
        eco: op.eco,
        variationName: v.name,
        pgn: v.pgn,
      });
    }
  }

  // 80 pro entries — overview pgn plus variations[].
  const pro = readJson('src/data/pro-repertoires.json');
  for (const op of pro.openings) {
    variations.push({
      sourceFile: 'pro-repertoires.json',
      openingId: op.id,
      openingName: op.name,
      eco: op.eco,
      variationName: '(main line)',
      pgn: op.pgn,
    });
    for (const v of op.variations ?? []) {
      variations.push({
        sourceFile: 'pro-repertoires.json',
        openingId: op.id,
        openingName: op.name,
        eco: op.eco,
        variationName: v.name,
        pgn: v.pgn,
      });
    }
  }

  return variations;
}

// ─── Offline reference (src/data/openings-lichess.json) ───────────────────
//
// 3641 ECO entries — every named line in Lichess's catalog. Build a
// trie of FEN sequences so we can ask, in O(plies), "is this PGN a
// prefix of any catalog entry, and which one(s) named lines pass
// through this exact FEN?"

let lichessFenIndex = null;

function loadLichessFenIndex() {
  if (lichessFenIndex) return lichessFenIndex;
  const list = readJson('src/data/openings-lichess.json');
  // Map: fen -> array of { eco, name, plyIndex } that pass through this FEN
  const fenToOpenings = new Map();
  for (const entry of list) {
    const sans = tokensToSans(entry.pgn);
    const chess = new Chess(STARTING_FEN);
    let ok = true;
    for (let i = 0; i < sans.length; i++) {
      try {
        chess.move(sans[i]);
      } catch {
        ok = false;
        break;
      }
      const fen = chess.fen();
      let bucket = fenToOpenings.get(fen);
      if (!bucket) {
        bucket = [];
        fenToOpenings.set(fen, bucket);
      }
      bucket.push({ eco: entry.eco, name: entry.name, plyIndex: i });
    }
    if (!ok) continue;
  }
  lichessFenIndex = { fenToOpenings, totalEntries: list.length };
  return lichessFenIndex;
}

// Crude opening-name normalization for fuzzy matching variation names
// against catalog entries. Strips ECO prefixes, parenthetical notes, and
// punctuation so "Italian Game" matches "Italian Game: Anti-Fried Liver".
function normalizeOpeningName(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\bdefen[cs]e\b/g, 'defence')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// For each variation, classify it relative to the catalog:
//   clean              — every ply lies within a Lichess catalog entry,
//                        and the deepest matching entry's name shares
//                        meaningful tokens with the variation's claimed
//                        parent opening name (e.g. "italian" appears in
//                        both). The line is real *and* correctly named.
//   continuation       — plies match a catalog entry as a prefix and
//                        the matched entry is consistent with the
//                        claimed parent, but the variation continues
//                        past where the catalog stops naming positions.
//                        Normal for deep theory; not a bug.
//   wrong-parent       — plies match a catalog entry but the matched
//                        entry's name is from a DIFFERENT opening than
//                        the variation claims (e.g. claimed "Najdorf"
//                        but plies put us in a Caro-Kann). Real bug.
//   never-in-book      — first ply not in any catalog entry (Nh3 etc.
//                        without further development matching). Real bug.
//   illegal-san        — chess.js can't play the move. Always a bug.
async function auditVariationOffline(v) {
  const idx = loadLichessFenIndex();
  const sans = tokensToSans(v.pgn);
  const chess = new Chess(STARTING_FEN);
  let lastInBookPly = -1;
  let lastInBookOpening = null;
  let illegalAt = -1;

  for (let i = 0; i < sans.length; i++) {
    try {
      chess.move(sans[i]);
    } catch {
      illegalAt = i;
      break;
    }
    const bucket = idx.fenToOpenings.get(chess.fen());
    if (bucket && bucket.length > 0) {
      lastInBookPly = i;
      lastInBookOpening = bucket[0];
    }
  }

  let status;
  let findings = [];
  if (illegalAt >= 0) {
    status = 'illegal-san';
    findings = [{ kind: 'illegal-san', plyIndex: illegalAt, claimedSan: sans[illegalAt] }];
  } else if (lastInBookPly < 0) {
    status = 'never-in-book';
    findings = [{
      kind: 'never-in-book',
      plyIndex: 0,
      moveNumber: 1,
      sideToMove: 'white',
      claimedSan: sans[0],
    }];
  } else {
    // Did the in-book opening name match the variation's claimed parent?
    // We skip the check entirely when the variation's name announces a
    // transposition / cross-opening setup ("vs", "Setup", "Response",
    // "Structure", "Transposition") — those are intentional cross-
    // references and the catalog match landing in another opening is
    // expected, not a bug.
    const transpositionRe = /\b(?:vs\.?|transposition|setup|response|structure|reversed)\b/i;
    const variationAcknowledgesCross = transpositionRe.test(v.variationName ?? '');
    const parentTokens = new Set(normalizeOpeningName(v.openingName).split(' ').filter((t) => t.length >= 4));
    const matchedTokens = normalizeOpeningName(lastInBookOpening.name).split(' ').filter((t) => t.length >= 4);
    const overlap = matchedTokens.some((t) => parentTokens.has(t));
    if (!overlap && parentTokens.size > 0 && !variationAcknowledgesCross) {
      status = 'wrong-parent';
      findings = [{
        kind: 'wrong-parent',
        plyIndex: lastInBookPly,
        matchedOpening: `${lastInBookOpening.eco} ${lastInBookOpening.name}`,
        claimedParent: v.openingName,
      }];
    } else if (lastInBookPly === sans.length - 1) {
      status = 'clean';
    } else {
      status = 'continuation';
    }
  }

  return {
    sourceFile: v.sourceFile,
    openingId: v.openingId,
    openingName: v.openingName,
    eco: v.eco,
    variationName: v.variationName,
    pgn: v.pgn,
    plies: sans.length,
    lastInBookPly,
    lastInBookOpening: lastInBookOpening ? `${lastInBookOpening.eco} ${lastInBookOpening.name}` : null,
    status,
    findings,
  };
}

// ─── Lichess explorer fetcher (cached, rate-limited) ──────────────────────

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const USER_AGENT =
  'ChessAcademyPro/1.0 audit (https://chess-academy-pro.vercel.app)';

const fenCache = new Map(); // fen -> { moves: Array<{san, white, draws, black}>, total }

let lastRequestAt = 0;
async function rateLimit() {
  const minGapMs = Math.ceil(1000 / RPS);
  const now = Date.now();
  const wait = lastRequestAt + minGapMs - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function fetchExplorerForFen(fen, attempt = 0) {
  if (fenCache.has(fen)) return fenCache.get(fen);
  const params = new URLSearchParams({ fen, moves: '20' });
  if (SOURCE === 'lichess') {
    // Restrict to humans 1600+ to avoid noise from beginner blunders.
    params.set('speeds', 'blitz,rapid,classical');
    params.set('ratings', '1600,1800,2000,2200,2500');
  }
  const url = `${EXPLORER_BASE}/${SOURCE}?${params.toString()}`;
  await rateLimit();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status === 429) {
      // Lichess rate-limited us. Back off.
      const backoffMs = 2000 * Math.pow(2, attempt);
      console.warn(`[audit-lichess] 429, backing off ${backoffMs}ms`);
      await new Promise((r) => setTimeout(r, backoffMs));
      if (attempt < 4) return fetchExplorerForFen(fen, attempt + 1);
      throw new Error('rate-limited after 4 retries');
    }
    if (!res.ok) throw new Error(`explorer ${res.status}`);
    const json = await res.json();
    const moves = Array.isArray(json.moves) ? json.moves : [];
    const compact = {
      moves: moves.map((m) => ({
        san: m.san,
        total: (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0),
      })),
      total: moves.reduce((a, m) => a + (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0), 0),
    };
    fenCache.set(fen, compact);
    return compact;
  } catch (e) {
    // Network blip — retry with exponential backoff up to 3 times.
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      return fetchExplorerForFen(fen, attempt + 1);
    }
    throw e;
  }
}

// ─── Per-variation walker ──────────────────────────────────────────────────
//
// Walk each variation ply by ply. At every position, query Lichess for
// what's been played there. The variation's claimed next move must
// appear in the response with at least MIN_GAMES games. First ply that
// fails is the divergence point — we stop walking that variation.
//
// Variations diverge in two ways:
//   - off-book: the next claimed move has 0 games (fabricated line)
//   - rare:    the next claimed move has < MIN_GAMES games (could be
//              a sideline only the audit cares about, or a typo)
// We flag both with the actual game count so the report can be triaged.

async function auditVariation(v) {
  const sans = tokensToSans(v.pgn);
  const chess = new Chess(STARTING_FEN);
  const findings = [];
  let pliesChecked = 0;
  let stopped = false;

  for (let i = 0; i < sans.length && !stopped; i++) {
    const fenBefore = chess.fen();
    const claimedSan = sans[i];

    let result;
    try {
      result = await fetchExplorerForFen(fenBefore);
    } catch (e) {
      findings.push({
        kind: 'fetch-error',
        plyIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        sideToMove: i % 2 === 0 ? 'white' : 'black',
        claimedSan,
        message: String(e?.message ?? e),
      });
      stopped = true;
      break;
    }

    pliesChecked++;

    const matched = result.moves.find((m) => m.san === claimedSan);
    if (!matched) {
      // Move never played at this position by anyone in the rating window.
      findings.push({
        kind: 'off-book',
        plyIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        sideToMove: i % 2 === 0 ? 'white' : 'black',
        claimedSan,
        fenBefore,
        gamesAtPosition: result.total,
        topAlternatives: result.moves.slice(0, 3).map((m) => `${m.san} (${m.total})`),
      });
      stopped = true;
      break;
    }

    if (matched.total < MIN_GAMES) {
      findings.push({
        kind: 'rare-move',
        plyIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        sideToMove: i % 2 === 0 ? 'white' : 'black',
        claimedSan,
        fenBefore,
        gamesForMove: matched.total,
        gamesAtPosition: result.total,
        topAlternatives: result.moves.slice(0, 3).map((m) => `${m.san} (${m.total})`),
      });
      // Continue walking — rare ≠ wrong, just notable.
    }

    // Advance the chess.js board.
    try {
      chess.move(claimedSan);
    } catch {
      findings.push({
        kind: 'illegal-san',
        plyIndex: i,
        moveNumber: Math.floor(i / 2) + 1,
        claimedSan,
      });
      stopped = true;
      break;
    }
  }

  return {
    sourceFile: v.sourceFile,
    openingId: v.openingId,
    openingName: v.openingName,
    eco: v.eco,
    variationName: v.variationName,
    pgn: v.pgn,
    plies: sans.length,
    pliesChecked,
    status: findings.length === 0 ? 'clean' : findings.find((f) => f.kind === 'off-book') ? 'off-book' : findings.find((f) => f.kind === 'rare-move') ? 'rare-move' : 'error',
    findings,
  };
}

// ─── Runner + report writer ────────────────────────────────────────────────

async function main() {
  const all = collectVariations();
  const scoped = LIMIT > 0 ? all.slice(0, LIMIT) : all;
  console.log(`[audit-lichess] ${all.length} variations collected (${scoped.length} in scope)`);
  console.log(`  source: ${SOURCE}, min-games threshold: ${MIN_GAMES}, rps: ${RPS}`);

  const results = [];
  const t0 = Date.now();
  let cleanCount = 0, continuationCount = 0, wrongParentCount = 0, neverCount = 0, illegalCount = 0;
  let offBookCount = 0, rareCount = 0, errorCount = 0;

  console.log(`  mode: ${MODE}`);
  if (MODE === 'offline') {
    const idx = loadLichessFenIndex();
    console.log(`  offline reference: ${idx.totalEntries} entries from openings-lichess.json`);
  }

  for (let i = 0; i < scoped.length; i++) {
    const v = scoped[i];
    const result = MODE === 'online'
      ? await auditVariation(v)
      : await auditVariationOffline(v);
    results.push(result);
    if (result.status === 'clean') cleanCount++;
    else if (result.status === 'continuation') continuationCount++;
    else if (result.status === 'wrong-parent') wrongParentCount++;
    else if (result.status === 'never-in-book') neverCount++;
    else if (result.status === 'illegal-san') illegalCount++;
    // online-mode statuses
    else if (result.status === 'off-book') offBookCount++;
    else if (result.status === 'rare-move') rareCount++;
    else errorCount++;

    if ((i + 1) % 50 === 0 || i === scoped.length - 1) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(
        `[audit-lichess] ${i + 1}/${scoped.length} | ` +
          `clean=${cleanCount} cont=${continuationCount} wrong=${wrongParentCount} ` +
          `never=${neverCount} illegal=${illegalCount} | ${elapsed}s`,
      );
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - t0,
    mode: MODE,
    source: SOURCE,
    minGamesThreshold: MIN_GAMES,
    totalVariations: scoped.length,
    clean: cleanCount,
    continuation: continuationCount,
    wrongParent: wrongParentCount,
    neverInBook: neverCount,
    illegalSan: illegalCount,
    offBook: offBookCount,
    rareMove: rareCount,
    errors: errorCount,
    fenCacheSize: fenCache.size,
  };

  writeFileSync(
    join(outDir, 'lichess-lines.json'),
    JSON.stringify({ summary, results }, null, 2),
  );

  // Markdown report — group by status, list off-book first.
  const md = [];
  md.push('# Lichess Opening-Line Audit');
  md.push('');
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Source: \`${SOURCE}\` (Lichess explorer, ${SOURCE === 'lichess' ? '1600+ rated humans' : 'master games'})`);
  md.push(`Threshold: any move with < ${MIN_GAMES} games at its position is "rare"; 0 games = "off-book".`);
  md.push(`Elapsed: ${(summary.elapsedMs / 1000).toFixed(1)}s, FEN cache hits saved redundant API calls.`);
  md.push('');
  md.push('## Counts');
  md.push('');
  md.push('| Status | Count | Meaning |');
  md.push('|---|---:|---|');
  md.push(`| ✅ Clean | ${summary.clean} | All plies match Lichess catalog through the deepest named line. |`);
  md.push(`| 📚 Continuation | ${summary.continuation} | First plies match the claimed parent opening; line continues past where Lichess names positions. Normal for deep theory. |`);
  md.push(`| ⚠️ Wrong parent | ${summary.wrongParent} | Plies match a catalog entry but its name shares no tokens with the variation's claimed parent. Likely mislabeled. |`);
  md.push(`| ❌ Never in book | ${summary.neverInBook} | First move not in any Lichess catalog entry. Likely fabricated. |`);
  md.push(`| ⛔ Illegal SAN | ${summary.illegalSan} | A move can't be played from its position. Always a bug. |`);
  if (MODE === 'online') {
    md.push(`| Off-book (online) | ${summary.offBook} | A move was played 0 times in real games at its position. |`);
    md.push(`| Rare (online) | ${summary.rareMove} | A move was played fewer than ${summary.minGamesThreshold} times. |`);
    md.push(`| Errors | ${summary.errors} | Network / fetch failures. |`);
  }
  md.push(`| **Total** | **${summary.totalVariations}** | |`);
  md.push('');

  const wrong = results.filter((r) => r.status === 'wrong-parent');
  if (wrong.length > 0) {
    md.push(`## Wrong-parent variations (${wrong.length}) — likely mislabeled`);
    md.push('');
    for (const r of wrong) {
      const f = r.findings[0];
      md.push(`### [${r.eco}] ${r.openingName} — ${r.variationName}`);
      md.push('');
      md.push(`- Source: \`${r.sourceFile}\` / \`${r.openingId}\``);
      md.push(`- Claimed parent: **${f.claimedParent}**`);
      md.push(`- Catalog match: **${f.matchedOpening}**`);
      md.push(`- Full PGN: \`${r.pgn}\``);
      md.push('');
    }
  }

  const never = results.filter((r) => r.status === 'never-in-book');
  if (never.length > 0) {
    md.push(`## Never-in-book variations (${never.length}) — first move outside Lichess catalog`);
    md.push('');
    for (const r of never) {
      md.push(`- [${r.eco}] ${r.openingName} / ${r.variationName} — first move \`${r.findings[0].claimedSan}\``);
    }
    md.push('');
  }

  const illegal = results.filter((r) => r.status === 'illegal-san');
  if (illegal.length > 0) {
    md.push(`## Illegal-SAN variations (${illegal.length})`);
    md.push('');
    for (const r of illegal) {
      const f = r.findings[0];
      md.push(`- [${r.eco}] ${r.openingName} / ${r.variationName} — illegal at ply ${f.plyIndex + 1}: \`${f.claimedSan}\``);
    }
    md.push('');
  }

  if (MODE === 'online') {
    const offBook = results.filter((r) => r.status === 'off-book');
    if (offBook.length > 0) {
      md.push(`## Off-book variations (${offBook.length}) — 0 games in Lichess explorer`);
      md.push('');
      for (const r of offBook) {
        const f = r.findings[0];
        md.push(`### [${r.eco}] ${r.openingName} — ${r.variationName}`);
        md.push('');
        md.push(`- Source: \`${r.sourceFile}\` / \`${r.openingId}\``);
        md.push(`- Diverges at ply ${(f.plyIndex ?? 0) + 1} (move ${f.moveNumber}, ${f.sideToMove}): claims **${f.claimedSan}**`);
        md.push(`- Lichess: ${f.gamesAtPosition} games at this position; **${f.claimedSan}** appears in **0**.`);
        md.push(`- Top moves actually played: ${(f.topAlternatives ?? []).join(', ')}`);
        md.push(`- Full PGN: \`${r.pgn}\``);
        md.push('');
      }
    }
  }

  const rare = results.filter((r) => r.status === 'rare-move');
  if (rare.length > 0) {
    md.push(`## Rare-move variations (${rare.length}) — found in book but uncommon`);
    md.push('');
    md.push('| ECO | Opening | Variation | Ply | Move | Games |');
    md.push('|---|---|---|---:|---|---:|');
    for (const r of rare.slice(0, 30)) {
      const f = r.findings.find((x) => x.kind === 'rare-move');
      md.push(`| ${r.eco} | ${r.openingName} | ${r.variationName} | ${(f.plyIndex ?? 0) + 1} | ${f.claimedSan} | ${f.gamesForMove} |`);
    }
    if (rare.length > 30) md.push(`| ... | ... | (${rare.length - 30} more in JSON) | | | |`);
    md.push('');
  }

  const errors = results.filter((r) => r.status === 'error');
  if (errors.length > 0) {
    md.push(`## Errors (${errors.length})`);
    md.push('');
    for (const r of errors.slice(0, 10)) {
      const f = r.findings[0];
      md.push(`- [${r.eco}] ${r.openingName} / ${r.variationName}: ${f.message ?? f.kind}`);
    }
    md.push('');
  }

  writeFileSync(join(outDir, 'lichess-lines.md'), md.join('\n'));
  console.log(
    `[audit-lichess] wrote audit-reports/lichess-lines.{json,md} | ` +
      `clean=${summary.clean}, off-book=${summary.offBook}, rare=${summary.rareMove}, err=${summary.errors}`,
  );
}

main().catch((e) => {
  console.error('[audit-lichess] fatal:', e?.message ?? e);
  process.exit(1);
});

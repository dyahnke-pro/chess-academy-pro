#!/usr/bin/env node
/**
 * anchor-notes — STAGE 1 of the corpus determinism pipeline.
 *
 * The problem: 3,710 of the 4,529 notes in src/data/danya-teachings.json carry
 * no `lineSan`, so nothing knows WHICH POSITION they teach. Unplaceable notes
 * can only reach the model as advisory prompt context ("use these if they fit")
 * — the model then DECIDES whether to speak them, which violates G0. A note
 * that can't be placed can't be spoken deterministically.
 *
 * The fix, pure code, no model: 96.7% of the unanchored notes name their own
 * moves in prose ("play h3, then Kh2, Nd2, and prepare f4"). Replay those moves
 * against every ply of every spine the note's opening name resolves to, and
 * score each candidate root on (a) how many of the note's named moves play
 * legally from it and (b) whether the note's piece-on-square claims are TRUE
 * there. Best-scoring root with ZERO disproven claims wins and becomes the
 * note's `lineSan`. Nothing clears the bar → the note is REJECTED.
 *
 * Three defects die in this one pass:
 *   1. REACH      — notes gain positions, so Stage 2 can bind them to a spine.
 *   2. MIS-TAGGING— a Ruy note stamped "Glek System" anchors on the RUY spine
 *                   (its moves are illegal on a Glek board), correcting the tag.
 *   3. HALLUCINATION — "Bg5 pins the knight" verifies at no position on any
 *                   candidate spine, so it anchors nowhere and is rejected.
 *                   The rejection list IS the corpus defect report.
 *
 * Zero-false-claims is a HARD requirement on the accepted root — the same bar
 * `narrationAccuracy` holds authored masterclass beats to. Board truth is not
 * a tiebreak; it's the gate.
 *
 * Usage:
 *   node scripts/danya-corpus/anchor-notes.mjs [--opening "Glek"] [--limit N]
 *
 * Writes:
 *   audit-reports/danya-anchor/report.json   full per-note outcome
 *   audit-reports/danya-anchor/rejected.json the defect list (mis-tags + lies)
 * audit-reports/danya-anchor/danya-teachings.anchored.json  (gitignored intermediate)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Chess } from 'chess.js';

const CORPUS = 'src/data/danya-teachings.json';
const OUT_DIR = 'audit-reports/danya-anchor';
// NOT src/data/ — that directory is imported into the app bundle, and this is a
// regeneratable pipeline intermediate (150s from committed inputs), not shipped
// app data. It also stays provisional until the position-tracking distiller
// lands, so nothing should be able to import it by accident.
const OUT_CORPUS = 'audit-reports/danya-anchor/danya-teachings.anchored.json';

// Candidate-root search bounds. A note's opening name resolves to at most
// MAX_SPINES spines; each contributes its first MAX_PLIES ply-prefixes as roots.
const MAX_SPINES = 10;
const MAX_PLIES = 44;
// A note must land at least this much signal to be accepted at all.
const MIN_SCORE = 4;
// A root shallower than this makes the note fire at the top of every game.
const MIN_ANCHOR_PLIES = 4;

const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const ONLY_OPENING = argVal('--opening');
const LIMIT = argVal('--limit') ? Number(argVal('--limit')) : Infinity;

const norm = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── SAN + CLAIM EXTRACTION ────────────────────────────────────────────────
// SAN-shaped tokens in prose. Castling, piece moves, pawn captures, pawn
// pushes. Bare squares ("d4") are included deliberately — they're often real
// pawn moves; when they aren't, they simply fail to play and cost nothing.
const SAN_RE =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };

/** Piece-on-square assertions the prose makes: "knight on f6", "f6-knight",
 *  "the f5 pawn". These are checkable against a board — that's the gate. */
function extractClaims(text) {
  const out = [];
  const push = (sq, word) => {
    const code = PIECE_CODE[word.toLowerCase()];
    if (code) out.push({ square: sq.toLowerCase(), code });
  };
  for (const m of text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)\s+on\s+([a-h][1-8])\b/gi)) push(m[2], m[1]);
  for (const m of text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi)) push(m[1], m[2]);
  return out;
}

function extractSans(text) {
  return (text.match(SAN_RE) || []).slice(0, 24);
}

// ── SPINE CATALOG ─────────────────────────────────────────────────────────
/** Every spine we can anchor against: the curated repertoire + pro lines
 *  (deep, hand-built) and the full lichess DB (broad). Deeper spines first —
 *  a deeper line offers more candidate roots. */
async function buildSpineCatalog() {
  const spines = [];
  const add = (name, pgn, src) => {
    const moves = String(pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
    if (moves.length >= 2) spines.push({ name, key: norm(name), moves, src });
  };

  const rep = JSON.parse(await readFile('src/data/repertoire.json', 'utf8'));
  for (const o of Array.isArray(rep) ? rep : Object.values(rep).flat()) {
    add(o.name, o.pgn, 'repertoire');
    for (const v of o.variations || []) add(`${o.name} ${v.name || ''}`, v.pgn, 'repertoire-var');
  }
  const pro = JSON.parse(await readFile('src/data/pro-repertoires.json', 'utf8'));
  const proArr = Array.isArray(pro) ? pro : pro.openings || pro.repertoires || [];
  for (const o of proArr) {
    add(o.name, o.pgn, 'pro');
    for (const v of o.variations || []) add(`${o.name} ${v.name || ''}`, v.pgn, 'pro-var');
  }
  const lich = JSON.parse(await readFile('src/data/openings-lichess.json', 'utf8'));
  for (const o of Array.isArray(lich) ? lich : Object.values(lich)) add(o.name, o.pgn, 'lichess');

  spines.sort((a, b) => b.moves.length - a.moves.length);
  return spines;
}

/** Precomputed board state per ply of a spine: piece map + legal SAN set.
 *  Scoring a root is then pure lookups. */
const plyCache = new Map();
function plyStates(spine) {
  const id = `${spine.src}::${spine.name}::${spine.moves.join(' ')}`;
  if (plyCache.has(id)) return plyCache.get(id);
  const states = [];
  const c = new Chess();
  const record = (movesSoFar) => {
    const board = {};
    for (const row of c.board()) for (const sq of row) if (sq) board[sq.square] = sq.type;
    states.push({ lineSan: movesSoFar.slice(), fen: c.fen(), board, legal: new Set(c.moves()) });
  };
  record([]);
  const played = [];
  for (const san of spine.moves.slice(0, MAX_PLIES)) {
    try {
      if (!c.move(san)) break;
    } catch { break; }
    played.push(san);
    record(played);
  }
  plyCache.set(id, states);
  return states;
}

/** Spines whose name shares enough tokens with the note's opening name.
 *  Same ≥0.6 token-subset rule danyaTeachingService.notesForOpening uses, so
 *  anchoring and runtime lookup agree on what "this opening" means. */
const spineMatchCache = new Map();
function spinesFor(openingName, catalog) {
  const key = norm(openingName);
  if (spineMatchCache.has(key)) return spineMatchCache.get(key);
  const q = new Set(key.split(' ').filter((t) => t.length > 2));
  const scored = [];
  if (q.size > 0) {
    for (const s of catalog) {
      // SETS on both sides. Counting a token array lets a repeated word inflate
      // the score — "Botvinnik System, Prickly Pawn Pass System" scored 1.0
      // against "Glek System" because `system` was counted twice.
      const kt = new Set(s.key.split(' ').filter((t) => t.length > 2));
      if (kt.size === 0) continue;
      let shared = 0;
      for (const t of kt) if (q.has(t)) shared += 1;
      const score = shared / Math.max(1, Math.min(kt.size, q.size));
      if (score >= 0.6) scored.push({ s, score });
    }
  }
  scored.sort((a, b) => b.score - a.score || b.s.moves.length - a.s.moves.length);
  const picked = scored.slice(0, MAX_SPINES).map((x) => ({ ...x.s, nameScore: x.score }));
  spineMatchCache.set(key, picked);
  return picked;
}

// ── SCORING ───────────────────────────────────────────────────────────────
/** Replay the note's named moves from a root. Returns BOTH:
 *   strictRun  — moves that play consecutively starting at the FIRST named
 *                move, no skips. This is real evidence the note is describing
 *                a continuation FROM here.
 *   looseRun   — same but tolerating prose noise (square references, "or"
 *                alternatives). Weak evidence; a corroborator, never a basis. */
function replayRun(state, sans) {
  if (sans.length === 0) return { strictRun: 0, looseRun: 0, startedAt: -1 };
  // A note typically RECITES the opening from move one before describing the
  // continuation: "In the Glek (e4 e5 Nf3 Nc6 g3), play h3, then Kh2, Nd2, f4."
  // Anchoring on token[0] would demand `e4` be legal at a move-9 root, which it
  // never is. So find the longest CONSECUTIVE run starting anywhere — that run
  // is the continuation the note is actually teaching from this position.
  let strictRun = 0;
  let startedAt = -1;
  for (let i = 0; i < sans.length; i += 1) {
    if (!state.legal.has(sans[i])) continue; // cheap reject before any replay
    if (sans.length - i <= strictRun) break; // can't beat the incumbent
    const c = new Chess(state.fen);
    let run = 0;
    for (let j = i; j < sans.length; j += 1) {
      let ok = false;
      try { ok = !!c.move(sans[j]); } catch { ok = false; }
      if (!ok) break;
      run += 1;
    }
    if (run > strictRun) { strictRun = run; startedAt = i; }
  }
  let looseRun = 0;
  if (startedAt >= 0) {
    const c = new Chess(state.fen);
    let skips = 0;
    for (let j = startedAt; j < sans.length; j += 1) {
      let ok = false;
      try { ok = !!c.move(sans[j]); } catch { ok = false; }
      if (ok) { looseRun += 1; skips = 0; }
      else if (++skips > 3) break;
    }
  }
  return { strictRun, looseRun, startedAt };
}

/** Score one candidate root. Board truth is a GATE, not a tiebreak: any
 *  disproven piece-on-square claim disqualifies the root outright.
 *
 *  Confidence tiers, because an anchor RATE is worthless if the anchors are
 *  loose — only `high` is fit to author a lesson beat from:
 *    high   — the note's own move sequence plays consecutively from here AND
 *             (it verifies a real piece claim OR the run is long).
 *    medium — the sequence starts here but the corroboration is thin.
 *    (below that the root is not a candidate at all) */
function scoreRoot(state, sans, claims) {
  let falseClaims = 0;
  let trueClaims = 0;
  for (const cl of claims) {
    if (state.board[cl.square] === cl.code) trueClaims += 1;
    else falseClaims += 1;
  }
  if (falseClaims > 0) return { ok: false, score: -1, trueClaims, falseClaims, strictRun: 0, looseRun: 0 };

  const { strictRun, looseRun, startedAt } = replayRun(state, sans);
  // The note must describe a real continuation FROM here — at least two of its
  // named moves playing back to back. One incidental legal token is noise.
  if (strictRun < 2) return { ok: false, score: -1, trueClaims, falseClaims, strictRun, looseRun };

  const tier = strictRun >= 3 && (trueClaims >= 1 || strictRun >= 4) ? 'high' : 'medium';
  const score = strictRun * 4 + looseRun + trueClaims * 3;
  return { ok: true, score, tier, trueClaims, falseClaims, strictRun, looseRun, startedAt };
}

function anchorNote(note, catalog) {
  const prose = [note.explains, note.teaches, note.plans].filter(Boolean).join(' ');
  const sans = extractSans(prose);
  // `explains` describes the position AS IT IS — its claims are the gate.
  // `plans` describes the FUTURE, so its claims are deliberately not gated.
  const claims = extractClaims([note.explains, note.teaches].filter(Boolean).join(' '));

  const spines = spinesFor(note.opening || '', catalog);
  if (spines.length === 0) return { outcome: 'no-spine', sans: sans.length, claims: claims.length };

  let best = null;
  for (const spine of spines) {
    const states = plyStates(spine);
    for (const st of states) {
      // A root must be a real line. Anchoring to the bare start position (or a
      // 1-2 ply stub) makes the note fire at the top of EVERY game — that was
      // swallowing the mis-tagged Sicilian notes.
      if (st.lineSan.length < MIN_ANCHOR_PLIES) continue;
      const r = scoreRoot(st, sans, claims);
      if (!r.ok) continue;
      if (r.score < MIN_SCORE) continue;
      // NAME AFFINITY. Without it, an unrelated spine that happens to make the
      // note's moves legal can outscore the opening the note is actually about
      // (Glek notes were landing on "Scotch Four Knights"). The note's own tag
      // is evidence — weak evidence, but evidence — so it breaks ties.
      const total = r.score + (spine.nameScore ?? 0) * 6;
      if (
        !best ||
        total > best.total ||
        (total === best.total && st.lineSan.length > best.lineSan.length)
      ) {
        best = { ...r, total, lineSan: st.lineSan, spine: spine.name, spineSrc: spine.src, fen: st.fen };
      }
    }
  }

  if (!best) {
    const anyClaimFalse = claims.length > 0;
    return {
      outcome: 'rejected',
      reason: anyClaimFalse
        ? 'no candidate position where the note\'s board claims are all true'
        : 'named moves illegal on every candidate spine',
      sans: sans.length,
      claims: claims.length,
      spinesTried: spines.length,
    };
  }
  return { outcome: 'anchored', ...best, sans: sans.length, claims: claims.length };
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const started = Date.now();
  const bundle = JSON.parse(await readFile(CORPUS, 'utf8'));
  const catalog = await buildSpineCatalog();
  console.log(`[anchor] spine catalog: ${catalog.length} lines`);

  let notes = bundle.notes;
  if (ONLY_OPENING) {
    const q = norm(ONLY_OPENING);
    notes = notes.filter((n) => norm(n.opening).includes(q));
    console.log(`[anchor] filtered to opening~"${ONLY_OPENING}": ${notes.length} notes`);
  }
  if (Number.isFinite(LIMIT)) notes = notes.slice(0, LIMIT);

  const results = [];
  const out = [];
  let done = 0;
  for (const note of notes) {
    // Already-anchored notes are RE-VERIFIED under the same rule — that is how
    // a board-false pre-anchored note (the "Bg5 pins the knight" class) gets
    // caught rather than grandfathered.
    const res = anchorNote(note, catalog);
    results.push({ id: note.id, opening: note.opening, phase: note.phase, sources: note.sources, was: note.lineSan.length, ...res });
    if (res.outcome === 'anchored') out.push({ ...note, lineSan: res.lineSan });
    if (++done % 500 === 0) console.log(`[anchor] ${done}/${notes.length}…`);
  }

  const tally = results.reduce((a, r) => { a[r.outcome] = (a[r.outcome] || 0) + 1; return a; }, {});
  const tiers = results.filter((r) => r.outcome === 'anchored').reduce((a, r) => { a[r.tier] = (a[r.tier] || 0) + 1; return a; }, {});
  const wasAnchored = results.filter((r) => r.was > 0);
  const reVerifyFailed = wasAnchored.filter((r) => r.outcome !== 'anchored');
  const newlyAnchored = results.filter((r) => r.was === 0 && r.outcome === 'anchored');
  const retagged = results.filter(
    (r) => r.outcome === 'anchored' && r.spine && norm(r.spine) !== norm(r.opening) &&
      !norm(r.spine).includes(norm(r.opening)) && !norm(r.opening).includes(norm(r.spine)),
  );

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({
    generatedAt: new Date(started).toISOString(),
    corpusNotes: bundle.notes.length,
    processed: results.length,
    tally,
    tiers,
    reVerifyFailed: reVerifyFailed.length,
    newlyAnchored: newlyAnchored.length,
    retagged: retagged.length,
    results,
  }, null, 2));
  await writeFile(`${OUT_DIR}/rejected.json`, JSON.stringify(
    results.filter((r) => r.outcome !== 'anchored'), null, 2));
  if (!ONLY_OPENING && !Number.isFinite(LIMIT)) {
    await writeFile(OUT_CORPUS, JSON.stringify({
      generatedAt: new Date(started).toISOString(),
      derivedFrom: CORPUS,
      noteCount: out.length,
      notes: out,
    }, null, 2));
  }

  const pct = (n) => `${((100 * n) / results.length).toFixed(1)}%`;
  console.log('\n──────── ANCHOR REPORT ────────');
  console.log(`processed            ${results.length}`);
  console.log(`anchored             ${tally.anchored || 0}  (${pct(tally.anchored || 0)})`);
  console.log(`  ↳ HIGH confidence ${String(tiers.high || 0).padStart(4)}  (${pct(tiers.high || 0)})  ← authorable`);
  console.log(`  ↳ medium           ${String(tiers.medium || 0).padStart(4)}  (${pct(tiers.medium || 0)})`);
  console.log(`  ↳ newly placed     ${newlyAnchored.length}`);
  console.log(`  ↳ re-tagged opening${String(retagged.length).padStart(4)}`);
  console.log(`rejected             ${tally.rejected || 0}  (${pct(tally.rejected || 0)})`);
  console.log(`no matching spine    ${tally['no-spine'] || 0}  (${pct(tally['no-spine'] || 0)})`);
  console.log(`pre-anchored notes that FAILED re-verification: ${reVerifyFailed.length}`);
  console.log(`\nreports → ${OUT_DIR}/  (${Math.round((Date.now() - started) / 1000)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

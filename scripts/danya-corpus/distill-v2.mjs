#!/usr/bin/env node
/**
 * distill-v2 — STAGE 0 of the corpus determinism pipeline. Replaces distill.mjs.
 *
 * WHY v1 CAPPED OUT (measured, not guessed):
 *   - ONE DeepSeek call per video at `max_tokens: 8000` → 10.8 notes/video
 *     (median 10) against 60-100 teachable moments in a 40-minute video. The
 *     ceiling was the token budget, not the content.
 *   - Its truncation retry re-asked for "AT MOST the 12 most valuable teaching
 *     moments", so the densest videos were capped hardest.
 *   - It asked the MODEL for `moves` — an absolute SAN sequence from move 1 —
 *     off unpunctuated auto-captions. That is the one thing an LLM reliably
 *     cannot do, so 3,710 of 4,529 notes shipped with no position at all and
 *     could only ever reach the coach as advisory prompt context (a G0
 *     violation: the model then DECIDES whether to speak them).
 *
 * v1 let the LLM decide the moves. That is the same disease the whole app is
 * built to prevent (G0/G3), one layer upstream in the content pipeline.
 *
 * THE INVERSION: code owns the moves, the model owns only the prose.
 *   1. He SAYS the moves out loud ("knight f3", "bishop takes d5", "castles").
 *      Parse those spoken tokens and resolve each against a LIVE chess.js
 *      board — the board itself disambiguates, so no recall is required.
 *   2. That gives a timeline: transcript offset → exact SAN prefix. Every note
 *      is then BORN with its position. No post-hoc anchoring, no guessing.
 *   3. Chunk the transcript and make one small call PER CHUNK asking for prose
 *      ONLY — no moves field exists in the schema. Density now scales with
 *      video length instead of being clipped by one 8k reply.
 *
 * SAFETY (empty > invented, per CLAUDE.md):
 *   - A spoken token that is ILLEGAL in the current position is skipped, never
 *     forced. Speech is noisy; a wrong board is worse than no board.
 *   - If the tracker loses the thread (too many consecutive unresolvable move
 *     candidates) it stops emitting positions for the rest of that video and
 *     the notes fall back to opening-name keying. It never emits a position it
 *     is not sure of.
 *   - Speedruns contain many games. When a token is illegal here but legal from
 *     a fresh board, that is a new game — reset and keep tracking.
 *   - The v1 plagiarism guard is unchanged: 7-gram overlap against the
 *     transcript kills a note. Transcripts stay local and are never shipped.
 *
 * Usage:
 *   node scripts/danya-corpus/distill-v2.mjs [--id VIDEOID] [--limit N]
 *                                            [--concurrency 4] [--dry]
 *   --dry  runs the board tracker + chunker and reports coverage WITHOUT
 *          calling the model. Use it to verify tracking before spending tokens.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { Chess } from 'chess.js';

const TDIR = 'data/sources/naroditsky-voice/transcripts';
const DDIR = 'data/sources/naroditsky-voice/distilled-v2';
const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const has = (name) => process.argv.includes(`--${name}`);
const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── TRANSCRIPT ────────────────────────────────────────────────────────────
/** Parse a YouTube auto-sub VTT into clean running text. Auto-subs repeat each
 *  line across overlapping cues, so collapse consecutive duplicates and the
 *  rolling-window A,B,B,C,C artifact. (Same logic as v1 — it worked.) */
export function vttToText(vtt) {
  const lines = [];
  for (const raw of vtt.split('\n')) {
    const line = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!line) continue;
    if (/^WEBVTT|^Kind:|^Language:|^NOTE/.test(line)) continue;
    if (/^\d{2}:\d{2}/.test(line) && line.includes('-->')) continue;
    if (/^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue;
    lines.push(line);
  }
  const out = [];
  for (const l of lines) {
    if (out[out.length - 1] === l || out[out.length - 2] === l) continue;
    out.push(l);
  }
  return out.join(' ');
}

// ── SPOKEN CHESS → SAN CANDIDATES ─────────────────────────────────────────
const PIECE_LETTER = { knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };

/** Scan running text for spoken move mentions, in order, and emit CANDIDATE
 *  SAN strings with the character offset where each was said.
 *
 *  Deliberately NOT greedy about descriptive phrasing: "the knight on f6" and
 *  "his bishop on b5" describe where a piece ALREADY sits — consuming those as
 *  moves is what would corrupt the board. Only movement phrasings are emitted
 *  ("knight f3", "knight to f3", "knight takes d5"), and even then the move
 *  only counts if chess.js says it is legal right now. */
export function spokenMoveCandidates(text) {
  const out = [];
  // SPAN CLAIMING, by descending confidence. The patterns genuinely overlap:
  // "knight f3" is also matched by the bare-pawn pattern as `f3`, and "knight
  // takes d5" is also matched by the pawn-capture pattern. Emitting both is not
  // harmless — after `Nf3` plays, a phantom `f3` push can ALSO be legal, which
  // silently corrupts the board and every position downstream of it. So a lower
  // -confidence pattern may never re-consume text a stronger one already took.
  const claimed = [];
  const free = (s, e) => !claimed.some(([cs, ce]) => s < ce && e > cs);
  const take = (m, sans) => {
    const s = m.index;
    const e = m.index + m[0].length;
    if (!free(s, e)) return;
    claimed.push([s, e]);
    const list = sans.filter(Boolean);
    if (list.length) out.push({ index: s, sans: list });
  };

  // 1. Piece moves: "knight (to|takes|captures)? f3". `on` excluded on purpose —
  //    "the knight on f6" describes where a piece already sits.
  const pieceRe = new RegExp(
    String.raw`\b(knight|bishop|rook|queen|king)\s+(?:(to|takes|captures|goes to|back to)\s+)?([a-h])\s?([1-8])\b`,
    'gi',
  );
  for (const m of text.matchAll(pieceRe)) {
    const verb = (m[2] || '').toLowerCase();
    if (verb === '' && /\bon\s*$/i.test(text.slice(Math.max(0, m.index - 8), m.index))) continue;
    const P = PIECE_LETTER[m[1].toLowerCase()];
    const sq = `${m[3].toLowerCase()}${m[4]}`;
    const cap = verb === 'takes' || verb === 'captures';
    // Both forms — the board decides which is real.
    take(m, cap ? [`${P}x${sq}`, `${P}${sq}`] : [`${P}${sq}`, `${P}x${sq}`]);
  }

  // 2. Castling.
  for (const m of text.matchAll(/\b(castles?|castling)\b(?:\s+(short|long|king\s?side|queen\s?side))?/gi)) {
    const side = (m[2] || '').toLowerCase().replace(/\s/g, '');
    if (side === 'long' || side === 'queenside') take(m, ['O-O-O']);
    else if (side === 'short' || side === 'kingside') take(m, ['O-O']);
    else take(m, ['O-O', 'O-O-O']);
  }

  // 3. Pawn captures: "takes on d5" / "captures d5" / "e takes d5".
  for (const m of text.matchAll(/\b(?:([a-h])\s+)?(?:takes|captures)\s+(?:on\s+)?([a-h])\s?([1-8])\b/gi)) {
    const file = (m[1] || '').toLowerCase();
    const sq = `${m[2].toLowerCase()}${m[3]}`;
    // Every legal pawn capture onto that square, plus the explicit file form.
    const forms = file ? [`${file}x${sq}`] : [];
    for (const f of 'abcdefgh') forms.push(`${f}x${sq}`);
    take(m, forms);
  }

  // 4. Bare pawn pushes: "e4", "d5", "pawn to e4". Lowest confidence — a bare
  //    square is also how squares get named ("the d5 square"), so these are
  //    skipped when followed by a naming word, and only survive if legal.
  for (const m of text.matchAll(/\b(?:pawn\s+(?:to\s+)?)?([a-h])\s?([1-8])\b/gi)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 10).toLowerCase();
    if (/^\s*(square|squares|file|rank|diagonal|pawn|knight|bishop|rook|queen|king)/.test(after)) continue;
    take(m, [`${m[1].toLowerCase()}${m[2]}`]);
  }

  out.sort((a, b) => a.index - b.index);
  return out;
}

/** Replay the spoken candidates against a live board, producing a timeline of
 *  { index, lineSan } checkpoints — the exact position as of that point in the
 *  transcript. Returns `null` positions once the thread is lost. */
export function trackBoard(text, opts = {}) {
  const maxMisses = opts.maxMisses ?? 40;
  const candidates = spokenMoveCandidates(text);
  const timeline = [];
  let game = new Chess();
  let line = [];
  let misses = 0;
  let lost = false;
  let games = 1;
  let resolved = 0;

  for (const cand of candidates) {
    if (lost) break;
    let played = null;
    for (const san of cand.sans) {
      try {
        const m = game.move(san);
        if (m) { played = m.san; break; }
      } catch { /* not legal in this position — try the next form */ }
    }
    if (played) {
      line.push(played);
      resolved += 1;
      misses = 0;
      timeline.push({ index: cand.index, lineSan: line.slice() });
      continue;
    }
    // A speedrun rolls into a new game. If the token is illegal here but legal
    // from a fresh board AND we are past the opening, treat it as a new game.
    if (line.length >= 8) {
      const probe = new Chess();
      let fresh = null;
      for (const san of cand.sans) {
        try { const m = probe.move(san); if (m) { fresh = m.san; break; } } catch { /* no */ }
      }
      if (fresh) {
        game = probe; line = [fresh]; games += 1; misses = 0;
        timeline.push({ index: cand.index, lineSan: line.slice() });
        continue;
      }
    }
    // Speech is noisy — a stray unresolvable token is normal. Sustained failure
    // means the board no longer reflects the game, so stop rather than lie.
    if (++misses > maxMisses) lost = true;
  }
  return { timeline, resolved, candidates: candidates.length, games, lost };
}

/** The tracked position as of a transcript offset — the last checkpoint at or
 *  before it. Empty array when nothing has been resolved yet. */
function positionAt(timeline, index) {
  let lo = 0; let hi = timeline.length - 1; let best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].index <= index) { best = timeline[mid]; lo = mid + 1; } else hi = mid - 1;
  }
  return best ? best.lineSan : [];
}

// ── PLAGIARISM GATE (unchanged from v1) ───────────────────────────────────
export function makeOverlapGate(transcriptText, n = 7) {
  const words = norm(transcriptText).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) if (grams.has(w.slice(i, i + n).join(' '))) return true;
    return false;
  };
}

// ── CHUNKING ──────────────────────────────────────────────────────────────
/** Split the transcript into windows small enough that the model can cover
 *  every teaching moment inside one, with overlap so an idea spanning a
 *  boundary is not halved. This is what lifts the density ceiling: N small
 *  calls instead of one capped call. */
export function chunkTranscript(text, size = 5000, overlap = 600) {
  const chunks = [];
  for (let start = 0; start < text.length; start += size - overlap) {
    const end = Math.min(text.length, start + size);
    if (end - start < 400 && chunks.length > 0) break;
    chunks.push({ start, text: text.slice(start, end) });
    if (end >= text.length) break;
  }
  return chunks;
}

// ── MODEL CALL (PROSE ONLY — no `moves` field exists) ─────────────────────
const SYSTEM = `You are a chess-teaching editor. You are given a SHORT EXCERPT of a lesson transcript and, when known, THE EXACT POSITION on the board at that moment. Produce structured teaching notes.

ABSOLUTE RULES:
- ORIGINAL PROSE ONLY. Translate the ideas into your own words — never copy or lightly rephrase the speaker's sentences. The ideas are public-domain chess knowledge; the wording must be yours.
- NEVER name or reference the speaker, the video, the stream, chat, or the opponent. Write timeless chess teaching ("the knight belongs on d5", never "he says…").
- YOU DO NOT DECIDE MOVES. The position is supplied and is authoritative. Never state a move sequence as fact; if the excerpt is unclear about a continuation, leave it out.
- Only describe pieces and squares that the SUPPLIED POSITION supports. If you cannot tell, write the transferable idea instead of a concrete claim.
- Concise, concrete, idea-first. Name squares and pieces. No praise, no filler, no move-number prefixes ("Nf3", never "12.Nf3").

Extract EVERY distinct teaching moment in this excerpt (usually 1-5). For each:
- opening: opening/variation name if identifiable, else null
- phase: "opening" | "middlegame" | "endgame" | "concept"
- explains: 1-3 sentences — the read of THIS position (what matters, why)
- teaches: 1-2 sentences — the transferable idea being taught
- plans: 1-2 sentences — the forward plan from here ("" if none)
- concepts: 0-4 short kebab-case tags

Return STRICT JSON: {"notes":[...]}. Nothing else.`;

async function callModel(chunkText, lineSan, title, attempt = 0) {
  const posBlock = lineSan.length
    ? `POSITION (authoritative — moves already played from the start, SAN):\n${lineSan.join(' ')}`
    : 'POSITION: unknown for this excerpt. Do not invent one; prefer transferable ideas over concrete piece/square claims.';
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Video title (context only, do not quote): ${title}\n\n${posBlock}\n\nTRANSCRIPT EXCERPT (auto-captions, unpunctuated):\n${chunkText}` },
      ],
    }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      return callModel(chunkText, lineSan, title, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const body = await res.json();
  try {
    return JSON.parse(body.choices?.[0]?.message?.content ?? '');
  } catch {
    return { notes: [] }; // one bad chunk must never kill a video
  }
}

/** Bounded-concurrency map. Offline batch work, so a small pool is plenty. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try { out[i] = await fn(items[i], i); } catch { out[i] = null; }
    }
  }));
  return out;
}

async function distillOne(videoId, meta, { dry, concurrency }) {
  const vtt = await readFile(`${TDIR}/${videoId}.en.vtt`, 'utf8');
  const text = vttToText(vtt);
  if (text.length < 500) throw new Error('transcript too short');

  const track = trackBoard(text);
  const chunks = chunkTranscript(text);
  const withPos = chunks.filter((c) => positionAt(track.timeline, c.start).length > 0).length;

  const stats = {
    chars: text.length,
    chunks: chunks.length,
    chunksWithPosition: withPos,
    movesResolved: track.resolved,
    moveCandidates: track.candidates,
    gamesDetected: track.games,
    trackerLost: track.lost,
  };
  if (dry) return { videoId, title: meta.title, stats, notes: [] };

  const overlaps = makeOverlapGate(text);
  const perChunk = await pool(chunks, concurrency, async (c) => {
    const lineSan = positionAt(track.timeline, c.start);
    const parsed = await callModel(c.text, lineSan, meta.title);
    const raw = Array.isArray(parsed?.notes) ? parsed.notes : [];
    return raw.map((n) => ({ n, lineSan }));
  });

  const notes = [];
  const dropped = { overlap: 0, empty: 0, dupe: 0 };
  const seen = new Set();
  for (const bucket of perChunk) {
    for (const { n, lineSan } of bucket ?? []) {
      const explains = String(n.explains ?? '').trim();
      const teaches = String(n.teaches ?? '').trim();
      const plans = String(n.plans ?? '').trim();
      if (!explains || !teaches) { dropped.empty += 1; continue; }
      if (overlaps(explains) || overlaps(teaches) || (plans && overlaps(plans))) { dropped.overlap += 1; continue; }
      // Overlapping windows re-teach the boundary — dedup on the idea.
      const key = `${lineSan.length}:${norm(teaches).slice(0, 70)}`;
      if (seen.has(key)) { dropped.dupe += 1; continue; }
      seen.add(key);
      notes.push({
        lineSan,
        opening: n.opening ? String(n.opening).trim() : null,
        phase: ['opening', 'middlegame', 'endgame', 'concept'].includes(n.phase) ? n.phase : 'concept',
        explains, teaches, plans,
        concepts: Array.isArray(n.concepts) ? n.concepts.slice(0, 4).map(String) : [],
        sources: [`yt:${videoId}`],
      });
    }
  }
  const positioned = notes.filter((n) => n.lineSan.length > 0).length;
  return {
    videoId,
    playlist: meta.playlist,
    title: meta.title,
    distilledAt: new Date().toISOString(),
    stats: { ...stats, notes: notes.length, positioned, dropped },
    notes,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const dry = has('dry');
  if (!KEY && !dry) { console.error('DEEPSEEK_KEY / VITE_DEEPSEEK_API_KEY not set'); process.exit(1); }
  const concurrency = Number(arg('concurrency', '4'));
  const limit = Number(arg('limit', '10000'));
  const onlyId = arg('id', null);
  await mkdir(DDIR, { recursive: true });

  // The manifest is the work queue when present; otherwise fall back to
  // whatever transcripts are on disk (a targeted --id run needs no manifest).
  let videos = [];
  try {
    const manifest = JSON.parse(await readFile('data/sources/naroditsky-voice/manifest.json', 'utf8'));
    videos = manifest.videos;
  } catch {
    videos = onlyId ? [{ id: onlyId, title: onlyId, playlist: null }] : [];
  }
  if (onlyId) {
    videos = videos.filter((v) => v.id === onlyId);
    if (videos.length === 0) videos = [{ id: onlyId, title: onlyId, playlist: null }];
  }

  const queue = [];
  for (const v of videos) {
    if (!(await exists(`${TDIR}/${v.id}.en.vtt`))) continue;
    if (!dry && (await exists(`${DDIR}/${v.id}.json`))) continue;
    queue.push(v);
  }
  console.log(`[distill-v2] ${queue.length} video(s) to process${dry ? ' (DRY — tracker only, no model calls)' : ''}`);

  let ok = 0; let fail = 0; let totalNotes = 0; let totalPositioned = 0;
  for (const v of queue.slice(0, limit)) {
    try {
      const out = await distillOne(v.id, v, { dry, concurrency });
      if (!dry) await writeFile(`${DDIR}/${v.id}.json`, JSON.stringify(out, null, 2));
      ok += 1;
      totalNotes += out.notes.length;
      totalPositioned += out.notes.filter((n) => n.lineSan.length > 0).length;
      const s = out.stats;
      console.log(
        `[distill-v2] ${v.id} ✓ moves ${s.movesResolved}/${s.moveCandidates} resolved · ` +
        `${s.gamesDetected} game(s)${s.trackerLost ? ' · TRACKER LOST' : ''} · ` +
        `chunks ${s.chunksWithPosition}/${s.chunks} positioned` +
        (dry ? '' : ` · notes ${out.notes.length} (${out.notes.filter((n) => n.lineSan.length > 0).length} positioned)`),
      );
    } catch (e) {
      fail += 1;
      console.error(`[distill-v2] ${v.id} ✗ ${String(e).split('\n')[0].slice(0, 150)}`);
    }
  }
  console.log(`\n[distill-v2] ok=${ok} fail=${fail}` + (dry ? '' : ` notes=${totalNotes} positioned=${totalPositioned} (${totalNotes ? ((100 * totalPositioned) / totalNotes).toFixed(1) : '0'}%)`));
  if (!dry && ok > 0) console.log(`[distill-v2] mean notes/video = ${(totalNotes / ok).toFixed(1)}  (v1 baseline: 10.8, 18% positioned)`);
}

const isMain = process.argv[1]?.endsWith('distill-v2.mjs');
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });

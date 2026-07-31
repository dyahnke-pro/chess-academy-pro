#!/usr/bin/env node
/**
 * narrate-from-video — build an opening's WALKTHROUGH NARRATION from the
 * teacher's OWN VIDEO NARRATION, reworded into the coach's voice.
 *
 * David 2026-07-30 (twice, emphatically): "hand the entire video narration
 * phrasing to the llm and have it reword it into our voice." The generated
 * walkthrough narration sourced the model's own prose with corpus crumbs
 * spliced in — the source material must be HIS teaching for the opening.
 *
 * The plagiarism line (2026-07-02 lock) holds: the transcript is REFERENCE —
 * "translation, not invention". The model rewords his ideas into ORIGINAL
 * prose; the 7-gram overlap gate kills any line that lifts his wording; the
 * board-claim gate kills any line that lies about the position; the
 * depersonalization ban kills any leak of the teacher/medium. Raw transcripts
 * stay gitignored — only the reworded, gated narration ships.
 *
 * Output: src/data/walkthrough-narrations.json — keyed by normalized opening
 * name, shaped like the generator's NarrationOutput (intro/outro/ideas with
 * full `text` + brief `shortText`). The generator uses a hit as its narration
 * source INSTEAD of calling the LLM at runtime: deterministic, same words
 * every session, zero runtime generation for covered openings.
 *
 * Register rules (G5 applied here): `text` (full) has NO length cap — his
 * depth where he lingers; `shortText` is the ≤18-word brief register; silent
 * is the voice gate's job, not this file's.
 *
 * Usage:
 *   DEEPSEEK_KEY=... node scripts/danya-corpus/narrate-from-video.mjs \
 *     --opening "sicilian defense: alapin variation" \
 *     --videos KNwKz9Ssi8c[,<id2>...]           # theory/speedrun vids for X
 *     [--creator naroditsky|chessbrah]           # whose transcript farm
 *     [--dry]                                    # spine+transcript check only
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveCreator } from './creator.mjs';

// Whose transcripts to bake from. Defaults to naroditsky, so every existing
// invocation is unchanged; another creator's farm is reachable with --creator.
const CREATOR = resolveCreator();
const TDIR = CREATOR.transcripts;
// Per-creator attribution ban: a chessbrah bake can't leak "Aman" any more
// than a Danya bake can leak "Naroditsky".
const BANNED_EXTRA = (CREATOR.bannedExtra ?? []).length
  ? new RegExp(`\\b(${(CREATOR.bannedExtra ?? []).join('|')})\\b`, 'i')
  : null;
const OUT = 'src/data/walkthrough-narrations.json';
const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
// Re-bake ONLY the comparative bridges for an already-shipped entry —
// never churns reviewed narration prose.
const BRIDGES_ONLY = process.argv.includes('--bridges-only');
const OPENING = arg('opening', null);
const VIDEO_IDS = (arg('videos', '') || '').split(',').filter(Boolean);
if (!OPENING || VIDEO_IDS.length === 0) {
  console.error('usage: --opening "<canonical name>" --videos <id,id,...> [--dry]');
  process.exit(1);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ── transcript prep (same VTT cleaner as distill-v2) ─────────────────────
function vttToText(vtt) {
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

function makeOverlapGate(transcriptText, n = 7) {
  const words = norm(transcriptText).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  // Returns the OFFENDING gram (so a repair call can name what to avoid —
  // a blind "overlap" verdict kept failing the same way), or null.
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) {
      const g = w.slice(i, i + n).join(' ');
      if (grams.has(g)) return g;
    }
    return null;
  };
}

const BANNED = /\b(naroditsky|danya|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

/** ALIGNMENT: idea[i] is spoken AS spine[i] animates, so it MUST speak about
 *  its OWN move. The first Latvian bake shipped ideas 2-10 shifted one ply
 *  ("f5 is the Latvian Gambit" narrated on Nf3's ply) — every board claim
 *  was true, so only an own-move check catches the desync: the ply's SAN
 *  (or its destination square / "castle") must appear in the text. */
/** SIDE VOICE: entry i narrates the move made by plies[i].movedBy. When that
 *  is the OPPONENT, the text must not claim the move as ours — the 2026-07-31
 *  Stafford bake opened a BLACK repertoire with "We open with e4". Only the
 *  claim-the-move pattern is flagged (a later "we answer…" clause is fine). */
function claimsOpponentMove(text, san, movedBy, studentSide) {
  if (movedBy === studentSide) return false;
  const bare = san.replace(/[+#]/g, '');
  const esc = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(we|our)\\b[^.!?]{0,60}\\b${esc}\\b|\\b${esc}\\b[^.!?]{0,20}\\b(is|are)\\s+our\\b`, 'i');
  return re.test(text);
}

function mentionsOwnMove(text, san) {
  const bare = san.replace(/[+#]/g, '');
  if (/^O-O/.test(bare)) return /\bcastl/i.test(text) || text.includes(bare);
  if (new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) return true;
  const dest = bare.match(/([a-h][1-8])(?:=[NBRQ])?$/)?.[1];
  return dest ? new RegExp(`\\b${dest}\\b`).test(text) : false;
}

// ── spine: the exact line the app walks for this opening ─────────────────
// The RUNTIME resolves (and middlegame-extends) its spine via
// resolveTeachSpine; `bakedNarrationFor` requires a ply-for-ply prefix
// match, so the bake MUST narrate that exact line. Ask the app code first
// (tsx bridge); fall back to the local repertoire/DB guess only if the
// bridge fails.
async function resolveSpine(openingName) {
  try {
    const { execFileSync } = await import('node:child_process');
    const raw = execFileSync('npx', ['tsx', 'scripts/danya-corpus/print-spine.mts', openingName], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180_000,
    }).trim().split('\n').pop();
    const r = JSON.parse(raw);
    if (Array.isArray(r.spineMoves) && r.spineMoves.length > 0) {
      console.log(`[narrate] runtime spine via print-spine: ${r.spineMoves.length} plies${r.extendedToMiddlegame ? ' (middlegame-extended)' : ''}, ${(r.branches ?? []).length} fork branch(es)`);
      return { name: r.canonicalName, moves: r.spineMoves, studentSide: r.studentSide, branches: r.branches ?? [] };
    }
  } catch (e) {
    console.error(`  (print-spine bridge failed — ${String(e).slice(0, 120)}; falling back to local resolution)`);
  }
  const q = norm(openingName);
  const rep = JSON.parse(await readFile('src/data/repertoire.json', 'utf8'));
  for (const o of rep) if (norm(o.name) === q || norm(o.id) === q.replace(/ /g, '-')) {
    return { name: o.name, moves: o.pgn.split(/\s+/).filter((t) => !/^\d+\.+$/.test(t)) };
  }
  const lich = JSON.parse(await readFile('src/data/openings-lichess.json', 'utf8'));
  const arr = Array.isArray(lich) ? lich : Object.values(lich);
  // Deepest DB entry whose name matches exactly, else longest name-prefixed line.
  const exact = arr.filter((o) => norm(o.name) === q).sort((a, b) => b.pgn.length - a.pgn.length)[0];
  const pick = exact ?? arr.filter((o) => norm(o.name).startsWith(q)).sort((a, b) => b.pgn.length - a.pgn.length)[0];
  if (!pick) return null;
  return { name: pick.name, moves: pick.pgn.split(/\s+/).filter((t) => !/^\d+\.+$/.test(t)) };
}

// ── board-claim gate (piece-on-square truth per ply) ─────────────────────
const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
/** Returns null when every piece-on-square claim is true, else a message
 *  naming the FIRST false claim — the repair call needs to know WHICH
 *  sentence lied, or it rewrites blind and fails the same gate again. */
function boardClaimProblem(text, fen) {
  const c = new Chess(fen);
  // "the e4 pawn" (space form) counts too — the Bird bake claimed a "d4
  // pawn" on a board with a d3 pawn and the hyphen-only pattern missed it.
  // PLURAL + LIST form counts too — "pawns on e6 and c5" claims BOTH
  // squares (the Taimanov bridge claimed a traded-off c5 pawn this way).
  const claims = [];
  for (const m of text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)s?\s+(?:(?:is|are|sits|stands|now|still)\s+)*(?:on|at)\s+([a-h][1-8])((?:\s*(?:,|and)\s*[a-h][1-8])*)\b/gi)) {
    for (const sq of [m[2], ...(m[3]?.match(/[a-h][1-8]/g) ?? [])]) claims.push({ raw: m[0], sq, word: m[1] });
  }
  for (const m of text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi)) {
    claims.push({ raw: m[0], sq: m[1], word: m[2] });
  }
  for (const { raw, sq, word } of claims) {
    const p = c.get(sq.toLowerCase());
    if (!p) return `claims "${raw}" but ${sq} is EMPTY`;
    if (p.type !== PIECE_CODE[word.toLowerCase()]) return `claims "${raw}" but ${sq} holds a ${Object.entries(PIECE_CODE).find(([, v]) => v === p.type)?.[0]}`;
  }
  return null;
}

/** Compact "what is ACTUALLY on the board" listing for a FEN. Handed to the
 *  repair call: naming a false square is the #1 gate trip, and the model
 *  cannot check a FEN string by eye — it can read a square list. */
function piecePlacement(fen) {
  const c = new Chess(fen);
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const white = [], black = [];
  for (const file of 'abcdefgh') for (const rank of '12345678') {
    const sq = `${file}${rank}`;
    const pc = c.get(sq);
    if (!pc) continue;
    (pc.color === 'w' ? white : black).push(`${names[pc.type]} ${sq}`);
  }
  return `WHITE: ${white.join(', ')}\nBLACK: ${black.join(', ')}`;
}

async function callModel(system, user, maxTokens) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat', temperature: 0.4, max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return JSON.parse((await res.json()).choices?.[0]?.message?.content ?? '{}');
}

// ── BRIDGE PASS (David 2026-07-31: "narration that explains similarities
// and differences between what was already learned vs what is new"). For
// each SIDELINE at the spine-terminus fork (branches[1..] vs the main
// continuation branches[0]), bake a comparative bridge in the house voice —
// spoken at runtime only to a RETURNING student the ledger says has walked
// this opening before. Facts are the two real DB lines; the transcript is
// reference for the plans' framing. Gated like every other unit, PLUS both
// SANs must be named (the comparison anchor). Best-effort per branch — a
// bridge that can't pass its gates ships absent (runtime falls back to the
// computed v1 template).
async function bakeBridges(spine, plies, clipped, overlaps) {
  const branches = spine.branches ?? [];
  if (branches.length < 2) return null;
  const main = branches[0];
  const divergenceFen = plies[plies.length - 1].fen;
  const side = spine.studentSide ?? 'white';
  const other = side === 'white' ? 'black' : 'white';
  const bridgeSystem = `You are the app's chess coach speaking to a RETURNING student at a fork in an opening they have studied with you before. They know the MAIN continuation; today they just tapped a SIDELINE. Write the comparative bridge you speak at that exact moment.

SHAPE (2-5 sentences, house voice — concept-first, warm, rigorous):
1. Anchor the similarity in one clause: everything up to this position is the same road they already own.
2. Name the split: the main continuation plays its move toward its plan; today's sideline plays its move toward a DIFFERENT plan. Name BOTH moves by SAN and contrast the two plans concretely, grounded in the given continuation moves.
3. End by pointing their eyes at what to watch for as the new line unfolds.

ABSOLUTE RULES:
- Never 7 consecutive words from the reference transcript. Original prose only.
- Never name a teacher, video, stream, or chat.
- No move-number prefixes ("5.Nc3" banned — write "Nc3").
- Every piece-on-square claim must be TRUE on the given FEN. The FEN is the position BEFORE either continuation is played — so NEVER say a piece is "on" a square it only reaches later, and never name a pawn/piece that exists only in a future position. Speak continuations as MOTION ("Nb5 jumps in", "the knight lands on b5", "aiming at d6"), never as location ("the knight on b5", "the d6 pawn").
- Add no chess content the two given lines or the transcript don't support.
- "we/our" = ${side.toUpperCase()}. Also return the FLIPPED register where "we/our" = ${other.toUpperCase()} (same facts, other color addressed as the student).
- shortText / shortTextFlipped: ONE sentence, max 18 words, naming both SANs.

Return STRICT JSON: {"text": string, "shortText": string, "textFlipped": string, "shortTextFlipped": string}`;
  const bridges = {};
  for (const alt of branches.slice(1, 5)) {
    const promptFor = (repairNote) => `OPENING: ${spine.name}
THE SHARED ROAD (already learned, ${plies.length} plies): ${plies.map((p) => p.san).join(' ')}
POSITION AT THE FORK (FEN): ${divergenceFen}
THE MAIN CONTINUATION THEY KNOW: ${main.san}${main.label ? ` — "${main.label}"` : ''}, continuing ${[main.san, ...(main.extensionMoves ?? [])].join(' ')}
TODAY'S SIDELINE (just picked): ${alt.san}${alt.label ? ` — "${alt.label}"` : ''}, continuing ${[alt.san, ...(alt.extensionMoves ?? [])].join(' ')}
${repairNote ? `\nYOUR PREVIOUS ATTEMPT WAS REJECTED: ${repairNote}\nFix exactly that and return the full JSON again.\n` : ''}
TEACHER'S SPOKEN TRANSCRIPT (reference only — reword, never quote):
${clipped.slice(0, 60_000)}`;
    const gateBridge = (label, text) => {
      if (!text || !text.trim()) return `${label}: empty`;
      const gram = overlaps(text);
      if (gram) return `${label}: lifts the transcript phrase "${gram}"`;
      if (BANNED.test(text)) return `${label}: attribution/medium leak`;
      if (BANNED_EXTRA && BANNED_EXTRA.test(text)) return `${label}: creator attribution leak`;
      if (MOVE_NUM.test(text)) return `${label}: move-number prefix`;
      const claim = boardClaimProblem(text, divergenceFen);
      if (claim) return `${label}: ${claim}`;
      if (!mentionsOwnMove(text, alt.san)) return `${label}: never names the sideline move ${alt.san}`;
      if (!mentionsOwnMove(text, main.san)) return `${label}: never names the main move ${main.san} (no comparison anchor)`;
      return null;
    };
    let baked = null;
    let note = null;
    for (let attempt = 1; attempt <= 3 && !baked; attempt += 1) {
      try {
        const res = await callModel(bridgeSystem, promptFor(note), 2048);
        const primaryProblem = gateBridge('text', res.text)
          ?? (String(res.shortText ?? '').trim().split(/\s+/).length > 18 ? 'shortText: over 18 words' : null)
          ?? gateBridge('shortText', res.shortText);
        if (primaryProblem) { note = primaryProblem; console.error(`  (bridge ${alt.san} attempt ${attempt}: ${primaryProblem})`); continue; }
        const flipProblem = gateBridge('textFlipped', res.textFlipped)
          ?? (String(res.shortTextFlipped ?? '').trim().split(/\s+/).length > 18 ? 'shortTextFlipped: over 18 words' : null)
          // An unflipped copy is worse than no flip — the runtime would
          // speak the wrong pronouns on a flipped board thinking it's safe.
          ?? (String(res.textFlipped ?? '').trim() === String(res.text ?? '').trim() ? 'textFlipped: identical to the primary — not actually flipped' : null);
        baked = {
          mainSan: main.san,
          text: String(res.text).trim(),
          shortText: String(res.shortText ?? '').trim(),
          ...(flipProblem ? {} : {
            textFlipped: String(res.textFlipped).trim(),
            shortTextFlipped: String(res.shortTextFlipped ?? '').trim(),
          }),
        };
        if (flipProblem) console.error(`  (bridge ${alt.san}: flipped register dropped — ${flipProblem})`);
      } catch (e) {
        note = null;
        console.error(`  (bridge ${alt.san} attempt ${attempt} call failed: ${String(e).slice(0, 100)})`);
      }
    }
    if (baked) {
      bridges[alt.san] = baked;
      console.log(`  bridge baked: ${main.san} (known) vs ${alt.san} (new)${baked.textFlipped ? ' + flip' : ''}`);
    } else {
      console.error(`  (bridge ${alt.san}: gates never passed — runtime keeps the computed v1)`);
    }
  }
  return Object.keys(bridges).length ? bridges : null;
}

// ── BRANCH PASS (David 2026-07-31: "Tier 2 openings fully in effect?") ──
// A spine-only bake leaves every fork BRANCH speaking LLM/template prose —
// on a short-spine opening (the Alapin: 3 plies then the Barmen/Stoltz
// fork) that is MOST of the lesson. Bake each branch's teaser + one idea
// per extension ply from the transcript, gated exactly like spine ideas
// (alignment per ply, board claims on the replayed FEN, overlap, bans).
// Best-effort per branch: a branch that can't pass ships absent and the
// runtime keeps the LLM path for it.
async function bakeBranchNarrations(spine, plies, clipped, overlaps, system) {
  const branches = spine.branches ?? [];
  if (branches.length === 0) return null;
  const side = spine.studentSide ?? 'white';
  const out = {};
  for (const b of branches) {
    // Replay the branch line from the spine terminus for per-ply FENs.
    const seq = [];
    try {
      const c = new Chess();
      for (const san of spine.moves) c.move(san);
      for (const san of [b.san, ...(b.extensionMoves ?? [])]) {
        const mv = c.move(san);
        seq.push({ san: mv.san, fen: c.fen() });
      }
    } catch { console.error(`  (branch ${b.san}: illegal replay — skipped)`); continue; }
    const promptFor = (repairNote) => `OPENING: ${spine.name}
THE STUDENT PLAYS: ${side.toUpperCase()} — "we/our" means ${side} in every entry.
THE SHARED SPINE ALREADY NARRATED (${plies.length} plies): ${plies.map((p) => p.san).join(' ')}
THIS CALL COVERS ONE BRANCH: ${b.san}${b.label ? ` — "${b.label}"` : ''}
THE BRANCH LINE (${seq.length} plies, continuing from the spine): ${seq.map((p, i) => `${i + 1}:${p.san}`).join(' ')}

FOR THIS CALL return STRICT JSON:
{"teaser": string, "shortTeaser": string, "ideas": [{"text","shortText"}...]}
- teaser: 1-2 sentences spoken AS ${b.san} animates — name the move AND the line's character (continue the story from the spine; never re-introduce the opening).
- ideas: EXACTLY ${seq.length - 1} entries, one per move AFTER ${b.san} (${seq.slice(1).map((p) => p.san).join(' ')}), same alignment/teaching rules as always. Count them.
- TIME-OF-BOARD TRUTH: entry N is spoken at the position AFTER move N. NEVER state a piece is "on" a square it only reaches EARLIER or LATER in the line — if the queen recaptures on d5 two moves from now, say "the queen will take back on d5" (motion/future), never "the queen on d5" (location). A location claim must be true at that exact ply.
${repairNote ? `\nYOUR PREVIOUS ATTEMPT WAS REJECTED: ${repairNote}\nFix exactly those units (simplest fix: drop the false location claim) and return the full JSON again.\n` : ''}
TEACHER'S SPOKEN TRANSCRIPT (reference only — reword, never quote):
${clipped.slice(0, 120_000)}`;
    const gateUnit = (label, text, fen, san) => {
      if (!text || !text.trim()) return `${label}: empty`;
      const gram = overlaps(text);
      if (gram) return `${label}: lifts "${gram}"`;
      if (BANNED.test(text) || (BANNED_EXTRA && BANNED_EXTRA.test(text))) return `${label}: attribution leak`;
      if (MOVE_NUM.test(text)) return `${label}: move-number prefix`;
      if (fen) { const c = boardClaimProblem(text, fen); if (c) return `${label}: ${c}`; }
      if (san && !mentionsOwnMove(text, san)) return `${label}: does not speak about its own move ${san}`;
      return null;
    };
    let baked = null;
    let note = null;
    for (let attempt = 1; attempt <= 3 && !baked; attempt += 1) {
      try {
        const res = await callModel(system, promptFor(note), 6144);
        const ideas = Array.isArray(res.ideas) ? res.ideas : [];
        if (ideas.length !== seq.length - 1) { console.error(`  (branch ${b.san} attempt ${attempt}: ${ideas.length}/${seq.length - 1} ideas)`); continue; }
        const problems = [];
        const tp = gateUnit(`branch ${b.san} teaser`, res.teaser, seq[0].fen, b.san);
        if (tp) problems.push(tp);
        ideas.forEach((idea, i) => {
          const ip = gateUnit(`branch ${b.san} ply ${i + 2}`, idea.text, seq[i + 1].fen, seq[i + 1].san);
          if (ip) problems.push(ip);
          const shortWords = String(idea.shortText ?? '').trim().split(/\s+/).length;
          if (shortWords > 18) problems.push(`branch ${b.san} ply ${i + 2} shortText: ${shortWords} words`);
        });
        if (problems.length > 0) { note = problems.join('; '); console.error(`  (branch ${b.san} attempt ${attempt}: ${problems.slice(0, 3).join(' | ')})`); continue; }
        baked = {
          ...(b.label ? { label: b.label } : {}),
          moves: seq.map((p) => p.san),
          teaser: String(res.teaser).trim(),
          shortTeaser: String(res.shortTeaser ?? '').trim(),
          ideas: ideas.map((i) => ({ text: String(i.text).trim(), shortText: String(i.shortText ?? '').trim() })),
        };
      } catch (e) {
        console.error(`  (branch ${b.san} attempt ${attempt} call failed: ${String(e).slice(0, 100)})`);
      }
    }
    if (baked) { out[b.san] = baked; console.log(`  branch baked: ${b.san}${b.label ? ` (${b.label})` : ''} — ${baked.ideas.length + 1} plies`); }
    else console.error(`  (branch ${b.san}: gates never passed — runtime keeps the LLM path)`);
  }
  return Object.keys(out).length ? out : null;
}

async function main() {
  const spine = await resolveSpine(OPENING);
  if (!spine) { console.error(`no spine resolves for "${OPENING}"`); process.exit(1); }

  // Per-ply FENs, chess.js-computed (G3 — the moves are the DB's, never the model's).
  const c = new Chess();
  const plies = spine.moves.map((san) => {
    const mv = c.move(san);
    if (!mv) throw new Error(`illegal spine move ${san}`);
    return { san: mv.san, movedBy: mv.color === 'w' ? 'white' : 'black', fen: c.fen() };
  });

  let transcript = '';
  for (const id of VIDEO_IDS) {
    // Raw captions when present; a farm that already cleaned to prose (the
    // generic fetch-youtube-transcripts pipeline) writes .txt instead.
    const vtt = await readFile(`${TDIR}/${id}.en.vtt`, 'utf8').catch(() => null);
    if (vtt !== null) { transcript += `\n${vttToText(vtt)}`; continue; }
    const txt = await readFile(`${TDIR}/${id}.txt`, 'utf8').catch(() => null);
    if (txt !== null) { transcript += `\n${txt}`; continue; }
    console.error(`  (no transcript on disk for ${id} — skipping)`);
  }
  if (transcript.length < 2000) { console.error('transcript material too thin'); process.exit(1); }
  // DeepSeek context bound — keep the richest teaching bulk.
  const clipped = transcript.length > 180_000 ? transcript.slice(0, 180_000) : transcript;
  console.log(`[narrate] "${spine.name}" — ${plies.length} plies, ${VIDEO_IDS.length} video(s), ${Math.round(clipped.length / 1000)}k chars of reference`);
  if (DRY) return;

  const overlaps = makeOverlapGate(transcript);

  if (BRIDGES_ONLY) {
    const file = JSON.parse(await readFile(OUT, 'utf8'));
    const key = norm(spine.name);
    const entry = file.narrations[key];
    if (!entry) { console.error(`--bridges-only: no shipped entry for "${spine.name}" — bake the narration first`); process.exit(1); }
    const shipped = entry.spine.join(' ');
    const runtime = plies.map((p) => p.san).join(' ');
    if (!shipped.startsWith(runtime) && !runtime.startsWith(shipped)) {
      console.error(`--bridges-only: shipped spine diverges from the runtime spine — re-bake the whole entry\n  shipped: ${shipped}\n  runtime: ${runtime}`);
      process.exit(1);
    }
    const bridges = await bakeBridges(spine, plies, clipped, overlaps);
    if (!bridges) { console.error('no bridge passed its gates (or <2 fork branches) — nothing written'); process.exit(1); }
    entry.bridges = bridges;
    file.generatedAt = new Date().toISOString();
    await writeFile(OUT, JSON.stringify(file, null, 1));
    console.log(`✓ "${spine.name}" — ${Object.keys(bridges).length} comparative bridge(s) baked → ${OUT}`);
    return;
  }

  const system = `You are the app's chess coach — think Daniel Naroditsky sitting next to the student — rewording a master teacher's spoken video lesson into YOUR own narration of an opening walkthrough.

THE SOURCE is the teacher's raw spoken transcript (reference ONLY). THE LINE is the exact move sequence the app walks. Your job: for each move of the line, find what the teacher TEACHES about that moment in the transcript — the idea, the plan, the warning, the story — and say it in YOUR OWN WORDS.

ONE CONTINUOUS STORY (the teacher's videos are a NARRATIVE, not a move list — this is the shape):
- The INTRO states the story's through-line: the one tension this whole line is about (the square being fought over, the attack being built, the trap being set). Every entry advances THAT story.
- Each entry PICKS UP where the previous one left off — connective tissue is mandatory: "Now that the centre is braced…", "Remember the bishop we posted on g2? This is why…", "Black just called our bluff, so…". An entry that could be shuffled to any other position in the line is a FAILURE.
- Call BACK to earlier moves when a plan pays off, and plant setups the later entries will collect. The last entry and the outro land the payoff of the through-line stated in the intro.
- NEVER re-introduce the opening mid-line, never reset context, never write an entry that stands alone.

THE HOUSE VOICE (this is the bar — flat textbook prose is a FAILURE):
- Teach the IDEA, not just the move. A student should finish each beat understanding WHY, not just WHAT: name the concrete job the move does in THIS position (the square it takes away, the piece it frees, the plan it enables) rather than restating that it develops. Never reuse a sentence pattern from these instructions — earlier bakes copied an illustrative sentence out of this prompt verbatim, complete with a claim that was false on their board.
- Concept-first and conversational: "Here's the thing about this line…", "notice that…", "the point is…". Warmth is welcome; hollow hype is not.
- The opening turns on ONE central idea — find it in the transcript and teach toward it, so the beats build an argument instead of listing facts.
- Reach for the clarifying detail the teacher reaches for — the square that matters, the piece that's secretly the star, the plan three moves away.
- A KEYSTONE move (the line's defining decision, the pawn break, the move that gives it its character) gets taught like a masterclass beat: what it does, the plan it serves, what happens if the idea is ignored. A routine developing move gets ONE tight sentence — never a fabricated deep reason.
- BANNED FILLER: "develops the knight to a natural square", "a solid move", "we continue with our plan", "we're not worried", "keeps options open" — if a sentence would be true of any move in any opening, it teaches nothing; replace it with the teacher's actual idea or keep it to one plain factual clause.
- State only reasons TRUE of THIS exact position. One true concrete reason beats three plausible ones.

ABSOLUTE RULES:
- TRANSLATION, NOT TRANSCRIPTION: never copy or lightly rephrase his sentences. Never 7 consecutive words from the source. The ideas are chess knowledge; the wording must be original.
- TRANSLATION, NOT INVENTION: add NO chess content the transcript or the line itself doesn't support. Where the transcript is silent on a move, one tight factual sentence about the move is all you write.
- NEVER name or reference the teacher, a video, stream, chat, or opponent. Timeless coaching voice: warm, rigorous, concept-first.
- NO length cap on "text" — where he lingers and teaches deeply, teach deeply. "shortText" is the brief register: ONE sentence, max 18 words.
- NO move-number prefixes ("5.Nc3" is banned — write "Nc3"). Mention the move's SAN or spoken form in each text.
- ALIGNMENT IS ABSOLUTE: entry N is SPOKEN AS move N ANIMATES. It narrates move N — the move just played — and MUST name that move's SAN. It must NEVER present the NEXT move as its subject ("f5 is the gambit" as the entry for Nf3 is a hard failure). Forecasting what comes next is allowed only AFTER the entry has taught its own move.
- Frame ideas for the student playing the side the app teaches.

Return STRICT JSON:
{"intro": string, "shortIntro": string, "outro": string,
 "ideas": [{"text": string, "shortText": string}, ...]}  // EXACTLY one per move, in order`;

  const user = `OPENING: ${spine.name}
THE STUDENT PLAYS: ${(spine.studentSide ?? 'white').toUpperCase()} — "we/our" means ${(spine.studentSide ?? 'white')} in every entry; the other color is addressed by name.
THE LINE (${plies.length} plies, in order): ${plies.map((p, i) => `${i + 1}:${p.san}`).join(' ')}

TEACHER'S SPOKEN TRANSCRIPT (reference only — reword, never quote):
${clipped}`;

  // One-shot asks under-deliver on long lines (28 plies → 15 ideas). Chunk:
  // intro/outro from the first call, ideas in batches of 10 with the full
  // reference each time, exact-count enforced per batch.
  const BATCH = 10;
  // The model sometimes under-delivers a batch's count — retry the batch
  // (up to 3 tries) before refusing; a partial narration never ships.
  const callBatch = async (prompt, want, maxTokens) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await callModel(system, prompt, maxTokens);
      const got = Array.isArray(res.ideas) ? res.ideas : [];
      if (got.length >= want) return { ...res, ideas: got.slice(0, want) };
      console.error(`  (batch returned ${got.length}/${want} ideas — retry ${attempt}/3)`);
    }
    return null;
  };
  const firstWant = Math.min(BATCH, plies.length);
  const first = await callBatch(`${user}

FOR THIS CALL: return intro, shortIntro, outro, and ideas for ONLY the first ${firstWant} moves (${plies.slice(0, BATCH).map((p) => p.san).join(' ')}). EXACTLY ${firstWant} idea entries — one per listed move, count them.`, firstWant, 8192);
  if (!first) { console.error(`model kept under-delivering the first batch — refusing partial narration`); process.exit(1); }
  const out = { intro: first.intro, shortIntro: first.shortIntro, outro: first.outro };
  let ideas = first.ideas;
  for (let start = BATCH; start < plies.length; start += BATCH) {
    const slice = plies.slice(start, start + BATCH);
    const more = await callBatch(`${user}

FOR THIS CALL: return ONLY {"ideas":[...]} for moves ${start + 1}-${start + slice.length} of the line (${slice.map((p) => p.san).join(' ')}), continuing the same narration. EXACTLY ${slice.length} idea entries — one per listed move, count them.`, slice.length, 8192);
    if (!more) { console.error(`model kept under-delivering batch at ${start + 1} — refusing partial narration`); process.exit(1); }
    ideas = ideas.concat(more.ideas);
  }
  if (ideas.length !== plies.length) {
    console.error(`model returned ${ideas.length} ideas for ${plies.length} plies — refusing partial narration`);
    process.exit(1);
  }

  // Gates, per unit. A failed unit fails the BUILD (fix the source or re-run) —
  // a silently-dropped ply would desync narration from the board.
  const runGates = () => {
    const problems = [];
    const checkUnit = (label, text, fen) => {
      if (!text || !text.trim()) return problems.push(`${label}: empty`);
      const gram = overlaps(text);
      if (gram) return problems.push(`${label}: lifts the transcript phrase "${gram}" — reword it`);
      if (BANNED.test(text)) return problems.push(`${label}: attribution/medium leak`);
      if (BANNED_EXTRA && BANNED_EXTRA.test(text)) return problems.push(`${label}: creator attribution leak`);
      if (MOVE_NUM.test(text)) return problems.push(`${label}: move-number prefix`);
      if (fen) {
        const claim = boardClaimProblem(text, fen);
        if (claim) return problems.push(`${label}: ${claim}`);
      }
    };
    checkUnit('intro', out.intro, null);
    checkUnit('outro', out.outro, null);
    ideas.forEach((idea, i) => {
      checkUnit(`ply ${i + 1} (${plies[i].san}) text`, idea.text, plies[i].fen);
      checkUnit(`ply ${i + 1} shortText`, idea.shortText, plies[i].fen);
      const shortWords = String(idea.shortText ?? '').trim().split(/\s+/).length;
      if (shortWords > 18) problems.push(`ply ${i + 1} shortText: ${shortWords} words (max 18)`);
      if (idea.text && !mentionsOwnMove(idea.text, plies[i].san)) {
        problems.push(`ply ${i + 1} text: does not speak about its OWN move ${plies[i].san} (misaligned narration)`);
      }
      if (idea.text && claimsOpponentMove(idea.text, plies[i].san, plies[i].movedBy, spine.studentSide ?? 'white')) {
        problems.push(`ply ${i + 1} text: claims the OPPONENT's move ${plies[i].san} as ours — the student plays ${spine.studentSide ?? 'white'}, so ${plies[i].movedBy} played it`);
      }
    });
    return problems;
  };
  // REPAIR LOOP: a failed ply goes back to the model with the EXACT violation
  // (which claim lied, on which FEN) — a blind repair that doesn't know which
  // sentence lied just fails the same gate again. 5 rounds because the repair
  // OSCILLATES on hard plies (2026-07-31 batch: round 1 fixes the false claim
  // but drops the move name, round 2 restores the name and re-invents a
  // claim); it converges once it is given the actual piece placement AND the
  // exact token the alignment check wants.
  let problems = runGates();
  for (let round = 1; round <= 5 && problems.length > 0; round += 1) {
    const failing = [...new Set(problems.map((x) => x.match(/^ply (\d+)/)?.[1]).filter(Boolean).map(Number))];
    const introFailing = problems.some((x) => x.startsWith('intro'));
    const outroFailing = problems.some((x) => x.startsWith('outro'));
    if (failing.length === 0 && !introFailing && !outroFailing) break;
    console.error(`… repair round ${round}: ${problems.slice(0, 6).join(' | ')}`);
    const detail = [
      ...(introFailing ? [`the INTRO — rejected because: ${problems.filter((x) => x.startsWith('intro')).join('; ')}`] : []),
      ...(outroFailing ? [`the OUTRO — rejected because: ${problems.filter((x) => x.startsWith('outro')).join('; ')}`] : []),
      ...failing.map((n) => {
        const i = n - 1;
        const bare = plies[i].san.replace(/[+#]/g, '');
        const dest = bare.match(/([a-h][1-8])(?:=[NBRQ])?$/)?.[1];
        const token = /^O-O/.test(bare) ? `"${bare}" (or the word "castles")` : `"${bare}"${dest ? ` (or at minimum the square "${dest}")` : ''}`;
        return `move ${n} (${plies[i].san}) — rejected because: ${problems.filter((x) => x.startsWith(`ply ${n} `)).join('; ')}
  MUST CONTAIN the token ${token}.
  THE BOARD AFTER THIS MOVE (name NO square that contradicts this):
  ${piecePlacement(plies[i].fen).replace(/\n/g, '\n  ')}`;
      }),
    ].join('\n');
    const fix = await callModel(system, `${user}\n\nREPAIR CALL: these narration units were REJECTED for the exact reasons listed. Rewrite ONLY the listed units. HARD RULES, all of which must hold AT ONCE (past repairs fixed one and broke another): (1) the entry MUST contain the required token shown for it; (2) EVERY piece-on-square claim must appear in that move's board listing below — if you are unsure, name no square at all and teach the move's PURPOSE instead; (3) never reuse 7 consecutive words from the transcript; (4) shortText ≤18 words.\n${detail}\nReturn JSON with ${introFailing ? '"intro" and "shortIntro", ' : ''}${outroFailing ? '"outro", ' : ''}${failing.length > 0 ? `and "ideas" with EXACTLY ${failing.length} entries in the order listed` : 'nothing else'}.`, 4096);
    if (introFailing && fix.intro) { out.intro = fix.intro; if (fix.shortIntro) out.shortIntro = fix.shortIntro; }
    if (outroFailing && fix.outro) out.outro = fix.outro;
    const fixed = Array.isArray(fix.ideas) ? fix.ideas : [];
    failing.forEach((n, k) => { if (fixed[k]) ideas[n - 1] = fixed[k]; });
    problems = runGates();
  }
  if (problems.length > 0) {
    console.error(`✗ ${problems.length} gate failure(s) after repair:`);
    for (const x of problems.slice(0, 12)) console.error('  -', x);
    process.exit(1);
  }

  // ── FLIP PASS (David 2026-07-31: board orientation dictates the coach's
  // pronouns). One more offline call rewrites the finished, gated narration
  // addressing the OTHER color as "we" — same facts, same gates. Best-effort:
  // a flipped set that can't pass the gates ships absent (the primary
  // register then speaks regardless of orientation), never half-gated.
  const side = spine.studentSide ?? 'white';
  const other = side === 'white' ? 'black' : 'white';
  let flipped = null;
  try {
    const finished = ideas.map((idea, i) => `${i + 1}. [after ${plies[i].san}] ${idea.text} || SHORT: ${idea.shortText}`).join('\n');
    const flip = await callModel(system, `${user}

FLIP CALL: below is the FINISHED narration for this line, written for the student playing ${side.toUpperCase()} ("we" = ${side}). Rewrite the intro, shortIntro, outro, and EVERY entry so the student is playing ${other.toUpperCase()} instead — "we/our" now means ${other}, and ${side} becomes "White"/"Black" by name. SAME facts, SAME move each entry speaks about, same alignment and truth rules. Return {"intro":string,"shortIntro":string,"outro":string,"ideas":[{"text","shortText"}...]} with EXACTLY ${ideas.length} idea entries.

FINISHED NARRATION:
${finished}`, 8192);
    const fIdeas = Array.isArray(flip.ideas) ? flip.ideas : [];
    if (fIdeas.length === ideas.length && flip.intro && flip.outro) {
      const fProblems = [];
      const checkFlip = (label, text, fen) => {
        if (!text || !text.trim()) return fProblems.push(`${label}: empty`);
        const fGram = overlaps(text);
        if (fGram) return fProblems.push(`${label}: lifts "${fGram}"`);
        if (BANNED.test(text) || (BANNED_EXTRA && BANNED_EXTRA.test(text))) return fProblems.push(`${label}: attribution leak`);
        if (MOVE_NUM.test(text)) return fProblems.push(`${label}: move-number prefix`);
        if (fen) { const c = boardClaimProblem(text, fen); if (c) return fProblems.push(`${label}: ${c}`); }
      };
      checkFlip('flip intro', flip.intro, null);
      checkFlip('flip outro', flip.outro, null);
      fIdeas.forEach((idea, i) => {
        checkFlip(`flip ply ${i + 1}`, idea.text, plies[i].fen);
        if (idea.text && !mentionsOwnMove(idea.text, plies[i].san)) fProblems.push(`flip ply ${i + 1}: misaligned`);
      });
      if (fProblems.length === 0) {
        flipped = flip;
        console.log(`  flip register baked (${other} perspective) — all gates green`);
      } else {
        console.error(`  (flip register FAILED ${fProblems.length} gate(s) — shipping primary only: ${fProblems.slice(0, 3).join(' | ')})`);
      }
    } else {
      console.error('  (flip register malformed — shipping primary only)');
    }
  } catch (e) {
    console.error(`  (flip call failed — shipping primary only: ${String(e).slice(0, 100)})`);
  }

  // Comparative bridges for the fork's sidelines (needs ≥2 branches).
  const bridges = await bakeBridges(spine, plies, clipped, overlaps);
  // Branch narrations — Tier 2 covers the whole tree, not just the spine.
  const branchNarrations = await bakeBranchNarrations(spine, plies, clipped, overlaps, system);

  let file = { generatedAt: '', narrations: {} };
  try { file = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first entry */ }
  file.generatedAt = new Date().toISOString();
  file.narrations[norm(spine.name)] = {
    openingName: spine.name,
    spine: plies.map((p) => p.san),
    sourceVideos: VIDEO_IDS.map((id) => `yt:${id}`),
    studentSide: side,
    intro: out.intro.trim(),
    shortIntro: String(out.shortIntro ?? '').trim(),
    outro: out.outro.trim(),
    ideas: ideas.map((i) => ({ text: i.text.trim(), shortText: String(i.shortText ?? '').trim() })),
    ...(flipped ? {
      introFlipped: String(flipped.intro).trim(),
      shortIntroFlipped: String(flipped.shortIntro ?? '').trim(),
      outroFlipped: String(flipped.outro).trim(),
      ideasFlipped: flipped.ideas.map((i) => ({ text: String(i.text).trim(), shortText: String(i.shortText ?? '').trim() })),
    } : {}),
    ...(bridges ? { bridges } : {}),
    ...(branchNarrations ? { branchNarrations } : {}),
  };
  await writeFile(OUT, JSON.stringify(file, null, 1));
  console.log(`✓ "${spine.name}" narration baked from video — ${ideas.length} plies${flipped ? ' + flip register' : ''}, all gates green → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

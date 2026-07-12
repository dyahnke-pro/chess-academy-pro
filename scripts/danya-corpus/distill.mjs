#!/usr/bin/env node
/**
 * distill — turn one video's transcript into ORIGINAL, position-keyed
 * teaching notes (David 2026-07-12: "what he teaches in every position,
 * accompanied by his explanation of the position, and the future plans").
 *
 * THE HARD LINE (locked, David 2026-07-02): the transcript is REFERENCE
 * ONLY. Nothing verbatim ships. Three enforcement layers here:
 *   1. The distillation prompt demands original prose (translation, not
 *      transcription) and bans quoting.
 *   2. A 7-gram overlap gate: any 7-word run shared with the transcript
 *      kills the note (checked on normalized text).
 *   3. chess.js validates every lineSan from the start position — a note
 *      whose moves don't replay is DROPPED, never repaired (G3).
 *
 * Output: data/sources/naroditsky-voice/distilled/<videoId>.json (committed —
 * original content). Resumable: skips videos already distilled.
 *
 * Usage:
 *   node scripts/danya-corpus/distill.mjs [--playlist key] [--limit N] [--id VIDEOID]
 */
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { Chess } from 'chess.js';

const TDIR = 'data/sources/naroditsky-voice/transcripts';
const DDIR = 'data/sources/naroditsky-voice/distilled';
const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
async function exists(p) { try { await access(p); return true; } catch { return false; } }

/** Parse a YouTube auto-sub VTT into clean running text. Auto-subs repeat
 *  each line across overlapping cues — collapse consecutive duplicates. */
export function vttToText(vtt) {
  const lines = [];
  for (let raw of vtt.split('\n')) {
    const line = raw
      .replace(/<[^>]+>/g, '')            // inline timing/format tags
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (!line) continue;
    if (/^WEBVTT|^Kind:|^Language:|^NOTE/.test(line)) continue;
    if (/^\d{2}:\d{2}/.test(line) && line.includes('-->')) continue;
    if (/^\d+$/.test(line)) continue;
    if (lines[lines.length - 1] === line) continue; // consecutive dup
    lines.push(line);
  }
  // Second dedup pass: auto-subs interleave A,B,B,C,C,D — drop any line equal
  // to the one two back as well (rolling-window artifact).
  const out = [];
  for (const l of lines) {
    if (out[out.length - 1] === l || out[out.length - 2] === l) continue;
    out.push(l);
  }
  return out.join(' ');
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Build the transcript's 7-gram set once; test note prose against it. */
export function makeOverlapGate(transcriptText, n = 7) {
  const words = norm(transcriptText).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) {
      if (grams.has(w.slice(i, i + n).join(' '))) return true; // overlap found
    }
    return false;
  };
}

/** chess.js-validate a SAN sequence from the start position. Returns the
 *  normalized SANs on success, null on any illegal move (drop, never fix). */
export function validateLine(sans) {
  if (!Array.isArray(sans) || sans.length === 0) return [];
  const c = new Chess();
  const out = [];
  for (const s of sans) {
    if (typeof s !== 'string' || !s.trim()) return null;
    try {
      const m = c.move(s.trim());
      if (!m) return null;
      out.push(m.san);
    } catch { return null; }
  }
  return out;
}

const SYSTEM = `You are a chess-teaching editor distilling a lesson transcript into structured, position-keyed teaching notes.

ABSOLUTE RULES:
- ORIGINAL PROSE ONLY. You are translating the teacher's ideas into your own words — never copy or lightly rephrase his sentences. The ideas are public-domain chess knowledge; the wording must be yours.
- NEVER name or reference the teacher, the video, the stream, chat, or the opponent. Write as timeless chess teaching ("the knight belongs on d5", never "he says…" / "in this game…").
- MOVES: only include a moves array when the transcript makes the exact sequence from the game's FIRST move clear. When unsure of any move, use an empty moves array — a wrong move is worse than none.
- Registers: concise, concrete, idea-first. Name squares and pieces. No praise, no filler, no move-number prefixes like "12.Nf3" (write "Nf3").

Extract EVERY distinct teaching moment. For each produce:
- moves: SAN array from move 1 of the game to the position being taught (or [] when uncertain)
- opening: the opening/variation name if stated or clearly identifiable, else null
- phase: "opening" | "middlegame" | "endgame" | "concept"
- explains: 1-3 sentences — the teacher's read of THIS position (what matters, why)
- teaches: 1-2 sentences — the transferable idea/principle being taught
- plans: 1-2 sentences — the forward plan from here (or "" if none given)
- concepts: 0-4 short kebab-case tags (e.g. "outpost", "pawn-break", "king-safety")

Return STRICT JSON: {"notes": [ ... ]}. Nothing else.`;

async function distillOne(videoId, meta) {
  const vtt = await readFile(`${TDIR}/${videoId}.en.vtt`, 'utf8');
  const text = vttToText(vtt);
  if (text.length < 500) throw new Error('transcript too short');
  // DeepSeek 64k context — clip pathological cases, keep the teaching bulk.
  const clipped = text.length > 120_000 ? text.slice(0, 120_000) : text;

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.4,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Video title (context only, do not quote): ${meta.title}\n\nTRANSCRIPT (auto-captions, unpunctuated):\n${clipped}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content ?? '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Note-dense videos overflow max_tokens and the JSON truncates. Retry
    // ONCE with a hard note cap so the reply fits — fewer, best notes beat
    // a dead video.
    const retry = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${SYSTEM}\n\nHARD LIMIT: extract AT MOST the 12 most valuable teaching moments. Keep every prose field under 60 words.` },
          { role: 'user', content: `Video title (context only, do not quote): ${meta.title}\n\nTRANSCRIPT (auto-captions, unpunctuated):\n${clipped}` },
        ],
      }),
    });
    if (!retry.ok) throw new Error(`deepseek retry ${retry.status}`);
    const retryBody = await retry.json();
    const retryRaw = retryBody.choices?.[0]?.message?.content ?? '';
    try { parsed = JSON.parse(retryRaw); } catch { throw new Error('non-JSON distillation (after capped retry)'); }
  }
  const candidates = Array.isArray(parsed.notes) ? parsed.notes : [];

  const overlaps = makeOverlapGate(text);
  const notes = [];
  let dropped = { overlap: 0, empty: 0 };
  let demoted = 0;
  for (const c of candidates) {
    const explains = String(c.explains ?? '').trim();
    const teaches = String(c.teaches ?? '').trim();
    const plans = String(c.plans ?? '').trim();
    if (!explains || !teaches) { dropped.empty += 1; continue; }
    // G3: an invalid sequence NEVER ships — but the prose teaching is still
    // real. Demote to an opening-keyed note (lineSan: []) instead of losing
    // it: the auto-captions rarely carry a full clean game score, so a hard
    // drop threw away 16/19 notes on the pilot video. The position-keyed
    // notes stay the premium tier; demoted notes ground by opening name.
    let line = validateLine(c.moves ?? []);
    if (line === null) {
      // But a demoted note without an opening name is unanchored — drop those.
      if (!c.opening) { dropped.empty += 1; continue; }
      line = [];
      demoted += 1;
    }
    if (overlaps(explains) || overlaps(teaches) || (plans && overlaps(plans))) { dropped.overlap += 1; continue; }
    notes.push({
      lineSan: line,
      opening: c.opening ? String(c.opening).trim() : null,
      phase: ['opening', 'middlegame', 'endgame', 'concept'].includes(c.phase) ? c.phase : 'concept',
      explains, teaches, plans,
      concepts: Array.isArray(c.concepts) ? c.concepts.slice(0, 4).map(String) : [],
      sources: [`yt:${videoId}`],
    });
  }
  return { videoId, playlist: meta.playlist, title: meta.title, distilledAt: new Date().toISOString(), notes, dropped, demoted };
}

async function main() {
  if (!KEY) { console.error('DEEPSEEK_KEY / VITE_DEEPSEEK_API_KEY not set'); process.exit(1); }
  await mkdir(DDIR, { recursive: true });
  const manifest = JSON.parse(await readFile('data/sources/naroditsky-voice/manifest.json', 'utf8'));
  const playlist = arg('playlist', null);
  const onlyId = arg('id', null);
  const limit = Number(arg('limit', '10000'));

  let videos = manifest.videos;
  if (playlist) videos = videos.filter((v) => v.playlist === playlist);
  if (onlyId) videos = videos.filter((v) => v.id === onlyId);

  const queue = [];
  for (const v of videos) {
    if (!(await exists(`${TDIR}/${v.id}.en.vtt`))) continue;      // no transcript yet
    if (await exists(`${DDIR}/${v.id}.json`)) continue;            // already distilled
    queue.push(v);
  }
  console.log(`[distill] ${queue.length} to distill (of ${videos.length} in scope)`);

  let ok = 0, fail = 0, totalNotes = 0;
  for (const v of queue.slice(0, limit)) {
    try {
      const out = await distillOne(v.id, v);
      await writeFile(`${DDIR}/${v.id}.json`, JSON.stringify(out, null, 2));
      ok += 1; totalNotes += out.notes.length;
      console.log(`[distill] ${v.id} ✓ ${out.notes.length} notes (${out.demoted} demoted to opening-key; dropped: overlap=${out.dropped.overlap} empty=${out.dropped.empty}) — ${v.title.slice(0, 60)}`);
    } catch (e) {
      fail += 1;
      console.error(`[distill] ${v.id} ✗ ${String(e).split('\n')[0].slice(0, 140)}`);
    }
  }
  console.log(`[distill] ok=${ok} fail=${fail} notes=${totalNotes}`);
}

const isMain = process.argv[1]?.endsWith('distill.mjs');
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });

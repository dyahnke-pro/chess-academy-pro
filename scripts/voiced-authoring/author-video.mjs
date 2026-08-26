#!/usr/bin/env node
/**
 * author-video — MOVE-BY-MOVE voiced authoring from the raw video transcript.
 *
 * David 2026-08-25, emphatic: "I want our walkthrough to mirror move by move /
 * step by step what he teaches… redo all of the narrations to cover each move.
 * I want every word spoken (about the position) transcribed and adopted into
 * our teaching… including the hypothetical lines." The old hand-authored beat
 * map (`lib.build` with 3-6 beats) left most moves silent — this covers EVERY
 * position-relevant move.
 *
 * WHAT IT DOES: reads the bank (`data/video-narration/<id>.json` — per move
 * {ply,t,fen,line,said}, the auto-caption transcript sliced by move timestamp),
 * hands the WHOLE ordered timeline to the model, and asks for a `spoken` line on
 * every move that carries position teaching in the transcript — reworded into
 * the house voice, board-true, capturing subtleties AND the hypothetical lines
 * Danya walks. Non-position chatter ("we'll have plenty after the game") → "".
 *
 * G0/plagiarism: the model REWORDS his own transcript (reference, never quoted).
 * Three gates per line, same as narrate-from-video:
 *   • 7-gram overlap  — no verbatim lift from the transcript
 *   • board-claim     — no "knight on f5" when f5 is empty (piece-on-square)
 *   • depersonalize + move-number-prefix bans
 * A tripped line gets ONE repair call (told which square/gram to fix); if it
 * still trips it is dropped to "" rather than shipped false.
 *
 * Usage:
 *   DEEPSEEK_KEY=... node scripts/voiced-authoring/author-video.mjs <id> \
 *       --opening "four knights: scotch" --side white [--dry] [--force]
 *   (omit --opening/--side to carry them from the existing voiced file.)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';
import { readBank, VOICED } from './lib.mjs';

const KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const IS_CLI = import.meta.url === `file://${process.argv[1]}`;
const id = process.argv[2];
const DRY = process.argv.includes('--dry');
if (IS_CLI) {
  if (!id) { console.error('usage: author-video.mjs <id> [--opening "..."] [--side white|black]'); process.exit(1); }
  if (!KEY && !DRY) { console.error('no DEEPSEEK_KEY'); process.exit(1); }
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const BANNED = /\b(naroditsky|danya|aman|hambleton|chessbrah|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\b\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;
const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };

// ── the running board per move index (fen the transcript slice describes) ──
function timeline(bank) {
  const g = new Chess();
  const rows = [];
  let last = 0;
  bank.moves.forEach((m, idx) => {
    const line = Array.isArray(m.line) ? m.line : [];
    let played = [];
    if (typeof m.ply === 'number' && m.ply <= last) {
      // rewind / analysis slice — keep the bank fen, do not advance the spine.
      rows.push({ idx, ply: m.ply, played: line, fen: m.fen, said: (m.said || '').replace(/\s+/g, ' ').trim(), analysis: true });
      return;
    }
    const snap = g.fen(); let ok = true;
    for (const s of line) { try { if (!g.move(s)) { ok = false; break; } played.push(s); } catch { ok = false; break; } }
    if (!ok) { g.load(snap); played = line; }
    if (typeof m.ply === 'number') last = m.ply;
    rows.push({ idx, ply: m.ply, played, fen: g.fen(), said: (m.said || '').replace(/\s+/g, ' ').trim(), analysis: false });
  });
  return rows;
}

function piecePlacement(fen) {
  const c = new Chess(fen);
  const names = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const w = [], b = [];
  for (const f of 'abcdefgh') for (const r of '12345678') {
    const pc = c.get(`${f}${r}`); if (!pc) continue;
    (pc.color === 'w' ? w : b).push(`${names[pc.type]} ${f}${r}`);
  }
  return `W: ${w.join(', ')} | B: ${b.join(', ')}`;
}

// piece-on-square truth (reused from narrate-from-video) — but HYPOTHETICAL-
// aware: a what-if line ("if the bishop comes to g4", "White had a bishop on
// g4", "after Bxc3 the pawn on c3…") legitimately names squares/pieces not on
// the CURRENT board. Those are the hypothetical lines David wants KEPT. Only a
// PRESENT-TENSE claim about the board in front of the student must be true, so
// a claim sitting in a conditional/hypothetical clause is exempt.
// A sentence is HYPOTHETICAL / FUTURE / TYPICAL (and so may name squares not on
// the current board) if it carries any of these markers. Broad on purpose:
// David wants the what-if lines and structural teaching KEPT, and the truly
// dangerous lie — a flat present-tense "the knight on f6 forks your queen" when
// f6 is empty — carries none of these, so it is still caught.
const HYPO = /\b(if|would|could|should|were|had|imagine|say|suppose|what if|after|once|instead|otherwise|might|may|else|then|typically|usually|often|generally|normally|tend|tends|aim|aims|aiming|head|heads|heading|want|wants|wanted|plan|plans|planning|will|'ll|shall|plann?ed|in case|recaptur\w*|threaten\w*|intend\w*|going to|about to|prepar\w*|idea is|looking to|hoping|hope|tries|try|trying|plans? to|plan on|plot|plotting|plan is|goal|plan being|plan to|so that|plan of)\b/i;
function boardClaimProblem(text, fen) {
  const c = new Chess(fen);
  // Sentence granularity: a hypothetical/future/typical marker anywhere in the
  // sentence exempts every square it names — the claim and its qualifier ("in
  // case White recaptures with the queen on d4") live in one sentence.
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (HYPO.test(sentence)) continue;
    const claims = [];
    for (const m of sentence.matchAll(/\b(knight|bishop|rook|queen|king|pawn)s?\s+(?:(?:is|are|sits|stands|now|still)\s+)*(?:on|at)\s+([a-h][1-8])((?:\s*(?:,|and)\s*[a-h][1-8])*)\b/gi))
      for (const sq of [m[2], ...(m[3]?.match(/[a-h][1-8]/g) ?? [])]) claims.push({ raw: m[0], sq, word: m[1] });
    for (const m of sentence.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi))
      claims.push({ raw: m[0], sq: m[1], word: m[2] });
    for (const { raw, sq, word } of claims) {
      const p = c.get(sq.toLowerCase());
      if (!p) return `claims "${raw}" but ${sq} is EMPTY`;
      if (p.type !== PIECE_CODE[word.toLowerCase()]) return `claims "${raw}" but ${sq} holds a ${Object.entries(PIECE_CODE).find(([, v]) => v === p.type)?.[0]}`;
    }
  }
  return null;
}

function makeOverlapGate(transcript, n = 8) {
  const words = norm(transcript).split(' ');
  const grams = new Set();
  for (let i = 0; i + n <= words.length; i += 1) grams.add(words.slice(i, i + n).join(' '));
  return (prose) => {
    const w = norm(prose).split(' ');
    for (let i = 0; i + n <= w.length; i += 1) { const g = w.slice(i, i + n).join(' '); if (grams.has(g)) return g; }
    return null;
  };
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
  if (!res.ok) throw new Error(`deepseek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return JSON.parse((await res.json()).choices?.[0]?.message?.content ?? '{}');
}

const SYSTEM = `You transcribe a chess teacher's spoken lesson into an ORIGINAL, board-accurate coaching script, move by move.

You are given a game's move timeline. Each row is one move: its index, the move(s) just played, a plain list of exactly what is on the board AFTER that move, and the RAW auto-caption transcript the teacher spoke around that moment (messy, misheard words, no punctuation).

Your job, for EVERY row that carries chess teaching about the position:
- Write a "spoken" line that says, in clean original prose, what the teacher taught THERE — the idea behind the move, the plan, the threat, the subtlety, AND any hypothetical/what-if line he walks ("if Black takes, then...").
- CAPTURE EVERYTHING HE SAYS about the position. Do not summarize away detail. If he mentions a hypothetical line, a square, a trade, a trap, a tempo, a weakness — keep it. Length is not capped; match his depth.
- RELAY ONLY WHAT HE ACTUALLY SAYS. This is the hard rule. You are TRANSLATING his words into clean prose, NOT analysing the position yourself. Add ZERO chess content of your own. If he does not mention a pin, you must not mention a pin. If he does not say which piece a move attacks or pins or forks, you must not invent one. Do not "improve" his explanation with reasons he didn't give. When his transcript is vague, stay vague — never fill the gap with your own analysis, because your analysis of the board is exactly what is banned here.
- The auto-caption for a move often lands a beat early or late, and words are frequently misheard (e.g. "fortnite scotch" = "four knights scotch", "Edie" = a move). Read neighbouring rows, repair the obvious mishearings, and attribute each idea to the row whose BOARD it actually describes.
- BOARD TRUTH IS ABSOLUTE: only name a piece on a square if that square list shows it there. Never say "the knight on f5" unless f5 holds a knight in that row's list. You may name an empty square as a destination ("the knight heads for f5"). If relaying his claim would require naming a piece/square that isn't there, relay the idea without the false detail.
- ORIGINAL WORDS ONLY. Never copy the teacher's phrasing — rewrite the idea in your own words. No 7-word span may match his transcript.
- NEVER name the teacher, the channel, the video, the stream, chat, or "speedrun". No move numbers ("2.Nc3" — write "Nc3" or "the knight to c3").
- A row that is pure chatter / greetings / results-talk with NO position content gets "" (empty). Leave those out; keep every position-relevant one.

Return JSON: {"spoken": {"<idx>": "<prose>", ...}} — a key for every row you author (skip pure-chatter rows). Keys are the row indexes as strings.`;

function buildUserPrompt(rows) {
  const lines = rows.map((r) =>
    `#${r.idx} ${r.analysis ? '(analysis)' : ''} played:${r.played.join(' ') || '—'}\n  board: ${piecePlacement(r.fen)}\n  said: ${r.said || '(silence)'}`,
  );
  return `TIMELINE (${rows.length} rows):\n\n${lines.join('\n\n')}`;
}

async function repairOnce(san, fen, prior, reason, overlapGram) {
  const sys = 'Fix a chess coaching passage so it is board-accurate and fully original, KEEPING every teaching idea and hypothetical line it already contains. Return JSON {"spoken":"..."}.';
  const user = `The board here holds exactly:\n${piecePlacement(fen)}\n\nMove played: ${san}\nCurrent passage: "${prior}"\nProblem: ${reason}${overlapGram ? `\nIt also copies the teacher's words in this span: "${overlapGram}" — reword that span in your own words.` : ''}\n\nRewrite the WHOLE passage. Rules:\n- Preserve every teaching idea, plan, and hypothetical/what-if line it has. Do not shorten away content.\n- Name a piece on a square ONLY if the board list above shows it there.\n- If the passage describes a TYPICAL structure or a move about to be made (a square not yet occupied), keep the idea but frame it as such — "we're heading for the Scheveningen setup with the pawn going to e6", "the knight will belong on d4" — never state it as already on the board.\n- Fully original words (no copying the teacher).`;
  try {
    const r = await callModel(sys, user, 1500);
    return typeof r.spoken === 'string' ? r.spoken.trim() : '';
  } catch { return ''; }
}

export async function authorVideo(id, opts = {}) {
  const DRY = opts.dry ?? false;
  const bank = readBank(id);
  const rows = timeline(bank);
  const existingPath = `${VOICED}/${id}.json`;
  const existing = existsSync(existingPath) ? JSON.parse(readFileSync(existingPath, 'utf8')) : {};
  const opening = opts.opening ?? existing.openingName ?? '';
  const side = opts.side ?? existing.studentSide ?? 'white';
  const transcript = rows.map((r) => r.said).join(' ');
  const overlapGate = makeOverlapGate(transcript);

  console.log(`[author] ${id} | ${bank.title || '(no title)'} | ${rows.length} rows | opening="${opening}" side=${side}`);
  if (DRY) { console.log(buildUserPrompt(rows).slice(0, 2000)); return { id, authored: 0, dry: true }; }

  // one call for the whole video (chunk if very long)
  const CHUNK = 60;
  const spoken = {};
  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK);
    let out;
    try { out = await callModel(SYSTEM, buildUserPrompt(slice), 8192); }
    catch (e) { console.error(`  chunk@${start} failed: ${String(e).slice(0, 160)}`); continue; }
    Object.assign(spoken, out.spoken || {});
  }

  // gate + repair every authored line
  let authored = 0, repaired = 0, dropped = 0;
  const A = {};
  for (const r of rows) {
    let text = (spoken[String(r.idx)] || '').trim();
    if (!text) continue;
    const san = r.played[r.played.length - 1] || '';
    const check = () => {
      if (BANNED.test(text)) return 'attribution/medium leak';
      if (MOVE_NUM.test(text)) return 'move-number prefix';
      const bc = boardClaimProblem(text, r.fen); if (bc) return bc;
      const og = overlapGate(text); if (og) return `overlap:${og}`;
      return null;
    };
    let problem = check();
    let didRepair = false;
    for (let attempt = 0; attempt < 3 && problem; attempt += 1) {
      if (process.env.DEBUG_AUTHOR) console.error(`  TRIP #${r.idx} a${attempt} (${problem})`);
      const og = problem.startsWith('overlap:') ? problem.slice(8) : null;
      const fixed = await repairOnce(san, r.fen, text, problem, og);
      if (!fixed) break;
      text = fixed; didRepair = true;
      problem = check();
    }
    if (didRepair && !problem) repaired += 1;
    if (problem) { dropped += 1; if (process.env.DEBUG_AUTHOR) console.error(`  DROP #${r.idx} (${problem}): ${text.slice(0, 120)}`); continue; }
    A[r.idx] = { explains: text, ...(r.analysis ? { reanchor: true } : {}) };
    authored += 1;
  }

  // write in the voiced shape, straight from the bank (fidelity preserved)
  const outObj = {
    videoId: bank.videoId, title: bank.title, openingName: opening, studentSide: side,
    voice: 'danya-dna', rewrittenAt: new Date().toISOString().slice(0, 10), source: `yt:${id}`,
    moves: bank.moves.map((m, i) => {
      const a = A[i];
      return {
        ply: m.ply, t: m.t, fen: m.fen, line: m.line,
        spoken: a ? a.explains : '',
        ...(a?.reanchor ? { reanchor: true } : {}),
      };
    }),
  };
  writeFileSync(existingPath, JSON.stringify(outObj, null, 1));
  console.log(`[author] ${id} wrote ${authored} moves (${repaired} repaired, ${dropped} dropped) -> ${existingPath}`);
  return { id, authored, repaired, dropped, rows: rows.length };
}

// CLI entry — run directly for one video.
if (import.meta.url === `file://${process.argv[1]}`) {
  // ⛔ DISABLED — LLM authoring was rejected (zero-LLM, hand-authored only;
  // David messages 51 + 147). Hand-author per docs/wo/WO-VOICED-AUTHORING.md.
  console.error('⛔ DISABLED: LLM authoring rejected. Hand-author per docs/wo/WO-VOICED-AUTHORING.md.');
  process.exit(1);
}

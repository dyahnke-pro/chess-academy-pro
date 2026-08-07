#!/usr/bin/env node
/**
 * bake-spoken-notes — rewrite every corpus note the coach can speak into
 * SPOKEN form, once, offline, so the runtime never phrases anything.
 *
 * David 2026-08-07: "I'm willing to pay the price this time if it means never
 * using it again for the coach tab."
 *
 * WHY OFFLINE. Rewording at runtime costs a 3-4s model call on the critical
 * path, which is the latency that keeps the coach from being heard at all. The
 * rewrite happens ONCE here, is gated before it is committed, and at runtime is
 * a Map lookup. That is the Tier-1 BAKED tier: verified final form, no runtime
 * reword.
 *
 * ── THE DISTINCTION THAT MAKES THIS CORRECT ─────────────────────────────────
 * Notes come in two kinds and they need OPPOSITE treatment:
 *
 *   ANCHORED (has lineSan)  — its squares are TRUE at its own position, and the
 *                             coach only speaks it when the live board IS that
 *                             position. Keep the geometry. Fix the register.
 *
 *   FLOATING (no lineSan)   — reached by concept or tactic tag, so it is spoken
 *                             over a board it was never written about. Its
 *                             squares are a FOREIGN example's. A skewer note
 *                             read "bishop d2 attacks the queen and knight …
 *                             rook to b1 skewers the queen" — real teaching,
 *                             and every square in it a lie on the live board.
 *                             The geometry must be GENERALIZED AWAY: teach the
 *                             pattern, name no square.
 *
 * Mixing those two up is how a true sentence becomes a false claim. The gate
 * below enforces the split: an anchored rewrite may only use squares the source
 * used; a floating rewrite may use NONE.
 *
 * Output: `public/data/corpus-spoken.json`, keyed by note id. Source corpora are
 * untouched, so provenance and the board-truth machinery keep reading the
 * original. Resumable — re-running skips ids already baked.
 *
 *   DEEPSEEK_KEY=… node scripts/bake-spoken-notes.mjs [--limit N] [--kind anchored|floating]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/data/corpus-spoken.json');

const CORPORA = [
  'src/data/danya-teachings.json',
  'src/data/chessbrah-teachings.json',
  'public/data/hangingpawns-teachings.json',
  'public/data/saintlouis-teachings.json',
];

const API_KEY = process.env.DEEPSEEK_KEY ?? process.env.VITE_DEEPSEEK_API_KEY ?? '';
const MODEL = 'deepseek-chat';
// 48, not 12. At 12 the full corpus was pacing for ~19 hours; the calls are
// tiny (110 max tokens) and almost entirely latency, so the fix is more of them
// in flight, not faster ones. Resumable, so a rate-limit wall costs one restart.
const CONCURRENCY = 48;

const SHARED = `You rewrite chess teaching notes so a coach can SPEAK them aloud.

SAY THE SAME THING. The idea is the author's — keep it. You are changing the
WORDS, not the chess. Never add a piece, a move, a tactic or an evaluation the
note does not state. Never add a number it does not state.

USE YOUR OWN WORDING. Never reuse a run of words from the note.

KEEP THE CHESS VOCABULARY. Spoken does not mean simplified. This is a chess
academy and the student is here to learn the language, so use the real terms:
tempo and tempi, initiative, prophylaxis, outpost, zugzwang, compensation, the
exchange, luft, fianchetto, overloaded, zwischenzug, minority attack, backward
pawn, opposition. If the note says "gives White tempi", the rewrite says tempi —
"hands the opponent free moves" is a downgrade, not a translation. Plain
language is for the SENTENCE SHAPE, never for the chess.

WRITTEN TO BE HEARD:
- ONE or TWO short sentences. Under 220 characters. This is spoken while a
  student waits, not read off a page.
- Present tense, idea first.
- No praise. No "I", no "we'll", no "let me". Never mention the app or buttons.
- Never write a move number ("2.Nc3", "3...d5") — it is read aloud as "two".
- Never write "..." before a move.

Reply with the rewritten sentence(s) and NOTHING else — no preamble, no quotes,
no labels, no explanation of what you did.`;

const ANCHORED_RULES = `${SHARED}

This note is anchored to the exact position given, and the coach speaks it ONLY
on that position, so its squares are true and you may keep them. Name pieces the
way a person speaks — "the knight on f3", "the queenside knight", "White's
e-pawn" — and mention at most two moves, only when a move IS the point.`;

const FLOATING_RULES = `${SHARED}

CRITICAL — THIS NOTE HAS NO POSITION. It is spoken whenever the PATTERN it
teaches appears, over a board it was never written about. So every square and
every specific move in it belongs to some other game and would be a LIE if
spoken here.

Write the pattern with NO squares and NO move names at all. Teach the shape:
which pieces, what they do to each other, what the opponent is forced into, and
what that wins.

  source: "Bishop d2 attacks the queen and knight simultaneously. The queen must
           move to b2 to protect the knight, after which rook to b1 skewers the
           queen and wins material."
  good:   "The bishop hits queen and knight at once. When the queen steps aside
           to defend, the rook lines up behind her and the skewer wins material."

  source: "Moving the queen to a5 to regain the pawn immediately gives White
           tempi and neglects development."
  good:   "The pawn is a gift, not a debt. Chasing it with the queen concedes
           tempi and leaves development undone."
  BAD:    "…hands the opponent free moves and leaves the rest of the army at
           home."  ← "tempi" and "development" were the right words; replacing
           them with plain English teaches the student less than the note did.

Never write a letter-and-number square (like e4 or d2), and never write a move
name (like Nf3 or Bxd5). If the idea cannot survive without them, reply with
exactly: CANNOT_GENERALIZE`;

// ── gates ────────────────────────────────────────────────────────────────────

const SAN = /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
const SQUARE = /\b[a-h][1-8]\b/g;
const MOVE_NUMBER = /\d{1,2}(?:\.|…|\.\.\.)(?=\s?(?:[NBRQKO]|[a-h][1-8x]))/;
const BANNED = ['great move', 'excellent', 'well done', 'nice job', 'click', 'tap ', 'button', 'let me', "i'll show"];
/** Model chatter that must never reach a student. The first attempt shipped a
 *  reply that literally contained "OFF_ANCHOR" and my gate passed it, because
 *  the gate only measured length. Reject any control token appearing inside
 *  prose — it means the model narrated its own decision. */
const CONTROL_LEAK = /(CANNOT_GENERALIZE|OFF_ANCHOR|as an ai|i cannot|here'?s the rewrite|rewritten:)/i;

const words = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

/** Longest run of words shared with the source. A shared 6-gram in prose this
 *  short is a lifted phrase, not coincidence. */
function longestSharedRun(source, out) {
  const a = words(source);
  const b = words(out);
  let longest = 0;
  for (let n = 3; n <= Math.min(a.length, b.length); n++) {
    const seen = new Set();
    for (let i = 0; i + n <= a.length; i++) seen.add(a.slice(i, i + n).join(' '));
    let hit = false;
    for (let i = 0; i + n <= b.length; i++) if (seen.has(b.slice(i, i + n).join(' '))) { hit = true; break; }
    if (!hit) break;
    longest = n;
  }
  return longest;
}

/** Returns a rejection reason, or null when the rewrite is clean. */
export function gateSpoken(source, out, kind) {
  const text = (out ?? '').trim();
  if (!text) return 'empty';
  if (CONTROL_LEAK.test(text)) return 'control token in prose';
  if (text.length > 260) return `too long (${text.length})`;
  if (MOVE_NUMBER.test(text)) return 'move-number prefix';
  if (/\.\.\.[a-hNBRQK]/.test(text)) return 'ellipsis move notation';
  const low = text.toLowerCase();
  for (const b of BANNED) if (low.includes(b)) return `banned phrase "${b.trim()}"`;

  SAN.lastIndex = 0;
  const sans = text.match(SAN) ?? [];
  const squares = text.match(SQUARE) ?? [];

  if (kind === 'floating') {
    // The whole point: a note with no position may name no geometry.
    if (squares.length > 0) return `floating note names square ${squares[0]}`;
    if (sans.length > 0) return `floating note names move ${sans[0]}`;
  } else {
    if (sans.length > 2) return `move dictation (${sans.length} moves)`;
    const srcSquares = new Set((source.match(SQUARE) ?? []).map((s) => s.toLowerCase()));
    for (const sq of squares) if (!srcSquares.has(sq.toLowerCase())) return `invented square ${sq}`;
  }

  const run = longestSharedRun(source, text);
  if (run >= 6) return `lifted ${run}-word phrase`;
  return null;
}

// ── the bake ─────────────────────────────────────────────────────────────────

function loadNotes() {
  const out = [];
  for (const rel of CORPORA) {
    const raw = JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
    for (const n of Array.isArray(raw) ? raw : raw.notes) {
      const explains = (n.explains ?? '').trim();
      if (!explains) continue;
      out.push({
        id: n.id,
        kind: n.lineSan?.length ? 'anchored' : 'floating',
        opening: n.opening ?? '',
        line: (n.lineSan ?? []).join(' '),
        explains,
      });
    }
  }
  return out;
}

async function rewrite(note, feedback) {
  const user =
    (note.kind === 'anchored'
      ? `Opening: ${note.opening || 'unknown'}\nPosition after: ${note.line}\n\n`
      : `Teaching idea (no position — it is spoken wherever the pattern appears)\n\n`) +
    `Note:\n${note.explains}` +
    (feedback ? `\n\nYour previous attempt was rejected: ${feedback}. Fix exactly that.` : '');
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 110,
      temperature: 0.85,
      messages: [
        { role: 'system', content: note.kind === 'anchored' ? ANCHORED_RULES : FLOATING_RULES },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`http ${res.status}`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? '').trim();
}

async function main() {
  if (!API_KEY) { console.error('DEEPSEEK_KEY not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const limit = Number(args[args.indexOf('--limit') + 1]) || 0;
  const kindOnly = args.includes('--kind') ? args[args.indexOf('--kind') + 1] : null;

  const baked = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  let notes = loadNotes().filter((n) => !baked[n.id]);
  if (kindOnly) notes = notes.filter((n) => n.kind === kindOnly);
  if (limit) notes = notes.slice(0, limit);

  console.log(`[bake] ${notes.length} to bake (${Object.keys(baked).length} already done)`);
  const stats = { ok: 0, ungeneralizable: 0, rejected: 0 };
  const why = new Map();
  let done = 0;

  const runOne = async (note) => {
    let feedback = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      let out;
      try { out = await rewrite(note, feedback); } catch { continue; }
      if (out === 'CANNOT_GENERALIZE') {
        // Honest outcome: the idea cannot be taught without its geometry, so it
        // is never spoken over a foreign board. Recorded, not forced.
        baked[note.id] = { unspeakable: 'needs-geometry' };
        stats.ungeneralizable += 1;
        return;
      }
      const reason = gateSpoken(note.explains, out, note.kind);
      if (!reason) { baked[note.id] = { spoken: out, kind: note.kind }; stats.ok += 1; return; }
      feedback = reason;
      if (attempt === 2) {
        const key = reason.replace(/\d+/g, 'N').replace(/ [a-h][1-8]$/, ' <sq>').replace(/ [A-Z][a-z0-9x+#=]+$/, ' <move>');
        why.set(key, (why.get(key) ?? 0) + 1);
        stats.rejected += 1;
      }
    }
  };

  for (let i = 0; i < notes.length; i += CONCURRENCY) {
    await Promise.all(notes.slice(i, i + CONCURRENCY).map(runOne));
    done += Math.min(CONCURRENCY, notes.length - i);
    if (done % 480 < CONCURRENCY || done === notes.length) {
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, JSON.stringify(baked));
      console.log(`[bake] ${done}/${notes.length} · ok=${stats.ok} needs-geometry=${stats.ungeneralizable} rejected=${stats.rejected}`);
    }
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(baked));
  console.log(`[bake] done — ${JSON.stringify(stats)}`);
  if (why.size > 0) {
    console.log('[bake] rejection reasons:');
    for (const [r, c] of [...why].sort((a, b) => b[1] - a[1])) console.log(`   ${String(c).padStart(5)}  ${r}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) void main();

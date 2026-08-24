// Verify a voiced video-narration file against its bank (recovered at 09120f6).
//
// HARD gates (exit 1 on any):
//   1. bank-fidelity  — every move's {ply,t,fen,line} equals the bank's exactly, same order/length.
//   2. no-verbatim    — `spoken` shares no >=8-word contiguous run with the bank's `said`
//                       (5-7 word run -> warning; auto-captions are noisy, so >=8 is a real lift).
//   3. move-number     — no "12.Nf3" / "3...d5" style prefixes in spoken (stats like "5 games" are safe).
//
// REVIEW report (never auto-fails — DNA narration plays lines out verbally, so `spoken`
// legitimately names squares/pieces in HYPOTHETICAL future lines that are empty on the
// CURRENT fen; a blind "named square == fen" gate false-positives on the gold reference).
//   - board-truth WARN: a CURRENT-occupancy claim ("the d4-knight", "knight on g4") that
//     mismatches the fen AND sits in a sentence with no hypothetical marker -> read closely.
//   - board-truth REVIEW: every square the prose names + the fen occupant, for a human eye.
//   - praise words.
//
// Board-truth is ultimately enforced by human review of the WARN/REVIEW output (this is how
// the gold reference was verified); the report focuses that review on the load-bearing claims.
//
// Usage:  node scripts/danya-corpus/verify-voiced.mjs <id> [<id> ...]
//         node scripts/danya-corpus/verify-voiced.mjs --all
//         SHOW_REVIEWS=1 node ...   (dump every square-occupant line)
import { Chess } from 'chess.js';
import fs from 'node:fs';
import path from 'node:path';

const BANK_DIR = 'data/video-narration';
const VOICED_DIR = 'data/video-narration-voiced';

const PIECE_WORDS = { bishop: 'b', knight: 'n', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
const PIECE_RE = 'bishops?|knights?|rooks?|queens?|kings?|pawns?';
const SQ = '[a-h][1-8]';
const HYPO = /\b(if|would|could|were|instead|tempting|error|imagine|suppose|say|snatch\w*|hanging|leap\w*|swing\w*|jump\w*|drop\w*|comes? back|can'?t|cannot|after|threat\w*|ready|readies|wants? to|aim\w*|heading|head for|plan\w*|will |about to|once |the moment|recalculat\w*|come[s]? to|go(es)? to|reroute\w*|next|then )/i;
const PRAISE = /\b(great job|great move|excellent|well done|nice job|good job|bravo|fantastic move|beautiful move|amazing move|superb)\b/i;
const MOVENUM = /\b\d{1,2}\s*(?:\.\.\.|\.)\s*(?:[NBRQKO]|[a-h][1-8x])/;

function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean); }
function longestSharedRun(a, b) {
  const aw = norm(a), bw = norm(b);
  if (aw.length < 4 || bw.length < 4) return 0;
  const bgrams = (n) => { const s = new Set(); for (let i = 0; i + n <= bw.length; i++) s.add(bw.slice(i, i + n).join(' ')); return s; };
  for (let n = Math.min(aw.length, bw.length); n >= 4; n--) {
    const g = bgrams(n);
    for (let i = 0; i + n <= aw.length; i++) if (g.has(aw.slice(i, i + n).join(' '))) return n;
  }
  return 0;
}
function occ(chess, sq) { const p = chess.get(sq); return p ? p.type : null; }
function sentenceAround(text, idx) {
  let start = idx, end = idx;
  while (start > 0 && !'.;:'.includes(text[start - 1])) start--;
  while (end < text.length && !'.;:'.includes(text[end])) end++;
  return text.slice(start, end);
}

function boardTruth(spoken, fen) {
  const chess = new Chess(fen);
  const warns = [], review = [];
  const named = new Set();
  const push = (re, kind) => {
    let m;
    while ((m = re.exec(spoken))) {
      let piece, sq;
      if (kind === 'sqPiece') { sq = m[1].toLowerCase(); piece = PIECE_WORDS[m[2].toLowerCase().replace(/s$/, '')]; }
      else { piece = PIECE_WORDS[m[1].toLowerCase().replace(/s$/, '')]; sq = m[2].toLowerCase(); }
      named.add(sq);
      const got = occ(chess, sq);
      if (got !== piece) {
        const sent = sentenceAround(spoken, m.index);
        if (!HYPO.test(sent)) warns.push(`current-claim "${m[0]}" but ${sq} holds ${got || 'nothing'} (expected ${piece}) — sentence not hypothetical`);
      }
    }
  };
  push(new RegExp(`\\b(${SQ})[-\\s](${PIECE_RE})\\b`, 'gi'), 'sqPiece');   // "d4-knight", "d4 knight"
  push(new RegExp(`\\b(${PIECE_RE})\\s+on\\s+(${SQ})\\b`, 'gi'), 'pieceSq'); // "knight on g4"
  for (const s of (spoken.match(new RegExp(SQ, 'gi')) || [])) {
    const sq = s.toLowerCase();
    review.push(`${sq}=${occ(chess, sq) || 'empty'}`);
  }
  return { warns, review };
}

function verifyOne(id) {
  const bankPath = path.join(BANK_DIR, `${id}.json`);
  const voicedPath = path.join(VOICED_DIR, `${id}.json`);
  const res = { id, ok: true, errors: [], warnings: [], reviews: [], narrated: 0 };
  if (!fs.existsSync(bankPath)) { res.ok = false; res.errors.push(`bank missing (recover from 09120f6): ${bankPath}`); return res; }
  if (!fs.existsSync(voicedPath)) { res.ok = false; res.errors.push(`voiced missing: ${voicedPath}`); return res; }
  const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  const voiced = JSON.parse(fs.readFileSync(voicedPath, 'utf8'));
  const bMoves = bank.moves || bank;
  const vMoves = voiced.moves || [];

  for (const f of ['videoId', 'openingName', 'voice', 'source', 'moves']) if (!(f in voiced)) res.errors.push(`missing field: ${f}`);
  if (voiced.videoId && voiced.videoId !== id) res.errors.push(`videoId ${voiced.videoId} != ${id}`);
  if (voiced.voice && voiced.voice !== 'danya-dna') res.warnings.push(`voice="${voiced.voice}" (expected danya-dna)`);

  if (vMoves.length !== bMoves.length) res.errors.push(`move count ${vMoves.length} != bank ${bMoves.length}`);
  const n = Math.min(vMoves.length, bMoves.length);
  for (let i = 0; i < n; i++) {
    const b = bMoves[i], v = vMoves[i];
    if (b.ply !== v.ply) res.errors.push(`[${i}] ply ${v.ply} != ${b.ply}`);
    if (b.t !== v.t) res.errors.push(`[${i}] t ${v.t} != ${b.t}`);
    if (b.fen !== v.fen) res.errors.push(`[${i}] fen mismatch`);
    if (JSON.stringify(b.line || []) !== JSON.stringify(v.line || [])) res.errors.push(`[${i}] line ${JSON.stringify(v.line)} != ${JSON.stringify(b.line)}`);
  }

  for (let i = 0; i < vMoves.length; i++) {
    const v = vMoves[i];
    const spoken = (v.spoken || '').trim();
    if (!spoken) continue;
    res.narrated++;
    const said = (bMoves[i] && bMoves[i].said) || '';
    const run = longestSharedRun(spoken, said);
    if (run >= 8) res.errors.push(`[${i} ply${v.ply}] VERBATIM: ${run}-word run shared with said`);
    else if (run >= 5) res.warnings.push(`[${i} ply${v.ply}] ${run}-word run shared with said (check idiom vs lift)`);
    if (MOVENUM.test(spoken)) res.errors.push(`[${i} ply${v.ply}] move-number prefix in spoken`);
    if (PRAISE.test(spoken)) res.warnings.push(`[${i} ply${v.ply}] praise word`);
    if (!v.fen) { res.errors.push(`[${i}] narrated beat missing fen`); continue; }
    let bt; try { bt = boardTruth(spoken, v.fen); } catch (e) { res.errors.push(`[${i} ply${v.ply}] fen parse: ${e.message}`); continue; }
    for (const w of bt.warns) res.warnings.push(`[${i} ply${v.ply}] BOARD-TRUTH? ${w}`);
    res.reviews.push(`[${i} ply${v.ply}] sq: ${bt.review.join(' ')} | "${spoken.slice(0, 80)}${spoken.length > 80 ? '…' : ''}"`);
  }
  res.ok = res.errors.length === 0;
  return res;
}

const args = process.argv.slice(2);
let ids = args;
if (args[0] === '--all') ids = fs.readdirSync(VOICED_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
const showReviews = process.env.SHOW_REVIEWS === '1';
let anyFail = false;
for (const id of ids) {
  const r = verifyOne(id);
  console.log(`\n${r.ok ? 'PASS' : 'FAIL'}  ${id}  (${r.narrated} narrated)`);
  for (const e of r.errors) console.log('   ERROR  ' + e);
  for (const w of r.warnings) console.log('   warn   ' + w);
  if (showReviews) for (const rv of r.reviews) console.log('   review ' + rv);
  if (!r.ok) anyFail = true;
}
console.log('');
process.exit(anyFail ? 1 : 0);

#!/usr/bin/env node
/**
 * danya-viewer-questions — the questions Danya's viewers asked during his
 * speedruns, each placed on the board it was asked about, with his answer
 * (David 2026-11-17: "Ask the questions Danya's viewers asked during the speed
 * runs. See if our coach can produce answers similar to his").
 *
 * The transcripts carry no board, so the board is found in code:
 *   1. the video's games come from its voiced notes (`vc-…`, ordered, each a
 *      `lineSan` prefix of the game);
 *   2. the moves he SAYS ("knight c2", "takes on e5", "castles") are lined up
 *      monotonically against the game's moves (a spoken move counts only when
 *      it is one of the next few game moves — a variation he analyses does not
 *      move the anchor);
 *   3. a viewer question ("<name> asks …", "question from …") sits at the board
 *      of the last anchored move before it;
 *   4. the move the question names must be LEGAL on that board (or a ply
 *      either side), or the question is dropped — nothing is placed by guess.
 *
 *   node scripts/danya-viewer-questions.mjs [vttDir] > audit-reports/.danya-viewer-questions.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const VTT = process.argv[2] ?? '/home/user/danya-full/vtt';
const raw = JSON.parse(fs.readFileSync('public/data/voiced-teachings.json', 'utf8'));
const notes = Array.isArray(raw) ? raw : (raw.notes ?? raw.teachings ?? Object.values(raw)[0]);
const byVideo = new Map();
const seatVotes = new Map();
for (const n of notes) {
  const yt = (n.sources ?? []).find((s) => s.startsWith('yt:'))?.slice(3);
  if (!yt || !Array.isArray(n.lineSan) || !n.lineSan.length) continue;
  if (!byVideo.has(yt)) byVideo.set(yt, []);
  byVideo.get(yt).push(n.lineSan);
  if (n.studentSide) { const c = seatVotes.get(yt) ?? { white: 0, black: 0 }; c[n.studentSide] += 1; seatVotes.set(yt, c); }
}
/** The games of a video: every line not a prefix of a longer one. */
function gamesOf(lines) {
  const key = (l) => l.join(' ');
  const all = [...new Set(lines.map(key))].sort((a, b) => b.length - a.length);
  const out = [];
  for (const l of all) if (!out.some((g) => g === l || g.startsWith(`${l} `))) out.push(l);
  return out.map((s) => s.split(' ')).filter((g) => g.length >= 10);
}

function readVtt(file) {
  const lines = [];
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const l = raw.replace(/<[^>]+>/g, '').trim();
    if (!l || l.includes('-->') || /^(WEBVTT|Kind:|Language:)/.test(l)) continue;
    if (lines.length && lines[lines.length - 1] === l) continue;
    lines.push(l);
  }
  return lines.join(' ').replace(/\s+/g, ' ');
}

const PIECE = { knight: 'N', horse: 'N', night: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K' };
const SQ = '([a-h])\\s?([1-8])\\b';
/** Spoken moves in order: {at, piece ('' pawn), to, castle?}. */
function spokenMoves(text) {
  const out = [];
  const re = new RegExp(`\\b(?:(knight|horse|night|bishop|rook|queen|king)\\s+(?:takes\\s+(?:on\\s+)?|to\\s+)?|(?:takes\\s+(?:on\\s+)?))?${SQ}|\\b(castles?|castling)\\b`, 'gi');
  for (const m of text.matchAll(re)) {
    if (m[4]) { out.push({ at: m.index, castle: true }); continue; }
    out.push({ at: m.index, piece: m[1] ? PIECE[m[1].toLowerCase()] : null, to: `${m[2].toLowerCase()}${m[3]}` });
  }
  return out;
}
const matches = (sp, san) => {
  const s = san.replace(/[+#]$/, '');
  if (sp.castle) return s.startsWith('O-O');
  if (!s.includes(sp.to)) return false;
  if (sp.piece === null) return true;
  return s[0] === sp.piece;
};

/** Monotonic anchors: [{at, ply}] — ply = index of the game move said there. */
function anchors(text, game) {
  const out = [];
  let p = 0;
  for (const sp of spokenMoves(text)) {
    for (let k = p; k < Math.min(game.length, p + 4); k += 1) {
      if (matches(sp, game[k])) { out.push({ at: sp.at, ply: k }); p = k + 1; break; }
    }
  }
  return out;
}

/** A spoken move in a question → SAN, if legal on the board. */
function sanOn(fen, words) {
  const c = new Chess(fen);
  const re = new RegExp(`\\b(?:(knight|horse|night|bishop|rook|queen|king)\\s+(?:takes\\s+(?:on\\s+)?|to\\s+)?)?${SQ}`, 'gi');
  const found = [];
  for (const m of words.matchAll(re)) {
    const piece = m[1] ? PIECE[m[1].toLowerCase()] : null;
    const to = `${m[2].toLowerCase()}${m[3]}`;
    const legal = c.moves({ verbose: true }).filter((mv) => mv.to === to && (piece ? mv.piece.toUpperCase() === piece : mv.piece === 'p'));
    if (legal.length === 1) found.push(legal[0].san);
  }
  return found;
}
const fenAt = (game, ply) => { const c = new Chess(); for (let i = 0; i < ply; i += 1) c.move(game[i]); return c.fen(); };

const Q = /\b((?:[A-Z][\w]*\s){0,3}[\w]+\s+asks|a question from\s+[\w ]{1,25}|question from\s+[\w ]{1,25}|(?:is|are) asking)\b,?\s*:?\s*["“]?/g;
/** A bare question about a move: how most chat questions are read out. */
const BARE = /\b(why not|what if|what about|should we (?:play|take on|go))\s+(?:((?:he|they|white|black|we|i|our opponent))\s+(?:plays?|goes|takes(?:\s+on)?)\s+)?((?:(?:knight|horse|night|bishop|rook|queen|king)\s+(?:takes\s+(?:on\s+)?|to\s+)?|takes\s+(?:on\s+)?)?[a-h]\s?[1-8])\b/gi;
const ASK = { 'why not': (san) => `Why not ${san}?`, 'what if': (san) => `What if I play ${san}?`, 'what about': (san) => `What about ${san}?` };
const results = [];
let videos = 0; let asked = 0;
for (const file of fs.readdirSync(VTT).filter((f) => f.endsWith('.vtt'))) {
  const id = file.replace(/\.en\.vtt$/, '');
  const games = gamesOf(byVideo.get(id) ?? []);
  if (!games.length) continue;
  videos += 1;
  const v = seatVotes.get(id); const seat = v ? (v.white >= v.black ? 'w' : 'b') : null;
  const text = readVtt(path.join(VTT, file));
  const per = games.map((g) => ({ game: g, an: anchors(text, g) })).filter((x) => x.an.length >= 6);
  const marks = [...[...text.matchAll(Q)].map((m) => ({ index: m.index, len: m[0].length, who: m[1].trim(), kind: 'read-off-chat' })),
    ...[...text.matchAll(BARE)].map((m) => ({ index: m.index, len: m[0].length, who: '', kind: 'bare', form: m[1].toLowerCase(), actor: (m[2] ?? '').toLowerCase(), moveWords: m[3] }))]
    .sort((a, b) => a.index - b.index)
    .filter((m, i, a) => !(m.kind === 'bare' && a.some((o) => o.kind === 'read-off-chat' && m.index > o.index && m.index - o.index < 200)));
  for (const m of marks) {
    asked += 1;
    const qStart = m.index + m.len;
    const question = m.kind === 'bare' ? m.moveWords : text.slice(qStart, qStart + 220).split(/(?<=\?)/)[0];
    if (m.kind !== 'bare' && !question.includes('?') && !/^(why|what|how|should|can|could|is|isn|would|did|do|does|when|where)\b/i.test(question)) continue;
    // The game whose anchors bracket this point, and the last anchor before it.
    let best = null;
    for (const x of per) {
      const before = x.an.filter((a) => a.at < m.index);
      if (!before.length) continue;
      const last = before[before.length - 1];
      if (m.index - last.at > 1500) continue;
      if (!best || last.at > best.last.at) best = { ...x, last };
    }
    if (!best) continue;
    const answer = text.slice(m.kind === 'bare' ? qStart : qStart + question.length).slice(0, 600);
    // The board: after the last move said, or a ply either side, where the
    // question's move is legal.
    for (const d of [1, 0, 2, -1]) {
      const ply = best.last.ply + d;
      if (ply < 1 || ply > best.game.length) continue;
      const fen = fenAt(best.game, ply);
      if (m.kind === 'bare' && seat) {
        // Whose move the question weighs: his own ("why not", "should we",
        // "what about", "what if we") or theirs ("what if he plays").
        const theirs = m.form === 'what if' && /he|they|white|black|opponent/.test(m.actor) && !(m.actor === 'white' && seat === 'w') && !(m.actor === 'black' && seat === 'b');
        const mover = fen.split(' ')[1];
        if ((theirs ? mover === seat : mover !== seat)) continue;
      }
      const sans = sanOn(fen, question);
      if (!sans.length) continue;
      if (m.kind === 'bare' && sans.length !== 1) continue;
      const ask = m.kind === 'bare'
        ? (m.form.startsWith('should') ? `Should I play ${sans[0]}?` : (m.form === 'what if' && fen.split(' ')[1] !== seat ? `What if they play ${sans[0]}?` : ASK[m.form](sans[0])))
        : question.trim();
      results.push({ video: id, kind: m.kind, who: m.who, ply, fen, said: m.kind === 'bare' ? text.slice(m.index, m.index + m.len) : question.trim(), question: ask, sans, answer: answer.trim(), gameTo: best.game.slice(Math.max(0, ply - 4), ply).join(' ') });
      break;
    }
  }
}
process.stderr.write(`videos with games ${videos}, question markers ${asked}, placed on a board ${results.length}\n`);
process.stdout.write(JSON.stringify(results, null, 2));

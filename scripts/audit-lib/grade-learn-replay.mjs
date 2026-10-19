#!/usr/bin/env node
// GRADE A LEARN REPLAY AGAINST THE BOARD (David 2026-10-19: "make sure you are
// looking for ANY AND ALL errors. you need to have full context of what SHOULD
// be happening on that board!"). Reads the JSON `audit-learn-replay.mjs`
// writes and, for every student turn:
//   - replays the game to the position the coach spoke about;
//   - asks Stockfish (depth 16) what the position IS: eval before and after
//     the student's move, after the reply, the best move, the swing;
//   - checks every "your/their <piece> on <sq>" claim against the board and
//     the seat (whose piece it really is);
//   - checks every named SAN move is legal somewhere it could be meant;
//   - flags what SHOULD have been said and was not: a swing >= 150cp on the
//     student's move with no verdict line, a reply that hangs >= 3 points with
//     no line about it, a forced mate either way never named;
//   - flags duplicates (the SAN and spoken copies are collapsed first) and
//     turns over the 80-word Learn average.
// Usage: node scripts/audit-lib/grade-learn-replay.mjs <replay.json> [--depth 16]
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const DEPTH = Number(args[args.indexOf('--depth') + 1]) || 16;
if (!file) { console.error('usage: grade-learn-replay.mjs <replay.json>'); process.exit(1); }
const rep = JSON.parse(readFileSync(file, 'utf8'));
const drop = JSON.parse(readFileSync(process.env.AUDIT_FIXTURE ?? 'audit-reports/.fixtures/data-drop-david.json', 'utf8'));
const game = drop.stores.games.find((g) => g.id === rep.game);
const full = new Chess(); full.loadPgn(game.pgn);
const sans = full.history();
const seat = rep.seat === 'black' ? 'b' : 'w';

// ── engine ──
const sf = spawn('/usr/games/stockfish');
let buf = ''; const waiters = [];
sf.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); for (const w of [...waiters]) w(l); } });
const send = (s) => sf.stdin.write(`${s}\n`);
send('uci'); send('setoption name Threads value 2'); send('isready');
send('setoption name MultiPV value 2');
async function evalFen(fen) {
  return new Promise((res) => {
    const byPv = {};
    const on = (l) => {
      if (l.startsWith('info') && l.includes(' pv ')) {
        const m = / multipv (\d+) .*score (cp|mate) (-?\d+)/.exec(l);
        if (m) byPv[m[1]] = { score: m[2] === 'cp' ? Number(m[3]) : null, mate: m[2] === 'mate' ? Number(m[3]) : null, pv: l.split(' pv ')[1].trim().split(' ') };
      }
      if (l.startsWith('bestmove')) {
        waiters.splice(waiters.indexOf(on), 1);
        const a = byPv['1'] ?? { score: null, mate: null, pv: [] };
        res({ ...a, best: l.split(' ')[1], second: byPv['2'] ?? null });
      }
    };
    waiters.push(on);
    send(`position fen ${fen}`); send(`go depth ${DEPTH}`);
  });
}
// White-POV centipawns (mate = ±10000).
const whiteCp = (fen, e) => {
  const side = fen.split(' ')[1];
  const v = e.mate != null ? (e.mate > 0 ? 10000 : -10000) : e.score ?? 0;
  return side === 'w' ? v : -v;
};
const studentCp = (cp) => (seat === 'w' ? cp : -cp);
const uciToSan = (fen, uci) => { try { const c = new Chess(fen); return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return uci; } };

// ── claims ──
const PIECE = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const CLAIM = /\b(your|their)\s+(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;
// A board a sentence could be about: before the move, after it, after the reply.
function checkClaims(text, boards) {
  const out = [];
  for (const m of text.matchAll(CLAIM)) {
    const whose = m[1].toLowerCase(); const type = PIECE[m[2].toLowerCase()]; const sq = m[3];
    const color = whose === 'your' ? seat : (seat === 'w' ? 'b' : 'w');
    const holds = boards.some((f) => { const p = new Chess(f).get(sq); return p && p.type === type && p.color === color; });
    if (!holds) {
      const seatFlip = boards.some((f) => { const p = new Chess(f).get(sq); return p && p.type === type && p.color !== color; });
      out.push(`${seatFlip ? 'SEAT' : 'FALSE'}: "${m[0]}"`);
    }
  }
  return out;
}
const SAN_RE = /\b(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?/g;
// A named LINE ("Nhf6+, exf6 and Nxf6+") is legal move by move: a move counts
// as playable when it follows the moves named before it in the same sentence.
function lineLegal(sentence, boards) {
  const sans = (sentence.match(SAN_RE) ?? []).map((r) => r.replace(/[+#]$/, '')).filter((x) => !/^[a-h][1-8]$/.test(x));
  const ok = new Set();
  for (const f of boards) {
    for (let start = 0; start < sans.length; start++) {
      try { const c = new Chess(f); for (let k = start; k < sans.length; k++) { c.move(sans[k]); ok.add(sans[k]); } } catch { /* the line stops here */ }
    }
  }
  return ok;
}
function checkSans(text, boards) {
  const bad = [];
  const inLines = new Set(text.split(/(?<=[.!?])\s+/).flatMap((sen) => [...lineLegal(sen, boards)]));
  for (const raw of text.match(SAN_RE) ?? []) {
    if (inLines.has(raw.replace(/[+#]$/, ''))) continue;
    const san = raw.replace(/[+#]$/, '');
    if (/^[a-h][1-8]$/.test(san)) continue; // a bare square is usually a square, not a pawn move
    const legalSomewhere = boards.some((f) => { try { const c = new Chess(f); c.move(san); return true; } catch { /* next */ }
      try { const c = new Chess(f); const parts = f.split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-'; c.load(parts.join(' ')); c.move(san); return true; } catch { return false; } });
    if (!legalSomewhere) bad.push(`ILLEGAL/UNPLAYABLE move named: ${raw}`);
  }
  return bad;
}
// Collapse the SAN copy and the spoken copy of one line.
const norm = (t) => t.toLowerCase().replace(/pawn to |knight to |bishop to |rook to |queen to |king to |takes |castles? (kingside|queenside)/g, '').replace(/[^a-z0-9]/g, '');
const words = (t) => t.split(/\s+/).filter(Boolean).length;

const report = [];
const c = new Chess();
const boardsAt = [c.fen()];
for (const s of sans) { c.move(s); boardsAt.push(c.fen()); }

for (const t of rep.turns) {
  const m = /^(\d+)(\.|\.\.\.)(.+)$/.exec(t.move);
  const moveNo = Number(m[1]); const ply = (moveNo - 1) * 2 + (seat === 'w' ? 0 : 1);
  const before = boardsAt[ply]; const after = boardsAt[ply + 1]; const afterReply = boardsAt[ply + 2] ?? after;
  const [eb, ea, er] = [await evalFen(before), await evalFen(after), await evalFen(afterReply)];
  const sb = studentCp(whiteCp(before, eb)); const sa = studentCp(whiteCp(after, ea)); const sr = studentCp(whiteCp(afterReply, er));
  const lost = sb - sa; const replyGift = sr - sa; // reply's cost to them = student gain
  const bestSan = uciToSan(before, eb.best);
  const lines = []; const seen = new Set();
  for (const l of t.lines) {
    if (/^Got it — after your move/.test(l)) continue; // the replay's own dictation
    const k = norm(l); if (seen.has(k)) continue; seen.add(k); lines.push(l);
  }
  const text = lines.join(' ');
  const flags = [];
  const boards = [before, after, afterReply];
  for (const l of lines) { flags.push(...checkClaims(l, boards)); flags.push(...checkSans(l, boards)); }
  const dupes = t.lines.length - lines.length - t.lines.filter((l) => /^Got it/.test(l)).length;
  const w = words(text);
  if (w > 80) flags.push(`LONG: ${w} words`);
  const verdictSaid = /mistake|blunder|inaccura|cost|gave|hangs?|loses?|drops?|left .* (loose|undefended)|was a slip/i.test(text);
  if (lost >= 150 && Math.abs(sb) < 600 && !verdictSaid) flags.push(`MISSED VERDICT: ${t.move} lost ${lost}cp (best ${bestSan}) and no line said so`);
  if (lost < 50 && /mistake|blunder/i.test(text) && !/their|they/i.test(text.split(/mistake|blunder/i)[0].slice(-60))) flags.push(`FALSE VERDICT?: called a mistake but cost ${lost}cp`);
  if (replyGift >= 300 && Math.abs(sa) < 600 && !/hang|win|free|take|loose|undefended|punish|slip/i.test(text)) flags.push(`MISSED OPPORTUNITY: their ${t.reply} gave ${replyGift}cp and no line pointed at it`);
  if (er.mate != null && studentCp(whiteCp(afterReply, er)) > 0 && Math.abs(er.mate) <= 5 && !/mate/i.test(text)) flags.push(`MISSED MATE: forced mate in ${Math.abs(er.mate)} for the student, never named`);
  if (er.mate != null && studentCp(whiteCp(afterReply, er)) < 0 && Math.abs(er.mate) <= 5 && !/mate/i.test(text)) flags.push(`MISSED DANGER: they have mate in ${Math.abs(er.mate)}, never named`);
  // "The only move" is checked against the engine's second line at the board
  // the student moved on: true when the second best falls a band below.
  if (/only move|the one move/i.test(text)) {
    const s2 = eb.second ? studentCp(whiteCp(before, eb.second)) : null;
    if (s2 !== null && sb - s2 < 150) flags.push(`FALSE ONLY-MOVE: second best ${eb.second ? uciToSan(before, eb.second.pv[0]) : '?'} is ${s2} vs ${sb}`);
  }
  report.push({ move: t.move, reply: t.reply, eval: { before: sb, after: sa, afterReply: sr }, lost, replyGift, best: bestSan, words: w, dupes, replyMs: t.replyMs, lines, flags });
  console.log(`\n${t.move} → ${t.reply ?? '-'}  [${sb}→${sa}→${sr}] lost=${lost} best=${bestSan} ${w}w ${t.replyMs ?? '?'}ms`);
  for (const l of lines) console.log(`   • ${l}`);
  for (const f of flags) console.log(`   ✗ ${f}`);
}
sf.kill();
const out = file.replace(/\.json$/, '.graded.json');
writeFileSync(out, JSON.stringify(report, null, 2));
const all = report.flatMap((r) => r.flags);
const by = {}; for (const f of all) { const k = f.split(':')[0]; by[k] = (by[k] ?? 0) + 1; }
console.log(`\n${report.length} turns, ${all.length} flags:`, by, `avg words ${Math.round(report.reduce((n, r) => n + r.words, 0) / report.length)}`);
console.log(`→ ${out}`);

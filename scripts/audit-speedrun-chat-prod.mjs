#!/usr/bin/env node
/**
 * audit-speedrun-chat-prod — CAN THE COMPUTERS ANSWER ABOUT THEIR OWN
 * CALCULATIONS? (WO-SPEEDRUN-01 S6, David 2026-11-17: "Make sure you ask
 * questions about the position in your audit. The questions should revolve
 * around the build. Ie make sure the computers can answer questions about
 * their calculations" — and "I don't want chat limited for beginners …
 * if they ask a complex question about a deep line, coach should reply with
 * the appropriate answer.")
 *
 * Twelve real boards from Danya's speedruns, one per computer WO-SPEEDRUN-01
 * built or wired. On each, the chat is asked about the move the computer
 * reads, and the answer must carry THAT computer's calculation (the words its
 * wired test holds). Then the deep question — "calculate the line" — must be
 * answered with the line itself: a fresh audit device has an empty record,
 * so the coach reads it as a beginner (the cold-start prior), and a beginner
 * still gets the full answer.
 *
 * Muted (hand driver). Reads the page text and the door's `chat-turn` row.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-speedrun-chat-prod.mjs [--only=qf3,bg4,…]
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import { STOCK } from './audit-lib/chat-replay-cases.mjs';
import { boardQuestions, formFails } from './audit-lib/viewer-question-forms.mjs';

const PORT = Number(process.env.HAND_PORT ?? 7793);
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const base = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The boards: FEN, the move the computer reads, the computer, and what its
 *  calculation says (the words its wired test holds). */
const BOARDS = [
  { id: 'qf3', computer: 'king-group read (wins a pawn)', fen: 'r3r1k1/pbpq1ppp/1nNbpn2/1P1pB3/3P4/2NBP2P/PP3PP1/R2QK2R w KQ - 9 13', san: 'Qf3',
    asks: [{ q: 'What does Qf3 do here?', want: /f6.*wins a pawn|wins a pawn.*f6/i },
      { q: 'Why does taking on f6 win a pawn after Qf3?', want: /f6|g7|pawn/i }] },
  { id: 'bg4', computer: 'queenNet (no safe square)', fen: 'rnbq1rk1/pp3pp1/2pb1n1p/4p3/4p3/1BN4N/PPPP1PPP/R1BQKR2 b Q - 1 9', san: 'Bg4',
    asks: [{ q: 'What does Bg4 do?', want: /queen on d1.*(?:no safe square|nowhere to run)|queen.*(?:no safe square|nowhere to (?:run|go))/i },
      { q: 'Where can their queen go after Bg4?', want: /queen/i }] },
  { id: 'qa6', computer: 'outOfReach (why that square)', fen: 'r2r2k1/p1p1qppp/1nP1p3/4P3/2Q5/2N1P2P/PP3PP1/R2R2K1 w - - 3 21', san: 'Qa6',
    asks: [{ q: 'Why is a6 the right square for the queen?', want: /knight on b6 was already hitting it|b6/i },
      { q: 'Why not leave the queen on c4?', want: /b6|knight/i }] },
  { id: 'be2', computer: 'poisonedPiece (Bxh5+ Rxh5 Qxh5)', fen: 'rnbqkbnr/ppppp3/5p2/6Bp/3PP3/8/PPP2PPP/RN1QKBNR w KQkq - 0 4', san: 'Be2',
    asks: [{ q: 'What does Be2 do?', want: /Bxh5\+?.*Rxh5.*Qxh5|h5/i },
      { q: 'What happens if they take my bishop on g5 after Be2?', want: /Bxh5|h5|mate/i }] },
  { id: 'bh3', computer: 'everyMate (the mate and the escape)', fen: 'rn4k1/pp6/2p1b1pp/3p4/3Pp3/2N1P1b1/PPP4q/R1BQ1K2 b - - 1 19', san: 'Bh3#',
    asks: [{ q: 'Why is Bh3 mate?', want: /Qf2|f2|mate/i },
      { q: 'Is there another mate here besides Bh3?', want: /Qf2|mate/i }] },
  { id: 'rc6', computer: 'pinnedPawnGuard (the pinned pawn guards nothing)', fen: '3qkr2/p2n1p2/1p2pP2/3pNp1Q/1P1P4/P6P/5PP1/2R3K1 w - - 1 27', san: 'Rc6',
    asks: [{ q: 'What does Rc6 do?', want: /e6|f7|pin/i },
      { q: 'Why can the pawn on f7 not take back after Rc6?', want: /pin|king|f7/i }] },
  { id: 'bh6', computer: 'chainBase (the base of the chain)', fen: 'r3kb1r/1p3p2/2n3b1/1p2P2p/2p2p1P/P1P1pP2/1P2N1P1/RN2KB1R b KQkq - 1 18', san: 'Bh6',
    asks: [{ q: 'What does Bh6 do?', want: /dark-squared bishop|base|chain|e3|f4/i },
      { q: 'Which pawn holds their chain together?', want: /e3|f4|base|pawn/i }] },
  { id: 'c3', computer: 'pawnCutsGuard (the pawn cuts the guard)', fen: 'r2q1rk1/pp3pbp/3p1np1/N3pb2/2p5/4B3/PP1QPPPP/R3KB1R b KQ - 1 13', san: 'c3',
    asks: [{ q: 'What does c3 do?', want: /knight on a5|queen on d2|a5/i },
      { q: 'Why is their knight on a5 in trouble after c3?', want: /a5|queen|guard/i }] },
  { id: 'nd4', computer: 'queenNet (Nd4 covers e6)', fen: 'r1b1k2r/pppp1ppp/7n/4P3/1B2P3/5N2/q1P2PPP/1R1QKB1R w Kkq - 1 12', san: 'Nd4',
    asks: [{ q: 'What does Nd4 do?', want: /covers e6|e6|queen/i },
      { q: 'Where can their queen on a2 go after Nd4?', want: /a4|queen|a2/i }] },
  { id: 'ne7', computer: 'bothSaved (both pieces saved)', fen: '2R2b1r/r2k1p1p/1p1qpP2/3N1p2/p2P2P1/4BQ1P/P4R2/6K1 w - - 1 27', san: 'Ne7',
    asks: [{ q: 'What does Ne7 do?', want: /guard|rook|check|e7/i },
      { q: 'Is my rook on c8 safe after Ne7?', want: /rook|c8|guard/i }] },
  { id: 'e4', computer: 'pieceCage (the square taken from the knight)', fen: '2k5/p4ppp/NnP1p3/4P3/8/1P2P2P/P4PP1/6K1 w - - 3 32', san: 'e4',
    asks: [{ q: 'What does e4 do?', want: /takes d5 from their knight on b6|d5/i },
      { q: 'Where can their knight on b6 go after e4?', want: /b6|knight|d5|a8|c4|d7|a4|c8/i }] },
  { id: 'ne4', computer: 'opensCheck (the queen gets h4)', fen: 'rn1q1rk1/pp6/2pbbnpp/3p1p2/3P4/2N1PB2/PPP3PP/R1BQK2R b KQ - 0 13', san: 'Ne4',
    asks: [{ q: 'What does Ne4 do?', want: /h4/i },
      { q: 'What if they take on e4 after Ne4?', want: /h4|Qh4|check/i }] },
];

/** SANs (legal moves of a line) in the answer — the deep question's check. */
const sanTokens = (a) => (a.match(/\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?/g) ?? []);

const driver = spawn(process.execPath, ['scripts/audit-lib/hand-driver.mjs'], {
  env: { ...process.env, HAND_PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('hand driver did not start in 90s')), 90_000);
  driver.stdout.on('data', (b) => { if (String(b).includes('hand-driver on')) { clearTimeout(t); resolve(); } });
  driver.on('exit', (code) => reject(new Error(`hand driver exited ${code}`)));
});
const get = async (p, body) => (await fetch(`${base}${p}`, body === undefined ? {} : { method: 'POST', body })).json();
const js = (code) => get('/js', code);
const pageLines = async () => { const t = await js('return document.body.innerText'); return typeof t === 'string' ? t.split('\n').map((l) => l.trim()).filter(Boolean) : []; };
const chatRows = async () => {
  const lines = await get('/events?n=800&grep=chat-turn&details=1');
  return (Array.isArray(lines) ? lines : []).map((l) => { const i = l.indexOf(' | {'); try { return i > 0 ? JSON.parse(l.slice(i + 3)) : null; } catch { return null; } }).filter(Boolean);
};
const usable = (id) => js(`return [...document.querySelectorAll('[data-testid=${id}]')].some((e) => e.getClientRects().length > 0 && !e.disabled)`);
const newLines = (before, now) => {
  const seen = new Map(); for (const l of before) seen.set(l, (seen.get(l) ?? 0) + 1);
  const out = []; for (const l of now) { const n = seen.get(l) ?? 0; if (n > 0) seen.set(l, n - 1); else out.push(l); }
  return out;
};

async function ask(text) {
  const before = await pageLines();
  const rowsBefore = (await chatRows()).length;
  const t0 = Date.now();
  await get('/type?id=chat-text-input', text);
  let last = ''; let stable = 0;
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000);
    const cur = newLines(before, await pageLines()).filter((l) => l !== text && !/^(Coach is thinking|Analysing position)/i.test(l)).join(' ⏎ ');
    if (cur && cur === last && (await usable('chat-text-input'))) stable += 1; else stable = 0;
    last = cur;
    if (stable >= 2) break;
  }
  const rows = (await chatRows()).slice(rowsBefore);
  return { answer: last, secs: Math.round((Date.now() - t0) / 100) / 10, row: rows[rows.length - 1] ?? null };
}

const fails = (a, q) => {
  const f = [];
  if (!a) f.push('no answer');
  if (STOCK.test(a)) f.push('stock line');
  if (/\[BOARD:|\[\[/.test(a)) f.push('leaked markup');
  if (/(?:^|[^A-Za-z'])(?:I|I'm|I'll|I've|I'd)(?![A-Za-z'])/.test(a.replace(new RegExp(esc(q), 'g'), ''))) f.push('coach said "I"');
  return f;
};

const results = [];
await get('/open');
for (const b of BOARDS) {
  if (only.length && !only.includes(b.id)) continue;
  const c = new Chess(b.fen);
  if (!c.moves().includes(b.san)) { console.log(`❌ ${b.id}: ${b.san} is not legal on its board`); results.push({ board: b.id, id: 'legal', fails: ['move not legal'] }); continue; }
  console.log(`\n══ ${b.id} — ${b.computer} — ${b.san} ══`);
  await get(`/goto?path=${encodeURIComponent(`/coach/session/explain-position?fen=${encodeURIComponent(b.fen)}`)}&ms=12000`);
  for (let i = 0; i < 40 && !(await usable('chat-text-input')); i += 1) await sleep(1000);
  const qs = [...b.asks.map((a, i) => ({ id: i === 0 ? 'calc' : 'follow', ...a })),
    { id: 'deep', q: `Calculate the main line after ${b.san} for me, move by move.`, deep: true },
    // Danya's viewers' kinds of question, made for this board (David 2026-11-17).
    ...boardQuestions(b.fen, { avoid: [b.san] }).map((v) => ({ id: `viewer:${v.form}`, q: v.ask, viewer: v }))];
  for (const q of qs) {
    const r = await ask(q.q);
    const f = fails(r.answer, q.q);
    if (q.want && !q.want.test(r.answer)) f.push(`no ${b.computer} calculation (${q.want})`);
    if (q.viewer) f.push(...formFails(q.viewer, r.answer));
    // The line, not squares: at least three moves, two of them written as a
    // piece move or a capture (a plain square like "b6" is also a pawn move,
    // and an answer that only names squares must not pass as a line).
    if (q.deep) {
      const t = sanTokens(r.answer);
      const strong = t.filter((m) => /^[KQRBN]|x|^O-O/.test(m)).length;
      if (t.length < 3 || strong < 2) f.push(`deep question answered with ${t.length} moves (${strong} piece moves or captures), not the line`);
    }
    results.push({ board: b.id, computer: b.computer, id: q.id, ask: q.q, ...r, fails: f });
    console.log(`${f.length ? '❌' : '✅'} ${b.id}/${q.id} (${r.secs}s) ${q.q}\n   → ${r.answer.slice(0, 700)}${f.length ? `\n   ✗ ${f.join('; ')}` : ''}\n   row: ${r.row ? `read=${r.row.parsedKind ?? '—'} served=${r.row.servedIntent ?? '—'} outcome=${r.row.outcome ?? '—'}` : 'NONE'}`);
  }
}

const pass = results.filter((r) => !r.fails?.length).length;
console.log(`\nSPEEDRUN CHAT ${pass}/${results.length} clean`);
const dir = path.join('audit-reports', `speedrun-chat-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(results, null, 2));
console.log(`report: ${dir}/report.json`);
try { await get('/close'); } catch { /* driver may already be gone */ }
driver.kill();
process.exit(pass === results.length ? 0 : 1);

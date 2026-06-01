#!/usr/bin/env node
// HAND-CURATION gem builder (David 2026-06-01: "find traps by hand. no more bots").
// You have ALREADY judged — via probe-trap.mjs — that <inaccuracy> at <spine> is a
// real, common, punishable slip. This materialises that ONE chosen trap into a full
// gem object: it plays Stockfish's best line for BOTH sides (the refutation), grades
// at the quiet leaf, and prints the gem JSON for you to review + paste. Engine =
// verification (sanctioned); the human chose the move. WRITES NOTHING.
//
// Usage: node scripts/build-gem.mjs '<openingId>' '<spine SAN>' '<inaccuracy SAN>' <w|b> [punishPlies=8]
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const RATINGS = '1600,1800,2000', SPEEDS = 'blitz,rapid,classical', SF_DEPTH = 22;
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const STOCKFISH = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish']
  .filter(Boolean).find((p) => existsSync(p));
if (!STOCKFISH) { console.error('no stockfish'); process.exit(2); }

function startEngine(bin) {
  const sf = spawn(bin); let buf = '', lastCp = null, resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const cp = l.match(/score cp (-?\d+)/), mt = l.match(/score mate (-?\d+)/);
      if (mt) lastCp = parseInt(mt[1], 10) > 0 ? 100000 : -100000; else if (cp) lastCp = parseInt(cp[1], 10);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r({ cp: lastCp, best: bm[1] === '(none)' ? null : bm[1] }); }
    }
  });
  sf.stdin.write('uci\nisready\n');
  return {
    eval(fen) { return new Promise((res) => { lastCp = null; resolver = res; sf.stdin.write(`position fen ${fen}\ngo depth ${SF_DEPTH}\n`); setTimeout(() => { if (resolver === res) { resolver = null; res({ cp: lastCp, best: null }); } }, 30000); }); },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* ignore */ } },
  };
}
function applyUci(c, u) { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }); }
function toUci(sans) { const c = new Chess(); return sans.map((m) => { const mv = c.move(m); return mv.from + mv.to + (mv.promotion ?? ''); }); }
async function explorer(sans) {
  // The egress proxy occasionally serves a not-yet-valid cert (clock skew) — a
  // transient TLS error. Retry a few times; the explorer data is only metadata
  // (freq / mainMove), so degrade to null rather than crash the local engine work.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(`${PROXY}?source=lichess&play=${toUci(sans).join(',')}&ratings=${RATINGS}&speeds=${SPEEDS}`);
      if (r.ok) return r.json();
    } catch { /* transient — retry */ }
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  console.error('[build-gem] explorer unreachable after retries — freqPct/mainMove will be null (fill from probe)');
  return null;
}
const games = (m) => m.white + m.draws + m.black;

// G3 DB-anchor
let SET = null;
function anchorPly(sans) {
  if (!SET) { SET = new Set(); for (const e of JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'))) { if (!e?.pgn) continue; const mv = e.pgn.split(' '); for (let k = 1; k <= mv.length; k++) SET.add(mv.slice(0, k).join(' ')); } }
  const c = new Chess(); const clean = []; for (const m of sans) { try { clean.push(c.move(m).san); } catch { break; } }
  for (let k = clean.length; k >= 1; k--) if (SET.has(clean.slice(0, k).join(' '))) return k;
  return 0;
}

(async () => {
  const [openingId, spine, inacc, studentChar] = process.argv.slice(2);
  const punishPlies = parseInt(process.argv[6] || '8', 10);
  const spineSans = spine.trim().split(/\s+/).filter(Boolean);
  const eng = startEngine(STOCKFISH);
  const c = new Chess(); for (const m of spineSans) c.move(m);
  const oppFen = c.fen();

  // frequency of the chosen inaccuracy + the best (most-common) move name
  const data = await explorer(spineSans);
  const total = data ? games({ white: data.white, draws: data.draws, black: data.black }) : 0;
  const row = data?.moves.find((m) => m.san === inacc);
  const freqPct = row && total ? +(100 * games(row) / total).toFixed(1) : null;
  const gms = row ? games(row) : null;
  const mainMove = data?.moves?.[0]?.san ?? null;

  // play the slip, then engine-best for both sides
  const c2 = new Chess(oppFen); const mv0 = c2.move(inacc); if (!mv0) { console.error('illegal inaccuracy'); eng.quit(); return; }
  const punishSeq = [];
  for (let i = 0; i < punishPlies; i++) {
    const { best } = await eng.eval(c2.fen()); if (!best) break;
    punishSeq.push(applyUci(c2, best).san);
    if (c2.isGameOver()) break;
  }
  const { cp } = await eng.eval(c2.fen());
  const stm = c2.turn();
  const studentCp = stm === studentChar ? cp : -cp;
  const tier = studentCp >= 100 ? 'confirmed' : studentCp >= 50 ? 'positional' : 'WEAK(drop)';

  const playLineSans = [...spineSans, inacc, ...punishSeq];
  const gem = {
    openingId,
    lineMoves: spineSans.join(' '),
    inaccuracy: inacc,
    freqPct, games: gms,
    practicalScore: null,
    mainMove,
    punish: punishSeq[0] ?? null,
    punishSeq,
    playLine: playLineSans.join(' '),
    engineCp: studentCp,
    materialDelta: 0,
    tier,
    why: `At your level opponents play ${inacc} here in ${freqPct}% of games. Punish with the best move ${punishSeq[0]} — the engine has the student clearly better (${(studentCp/100).toFixed(2)}).`,
  };
  console.log(`\nspine anchor ply (G3, need >=6): ${anchorPly(spineSans)}`);
  console.log(`gemId: ${openingId}:${spineSans.join(' ').replace(/ /g,'_')}:${inacc}`);
  console.log(`playLine plies: ${playLineSans.length}  (narration arrays need this length)`);
  console.log(JSON.stringify(gem, null, 2));
  eng.quit();
})();

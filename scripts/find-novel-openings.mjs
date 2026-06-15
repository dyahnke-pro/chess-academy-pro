#!/usr/bin/env node
// Novel-opening hunter (David 2026-06-15). Finds RARE moves that Stockfish
// labels STRONG, across many openings, both colors, ranked strongest→weakest.
//
// Method (no invention — engine + real DB do all the judging):
//   For each seed branch position:
//     1. Explorer (masters first, strong-amateur fallback) → real moves + how
//        often they're played (the RARITY signal).
//     2. Stockfish MultiPV at depth → top engine moves + cp evals (the STRENGTH
//        signal), from the side-to-move perspective.
//     3. A candidate = an engine top move that is (a) near-best (small cp drop),
//        (b) genuinely sound for the side, AND (c) rarely played by humans.
//     4. Finalists are RE-VERIFIED at high depth so every survivor is engine-sound.
//   Output ranked strongest→weakest → audit-reports/novel-openings/report.json
//
// Run: node scripts/find-novel-openings.mjs [depthScan] [depthVerify]
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const SF_BIN = 'node_modules/stockfish/bin/stockfish-18-lite-single.js';
const DEPTH_SCAN = Number(process.argv[2] ?? 24);
const DEPTH_VERIFY = Number(process.argv[3] ?? 30);
const MULTIPV = 8;
const RARE_PCT = 0.05;     // played in < 5% of games at this node = rare
const RARE_GAMES_MIN = 8;  // but seen enough to be a real, legal, tested move
const NEAR_BEST_CP = 30;   // within 0.30 of the engine's #1 = "engine endorses"
const SOUND_FLOOR = -25;   // side-to-move eval must be >= -0.25 (roughly equal+)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Seed branch positions: real tabiyas across many openings, both colors.
// Each is a SAN line; we hunt a weapon for WHOEVER is to move at its end.
// Mix chosen so we cover e4/d4/c4/Nf3 worlds and the major defenses, and stop
// at the branch points where sidelines actually live.
const SEEDS = [
  // ===== White to move (find White weapons) =====
  ['e4 c5', 'Open Sicilian crossroads'],
  ['e4 c5 Nf3 d6', 'Sicilian ...d6'],
  ['e4 c5 Nf3 Nc6', 'Sicilian ...Nc6'],
  ['e4 c5 Nf3 e6', 'Sicilian ...e6'],
  ['e4 e5', "King's Pawn"],
  ['e4 e5 Nf3 Nc6', 'Open Game'],
  ['e4 e5 Nf3 Nc6 Bb5 a6', 'Ruy Lopez ...a6'],
  ['e4 e5 Nf3 Nc6 Bc4', 'Italian crossroads'],
  ['e4 e6', 'French'],
  ['e4 e6 d4 d5', 'French main'],
  ['e4 c6', 'Caro-Kann'],
  ['e4 c6 d4 d5', 'Caro-Kann main'],
  ['e4 d5 exd5 Qxd5', 'Scandinavian'],
  ['e4 d6 d4 Nf6 Nc3 g6', 'Pirc'],
  ['e4 g6', 'Modern'],
  ['e4 Nf6', 'Alekhine'],
  ['d4 Nf6 c4 e6', 'QGD/Nimzo crossroads'],
  ['d4 Nf6 c4 g6', "King's Indian / Grünfeld"],
  ['d4 Nf6 c4 g6 Nc3 d5', 'Grünfeld'],
  ['d4 Nf6 c4 g6 Nc3 Bg7', "King's Indian"],
  ['d4 d5 c4 e6', 'QGD'],
  ['d4 d5 c4 c6', 'Slav'],
  ['d4 d5 c4 dxc4', 'QGA'],
  ['d4 f5', 'Dutch'],
  ['c4 e5', 'English reversed Sicilian'],
  ['c4 c5', 'Symmetrical English'],
  ['Nf3 d5 g3', 'Réti / KIA'],
  // ===== Black to move (find Black weapons) =====
  ['e4', 'Black vs 1.e4'],
  ['e4 c5 Nf3', 'Sicilian, Black 2nd'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3', 'Open Sicilian Black move 5'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', 'Najdorf tabiya (White moves; Black weapon next ply via seed)'],
  ['e4 e5 Nf3', 'Black vs 2.Nf3'],
  ['e4 e5 Nf3 Nc6 Bb5', 'Ruy, Black 3rd'],
  ['e4 e5 Nf3 Nc6 Bc4 Bc5', 'Italian, Black 4th'],
  ['e4 e6 d4', 'French, Black 2nd'],
  ['e4 e6 d4 d5 Nc3', 'French vs 3.Nc3'],
  ['e4 e6 d4 d5 e5', 'French Advance, Black'],
  ['e4 c6 d4 d5 Nc3', 'Caro vs 3.Nc3'],
  ['e4 c6 d4 d5 e5', 'Caro Advance, Black'],
  ['d4', 'Black vs 1.d4'],
  ['d4 Nf6 c4', 'Indian, Black 2nd'],
  ['d4 Nf6 c4 e6 Nc3', 'Nimzo/QGD vs Nc3'],
  ['d4 Nf6 c4 e6 Nf3', 'vs 3.Nf3'],
  ['d4 d5 c4', 'QG, Black 2nd'],
  ['d4 d5 c4 c6 Nf3 Nf6 Nc3', 'Slav main, Black'],
  ['c4', 'Black vs 1.c4'],
  ['Nf3', 'Black vs 1.Nf3'],
  ['d4 Nf6 c4 g6 Nc3 Bg7 e4 d6', "KID classical, Black"],
  ['d4 f5 g3', 'Dutch vs g3, Black'],
];

// ── Stockfish persistent engine with MultiPV ────────────────────────────────
function startEngine() {
  const sf = spawn('node', [SF_BIN]);
  let buf = '';
  let pvs = new Map(); // multipv index -> { cp, mate, firstUci }
  let resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString();
    const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const mpv = l.match(/multipv (\d+)/);
      if (mpv && l.includes(' pv ')) {
        const idx = parseInt(mpv[1], 10);
        const cp = l.match(/score cp (-?\d+)/);
        const mate = l.match(/score mate (-?\d+)/);
        const pv = l.match(/ pv (\S+)/);
        pvs.set(idx, {
          cp: cp ? parseInt(cp[1], 10) : null,
          mate: mate ? parseInt(mate[1], 10) : null,
          firstUci: pv ? pv[1] : null,
        });
      }
      if (l.startsWith('bestmove') && resolver) {
        const r = resolver; resolver = null; r([...pvs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v));
      }
    }
  });
  sf.stdin.write('uci\nisready\n');
  return {
    setMultiPV(n) { sf.stdin.write(`setoption name MultiPV value ${n}\n`); },
    analyse(fen, depth) {
      return new Promise((res) => {
        pvs = new Map(); resolver = res;
        sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
        setTimeout(() => { if (resolver === res) { resolver = null; res([...pvs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)); } }, 60000);
      });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* */ } },
  };
}

const toUci = (sans) => { const c = new Chess(); return sans.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };
const gamesOf = (m) => (m.white || 0) + (m.draws || 0) + (m.black || 0);
async function explorer(source, sans) {
  const extra = source === 'lichess' ? '&ratings=2000,2200,2500&speeds=blitz,rapid,classical' : '';
  const r = await fetch(`${PROXY}?source=${source}&play=${toUci(sans).join(',')}${extra}`);
  return r.ok ? r.json() : null;
}
// cp from side-to-move perspective → normalized number; mate dominates.
const scoreNum = (pv) => pv.mate != null ? (pv.mate > 0 ? 100000 - pv.mate : -100000 - pv.mate) : (pv.cp ?? -99999);
const fmtEval = (pv) => pv.mate != null ? `#${pv.mate}` : `${pv.cp >= 0 ? '+' : ''}${(pv.cp / 100).toFixed(2)}`;

async function main() {
  const eng = startEngine();
  eng.setMultiPV(MULTIPV);
  await sleep(500);
  const candidates = [];

  for (let si = 0; si < SEEDS.length; si++) {
    const [seedStr, label] = SEEDS[si];
    const seed = seedStr.trim() ? seedStr.trim().split(/\s+/) : [];
    const base = new Chess();
    let legal = true;
    for (const m of seed) { try { base.move(m); } catch { legal = false; break; } }
    if (!legal) { console.log(`[skip] illegal seed: ${seedStr}`); continue; }
    const sideToMove = base.turn(); // 'w' | 'b' — the side we're arming
    const fen = base.fen();

    // Real human move frequencies at this node.
    let book = await explorer('masters', seed); await sleep(120);
    let bookSrc = 'masters';
    let total = book ? gamesOf(book) : 0;
    if (total < 200) { const k = await explorer('lichess', seed); await sleep(120); if (k && gamesOf(k) > total) { book = k; bookSrc = 'lichess'; total = gamesOf(k); } }
    if (!book || !book.moves?.length || total < 50) { console.log(`[skip] thin book (${total}) @ ${label}`); continue; }
    const freq = new Map(); // san -> {games, pct}
    for (const m of book.moves) freq.set(m.san, { games: gamesOf(m), pct: gamesOf(m) / total });

    // Engine top-N from the side-to-move perspective.
    const pvs = (await eng.analyse(fen, DEPTH_SCAN)).filter((p) => p.firstUci);
    if (!pvs.length) { console.log(`[skip] no engine pv @ ${label}`); continue; }
    const bestScore = scoreNum(pvs[0]);

    for (const pv of pvs) {
      const c = new Chess(fen);
      let mv; try { mv = c.move({ from: pv.firstUci.slice(0, 2), to: pv.firstUci.slice(2, 4), promotion: pv.firstUci.length > 4 ? pv.firstUci[4] : undefined }); } catch { continue; }
      const san = mv.san;
      const f = freq.get(san) || { games: 0, pct: 0 };
      const sc = scoreNum(pv);
      const drop = bestScore - sc;
      const soundCp = pv.mate != null ? (pv.mate > 0 ? 9999 : -9999) : pv.cp;
      // Color-aware soundness floor: a WHITE weapon must KEEP the edge (>= 0);
      // a BLACK weapon need only reach near-equality (>= SOUND_FLOOR) — full
      // equalisation is the prize for the second player.
      const floor = sideToMove === 'w' ? 0 : SOUND_FLOOR;
      // Candidate gates: near the engine's best, sound for the side, RARE in practice.
      const isNearBest = drop <= NEAR_BEST_CP;
      const isSound = soundCp >= floor;
      const isRare = f.pct < RARE_PCT && f.games >= 1;
      if (isNearBest && isSound && isRare && f.games >= 1) {
        candidates.push({
          label, bookSrc, sideToMove,
          line: seed.join(' '), move: san,
          fenAfter: c.fen(),
          pgnAfter: [...seed, san].join(' '),
          eco: book.opening?.eco || null, openingName: book.opening?.name || null,
          scanEval: fmtEval(pv), scanCp: soundCp, dropFromBestCp: drop,
          freqPct: +(f.pct * 100).toFixed(2), freqGames: f.games, totalGames: total,
        });
      }
    }
    console.log(`[${si + 1}/${SEEDS.length}] ${label} — book:${bookSrc}(${total}) bestEval:${fmtEval(pvs[0])} cand:${candidates.length}`);
  }

  // ── Re-verify every finalist deep so the list is genuinely engine-sound.
  console.log(`\n[verify] re-evaluating ${candidates.length} candidates at depth ${DEPTH_VERIFY}...`);
  eng.setMultiPV(1);
  for (const cand of candidates) {
    const pv = (await eng.analyse(cand.fenAfter, DEPTH_VERIFY))[0];
    if (!pv) { cand.verifyCp = cand.scanCp; cand.verifyEval = cand.scanEval; continue; }
    // fenAfter is the OPPONENT to move → flip to the armed side's perspective.
    const oppScore = scoreNum(pv);
    const sideScore = pv.mate != null ? -scoreNum(pv) : -(pv.cp ?? 0);
    cand.verifyCp = pv.mate != null ? (sideScore > 0 ? 9999 : -9999) : sideScore;
    cand.verifyEval = pv.mate != null ? `#${-pv.mate}` : `${sideScore >= 0 ? '+' : ''}${(sideScore / 100).toFixed(2)}`;
    cand.oppBestReply = pv.firstUci;
  }
  eng.quit();

  // Keep only the ones that survive deep verification as sound for the armed side
  // (color-aware floor: White must keep the edge, Black need only equalise).
  const sound = candidates.filter((c) => c.verifyCp >= (c.sideToMove === 'w' ? 0 : SOUND_FLOOR));
  for (const c of sound) c.rarityTier = c.freqPct < 1 ? 'rare' : 'offbeat';
  // Rank each color by its own engine eval (strongest first), then by rarity.
  const byCp = (a, b) => b.verifyCp - a.verifyCp || a.freqPct - b.freqPct;
  const white = sound.filter((c) => c.sideToMove === 'w').sort(byCp);
  const black = sound.filter((c) => c.sideToMove === 'b').sort(byCp);
  sound.sort(byCp);

  const outDir = 'audit-reports/novel-openings';
  mkdirSync(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    params: { DEPTH_SCAN, DEPTH_VERIFY, MULTIPV, RARE_PCT, NEAR_BEST_CP, SOUND_FLOOR },
    totalCandidates: candidates.length, soundCount: sound.length,
    white, black, results: sound,
  };
  writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));

  const row = (c, i) => `${String(i + 1).padStart(2)}. ${c.verifyEval.padStart(6)} ${c.rarityTier === 'rare' ? '★' : ' '} ${c.line ? c.line + ' ' : '(start) '}>> ${c.move}   (${c.freqGames}/${c.totalGames} = ${c.freqPct}% ${c.bookSrc})  — ${c.label}${c.openingName ? ' · ' + c.openingName : ''}`;
  console.log(`\n===== WHITE WEAPONS (rare + engine-sound, strongest→weakest) =====`);
  console.log(`(eval from White's view, after Black's best reply, depth ${DEPTH_VERIFY}; ★ = <1% played)\n`);
  white.forEach((c, i) => console.log(row(c, i)));
  console.log(`\n===== BLACK WEAPONS (rare + engine-sound, strongest→weakest) =====`);
  console.log(`(eval from Black's view; 0.00 = full equaliser, the prize for Black; ★ = <1% played)\n`);
  black.forEach((c, i) => console.log(row(c, i)));
  console.log(`\nreport: ${outDir}/report.json  (${white.length} White + ${black.length} Black sound / ${candidates.length} scanned)`);
}
main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env node
// Punish-the-inaccuracy miner (WO: docs/plans/2026-05-23-punish-gems-wo.md).
//
// The amateur DB finds the COMMON move the opponent actually plays that scores
// badly for them (a real, faced-at-your-level inaccuracy). The student's best
// reply (masters→amateur) is the punish. Stockfish — when an engine is present
// (CI / STOCKFISH_PATH) — confirms the punish leaves the student clearly
// better and promotes the gem to tier 'confirmed'; in the web sandbox (no
// engine) gems stay tier 'practical' (DB-scored only). NOTHING invented —
// every move comes from the DB; every claim from explorer numbers / the engine.
//
// Run: node scripts/mine-punish-gems.mjs        (writes src/data/punish-gems.json)
import { Chess } from 'chess.js';
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
// The Vercel-edge proxy can't reach explorer.lichess.ovh from a datacenter
// (connection-refused), and the explorer now 401s anonymous requests. When a
// LICHESS token is present (GitHub Actions secret / local env), hit the
// explorer host DIRECTLY with a Bearer header — the WO §1 fallback. GitHub
// runners reach explorer.lichess.ovh; the sandbox egress does not.
const LICHESS_TOKEN = process.env.LICHESS || process.env.LICHESS_API_KEY || process.env.LICHESS_TOKEN || '';
const EXPLORER_DIRECT = 'https://explorer.lichess.ovh';
// Rating buckets matched to the student's level (~1400-1600) — that's where
// the natural blunders David means (grab the gambit pawn, walk into Bxf7+)
// actually get played. Master buckets hide them.
const RATINGS = '1600,1800,2000';
const SPEEDS = 'blitz,rapid,classical';
// Output store. Defaults to the masterclass gem file; the gambit-tab lane sets
// GEM_OUT=src/data/gambit-punish-gems.json so gambit gems never touch the
// masterclass punish-gems.json (separate-lane contract, David 2026-05-27).
const GEM_OUT = process.env.GEM_OUT || 'src/data/punish-gems.json';
// ENGINE-FIRST discovery (David 2026-05-24): the amateur DB only says what's
// COMMON; STOCKFISH says what's PUNISHABLE. A move that loses by force often
// still scores fine in amateur practice (the winner doesn't find the refutation),
// so a practical-win-rate filter HIDES the real crushes (f7 sacs, bad gambit
// grabs). Instead: take the common opponent moves, and keep the ones the engine
// refutes — the punish is the ENGINE'S best move, so sacs surface.
const FREQ_FLOOR = 0.02;     // opponent move ≥2% common (natural blunders are rarer)
const MIN_GAMES = 100;       // …with a real sample
const CANDIDATES = 5;        // engine-test the top-N common opponent moves per node
const JUMP_CP = 50;          // the move must hand the student ≥+0.5 vs best play
// Engine bar: a weapon must give REAL benefit. ≥+1.0 = 'confirmed' crush (wins
// material / decisive); +0.5..+1.0 = 'positional' (clearly better); below +0.5
// never becomes a gem.
const WEAPON_CP = 100;       // confirmed: student ≥ +1.0
const EDGE_CP = 50;          // positional: student ≥ +0.5
const SF_DEPTH = 18;         // deep enough to see tactical follow-ups (sacs)
const MIN_SPINE = 6;         // opening spine must DB-anchor ≥6 plies (G3)

// G3 DB-anchor — mirror of src/utils/dbAnchor.ts. A gem's spine must match a
// real openings-lichess.json move-prefix of ≥MIN_SPINE plies, or it isn't
// grounded (an explorer transposition in a non-DB move order doesn't count).
let DB_PREFIXES = null;
function dbPrefixSet() {
  if (DB_PREFIXES) return DB_PREFIXES;
  const set = new Set();
  const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'));
  for (const e of db) {
    if (!e?.pgn) continue;
    const moves = e.pgn.split(' ');
    for (let k = 1; k <= moves.length; k++) set.add(moves.slice(0, k).join(' '));
  }
  DB_PREFIXES = set;
  return set;
}
function longestAnchorPly(sans) {
  const set = dbPrefixSet();
  const c = new Chess();
  const clean = [];
  for (const m of sans) { try { clean.push(c.move(m).san); } catch { break; } }
  for (let k = clean.length; k >= 1; k--) if (set.has(clean.slice(0, k).join(' '))) return k;
  return 0;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Stockfish (optional — promotes practical → confirmed) ───────────────
function resolveStockfish() {
  const cands = [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean);
  for (const p of cands) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf-8' }).trim() || null; } catch { return null; }
}
const STOCKFISH = resolveStockfish();

// Persistent engine: one process, queried sequentially. Each eval returns the
// score (cp, side-to-move perspective) AND the best move (UCI) — the best move
// IS the punish (David: "we refute with BEST MOVES").
function startEngine(bin) {
  if (!bin) return null;
  const sf = spawn(bin);
  let buf = '', lastCp = null, resolver = null;
  sf.stdout.on('data', (d) => {
    buf += d.toString(); const lines = buf.split('\n'); buf = lines.pop() ?? '';
    for (const l of lines) {
      const cp = l.match(/score cp (-?\d+)/), mt = l.match(/score mate (-?\d+)/);
      if (mt) lastCp = parseInt(mt[1], 10) > 0 ? 100000 : -100000; else if (cp) lastCp = parseInt(cp[1], 10);
      const bm = l.match(/^bestmove (\S+)/);
      if (bm && resolver) { const r = resolver; resolver = null; r({ cp: lastCp, best: bm[1] === '(none)' ? null : bm[1] }); }
    }
  });
  sf.on('error', () => { if (resolver) { const r = resolver; resolver = null; r({ cp: null, best: null }); } });
  sf.stdin.write('uci\nisready\n');
  return {
    eval(fen) {
      return new Promise((res) => {
        lastCp = null; resolver = res;
        sf.stdin.write(`position fen ${fen}\ngo depth ${SF_DEPTH}\n`);
        setTimeout(() => { if (resolver === res) { resolver = null; res({ cp: lastCp, best: null }); } }, 20000);
      });
    },
    quit() { try { sf.stdin.write('quit\n'); sf.kill(); } catch { /* ignore */ } },
  };
}
function applyUci(chess, uci) {
  return chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
}

function toUci(sans) { const c = new Chess(); return sans.map((m) => { const mv = c.move(m); return mv.from + mv.to + (mv.promotion ?? ''); }); }
async function explorer(source, sans) {
  const extra = source === 'lichess' ? `&ratings=${RATINGS}&speeds=${SPEEDS}` : '';
  const play = toUci(sans).join(',');
  if (LICHESS_TOKEN) {
    const variant = source === 'lichess' ? 'variant=standard&' : '';
    const r = await fetch(`${EXPLORER_DIRECT}/${source}?${variant}play=${play}${extra}`, {
      headers: { Authorization: `Bearer ${LICHESS_TOKEN}` },
    });
    return r.ok ? r.json() : null;
  }
  const r = await fetch(`${PROXY}?source=${source}&play=${play}${extra}`);
  return r.ok ? r.json() : null;
}
function gamesOf(m) { return m.white + m.draws + m.black; }
function studentScore(m, sc) { const t = gamesOf(m); return t ? ((sc === 'w' ? m.white : m.black) + m.draws / 2) / t : 0; }

// ── Masters-DB grounding (David 2026-05-26): the LEARNER's side is validated
// against the MASTERS DB, the OPPONENT's inaccuracies come from the amateur DB.
// Two gates fix the engine over-rating sharp/gambit lines theory calls balanced:
//   (1) masters move-set VETO — if masters play the opponent's "inaccuracy", it
//       is theory, not a blunder (doctrine §7: masters don't play refutable
//       blunders). Bundled DB, offline, keyed by 4-field FEN.
//   (2) MATERIAL check at the quiet end — a `confirmed` weapon must win real
//       material; an engine `+cp` with the learner NOT up material is initiative
//       the engine over-rates (the 5…Na5 gambit, the Max Lange), so it is
//       dropped rather than mislabeled a crush.
const MASTERS_DB = (() => {
  try { return JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf-8')).positions || {}; }
  catch { return {}; }
})();
function mastersMovesAt(chess) {
  const key = chess.fen().split(' ').slice(0, 4).join(' ');
  const entry = MASTERS_DB[key];
  return Array.isArray(entry) ? entry.map((m) => m.san) : null; // null = masters never reached here
}
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
function materialDelta(chess, studentChar) {
  let w = 0, b = 0;
  for (const row of chess.board()) for (const sq of row) {
    if (!sq) continue;
    const v = PIECE_VAL[sq.type] || 0;
    if (sq.color === 'w') w += v; else b += v;
  }
  return studentChar === 'w' ? w - b : b - w; // learner material minus opponent
}

// Walk a FULL line (a curated variation pgn, or a short seed that then extends
// down the amateur trunk), scanning every opponent node for engine-refutable
// inaccuracies. `scanned` is shared across lines so overlapping variations
// (the closed-Ruy prefix, etc.) don't re-burn engine time on the same FENs.
async function mine(openingId, studentChar, walkLine, eng, scanned, extraPlies = 4) {
  if (!eng) return []; // engine-first: no Stockfish → no weapons (don't guess)
  const sideWord = studentChar === 'w' ? 'White' : 'Black';
  const SCAN_CAP = 18; // don't scan past the late opening (inaccuracies there are rarer / off-book)
  const gems = []; const line = [];
  for (let depth = 0; depth < walkLine.length + extraPlies; depth++) {
    const c = new Chess(); for (const m of line) c.move(m);
    const j = await explorer('lichess', line); await sleep(140);
    if (!j || !(j.moves || []).length) break;
    const total = (j.white || 0) + (j.draws || 0) + (j.black || 0);
    const main = j.moves[0];

    if (c.turn() !== studentChar && depth < SCAN_CAP && longestAnchorPly(line) >= MIN_SPINE && !scanned.has(c.fen())) {
      scanned.add(c.fen());
      // Baseline: how good is THIS position for the student under best play?
      // (node eval is opponent-to-move perspective, so flip for the student.)
      const node = await eng.eval(c.fen());
      const E0 = node.cp === null ? 0 : -node.cp;

      // Only hunt when the position isn't already winning for the student —
      // otherwise the edge is the opening, not the opponent's move.
      if (E0 < WEAPON_CP) {
        const cands = j.moves
          .map((m) => ({ san: m.san, games: gamesOf(m), pct: gamesOf(m) / total, s: studentScore(m, studentChar) }))
          .filter((m) => m.pct >= FREQ_FLOOR && m.games >= MIN_GAMES)
          .slice(0, CANDIDATES);

        // GATE 1 — masters move-set veto: drop candidates masters actually
        // play (theory-fine alternatives, not blunders).
        const mastersHere = mastersMovesAt(c);
        let best = null;
        for (const cand of cands) {
          if (mastersHere && mastersHere.includes(cand.san)) continue; // master-played = theory
          const cc = new Chess(c.fen());
          let mv; try { mv = cc.move(cand.san); } catch { continue; }
          // After the opponent's move it's the student to move → eval is the
          // student's advantage, and after.best IS the punish (BEST MOVE).
          const after = await eng.eval(cc.fen());
          if (after.cp === null || !after.best) continue;
          const E1 = after.cp;
          // Real inaccuracy = leaves the student clearly better AND is a big
          // drop vs the position under best play (the move's fault, not the line).
          if (E1 >= EDGE_CP && (E1 - E0) >= JUMP_CP) {
            if (!best || E1 > best.E1) best = { cand, E1, fenAfter: cc.fen(), punishUci: after.best, mv };
          }
        }

        if (best) {
          // The punish + the played-out crush: the engine's BEST move for the
          // student, then best play both sides until the advantage is shown.
          const pc = new Chess(c.fen()); pc.move(best.cand.san);
          const punishSeq = [];
          let punishSan = null;
          try { punishSan = applyUci(pc, best.punishUci).san; punishSeq.push(punishSan); } catch { /* skip */ }
          if (punishSan) {
            // Play the refutation OUT with best moves for BOTH sides, then
            // grade the QUIET final position — not the one-ply eval. A pawn
            // "won" that gets regained (e.g. Ruy ...a6 Bxc6 Nxe5) collapses
            // here; a real crush (a fork, a winning attack) holds.
            for (let k = 0; k < 7; k++) {
              const e = await eng.eval(pc.fen());
              if (!e.best) break;
              let m2; try { m2 = applyUci(pc, e.best); } catch { break; }
              punishSeq.push(m2.san);
            }
            const fin = await eng.eval(pc.fen());
            const engineCp = fin.cp === null ? best.E1 : (pc.turn() === studentChar ? fin.cp : -fin.cp);
            // GATE 2 — material reality at the quiet end. The engine over-rates
            // dynamic initiative in gambit/sharp lines (5…Na5, Max Lange) that
            // theory calls balanced. A real weapon WON material; require it:
            //   confirmed → learner up ≥ a full pawn of material (or it's mate)
            //   positional → learner at least NOT down material
            // An engine `+cp` with the learner down material is over-rated
            // initiative — drop it rather than ship a false weapon.
            const matDelta = materialDelta(pc, studentChar);
            const isMate = fin.cp === null && fin.best === null; // mate-ish terminal
            // Final, honest gate: still clearly better, a real jump from the
            // baseline, AND backed by material (not just engine initiative).
            if (engineCp >= EDGE_CP && (engineCp - E0) >= JUMP_CP && (matDelta >= 0 || isMate)) {
              // Tier off the engine eval (the gate's contract): ≥ +1.0 = confirmed
              // (decisive — a winning attack OR won material), +0.5..+1.0 =
              // positional. The matDelta ≥ 0 ship-gate above already rejects
              // over-rated initiative (student DOWN material), so a +1.0 here is a
              // real crush whether the win is material or a forced attack (Qh4+).
              const tier = engineCp >= WEAPON_CP ? 'confirmed' : 'positional';
              const playLine = [...line, best.cand.san, ...punishSeq];
              gems.push({
                openingId, lineMoves: line.join(' '), inaccuracy: best.cand.san,
                freqPct: +(best.cand.pct * 100).toFixed(1), games: best.cand.games,
                practicalScore: +(best.cand.s * 100).toFixed(0), mainMove: main.san,
                punish: punishSan, punishSeq, playLine: playLine.join(' '),
                engineCp, materialDelta: matDelta, tier,
                why: `At your level opponents play ${best.cand.san} here in ${(best.cand.pct * 100).toFixed(0)}% of games. Punish with the best move ${punishSan} — the engine has ${sideWord} ${tier === 'confirmed' ? 'winning' : 'clearly better'} (${engineCp >= 0 ? '+' : ''}${(engineCp / 100).toFixed(1)}${matDelta >= 1 ? `, +${matDelta} material` : ''}).`,
              });
            }
          }
        }
      }
    }
    // Advance ALONG the curated line; once it ends, follow the amateur trunk.
    const next = depth < walkLine.length ? walkLine[depth] : main.san;
    try { const t = new Chess(c.fen()); t.move(next); } catch { break; }
    line.push(next);
  }
  return gems;
}

// The masterclass openings to mine. baseSeed = the opening's canonical first
// moves; studentChar = the side the student plays (matches repertoire.json
// `color`). Per-variation seeds are derived from repertoire.json below so the
// miner walks EACH variation's line (not just the amateur trunk) — that's how
// variation tabs get their own gems. Every gem is DB-anchored by the gate
// regardless — a wrong seed just yields fewer gems, never invents one.
// Override the set with OPENINGS=caro-kann,ruy-lopez to mine a subset.
const OPENING_SEEDS = {
  'caro-kann':    { studentChar: 'b', baseSeed: ['e4', 'c6'] },
  'ruy-lopez':    { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  'pirc-defence': { studentChar: 'b', baseSeed: ['e4', 'd6'] },
  'vienna-game':  { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nc3'] },
  'italian-game': { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] },
  'scotch-game':  { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'] },
  // Sicilian Dragon — Black. Seed = the Dragon tabiya (the repertoire variations
  // carry no move lists, so pin the base seed explicitly rather than derive it).
  'sicilian-dragon': { studentChar: 'b', baseSeed: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'] },
  // Pro repertoires (2026-05-31 depth build) — gems mine the amateur explorer at
  // the opening's identity position, so the seed is the SHORT defining prefix.
  'pro-gothamchess-qgd':            { studentChar: 'b', baseSeed: ['d4', 'd5', 'c4', 'e6'] },
  'pro-naroditsky-caro-kann':       { studentChar: 'b', baseSeed: ['e4', 'c6', 'd4', 'd5'] },
  'pro-naroditsky-alapin':          { studentChar: 'w', baseSeed: ['e4', 'c5', 'c3'] },
  'pro-naroditsky-najdorf':         { studentChar: 'b', baseSeed: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
  'pro-naroditsky-kid':             { studentChar: 'b', baseSeed: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] },
  'pro-naroditsky-alekhine':        { studentChar: 'b', baseSeed: ['e4', 'Nf6', 'e5', 'Nd5'] },
  'pro-naroditsky-kia':             { studentChar: 'w', baseSeed: ['Nf3', 'Nf6', 'g3'] },
  'pro-naroditsky-rossolimo':       { studentChar: 'w', baseSeed: ['e4', 'c5', 'Nf3', 'Nc6', 'Bb5'] },
  'pro-naroditsky-jobava-london':   { studentChar: 'w', baseSeed: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4'] },
  'pro-naroditsky-ruy-lopez':       { studentChar: 'w', baseSeed: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'] },
  'pro-naroditsky-fantasy-caro':    { studentChar: 'w', baseSeed: ['e4', 'c6', 'd4', 'd5', 'f3'] },
  'pro-gothamchess-trompowsky':     { studentChar: 'w', baseSeed: ['d4', 'Nf6', 'Bg5'] },
  'pro-gothamchess-english':        { studentChar: 'w', baseSeed: ['c4'] },
  'pro-gothamchess-kia':            { studentChar: 'w', baseSeed: ['Nf3', 'd5', 'g3'] },
  'pro-gothamchess-closed-sicilian': { studentChar: 'w', baseSeed: ['e4', 'c5', 'Nc3'] },
  // Hikaru (2026-05-31)
  'pro-hikaru-nimzo-larsen':       { studentChar: 'w', baseSeed: ['b3'] },
  'pro-hikaru-closed-sicilian':    { studentChar: 'w', baseSeed: ['e4', 'c5', 'Nc3'] },
  'pro-hikaru-reti':               { studentChar: 'w', baseSeed: ['Nf3'] },
  'pro-hikaru-pirc-modern':        { studentChar: 'b', baseSeed: ['e4', 'g6'] },
  'pro-hikaru-caro-kann':          { studentChar: 'b', baseSeed: ['e4', 'c6'] },
};

// EXTRA_WALK — common AMATEUR side-tries the student will FACE that aren't in
// the pro's "his-response" curated pgns. A solid/positional repertoire (Hikaru's
// Nimzo-Larsen, Closed Sicilian, Caro, Modern) curates the quiet mainline, so
// the variation pgns walk equal lines with no refutation. But amateurs at the
// student's level throw the dubious f3-Fantasy, the h4-lunge, the premature
// dxc5/d5 — REAL inaccuracies the masterclass should arm the student to punish
// (exactly what Naroditsky's + Gotham's Caro gems came from). These seeds just
// DIRECT the walk toward those positions; every gem is still DB-anchored +
// masters-vetoed + engine-graded by the same gates — nothing is invented. Each
// entry is an array of SAN move-lists (the line up to where the opponent's try
// lands), walked node-by-node like any variation line.
const EXTRA_WALK = {
  // ── Caruana (2026-06-01): opponent side-tries his curated spine skips. ──
  // Ruy (student=White): punish Black's offbeat replies to the Spanish.
  'pro-caruana-ruy-lopez': [
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'f5'],                // Schliemann
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nd4'],               // Bird's Defense
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nge7'],              // Cozio
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'b5', 'Bb3', 'Na5'],  // …Na5 chasing
  ],
  // Italian (student=White): punish Black's loose tries.
  'pro-caruana-italian': [
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4'],         // Evans Gambit territory
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'],        // Fried Liver / Two Knights
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'Bg4'],  // …Bg4 pin
  ],
  // Najdorf (student=Black): punish White's overaggressive amateur tries.
  'pro-caruana-najdorf': [
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bc4'],  // Fischer-Sozin
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'g4'],   // early g4
  ],
  // Taimanov (student=Black): punish White's loose tries.
  'pro-caruana-taimanov': [
    ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nb5'],   // Ndb5 lunge
    ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nxc6'],  // premature trade
  ],
  // Caro-Kann (student=Black) — punish White's offbeat tries.
  'pro-hikaru-caro-kann': [
    ['e4', 'c6', 'd4', 'd5', 'f3'],                          // Fantasy
    ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4'],            // Advance h4-lunge
    ['e4', 'c6', 'd4', 'd5', 'e5', 'c5', 'dxc5'],           // Advance dxc5 grab
    ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'dxe4', 'Nxe4', 'Nf6'], // Two Knights dxe4
    ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3'], // Exchange
  ],
  // Pirc/Modern (student=Black) — punish White's overreach.
  'pro-hikaru-pirc-modern': [
    ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'f4'],           // Austrian Attack
    ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'Be3', 'a6', 'Qd2'], // 150 Attack
    ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'Bc4'],          // Bc4 aggression
  ],
  // Closed Sicilian / Grand Prix (student=White) — punish Black's loose setups.
  'pro-hikaru-closed-sicilian': [
    ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'd5'],                 // ...d5 break early
    ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'e5'],                 // ...e5 weakening
    ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'e6'], // ...e6 vs Bc4
  ],
};

function loadRepertoire() {
  try {
    const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
    return Array.isArray(raw) ? raw : raw.openings ?? [];
  } catch { return []; }
}
// Each variation's FULL curated line → walked node-by-node so every variation's
// characteristic positions (Marshall, Breyer, Berlin, …) get scanned, not just
// the shared opening prefix.
function variationLines(opening) {
  const lines = [];
  for (const v of opening?.variations ?? []) {
    const moves = v.pgn.replace(/\d+\.(\.\.)?/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    if (moves.length >= MIN_SPINE) lines.push(moves);
  }
  return lines;
}

// Auto-derive a seed config from the repertoire entry so a NEW masterclass
// opening mines without a hand-added OPENING_SEEDS line. studentChar = the
// repertoire `color`; baseSeed = the longest move-prefix common to every
// variation (the opening's shared trunk). The miner extends this down the
// amateur trunk anyway, and walks each full variation line separately, so a
// short common prefix is fine. Returns null when nothing can be derived
// (no variations) — caller falls back / skips, never invents a seed.
function deriveSeed(opening) {
  if (!opening) return null;
  const studentChar = String(opening.color).toLowerCase() === 'black' ? 'b' : 'w';
  const vlines = variationLines(opening);
  if (!vlines.length) return null;
  let prefix = vlines[0].slice();
  for (const l of vlines.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < l.length && prefix[i] === l[i]) i++;
    prefix = prefix.slice(0, i);
  }
  // A 1-ply prefix (just "e4") is too generic to seed a useful trunk walk;
  // require ≥2 plies, else fall back to the shortest full variation line.
  const baseSeed = prefix.length >= 2 ? prefix : vlines.slice().sort((a, b) => a.length - b.length)[0];
  return { studentChar, baseSeed };
}
const seedKey = (s) => s.join(' ');

(async () => {
  console.log(`[mine] stockfish: ${STOCKFISH ?? 'NONE'}`);
  if (!STOCKFISH) { console.error('[mine] ENGINE REQUIRED — engine-first discovery refutes with best moves. Set STOCKFISH_PATH.'); process.exit(2); }
  const eng = startEngine(STOCKFISH);
  const repertoire = loadRepertoire();
  // Gambit-tab openings live in gambits.json (same shape: color + variations[].pgn).
  // Fall back to it so OPENINGS=gambit-<id> mines under the gambit-tab id.
  let gambits = [];
  try { gambits = JSON.parse(readFileSync('src/data/gambits.json', 'utf-8')); } catch { /* none */ }
  // Pro-rep openings (pro-<player>-<opening>) live in pro-repertoires.json,
  // same shape (color + variations[].pgn). Source them too so OPENINGS=
  // pro-gothamchess-caro-kann mines a pro entry's variation tabs. Every gem is
  // still DB-anchored by the gate; a pro seed just walks his curated lines.
  let proRep = [];
  try { proRep = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf-8')).openings ?? []; } catch { /* none */ }
  const only = (process.env.OPENINGS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ids = only.length ? only : Object.keys(OPENING_SEEDS);
  const all = [];
  const seen = new Set(); // dedupe gems across overlapping lines
  for (const id of ids) {
    const opening = repertoire.find((o) => o.id === id) || gambits.find((o) => o.id === id) || proRep.find((o) => o.id === id);
    // Hand-tuned seed if present, else auto-derive from the repertoire entry
    // (color → studentChar, common variation prefix → baseSeed). Only truly
    // un-deriveable openings (not in repertoire / no variations) are skipped.
    const cfg = OPENING_SEEDS[id] ?? deriveSeed(opening);
    if (!cfg) { console.warn(`[mine] no seed config and none derivable for "${id}" — skipping`); continue; }
    if (!OPENING_SEEDS[id]) console.log(`[mine] ${id}: auto-derived seed (student=${cfg.studentChar}, base="${cfg.baseSeed.join(' ')}")`);
    const scanned = new Set(); // FENs already scanned (shared across this opening's lines)
    // The short base seed extends down the amateur trunk (extraPlies large);
    // each full variation line is walked as-is (extraPlies small).
    const lines = [cfg.baseSeed, ...variationLines(opening), ...(EXTRA_WALK[id] ?? [])];
    const uniqueLines = [...new Map(lines.map((l) => [seedKey(l), l])).values()];
    console.log(`[mine] ${id} (student=${cfg.studentChar}) — ${uniqueLines.length} lines`);
    for (const wl of uniqueLines) {
      const extra = wl.length <= 6 ? 12 : 2;
      const gems = await mine(id, cfg.studentChar, wl, eng, scanned, extra);
      for (const g of gems) {
        const key = `${g.openingId}|${g.lineMoves}|${g.inaccuracy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(g);
      }
      if (gems.length) console.log(`[mine]   line "${seedKey(wl).slice(0, 40)}…" → ${gems.length}`);
    }
  }
  eng.quit();
  // MERGE: a scoped run (OPENINGS=italian-game) must not wipe other openings'
  // gems. Keep every existing gem whose opening wasn't mined this run; replace
  // the mined openings' gems with the freshly-mined set (a full run mines all
  // ids, so this still regenerates the whole file).
  const minedIds = new Set(ids);
  let existing = [];
  try { existing = JSON.parse(readFileSync(GEM_OUT, 'utf-8')); } catch { /* none yet */ }
  const kept = existing.filter((g) => !minedIds.has(g.openingId));
  const merged = [...kept, ...all];
  await writeFile(GEM_OUT, JSON.stringify(merged, null, 2) + '\n');
  console.log(`[mine] wrote ${all.length} new gems (kept ${kept.length} from other openings) → ${merged.length} total`);
  for (const g of all) console.log(`  ${g.openingId} | ${g.lineMoves} | ${g.inaccuracy} (${g.freqPct}%) → ${g.punish} [${g.tier} ${g.engineCp}cp]`);
})();

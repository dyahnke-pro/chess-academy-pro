// TRAP CENSUS → gems (WO-COURSE-01, David 2026-10-27: "make sure we are not
// missing any traps. I know we are.").
//
// Every trap here was CHOSEN BY HAND from the census reports
// (named-trap-coverage, trap-census-slips, trap-census-puzzles) and is listed
// in `hand-traps.json` with the board it happens on (`path`) and the slip. This
// script only materialises each chosen trap into a gem the way the miner and
// `build-gem.mjs` do, so it can be read before it ships:
//   - the board must be on a DB opening line (≥ 6 plies, G3);
//   - frequency, games and the student's practical score come from the Lichess
//     explorer at 1000–2000 (the band the course's replies are walked at);
//   - the punishment is the engine's best move, then best play for BOTH sides
//     until the advantage is on the board (the extend-punish-gems terminus:
//     QUIET — no check, the best move is no capture or check — held for two
//     plies, and SHOWN — the student is up material, or mate);
//   - it is graded there; only a trap (≥ +3.0 with material won, or mate)
//     comes out as `trap: true`.
// Writes audit-reports/hand-trap-gems.json; `--write` appends the traps to the
// gem file (never a duplicate gemId). The narration is written by hand after.
//
// Usage: node scripts/course-replies/build-trap-gems.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine, MATE } from './engine.mjs';
import { explorerLookup } from './lichess-explorer.mjs';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const RATINGS = '1000,1200,1400,1600,1800,2000';
const TRAP_CP = 300;
const CAP = 16;
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const material = (c, side) => { let s = 0; for (const row of c.board()) for (const q of row) if (q) s += (q.color === side ? 1 : -1) * (VAL[q.type] ?? 0); return s; };
const uci = (c, u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

let anchors = null;
function anchorPly(sans) {
  if (!anchors) {
    anchors = new Set();
    for (const e of J('src/data/openings-lichess.json')) {
      if (!e?.pgn) continue;
      const mv = e.pgn.split(' ');
      for (let k = 1; k <= mv.length; k++) anchors.add(mv.slice(0, k).join(' '));
    }
  }
  for (let k = sans.length; k >= 1; k--) if (anchors.has(sans.slice(0, k).join(' '))) return k;
  return 0;
}

const explorer = (fen) => explorerLookup(fen, { ratings: RATINGS });

const listArg = process.argv.indexOf('--list');
// `--write-report` adds the report's traps to the gem file without re-running.
const WRITE_ONLY = process.argv.includes('--write-report');
const traps = WRITE_ONLY ? [] : listArg >= 0 ? JSON.parse(readFileSync(process.argv[listArg + 1], 'utf8')) : J('scripts/course-replies/hand-traps.json');
const REPORT = 'audit-reports/hand-trap-gems.json';
const engine = new Engine();
const out = [];
for (const t of traps) {
  const sans = t.path.split(' ');
  const c = new Chess();
  for (const s of sans) c.move(s);
  const student = c.turn() === 'w' ? 'b' : 'w';
  const fen = c.fen();
  const data = await explorer(fen);
  const n = (m) => m.white + m.draws + m.black;
  const total = data ? n(data) : 0;
  const row = data?.moves.find((m) => m.san === t.slip);
  const score = row ? Math.round(100 * ((student === 'w' ? row.white : row.black) + row.draws / 2) / n(row)) : null;

  const p = new Chess(fen);
  p.move(t.slip);
  const mat0 = material(new Chess(fen), student);
  const punishSeq = [];
  let quietRun = 0;
  for (let k = 0; k < CAP; k++) {
    if (p.isGameOver()) break;
    const r = await engine.analyse(p.fen(), { depth: 18 });
    if (!r.best) break;
    const probe = new Chess(p.fen());
    const next = uci(probe, r.best);
    const quiet = !p.inCheck() && !next.captured && !probe.inCheck();
    const shown = material(p, student) - mat0 >= 1;
    quietRun = quiet ? quietRun + 1 : 0;
    // Stop on a quiet, settled board where the student is up material and the
    // student made the last move (a line ends on your move).
    if (punishSeq.length >= 1 && quietRun >= 2 && shown && p.turn() !== student) break;
    punishSeq.push(uci(p, r.best).san);
  }
  // A line that ran to the cap ends on the student's last move.
  while (punishSeq.length > 1 && p.turn() === student) { p.undo(); punishSeq.pop(); }
  const fin = p.isCheckmate() ? { score: -MATE } : await engine.analyse(p.fen(), { depth: 20 });
  const cp = p.turn() === student ? fin.score : -(fin.score ?? 0);
  const won = material(p, student) - mat0;
  const mate = p.isCheckmate() || Math.abs(cp) >= 10000;
  const gem = {
    openingId: t.openingId,
    lineMoves: t.path,
    inaccuracy: t.slip,
    freqPct: row && total ? +(100 * n(row) / total).toFixed(1) : null,
    games: row ? n(row) : null,
    practicalScore: score,
    mainMove: data?.moves?.[0]?.san ?? null,
    punish: punishSeq[0],
    punishSeq,
    playLine: [...sans, t.slip, ...punishSeq].join(' '),
    engineCp: mate ? 100000 * Math.sign(cp) : cp,
    tier: cp >= 100 ? 'confirmed' : cp >= 50 ? 'positional' : 'weak',
    why: '',
  };
  gem.why = `At your level opponents play ${t.slip} here in ${gem.freqPct}% of games. Punish with the best move ${gem.punish} — the engine has ${student === 'w' ? 'White' : 'Black'} ${mate ? 'mating' : `winning (+${(cp / 100).toFixed(1)})`}.`;
  // The app's trap bar (TRAP_BAR, +3.0) with material on the board: a piece
  // for two pawns (+1 net) counts, an eval alone does not.
  const verdict = { anchor: anchorPly(sans), materialWon: won, trap: (cp >= TRAP_CP && won >= 1) || mate, knownMistake: t.kind === 'known-mistake' && cp >= 100 };
  out.push({ ...verdict, gem });
  console.log(`${t.openingId} ${t.slip}: anchor ${verdict.anchor} · ${gem.freqPct}% of ${total} · ${gem.games} games · you score ${score}% · ${gem.punishSeq.join(' ')} · ${gem.engineCp}cp · +${won} · ${verdict.trap ? 'TRAP' : 'not a trap'}`);
}
engine.quit();
// A run over a partial list replaces only its own rows in the report.
const key = (o) => `${o.gem.openingId}|${o.gem.lineMoves}|${o.gem.inaccuracy}`;
let report = [];
try { report = J(REPORT); } catch { /* first run */ }
const mine = new Set(out.map(key));
report = [...report.filter((o) => !mine.has(key(o))), ...out];
writeFileSync(root + REPORT, JSON.stringify(report, null, 1));

if (process.argv.includes('--write') || WRITE_ONLY) {
  const listed = new Set(J('scripts/course-replies/hand-traps.json').map((t) => `${t.openingId}|${t.path}|${t.slip}`));
  const file = 'src/data/punish-gems.json';
  const gems = J(file);
  const id = (g) => `${g.openingId}:${g.lineMoves.replace(/\s+/g, '_')}:${g.inaccuracy}`;
  const have = new Set(gems.map(id));
  let added = 0;
  for (const o of report) {
    // Only a trap still on the hand list ships (a row whose trap turned out to
    // be taught elsewhere is dropped from the list, not from the report). A
    // row listed as a KNOWN MISTAKE ships at a pawn or more (`confirmed`): the
    // course walker punishes it, and it teaches on the principle surfaces.
    if (!(o.trap || o.knownMistake) || o.anchor < 6 || o.gem.games == null || have.has(id(o.gem))) continue;
    if (!listed.has(`${o.gem.openingId}|${o.gem.lineMoves}|${o.gem.inaccuracy}`)) continue;
    gems.push(o.gem);
    added++;
  }
  writeFileSync(root + file, JSON.stringify(gems, null, 2) + '\n');
  console.log(`[trap-gems] ${added} added to ${file}`);
}

// THE FAMOUS-TRAP INDEX, computed from the repo's own named lines (David
// 2026-11-26: "the Theory button finds every famous trap in any opening").
//
// Sources, in the order a name is kept when two name one board:
//   1. the opening index (openings-lichess.json) — every entry whose name
//      carries "Trap" or ends in "Mate";
//   2. the named-trap lessons (Ruy, Italian, Caro, Scotch, Vienna) — a def whose
//      name is a name (no move in it), the lesson's longest line;
//   3. famous-trap-lines.json — named traps no other source carries, each to
//      the move it is known by;
//   4. the courses' trapLines / warningLines whose name carries Trap or Mate.
// For each line the ENGINE finds the slip (the move that loses the most for
// its mover; a famous-trap-lines entry's own last move), chess.js plays every
// move, and the engine reads what the punishment wins at the quiet end of the
// forced line, depth 22, from the punisher's seat. Nothing is spoken here.
//
//   npx tsx scripts/theory/build-famous-traps.mts [--depth 22] [--shard i/n] [--only <name>]
//   npx tsx scripts/theory/build-famous-traps.mts --merge   (every shard file → the index)
//   → src/data/famous-traps.json (progress: audit-reports/famous-traps.progress)
import { Chess } from 'chess.js';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync } from 'node:fs';
import { RUY_TRAP_DEFS, RUY_TRAP_LESSONS } from '../../src/data/lessons/ruyTrapLessons';
import { ITALIAN_GAME_TRAP_DEFS, ITALIAN_GAME_TRAP_LESSONS } from '../../src/data/lessons/italianGameTrapLessons';
import { CARO_TRAP_DEFS, CARO_TRAP_LESSONS } from '../../src/data/lessons/caroKannTrapLessons';
import { SCOTCH_GAME_TRAP_DEFS, SCOTCH_GAME_TRAP_LESSONS } from '../../src/data/lessons/scotchGameTrapLessons';
import { VIENNA_TRAP_DEFS, VIENNA_TRAP_LESSONS } from '../../src/data/lessons/viennaTrapLessons';

const arg = (k: string): string | null => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] ?? null : null; };
const DEPTH = Number(arg('--depth') ?? 22);
const SCAN_DEPTH = 12;
const ONLY = arg('--only');
const SHARD = arg('--shard'); // i/n: this process reads every n-th line
const MERGE = process.argv.includes('--merge');
const MATE = 100_000;
const FLOOR = 50; // the known-mistake floor: below it the move loses nothing worth a name
const PROGRESS = `audit-reports/famous-traps${SHARD ? `.shard-${SHARD.split('/')[0]}` : ''}.progress`;
mkdirSync('audit-reports', { recursive: true });
writeFileSync(PROGRESS, '');
const log = (s: string): void => { appendFileSync(PROGRESS, `${s}\n`); console.log(s); };

// ── one engine, kept open ────────────────────────────────────────────────────
class Engine {
  private p: ChildProcessWithoutNullStreams;
  private buf = '';
  private waiter: ((s: string) => void) | null = null;
  constructor() {
    this.p = spawn('node', ['node_modules/stockfish/bin/stockfish-18-single.js']);
    this.p.stdout.on('data', (d: Buffer) => {
      this.buf += d.toString();
      if (this.waiter && /\nbestmove [^\n]*\n/.test(this.buf)) { const b = this.buf; this.buf = ''; const w = this.waiter; this.waiter = null; w(b); }
    });
    this.p.stdin.write('uci\nsetoption name Hash value 128\nisready\n');
  }
  /** Score for the side to move (cp, mate as ±MATE) and the line. */
  read(fen: string, depth: number): Promise<{ cp: number; pv: string[] }> {
    return new Promise((resolve) => {
      this.buf = '';
      this.waiter = (out) => {
        const last = [...out.matchAll(/info depth \d+ .*?score (cp|mate) (-?\d+).*? pv ([^\n]+)/g)].pop();
        if (!last) { resolve({ cp: new Chess(fen).isCheckmate() ? -MATE : 0, pv: [] }); return; }
        const v = Number(last[2]);
        resolve({ cp: last[1] === 'mate' ? (v > 0 ? MATE : -MATE) : v, pv: last[3].trim().split(/\s+/) });
      };
      this.p.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    });
  }
  quit(): void { this.p.kill(); }
}
const eng = new Engine();
const evalFor = async (fen: string, depth: number): Promise<number> => {
  const c = new Chess(fen);
  if (c.isCheckmate()) return -MATE;
  if (c.isDraw()) return 0;
  return (await eng.read(fen, depth)).cp;
};
const toSans = (fen: string, pv: readonly string[]): string[] => {
  const c = new Chess(fen); const out: string[] = [];
  for (const u of pv) { try { out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san); } catch { break; } }
  return out;
};

// ── the named lines ──────────────────────────────────────────────────────────
interface Named { name: string; source: string; moves: string[]; slipIsLast: boolean }
const named: Named[] = [];
const clean = (n: string): string => n.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+[—–-]\s+.*$/, '').replace(/^(?:Weapon|Watch out):\s*/i, '').replace(/^the\s+/i, '').trim();
const TRAP_WORD = /\btrap\b|\bmate\b/i;
const SAN_IN_NAME = /\b(?:[NBRQK][a-h]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|O-O)\b/;

for (const e of JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8')) as Array<{ name: string; pgn: string }>) {
  const seg = e.name.split(/[:,]/).map((s) => s.trim()).reverse().find((s) => /\bTrap$|\bMate$/i.test(s));
  if (seg) named.push({ name: seg, source: `opening index: ${e.name}`, moves: e.pgn.split(/\s+/), slipIsLast: false });
}
const lessonSets: Array<[Array<{ id: string; name: string }>, Record<string, { beats: Array<{ moves?: string[] | string }> }>]> = [
  [RUY_TRAP_DEFS, RUY_TRAP_LESSONS as never], [ITALIAN_GAME_TRAP_DEFS, ITALIAN_GAME_TRAP_LESSONS as never], [CARO_TRAP_DEFS, CARO_TRAP_LESSONS as never],
  [SCOTCH_GAME_TRAP_DEFS, SCOTCH_GAME_TRAP_LESSONS as never], [VIENNA_TRAP_DEFS, VIENNA_TRAP_LESSONS as never],
];
for (const [defs, lessons] of lessonSets) {
  for (const d of defs) {
    if (SAN_IN_NAME.test(d.name) || !TRAP_WORD.test(d.name) || /only-move/i.test(d.name)) continue;
    const l = lessons[d.id];
    if (!l) continue;
    const lines = l.beats.map((b) => (Array.isArray(b.moves) ? b.moves : (b.moves ?? '').split(/\s+/).filter(Boolean)));
    const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), [] as string[]);
    if (longest.length) named.push({ name: clean(d.name), source: `lesson: ${d.id}`, moves: longest, slipIsLast: false });
  }
}
for (const e of (JSON.parse(readFileSync('src/data/famous-trap-lines.json', 'utf8')) as { lines: Array<{ name: string; moves: string; ref: string }> }).lines) {
  named.push({ name: e.name, source: `famous-trap-lines: ${e.ref}`, moves: e.moves.split(/\s+/), slipIsLast: true });
}
for (const f of ['repertoire', 'pro-repertoires', 'gambits', 'anti-openings']) {
  const d = JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8')) as unknown;
  const all = (Array.isArray(d) ? d : Object.values(d as object).flat()) as Array<{ trapLines?: Array<{ name?: string; pgn?: string }>; warningLines?: Array<{ name?: string; pgn?: string }> }>;
  for (const o of all) {
    for (const t of [...(o.trapLines ?? []), ...(o.warningLines ?? [])]) {
      if (t.name && t.pgn && TRAP_WORD.test(t.name) && !SAN_IN_NAME.test(clean(t.name))) named.push({ name: clean(t.name), source: `${f}: ${t.name}`, moves: t.pgn.split(/\s+/), slipIsLast: false });
    }
  }
}

// ── each line: the slip, the punishment, what it wins ──────────────────────
interface FamousTrap { order: number; name: string; source: string; line: string; board: string; slip: string; by: 'w' | 'b'; punish: string[]; endCp: number; mate: boolean }
const out: FamousTrap[] = [];
const boardKey = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');
const seen = new Set<string>();

if (MERGE) {
  const all: FamousTrap[] = [];
  for (const f of readdirSync('audit-reports').filter((x) => /^famous-traps\.shard-.*\.json$/.test(x))) all.push(...(JSON.parse(readFileSync(`audit-reports/${f}`, 'utf8')) as FamousTrap[]));
  all.sort((a, b) => a.order - b.order);
  const keep = new Map<string, FamousTrap>();
  for (const t of all) {
    // A famous-trap-lines entry is the move the trap is known by: always kept.
    // The opening index's line ends on its trap, so a pawn is enough there;
    // a course's or lesson's long line needs a pawn and a half (a gambit's
    // first move is no trap: the anti-openings' "Englund Queen Trap" read …e5).
    if (!t.mate && !t.source.startsWith('famous-trap-lines') && t.endCp < (t.source.startsWith('opening index') ? 100 : 150)) continue;
    const key = `${t.board}|${t.slip}`;
    if (!keep.has(key)) keep.set(key, t);
  }
  const traps = [...keep.values()];
  writeFileSync('src/data/famous-traps.json', `${JSON.stringify({ meta: { depth: DEPTH, built: new Date().toISOString().slice(0, 10), traps: traps.length }, traps }, null, 1)}\n`);
  console.log(`merged ${traps.length}`);
  eng.quit();
  process.exit(0);
}
const [shardI, shardN] = SHARD ? SHARD.split('/').map(Number) : [0, 1];
for (const [order, n] of named.entries()) {
  if (order % shardN !== shardI) continue;
  if (ONLY && n.name !== ONLY) continue;
  const fens: string[] = []; const sans: string[] = [];
  const c = new Chess();
  fens.push(c.fen());
  let legal = true;
  for (const m of n.moves) { try { sans.push(c.move(m).san); fens.push(c.fen()); } catch { legal = false; break; } }
  if (!legal) { log(`✗ ${n.name} (${n.source}): illegal move in the line`); continue; }
  // The slip: the FIRST move of the side that ends up losing that costs it a
  // pawn and a half (the trap is sprung there, not on the last blunder of the
  // punished side); else the move that loses the most.
  let k = sans.length - 1;
  if (!n.slipIsLast) {
    const ev: number[] = [];
    for (const f of fens) ev.push(await evalFor(f, SCAN_DEPTH)); // side to move at each board
    const endTurn = new Chess(fens[fens.length - 1]).turn();
    const endEv = ev[ev.length - 1];
    const loser: 'w' | 'b' = endEv >= 0 ? (endTurn === 'w' ? 'b' : 'w') : endTurn;
    const drop = (i: number): number => Math.min(ev[i] + ev[i + 1], 3000); // mover before − mover after
    const first = sans.findIndex((_, i) => new Chess(fens[i]).turn() === loser && drop(i) >= 150);
    if (first >= 0) k = first;
    else { let best = -Infinity; for (let i = 0; i < sans.length; i += 1) if (drop(i) > best) { best = drop(i); k = i; } }
  }
  const fen = fens[k]; const slip = sans[k]; const by = new Chess(fen).turn();
  const key = `${boardKey(fen)}|${slip}`;
  // What the slip loses at depth: the punisher's read after it, then the
  // quiet end of the forced line.
  const after = fens[k + 1];
  const read = new Chess(after).isCheckmate() ? { cp: -MATE, pv: [] as string[] } : await eng.read(after, DEPTH);
  const punisherCp = read.cp; // the side to move after the slip is the punisher
  const engineLine = toSans(after, read.pv);
  const own = sans.slice(k + 1);
  let punish = own.length ? own : engineLine;
  let mate = Math.abs(read.cp) >= MATE || /#$/.test(slip);
  if (/#$/.test(slip)) { punish = []; mate = true; }
  if (own.length && engineLine[0] && own[0] !== engineLine[0]) {
    // The line's own blow, read against the engine's: keep it when it wins
    // within a pawn of the best.
    const q = new Chess(after); q.move(own[0]);
    const ownCp = -(await evalFor(q.fen(), DEPTH - 4));
    if (ownCp < punisherCp - 100 && !(mate && ownCp >= MATE)) punish = engineLine;
  }
  if (punish === own && !mate && !/#$/.test(own[own.length - 1] ?? '') && own.length < 8) {
    // The line stops before the material settles: the engine plays on from
    // its end, to the quiet board and a move past it.
    const q = new Chess(after); for (const s of own) q.move(s);
    if (!q.isGameOver()) {
      const more = toSans(q.fen(), (await eng.read(q.fen(), DEPTH - 4)).pv);
      const r = new Chess(q.fen()); const add: string[] = [];
      for (const s of more) { if (own.length + add.length >= 10) break; const m = r.move(s); add.push(s); if (!m.captured && !r.inCheck() && add.length >= 2 && !more[add.length]?.includes('x')) break; }
      punish = [...own, ...add];
    }
  }
  // Never stop on a capture the other side takes back.
  for (let guard = 0; guard < 4 && punish.length; guard += 1) {
    const q = new Chess(after); let ok = true;
    for (const s of punish) { try { q.move(s); } catch { ok = false; break; } }
    if (!ok || q.isGameOver()) break;
    const last = q.history({ verbose: true }).pop();
    if (!last?.captured) break;
    const next = toSans(q.fen(), (await eng.read(q.fen(), 12)).pv)[0];
    const m = next ? new Chess(q.fen()).move(next) : null;
    if (!m || m.to !== last.to) break;
    punish = [...punish, next];
  }
  let endCp = punisherCp;
  if (!mate) {
    const q = new Chess(after); let forced = 0;
    for (const s of engineLine) { const m = q.move(s); if (!m.captured && !q.inCheck()) { q.undo(); break; } forced += 1; }
    if (forced > 0) { const quiet = await evalFor(q.fen(), DEPTH); endCp = forced % 2 === 0 ? quiet : -quiet; }
    if (Math.abs(endCp) >= MATE) mate = true;
  }
  // A famous-trap-lines entry is the move the trap is known by: it is kept
  // whatever the engine finds, and said by what the engine finds.
  if (!mate && endCp < FLOOR && !n.slipIsLast) { log(`· ${n.name}: ${slip} costs ${endCp}cp at the quiet end — no slip (${n.source})`); continue; }
  seen.add(key);
  if (SHARD && !ONLY) writeFileSync(`audit-reports/famous-traps.shard-${shardI}.json`, JSON.stringify(out));
  // A punish line ends where the material settles: the trap's own line, or
  // the engine's to its quiet end and two moves on.
  if (punish === engineLine) {
    const q = new Chess(after); let n2 = 0;
    for (const s of engineLine) { const m = q.move(s); n2 += 1; if (!m.captured && !q.inCheck() && n2 >= 2) break; }
    punish = engineLine.slice(0, Math.max(1, Math.min(n2 + 1, 8)));
  }
  out.push({ order, name: n.name, source: n.source, line: sans.slice(0, k).join(' '), board: boardKey(fen), slip, by, punish, endCp: mate ? 0 : endCp, mate });
  log(`✓ ${n.name}: ${by === 'b' ? '…' : ''}${slip} → ${punish.join(' ')}  ${mate ? 'mate' : `${endCp}cp`}  (${n.source})`);
}
eng.quit();
writeFileSync(ONLY ? `audit-reports/famous-traps.shard-only-${ONLY.replace(/\W+/g, '_')}.json` : SHARD ? `audit-reports/famous-traps.shard-${shardI}.json` : 'audit-reports/famous-traps.shard-0.json', JSON.stringify(out));
log(`DONE ${out.length} traps`);

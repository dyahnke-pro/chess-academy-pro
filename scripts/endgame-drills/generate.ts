// ENDGAME CONCEPT DRILLS — our own positions, computed (David 2026-10-01: "We
// need to get the concepts and be able to teach on our own. Set up similar
// drills and positions. Not exactly and only the ones he does. We need to be
// able to compute his teachings so it's our positions in our own words.").
//
// For each concept computer from the endgame comb, sample legal pawn endings
// (≤7 pieces) and KEEP a position only when the computer fires on it AND the
// tablebase confirms what the lesson claims. The solution is the tablebase's
// best line; the explanation is the computer's own sentence. Nothing is
// authored from memory; a position that cannot be proven is dropped.
//
//   npx tsx scripts/endgame-drills/generate.ts [perConcept=6]
//
// Output: src/data/endgame-concept-drills.json. Tablebase answers are cached in
// /tmp/claude-0/eg/tb-cache.json so reruns are cheap.
import { Chess } from 'chess.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { outsidePasserDecoy, kingCourse, findBreakthrough } from '../../src/services/endgamePawnReads';
import { readZugzwang, findTriangulation, triangulationSentence, type ZugzwangRead } from '../../src/services/zugzwang';
import { detectPlanRace, planRaceClause } from '../../src/services/planRace';
import type { TablebaseMovesResult } from '../../src/services/endgameTablebaseService';
import { queenVsSeventh } from '../../src/services/queenVsPawn';

const PER = Number(process.argv[2] ?? 6);
/** Optional: only these concepts; the rest are kept from the existing file. */
const ONLY = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const CACHE = '/tmp/claude-0/eg/tb-cache.json';
mkdirSync('/tmp/claude-0/eg', { recursive: true });
const cache: Record<string, TablebaseMovesResult | null> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function tb(fen: string): Promise<TablebaseMovesResult | null> {
  if (fen in cache) return cache[fen];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const r = await fetch(`https://chess-academy-pro.vercel.app/api/lichess-tablebase?fen=${encodeURIComponent(fen)}`);
      if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!r.ok) { cache[fen] = null; return null; }
      const j = await r.json() as { category: TablebaseMovesResult['category']; moves: Array<{ uci: string; san: string; category: TablebaseMovesResult['category']; dtz: number | null; dtm: number | null; checkmate: boolean; stalemate: boolean }> };
      const res: TablebaseMovesResult = { category: j.category, moves: j.moves.map((m) => ({ uci: m.uci, san: m.san, category: m.category, dtz: m.dtz ?? null, dtm: m.dtm ?? null, checkmate: !!m.checkmate, stalemate: !!m.stalemate })) };
      cache[fen] = res;
      await sleep(250);
      return res;
    } catch { await sleep(1000); }
  }
  return null;
}

// ── random legal pawn endings ──────────────────────────────────────────────
let seed = 20261001;
const rnd = (n: number): number => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 16) % n; };
const FILES = 'abcdefgh';
function randomPawnEnding(wp: number, bp: number, stm: 'w' | 'b', opposed = false): string | null {
  const board: Record<string, string> = {};
  const free = (sq: string): boolean => !board[sq];
  const place = (p: string, ranks: [number, number]): boolean => {
    for (let t = 0; t < 40; t += 1) {
      const sq = `${FILES[rnd(8)]}${ranks[0] + rnd(ranks[1] - ranks[0] + 1)}`;
      if (free(sq)) { board[sq] = p; return true; }
    }
    return false;
  };
  if (opposed) {
    // The king IN FRONT of its pawn, kings in opposition — zugzwang's home
    // (the textbook K+P vs K family), varied by file, rank and side pawns.
    const f = FILES[1 + rnd(6)]; const r = 3 + rnd(3);
    board[`${f}${r - 1}`] = 'P'; board[`${f}${r}`] = 'K'; board[`${f}${r + 2}`] = 'k';
    wp -= 1;
  } else if (!place('K', [1, 8]) || !place('k', [1, 8])) return null;
  for (let i = 0; i < wp; i += 1) if (!place('P', [2, 6])) return null;
  for (let i = 0; i < bp; i += 1) if (!place('p', [3, 7])) return null;
  const rows: string[] = [];
  for (let r = 8; r >= 1; r -= 1) {
    let row = ''; let empty = 0;
    for (const f of FILES) { const p = board[`${f}${r}`]; if (p) { if (empty) row += empty; empty = 0; row += p; } else empty += 1; }
    if (empty) row += empty;
    rows.push(row);
  }
  const fen = `${rows.join('/')} ${stm} - - 0 1`;
  try {
    const c = new Chess(fen);
    // the side NOT to move may not be in check
    const flip = new Chess(fen.replace(` ${stm} `, ` ${stm === 'w' ? 'b' : 'w'} `));
    if (flip.inCheck() || c.isGameOver()) return null;
    return fen;
  } catch { return null; }
}

/** Triangulation's home: a locked pawn pair (white on rank r, black on r+1,
 *  same file), a spare pawn, and the kings close to the blocked pair. */
function lockedPawnEnding(): string | null {
  const f = 1 + rnd(6); const r = 3 + rnd(3);
  const sq = (ff: number, rr: number): string => `${FILES[ff]}${rr}`;
  const pieces: Record<string, string> = { [sq(f, r)]: 'P', [sq(f, r + 1)]: 'p' };
  const extra = sq(Math.max(0, Math.min(7, f + (rnd(2) ? 2 : -2))), r + (rnd(2) ? 1 : 0));
  if (!pieces[extra]) pieces[extra] = rnd(2) ? 'P' : 'p';
  const kingNear = (p: string): boolean => {
    for (let t = 0; t < 30; t += 1) {
      const s2 = sq(Math.max(0, Math.min(7, f - 2 + rnd(5))), Math.max(1, Math.min(8, r - 1 + rnd(4))));
      if (!pieces[s2]) { pieces[s2] = p; return true; }
    }
    return false;
  };
  if (!kingNear('K') || !kingNear('k')) return null;
  const rows: string[] = [];
  for (let rr = 8; rr >= 1; rr -= 1) {
    let row = ''; let e = 0;
    for (let ff = 0; ff < 8; ff += 1) { const p = pieces[sq(ff, rr)]; if (p) { if (e) row += e; e = 0; row += p; } else e += 1; }
    if (e) row += e; rows.push(row);
  }
  const stm = rnd(2) ? 'w' : 'b';
  const fen = `${rows.join('/')} ${stm} - - 0 1`;
  try {
    const c = new Chess(fen);
    if (new Chess(fen.replace(` ${stm} `, ` ${stm === 'w' ? 'b' : 'w'} `)).inCheck() || c.isGameOver()) return null;
    if (/[Pp]/.test(rows[0] + rows[7])) return null;
    return fen;
  } catch { return null; }
}

/** Queen against a pawn on its seventh, its king beside it, the queen side to move. */
function queenSeventh(): string | null {
  const qSide = rnd(2) ? 'w' : 'b';
  const pf = rnd(8); const pr = qSide === 'w' ? 2 : 7; // the defender's pawn on ITS seventh
  const pieces: Record<string, string> = {};
  const sq = (f: number, r: number): string => `${FILES[f]}${r}`;
  pieces[sq(pf, pr)] = qSide === 'w' ? 'p' : 'P';
  const dk = sq(Math.max(0, Math.min(7, pf - 1 + rnd(3))), Math.max(1, Math.min(8, pr - 1 + rnd(3))));
  if (pieces[dk]) return null;
  pieces[dk] = qSide === 'w' ? 'k' : 'K';
  for (const p of [qSide === 'w' ? 'Q' : 'q', qSide === 'w' ? 'K' : 'k']) {
    let ok = false;
    for (let t = 0; t < 30 && !ok; t += 1) { const s2 = sq(rnd(8), 1 + rnd(8)); if (!pieces[s2]) { pieces[s2] = p; ok = true; } }
    if (!ok) return null;
  }
  const rows: string[] = [];
  for (let rr = 8; rr >= 1; rr -= 1) {
    let row = ''; let e = 0;
    for (let ff = 0; ff < 8; ff += 1) { const p = pieces[sq(ff, rr)]; if (p) { if (e) row += e; e = 0; row += p; } else e += 1; }
    if (e) row += e; rows.push(row);
  }
  const fen = `${rows.join('/')} ${qSide} - - 0 1`;
  try {
    const c = new Chess(fen);
    if (new Chess(fen.replace(` ${qSide} `, ` ${qSide === 'w' ? 'b' : 'w'} `)).inCheck() || c.isGameOver()) return null;
    return fen;
  } catch { return null; }
}

/** Facing pawn groups (the breakthrough's home): 2-3 white pawns side by side
 *  and black pawns on the same files two ranks ahead, kings away from them. */
function facingPawns(): string | null {
  const n = 2 + rnd(2); const f0 = rnd(9 - n); const wr = 4 + rnd(2);
  const pieces: Record<string, string> = {};
  const sq = (f: number, r: number): string => `${FILES[f]}${r}`;
  const white = rnd(2) === 0;
  for (let i = 0; i < n; i += 1) {
    pieces[sq(f0 + i, white ? wr : 9 - wr)] = white ? 'P' : 'p';
    pieces[sq(f0 + i, white ? wr + 2 : 7 - wr)] = white ? 'p' : 'P';
  }
  for (const k of ['K', 'k']) {
    let ok = false;
    for (let t = 0; t < 30 && !ok; t += 1) {
      const f = rnd(8); const r = 1 + rnd(8);
      if (Math.abs(f - (f0 + n / 2)) < 3) continue;
      if (!pieces[sq(f, r)]) { pieces[sq(f, r)] = k; ok = true; }
    }
    if (!ok) return null;
  }
  const rows: string[] = [];
  for (let rr = 8; rr >= 1; rr -= 1) {
    let row = ''; let e = 0;
    for (let ff = 0; ff < 8; ff += 1) { const p = pieces[sq(ff, rr)]; if (p) { if (e) row += e; e = 0; row += p; } else e += 1; }
    if (e) row += e; rows.push(row);
  }
  const stm = white ? 'w' : 'b';
  const fen = `${rows.join('/')} ${stm} - - 0 1`;
  try {
    const c = new Chess(fen);
    if (new Chess(fen.replace(` ${stm} `, ` ${stm === 'w' ? 'b' : 'w'} `)).inCheck() || c.isGameOver()) return null;
    return fen;
  } catch { return null; }
}

interface Drill {
  id: string; concept: string; lessonIds: string[]; fen: string; title: string; explanation: string;
  result: 'white-wins' | 'black-wins' | 'draw'; bestMove: string; solution: string[]; source: string; conceptHint: string;
}
const resultOf = (fen: string, cat: string): Drill['result'] => {
  const stm = fen.split(' ')[1];
  if (cat === 'draw' || cat === 'cursed-win' || cat === 'blessed-loss') return 'draw';
  const stmWins = cat === 'win';
  return (stm === 'w') === stmWins ? 'white-wins' : 'black-wins';
};

/** The tablebase's best line from `fen`, up to `plies`, SAN. */
async function bestLine(fen: string, plies: number): Promise<string[]> {
  const out: string[] = [];
  let f = fen;
  for (let i = 0; i < plies; i += 1) {
    const r = await tb(f);
    const m = r?.moves[0];
    if (!m) break;
    const c = new Chess(f);
    const mv = c.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
    if (!mv) break;
    out.push(mv.san);
    f = c.fen();
    if (c.isGameOver()) break;
  }
  return out;
}

const RES = ['loses', 'is a draw', 'wins'];
/** Zugzwang in demo voice (White/Black): on the mover's turn vs if they could pass. */
function zzDemo(z: ZugzwangRead, side: string, other: string): string {
  const passed = z.ifPassed === 1 ? `${side} would win` : `${side} would hold the draw`;
  return `${side} to move — and that is the problem. On ${side}'s move this ${RES[z.onMove + 1]} for ${side}; if it were ${other}'s move, ${passed}. Neither side wants to move here: in pawn endings, who has to move decides it.`;
}

const OUT = 'src/data/endgame-concept-drills.json';
const kept: Drill[] = ONLY && existsSync(OUT) ? (JSON.parse(readFileSync(OUT, 'utf8')) as Drill[]).filter((d) => !ONLY.has(d.concept)) : [];
const drills: Drill[] = [];
const have = (concept: string): number => drills.filter((d) => d.concept === concept).length;
const seen = new Set<string>();

async function tryConcept(concept: string, fen: string): Promise<void> {
  if (have(concept) >= PER || seen.has(`${concept}|${fen}`)) return;
  seen.add(`${concept}|${fen}`);
  const stm = fen.split(' ')[1] as 'w' | 'b';
  const side = stm === 'w' ? 'White' : 'Black';
  const other = stm === 'w' ? 'Black' : 'White';
  if (concept === 'zugzwang') {
    // Kings near each other is where zugzwang lives; elsewhere the two
    // tablebase calls are almost always spent for nothing.
    const ks = [...new Chess(fen).board().flat()].filter((x) => x?.type === 'k').map((x) => x!.square);
    const d = Math.max(Math.abs(ks[0].charCodeAt(0) - ks[1].charCodeAt(0)), Math.abs(Number(ks[0][1]) - Number(ks[1][1])));
    if (d > 2) return;
    const z = await readZugzwang(fen, tb);
    if (!z) return;
    const r = await tb(fen);
    if (!r) return;
    const line = await bestLine(fen, 6);
    drills.push({ id: `ecd-zz-${have(concept)}`, concept, lessonIds: ['opposition', 'triangulation'], fen, title: z.mutual ? 'Mutual zugzwang' : 'Zugzwang', explanation: zzDemo(z, side, stm === 'w' ? 'Black' : 'White'), result: resultOf(fen, r.category), bestMove: line[0] ?? '', solution: line, source: 'computed: tablebase (move vs pass)', conceptHint: 'Who has to move decides it.' });
    return;
  }
  // THE SOLUTION MUST BE THE IDEA. A computer firing is not enough: the
  // tablebase's best move has to be the concept in action, or the drill would
  // teach one thing and play another (first run: a "chart a course" drill whose
  // winning line was a pawn race).
  const best = async (): Promise<{ san: string; from: string; to: string; piece: string } | null> => {
    const r = await tb(fen);
    const m = r?.moves[0];
    if (!m) return null;
    const mv = new Chess(fen).move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
    return mv ? { san: mv.san, from: mv.from, to: mv.to, piece: mv.piece } : null;
  };
  const cheb = (a: string, b: string): number => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));
  if (concept === 'breakthrough') {
    const r = await tb(fen);
    if (!r || r.category !== 'win') return;
    const line = await bestLine(fen, 12);
    const bt = findBreakthrough(fen, line);
    if (!bt) return;
    drills.push({ id: `ecd-bt-${have(concept)}`, concept, lessonIds: ['breakthrough', 'push-passed-pawns'], fen, title: 'The breakthrough', explanation: `${side} to move and win. ${bt.sac} gives a pawn away to open a lane: whichever pawn takes it, another of ${side}'s pawns runs through and queens on ${bt.queens} before ${other}'s king can catch it.`, result: resultOf(fen, r.category), bestMove: line[0] ?? '', solution: line, source: 'computed: pawn sacrifice then promotion, tablebase line', conceptHint: 'Sacrifice a pawn to open a lane.' });
    return;
  }
  if (concept === 'q7') {
    const rule = queenVsSeventh(fen);
    if (!rule || rule.queenSide !== stm) return;
    const r = await tb(fen);
    if (!r) return;
    const got = r.category === 'win' ? 'win' : r.category === 'draw' || r.category === 'cursed-win' || r.category === 'blessed-loss' ? 'draw' : 'loss';
    if (got !== rule.expect) return; // the position must follow the rule it is teaching
    const line = await bestLine(fen, 10);
    const qs = stm === 'w' ? 'White' : 'Black';
    drills.push({ id: `ecd-q7-${have(concept)}`, concept, lessonIds: ['rule-of-the-square', 'push-passed-pawns'], fen, title: rule.expect === 'win' ? 'Queen against a pawn on the seventh — the win' : 'Queen against a pawn on the seventh — the draw', explanation: `${qs} to move. ${rule.text} ${rule.expect === 'win' ? `${qs} wins.` : `Best play is a draw.`}`, result: resultOf(fen, r.category), bestMove: line[0] ?? '', solution: line, source: 'computed: file rule + tablebase agrees', conceptHint: rule.expect === 'win' ? 'Check, pin, and bring the king.' : 'The corner and stalemate save the pawn.' });
    return;
  }
  if (concept === 'triangle') {
    const r = await tb(fen);
    if (!r || r.category !== 'win') return;
    const line = await bestLine(fen, 11);
    const t = findTriangulation(fen, line);
    if (!t) return;
    const full = await bestLine(fen, 16);
    drills.push({ id: `ecd-tri-${have(concept)}`, concept, lessonIds: ['triangulation', 'opposition'], fen, title: 'Triangulation', explanation: `${triangulationSentence(side, other, t)} ${side} to move and win.`, result: resultOf(fen, r.category), bestMove: full[0] ?? '', solution: full, source: 'computed: tablebase line returns to the same position, other side to move', conceptHint: 'Lose a tempo: walk a triangle and come back.' });
    return;
  }
  if (concept === 'decoy') {
    const read = outsidePasserDecoy(fen, stm);
    if (!read) return;
    const r = await tb(fen); const bm = await best();
    if (!r || r.category !== 'win' || !bm || bm.piece !== 'p' || bm.from !== read.passer) return; // the passer runs
    const line = await bestLine(fen, 8);
    drills.push({ id: `ecd-decoy-${have(concept)}`, concept, lessonIds: ['push-passed-pawns', 'breakthrough'], fen, title: 'The outside passer as a decoy', explanation: `${side} to move and win. The passed pawn on ${read.passer} is far from everything else — push it, and ${other}'s king has to walk over to stop it. While it does, ${side}'s king takes the pawns on the ${read.wing}.`, result: resultOf(fen, r.category), bestMove: bm.san, solution: line, source: 'computed: concept computer + tablebase win', conceptHint: 'Use the far passer to pull their king away.' });
    return;
  }
  if (concept === 'course') {
    const read = kingCourse(fen, stm);
    if (!read) return;
    const r = await tb(fen); const bm = await best();
    if (!r || r.category !== 'win' || !bm || bm.piece !== 'k') return;
    if (cheb(bm.to, read.target) >= cheb(bm.from, read.target)) return; // the king heads for it
    if (new Chess(fen).get(bm.to as Parameters<Chess['get']>[0]) && bm.to !== read.target) return; // and takes nothing else on the way
    const line = await bestLine(fen, 8);
    drills.push({ id: `ecd-course-${have(concept)}`, concept, lessonIds: ['activate-the-king', 'attack-weak-pawns'], fen, title: 'Chart a course', explanation: `${side} to move and win. ${other}'s pawn on ${read.target} has no pawn that can ever defend it, so that is where ${side}'s king is going — not to the centre, to the target.`, result: resultOf(fen, r.category), bestMove: bm.san, solution: line, source: 'computed: concept computer + tablebase win', conceptHint: 'The king goes to the weak pawn.' });
    return;
  }
  if (concept === 'race') {
    const race = detectPlanRace(fen, stm);
    if (!race || race.kind !== 'passer-race' || !race.firstQueenCovers || !race.youQueenFirst) return;
    const r = await tb(fen); const bm = await best();
    if (!r || r.category !== 'win' || !bm || bm.piece !== 'p' || bm.from !== race.yourPawn) return; // the runner runs
    const line = await bestLine(fen, 8);
    const promo = `${race.theirPawn[0]}${stm === 'w' ? 1 : 8}`;
    drills.push({ id: `ecd-race-${have(concept)}`, concept, lessonIds: ['rule-of-the-square', 'push-passed-pawns'], fen, title: 'The race, and the first queen', explanation: `${side} to move and win. Count it: the pawn on ${race.yourPawn} needs ${race.yourPushes}, the one on ${race.theirPawn} needs ${race.theirPushes} — ${side} queens first, and the new queen covers ${promo}, so ${other}'s pawn never promotes.`, result: resultOf(fen, r.category), bestMove: bm.san, solution: line, source: 'computed: race count + tablebase win', conceptHint: 'Count the pushes — and where the new queen stands.' });
  }
}

async function main(): Promise<void> {
  const concepts = ['decoy', 'course', 'race', 'zugzwang', 'triangle', 'q7', 'breakthrough'].filter((c) => !ONLY || ONLY.has(c));
  for (let n = 0; n < 6000 && concepts.some((c) => have(c) < PER); n += 1) {
    const wp = 1 + rnd(3); const bp = 1 + rnd(3);
    if (wp + bp + 2 > 7) continue;
    const fen = randomPawnEnding(wp, bp, rnd(2) ? 'w' : 'b');
    if (fen) for (const c of concepts) if (c !== 'triangle' && c !== 'q7' && c !== 'breakthrough') await tryConcept(c, fen);
    if (concepts.includes('breakthrough') && have('breakthrough') < PER) {
      const bfen = facingPawns();
      if (bfen) await tryConcept('breakthrough', bfen);
    }
    if (concepts.includes('q7') && have('q7') < PER) {
      const qfen = queenSeventh();
      if (qfen) await tryConcept('q7', qfen);
    }
    if (concepts.includes('triangle') && have('triangle') < PER) {
      const tfen = lockedPawnEnding();
      if (tfen) await tryConcept('triangle', tfen);
    }
    if (concepts.includes('zugzwang') && have('zugzwang') < PER) {
      const zfen = randomPawnEnding(1 + rnd(2), rnd(2), rnd(2) ? 'w' : 'b', true);
      if (zfen) await tryConcept('zugzwang', zfen);
    }
    if (n % 200 === 0) { writeFileSync(CACHE, JSON.stringify(cache)); writeFileSync(OUT, `${JSON.stringify([...kept, ...drills], null, 2)}\n`); console.log(`[gen] n=${n} ${concepts.map((c) => `${c}=${have(c)}`).join(' ')}`); }
  }
  writeFileSync(CACHE, JSON.stringify(cache));
  writeFileSync(OUT, `${JSON.stringify([...kept, ...drills], null, 2)}\n`);
  console.log(`[gen] wrote ${drills.length} drills: ${['decoy', 'course', 'race', 'zugzwang', 'triangle', 'q7', 'breakthrough'].map((c) => `${c}=${have(c)}`).join(' ')}`);
}
void main();

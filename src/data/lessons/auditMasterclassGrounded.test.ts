// DIAGNOSTIC (not a gate) — grounded audit of MASTERCLASS content only.
// Bar (playbook §0.6 + line 174): a STUDENT ply is wrong only if it is
// NEITHER master-played (local masters DB) NOR engine-sound (≤120cp vs best).
// Opponent moves (incl. trap bait) are exempt — we don't optimise their play.
// Covers: middlegame PLANS + main/variation LESSON lines + TRAPS, scoped to
// FIRST_CLASS (masterclass) openings.
//
//   RUN_GROUNDED=1 STOCKFISH_PATH=/usr/games/stockfish \
//     npx vitest run src/data/lessons/auditMasterclassGrounded.test.ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { ALL_LESSONS, FIRST_CLASS_OPENING_IDS } from './registry';
import { longestAnchorPly } from '../../utils/dbAnchor';

const RUN = !!process.env.RUN_GROUNDED;
function resolveSF(): string | null {
  for (const p of [process.env.STOCKFISH_PATH, '/usr/games/stockfish', '/usr/bin/stockfish']) if (p && existsSync(p)) return p;
  return null;
}
const SF = resolveSF();
const DEPTH = 16, MAX = 120;
const DB = (JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')) as { positions: Record<string, { san: string }[]> }).positions;
const k4 = (f: string) => f.split(' ').slice(0, 4).join(' ');
const MC = new Set(FIRST_CLASS_OPENING_IDS);

const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf8'));
const planColor: Record<string, 'white' | 'black'> = {};
for (const s of [rep, pro]) if (Array.isArray(s)) for (const o of s) if (o?.id && o?.color) planColor[o.id] = o.color;
const plans = JSON.parse(readFileSync('src/data/middlegame-plans.json', 'utf8')) as Array<{ id: string; openingId: string; playableLines?: { fen: string; moves: string[] }[] }>;

function ev(fen: string, sm?: string): Promise<number | null> {
  return new Promise((res) => {
    const sf = spawn(SF!); let last: number | null = null, done = false;
    const fin = (v: number | null) => { if (!done) { done = true; try { sf.kill(); } catch { /**/ } res(v); } };
    let buf = '';
    sf.stdout.on('data', (d) => { buf += d.toString(); const ls = buf.split('\n'); buf = ls.pop() ?? '';
      for (const line of ls) { const cp = line.match(/score cp (-?\d+)/); const m = line.match(/score mate (-?\d+)/);
        if (m) last = parseInt(m[1], 10) > 0 ? 1e5 : -1e5; else if (cp) last = parseInt(cp[1], 10);
        if (line.startsWith('bestmove')) fin(last); } });
    sf.on('error', () => fin(null));
    sf.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}${sm ? ` searchmoves ${sm}` : ''}\n`);
    setTimeout(() => fin(last), 12000);
  });
}
const deepestBeat = (beats: { moves: string[] }[]) => beats.reduce((d: string[], b) => (b.moves.length > d.length ? b.moves : d), []);

// startFen=null → walk from the standard start (lessons); else from the FEN (plans).
async function auditLine(moves: string[], studentChar: 'w' | 'b', startFen: string | null): Promise<string[]> {
  const c = startFen ? new Chess(startFen) : new Chess();
  const anchor = startFen ? 0 : longestAnchorPly(moves);
  const bad: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const before = c.fen(); const mover = c.turn(); let mv;
    try { mv = c.move(moves[i]); } catch { break; }
    const ply = i + 1;
    if (ply <= anchor) continue;                       // book plies = DB-anchored
    if (mover !== studentChar) continue;               // opponent moves exempt (bait/natural)
    const entry = DB[k4(before)];
    if (Array.isArray(entry) && entry.some((e) => e.san === mv.san)) continue; // master-played
    const best = await ev(before); const played = await ev(before, mv.from + mv.to + (mv.promotion ?? ''));
    if (best !== null && played !== null && best - played > MAX) bad.push(`ply ${ply} ${mv.san} (${best - played}cp)`);
  }
  return bad;
}

describe.runIf(RUN && !!SF)('grounded masterclass audit (diagnostic)', () => {
  it('reports student-side genuinely-wrong content (neither master-played nor sound)', async () => {
    const wrong: { type: string; key: string; plies: string[] }[] = [];
    const note = (type: string, key: string, plies: string[]) => {
      if (plies.length) { wrong.push({ type, key, plies }); console.log(`  WRONG [${type}] ${key}: ${plies.join(' ')}`); }
      else console.log(`  ok   [${type}] ${key}`);
    };
    // PLANS
    for (const p of plans) {
      if (!MC.has(p.openingId)) continue;
      const col = planColor[p.openingId]; const sc = col === 'black' ? 'b' : col === 'white' ? 'w' : 'w';
      for (const l of p.playableLines ?? []) note('plan', p.id, await auditLine(l.moves, sc, l.fen));
    }
    // LESSONS + TRAPS
    for (const { scope, key, lesson } of ALL_LESSONS as Array<{ scope: string; key: string; lesson: { openingId: string; orientation: 'white' | 'black'; beats: { moves: string[] }[] } }>) {
      if (!MC.has(lesson.openingId)) continue;
      const sc = lesson.orientation === 'black' ? 'b' : 'w';
      note(scope, key, await auditLine(deepestBeat(lesson.beats), sc, null));
    }
    console.log(`\n===== GROUNDED MASTERCLASS AUDIT =====`);
    const byType: Record<string, typeof wrong> = {};
    for (const w of wrong) (byType[w.type] ??= []).push(w);
    for (const t of ['plan', 'main', 'variation', 'trap']) {
      const list = byType[t] ?? [];
      console.log(`\n--- ${t.toUpperCase()} — student-side wrong: ${list.length} ---`);
      for (const w of list) console.log(`  ${w.key}: ${w.plies.join(' ')}`);
    }
    console.log(`\nTOTAL genuinely-wrong (student-side): ${wrong.length}`);
    expect(true).toBe(true);
  }, 60 * 60 * 1000);
});

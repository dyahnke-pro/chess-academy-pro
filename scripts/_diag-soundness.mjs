#!/usr/bin/env node
// READ-ONLY diagnostic (no content changes). For each flagged lesson:
//  1. replay the taught spine ply-by-ply, eval each position from the STUDENT's
//     perspective (depth 18) -> the eval curve.
//  2. find the student move with the biggest drop into the negative = the
//     suspect ply (where the line "breaks").
//  3. at the position the student moved FROM, ask the engine for its best move
//     + eval, and ask the masters explorer for the most-played human move.
//     -> if engine-best at that fork is fine but the taught move is much worse,
//        the TAUGHT MOVE is faulty (fixable). If engine-best is ALSO bad, the
//        position was already lost earlier (dim opening / walk back further).
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
import { build } from 'esbuild'; import { tmpdir } from 'os'; import { join } from 'path';
const SF = '/usr/games/stockfish';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';

// engine: return {cp, best} from White's perspective at `fen`
function engine(fen, depth = 18, ms = 9000) {
  return new Promise(res => {
    const sf = spawn(SF); let cp = null, best = null;
    sf.stdout.on('data', d => {
      const s = d.toString();
      const m = s.match(/score cp (-?\d+)/g); if (m) cp = parseInt(m[m.length - 1].match(/-?\d+/)[0]);
      const mt = s.match(/score mate (-?\d+)/); if (mt) cp = parseInt(mt[1]) > 0 ? 10000 : -10000;
      const bm = s.match(/bestmove (\w+)/); if (bm) { best = bm[1]; sf.kill(); res({ cp, best }); }
    });
    sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    setTimeout(() => { try { sf.kill() } catch {}; res({ cp, best }) }, ms);
  });
}
const uciToSan = (fen, uci) => { const c = new Chess(fen); const mv = c.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] }); return mv ? mv.san : uci; };
const toUci = (moves) => { const c = new Chess(); return moves.map(m => { const x = c.move(m); return x.from + x.to + (x.promotion ?? '') }); };
async function masters(moves) {
  try { const r = await fetch(`${PROXY}?source=masters&play=${toUci(moves).join(',')}`); if (!r.ok) return null;
    const j = await r.json(); const tot = (j.white||0)+(j.draws||0)+(j.black||0);
    if (!j.moves?.length || tot < 20) { const k = await fetch(`${PROXY}?source=lichess&play=${toUci(moves).join(',')}&ratings=2200,2500&speeds=blitz,rapid,classical`); if (k.ok){const kj=await k.json(); return {top:kj.moves?.slice(0,3).map(x=>({san:x.san,g:(x.white||0)+(x.draws||0)+(x.black||0)})), src:'lichess2200+', tot:(kj.white||0)+(kj.draws||0)+(kj.black||0)};} }
    return { top: j.moves.slice(0,3).map(x=>({san:x.san,g:(x.white||0)+(x.draws||0)+(x.black||0)})), src:'masters', tot };
  } catch { return null; }
}

const FLAGGED = process.env.KEYS ? process.env.KEYS.split('|') : [
  'kings-gambit::Allgaier Gambit','semi-slav::Botvinnik Variation Deep','kings-gambit::Muzio Gambit',
  'pirc-defence::Austrian Attack','albin-countergambit::Fianchetto Variation','benoni-defence::Taimanov Variation (f4/Bb5+)',
  'old-indian-defence::Old Indian: Be2 Development','alekhine-defence::Four Pawns Attack','sicilian-dragon::Yugoslav Attack: Chinese Dragon',
  'old-indian-defence::Old Indian: Czech Variation','kings-gambit::King\'s Knight Gambit Classical','vienna-game::Vienna vs 2...Nc6',
  'budapest-gambit::Budapest Gambit: Fajarowicz Variation','kings-indian-defence::Fianchetto Variation','pirc-defence::Czech Defence',
];

const o = join(tmpdir(), `lb-${Date.now()}.mjs`);
await build({ entryPoints:['src/data/lessons/index.ts'], bundle:true, format:'esm', platform:'node', outfile:o, loader:{'.json':'json'}, logLevel:'error' });
const { getAllLessonScripts } = await import(o);
const all = new Map(getAllLessonScripts().map(x => [x.key, x.lesson]));

for (const key of FLAGGED) {
  const lesson = all.get(key);
  if (!lesson) { console.log(`\n### ${key}\n  (lesson not found by key)`); continue; }
  let bt = lesson.beats[0]; for (const x of lesson.beats) if (x.moves.length > bt.moves.length) bt = x;
  const moves = bt.moves;
  const student = lesson.orientation === 'black' ? 'b' : 'w';
  // eval curve: persp = student-perspective cp at each ply
  const c = new Chess(); const curve = [];
  for (let i = 0; i < moves.length; i++) {
    let mv; try { mv = c.move(moves[i]); } catch { break; }
    const { cp } = await engine(c.fen(), 16, 6000);
    const persp = (c.turn() === student) ? cp : -cp; // c.turn() is side to move now
    curve.push({ ply: i+1, san: moves[i], byStudent: mv.color === student, persp });
  }
  // find the student move that dropped the eval most into the negative
  let worst = null, prev = 0;
  for (const pt of curve) {
    if (pt.byStudent) { const drop = pt.persp - prev; if (pt.persp < -60 && (worst === null || drop < worst.drop)) worst = { ...pt, drop, evalBefore: prev }; }
    prev = pt.persp;
  }
  const finalCp = curve.length ? curve[curve.length-1].persp : null;
  console.log(`\n### ${key}   [student=${student}, ${moves.length}p, final ${finalCp}cp]`);
  console.log(`  line: ${moves.join(' ')}`);
  if (!worst) { console.log(`  no single breaking student move (gradual / sac line).`); continue; }
  // position the student moved FROM (before the suspect move)
  const pre = new Chess(); for (let i = 0; i < worst.ply - 1; i++) pre.move(moves[i]);
  const preFen = pre.fen();
  const { cp: bestCp, best } = await engine(preFen, 22, 12000);
  const bestSan = best ? uciToSan(preFen, best) : '?';
  const bestPersp = (pre.turn() === student) ? bestCp : -bestCp; // pre.turn() == student here
  const mstr = await masters(moves.slice(0, worst.ply - 1));
  console.log(`  SUSPECT student move:  ${worst.san} (ply ${worst.ply})  ${worst.evalBefore}cp -> ${worst.persp}cp  (drop ${worst.drop}cp)`);
  console.log(`  engine BEST at that fork: ${bestSan}  -> ${bestPersp}cp (student persp, depth22)`);
  if (mstr?.top?.length) console.log(`  masters/${mstr.src} most-played: ${mstr.top.map(t=>`${t.san}(${t.g})`).join(', ')}  [${mstr.tot} games at fork]`);
  else console.log(`  masters: no data at fork (off-book)`);
  const verdict = bestPersp >= -50
    ? `FAULTY MOVE — engine had ${bestSan} at ~${bestPersp}cp; taught ${worst.san} throws ${Math.abs(worst.persp-bestPersp)}cp`
    : bestPersp < -100
      ? `DIM POSITION — even engine-best (${bestSan}) is ${bestPersp}cp; break is earlier / opening objectively worse`
      : `BORDERLINE — engine-best ${bestSan} ${bestPersp}cp, taught ${worst.persp}cp`;
  console.log(`  VERDICT: ${verdict}`);
}
console.log('\n[diag complete]');

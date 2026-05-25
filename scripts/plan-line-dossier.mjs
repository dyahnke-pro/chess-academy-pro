import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const dir = 'src/data';
const plans = JSON.parse(readFileSync(`${dir}/middlegame-plans.json`,'utf8'));
const baseline = JSON.parse(readFileSync(`${dir}/middlegamePlanThemes.baseline.json`,'utf8')).keys;
const colorMap = {};
for (const f of ['repertoire.json','pro-repertoires.json']) {
  try { for (const o of JSON.parse(readFileSync(`${dir}/${f}`,'utf8'))) if (o?.id && o?.color) colorMap[o.id]=o.color; } catch {}
}
const SQUARE=/\b([a-h][1-8])\b/g;
const byId = Object.fromEntries(plans.map(p=>[p.id,p]));
const out=[];
for (const key of baseline) {
  const [pid, idxS] = key.split('#'); const idx=+idxS;
  const plan=byId[pid]; if(!plan) continue;
  const line=(plan.playableLines||[])[idx]; if(!line) continue;
  const color=colorMap[plan.openingId]||null;
  let stm='?'; let studentLegal=[];
  try { const c=new Chess(line.fen); stm=c.turn()==='w'?'white':'black';
    // if student to move, list their legal moves
    studentLegal = c.moves();
  } catch {}
  const brk=new Set(); const harvest=s=>{ if(typeof s==='string'){let m;SQUARE.lastIndex=0;while((m=SQUARE.exec(s)))brk.add(m[1]);}};
  for(const pb of plan.pawnBreaks||[]){ if(typeof pb==='string')harvest(pb); else if(pb)harvest(pb.move);}
  out.push({ key, openingId:plan.openingId, color, sideToMoveAtFen:stm, title:line.title||plan.title,
    fen:line.fen, currentMoves:line.moves, currentAnnLast:(line.annotations||[]).slice(-1)[0],
    overview:plan.overview, pawnBreaks:plan.pawnBreaks, pieceManeuvers:plan.pieceManeuvers,
    breakSquares:[...brk], studentLegalAtFen: stm===color? studentLegal : '(opponent to move at fen)' });
}
writeFileSync('/tmp/dossier.json', JSON.stringify(out,null,2));
console.log('dossier:', out.length, 'offenders written to /tmp/dossier.json');
// group counts
const by={}; for(const o of out) by[o.openingId]=(by[o.openingId]||0)+1;
console.log(Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+':'+v).join('  '));

// Re-apply the miner's GATE 2 (material reality) at the TRUE quiet terminus.
// The miner checked it at its fixed 8-ply stop; extend-punish-gems now walks
// each line to a quiet, settled position, so the check finally happens where
// the student would actually see the advantage. A "weapon" that arrives there
// with no material and no mate was engine-over-rated initiative — the miner's
// own term for that is tier 'weak', which isWeaponGem() excludes.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

// MATERIAL ALONE IS NOT "no advantage" (the trap this script nearly walked
// into). A real weapon can win by a bind or a forced attack with the material
// still level — CLAUDE.md: "a +1.0 here is a real crush whether the win is
// material or a forced attack". Judging on material alone flagged 135 of 389
// gems, including authored ones that are genuinely winning. So the test is:
// NO material, NO mate, AND the engine sees no real edge at the quiet end.
const ENGINE='node_modules/stockfish/bin/stockfish-18-lite-single.js';
function startEngine(){
  const sf=spawn('node',[ENGINE]); let buf='',cp=null,mate=null,res=null;
  sf.stdout.on('data',d=>{buf+=d.toString();const ls=buf.split('\n');buf=ls.pop()??'';
    for(const l of ls){const m=l.match(/score cp (-?\d+)/),t=l.match(/score mate (-?\d+)/);
      if(m){cp=Number(m[1]);mate=null;} if(t){mate=Number(t[1]);cp=null;}
      const b=l.match(/^bestmove/); if(b&&res){const f=res;res=null;const r={cp,mate};cp=null;mate=null;f(r);}}});
  sf.stdin.write('uci\n');
  return {eval:(fen)=>new Promise(r=>{res=r;sf.stdin.write(`position fen ${fen}\ngo depth 16\n`);}),
          quit:()=>{try{sf.kill()}catch{}}};
}
const ONLY_DARK=process.argv.includes('--only-dark');
const DARK=new Set(JSON.parse(readFileSync('/tmp/claude-0/-home-user-chess-academy-pro/77d03188-7b1f-5c50-ac87-51b93307da0b/scratchpad/dark-ids.json','utf8')));
const V={p:1,n:3,b:3,r:5,q:9,k:0};
const mat=(c,ch)=>{let d=0;for(const row of c.board())for(const s of row)if(s)d+=(s.color===ch?1:-1)*(V[s.type]??0);return d;};
const DRY=process.argv.includes('--dry');
const files=['src/data/punish-gems.json','src/data/gambit-punish-gems.json'];
let demoted=0, kept=0; const rows=[];
const eng=startEngine();
await new Promise(r=>setTimeout(r,2000));
for (const f of files) {
  const gems=JSON.parse(readFileSync(f,'utf8'));
  const list=Array.isArray(gems)?gems:gems.gems;
  for (const g of list) {
    if (g.tier!=='confirmed' && g.tier!=='positional') continue;
    const c=new Chess(); let ok=true;
    for (const m of g.playLine.split(/\s+/).filter(Boolean)) { try{c.move(m)}catch{ok=false;break} }
    if(!ok) continue;
    const lineLen=g.lineMoves.split(/\s+/).filter(Boolean).length;
    const student=(lineLen+1)%2===0?'w':'b';
    const m=mat(c,student);
    const mate=c.isCheckmate();
    const gid=`${g.openingId}:${g.lineMoves.replace(/\s+/g,'_')}:${g.inaccuracy}`;
    if (ONLY_DARK && !DARK.has(gid)) { kept++; continue; }
    // Engine verdict at the quiet end, from the STUDENT's side.
    const e=await eng.eval(c.fen());
    const raw=e.mate!=null?(e.mate>0?10000:-10000):(e.cp??0);
    const studentCp=(c.turn()===student)?raw:-raw;
    const noEdge=studentCp<50;
    if (m<=0 && !mate && noEdge) {
      rows.push({f,op:g.openingId,slip:g.inaccuracy,was:g.engineCp,now:studentCp,mat:m});
      if(!DRY){ g.tier='weak'; g.demotedReason='no material or mate at the quiet terminus'; }
      demoted++;
    } else kept++;
  }
  if(!DRY) writeFileSync(f, `${JSON.stringify(gems,null,2)}\n`);
}
eng.quit();
console.log(`kept ${kept}  demoted ${demoted}${DRY?' (DRY)':''}`);
for(const r of rows) console.log(`  ${r.op} : ${r.slip}  minedCp=${r.was} -> terminusCp=${r.now}  material=${r.mat}`);
const byOp={}; for(const r of rows) byOp[r.op]=(byOp[r.op]||0)+1;
console.log(Object.entries(byOp).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'  '+k+': '+v).join('\n'));

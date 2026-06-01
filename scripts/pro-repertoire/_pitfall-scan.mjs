// Find real STUDENT pitfalls: walk each opening's lines; at student-to-move
// nodes, find a COMMON student move (amateur explorer) the engine rates clearly
// worse than its best (the correctMove). Grounded + engine-verified, for HAND
// authoring of common-mistakes entries.
import { spawn, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const SF_DEPTH=16, FREQ=0.04, MING=200, GAP=70; // student move >=4%, engine gap >=0.7
function rfStockfish(){for(const p of ['/usr/games/stockfish'])if(existsSync(p))return p;return null;}
function eng(bin){const sf=spawn(bin);let buf='',cp=null,res=null;sf.stdout.on('data',d=>{buf+=d;const ls=buf.split('\n');buf=ls.pop()??'';for(const l of ls){const m=l.match(/score cp (-?\d+)/),mt=l.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?100000:-100000;else if(m)cp=parseInt(m[1]);const b=l.match(/^bestmove (\S+)/);if(b&&res){const r=res;res=null;r({cp,best:b[1]==='(none)'?null:b[1]});}}});sf.stdin.write('uci\nisready\n');return{ev:f=>new Promise(r=>{cp=null;res=r;sf.stdin.write(`position fen ${f}\ngo depth ${SF_DEPTH}\n`);setTimeout(()=>{if(res===r){res=null;r({cp,best:null});}},20000);}),quit(){try{sf.stdin.write('quit\n');sf.kill();}catch{}}};}
const toUci=s=>{const c=new Chess();return s.map(m=>{const mv=c.move(m);return mv.from+mv.to+(mv.promotion??'');});};
async function expl(s){const r=await fetch(`${PROXY}?source=lichess&ratings=1600,1800,2000&speeds=blitz,rapid,classical&play=${toUci(s).join(',')}`);return r.ok?r.json():null;}
const g=m=>m.white+m.draws+m.black;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ap=(c,u)=>c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u.length>4?u[4]:undefined});
const E=eng(rfStockfish());
const lines=JSON.parse(readFileSync('/tmp/carlsen_lines.json','utf8'));
const ONLY=(process.env.ONLY||'').split(',').filter(Boolean);
const scanned=new Set();
for(const L of lines){
  if(ONLY.length&&!ONLY.includes(L.id))continue;
  const sc=L.sc;const line=[];
  for(let depth=0;depth<L.line.length+1;depth++){
    const c=new Chess();let ok=true;for(const m of line){try{c.move(m);}catch{ok=false;break;}}if(!ok)break;
    const j=await expl(line);await sleep(110);
    if(c.turn()===sc&&depth>=4&&depth<18&&j&&(j.moves||[]).length&&!scanned.has(c.fen())){
      scanned.add(c.fen());
      const tot=g({white:j.white,draws:j.draws,black:j.black});
      // engine best for student
      const best=await E.ev(c.fen());if(best.best){
        const bc=new Chess(c.fen());const bestSan=ap(bc,best.best).san;
        const bestEval=best.cp; // student POV (student to move)
        // check each common student move
        for(const m of (j.moves||[]).slice(0,6)){
          if(g(m)/tot<FREQ||g(m)<MING)continue; if(m.san===bestSan)continue;
          const cc=new Chess(c.fen());let mv;try{mv=cc.move(m.san);}catch{continue;}
          const after=await E.ev(cc.fen()); // opponent to move; student adv = -after.cp
          if(after.cp===null)continue;const studentAfter=-after.cp;
          if(bestEval-studentAfter>=GAP){ // the common move is clearly worse than best
            console.log(`### ${L.id} [${L.name}] depth=${depth}`);
            console.log(`  FEN: ${c.fen()}`);
            console.log(`  WRONG: ${m.san} (${(g(m)/tot*100).toFixed(1)}%) -> student ${studentAfter}cp | CORRECT: ${bestSan} -> ${bestEval}cp | gap=${bestEval-studentAfter}`);
          }
        }
      }
    }
    let nx=depth<L.line.length?L.line[depth]:(j&&j.moves&&j.moves[0]?j.moves[0].san:null);if(!nx)break;
    try{const t=new Chess();for(const m of line)t.move(m);t.move(nx);line.push(nx);}catch{break;}
  }
}
E.quit();console.log('[pitfall scan done]');

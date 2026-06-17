import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='evans-gambit'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi),t=s.triggerMove,p=s.atPly; let c;
  if(t==='Nf6'&&p===5) c='EV_NF6';
  else if(t==='Be7'&&(p===5||p===9)) c='EV_BE7';
  else if(t==='Bxb4'&&p===7) c='EV_BXB4';
  else if(t==='Bb6'&&p===7) c='EV_BB6_QUIET';
  else if(t==='Ba5'&&p===9) c='EV_BA5';
  else if(t==='Bd6'&&p===9) c='EV_BD6';
  else if(v===2) c='EV_BB6_QUIET';
  else if(v===3) c='EV_BD6';
  else c='EV_ATTACK';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_ev.txt','  // ── Evans Gambit ──\n'+out.join('\n')+'\n');
console.log('total',out.length);

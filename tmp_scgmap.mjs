import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='scotch-gambit'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi),t=s.triggerMove,p=s.atPly; let c;
  if(t==='Nf6'&&(p===5||p===7)) c='SCG_NF6_EARLY';
  else if(t==='d6'&&p===5) c='SCG_D6';
  else if(t==='Bc5'&&p===7) c='SCG_MAIN';
  else if(v===0) c='SCG_MAIN';
  else if(v===1) c='SCG_SHARP';
  else if(v===2) c='SCG_MAXLANGE';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_scg.txt','  // ── Scotch Gambit ──\n'+out.join('\n')+'\n');
console.log('total',out.length);

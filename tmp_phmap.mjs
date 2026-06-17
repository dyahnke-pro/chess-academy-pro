import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='philidor-defence'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi),t=s.triggerMove,p=s.atPly; let c;
  if(t==='d4'&&p===4) c='PH_OPEN';
  else if(v===0||v===1) c='PH_HANHAM';
  else if(v===2||v===3) c='PH_OPEN';
  else if(v===4) c='PH_COUNTERGAMBIT';
  else c='PH_D3_QUIET';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_ph.txt','  // -- Philidor Defence --\n'+out.join('\n')+'\n');
console.log('total',out.length);

import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='petrov-defence'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi),t=s.triggerMove; let c;
  if(t==='Nxf7') c='PT_COCHRANE';
  else if(v===0||v===5) c='PT_MAIN';
  else if(v===1) c='PT_D4';
  else if(v===2) c='PT_NC3_TRANSPOSE';
  else if(v===3) c='PT_COCHRANE';
  else c='PT_5NC3';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_pt.txt','  // -- Petrov Defence --\n'+out.join('\n')+'\n');
console.log('total',out.length);

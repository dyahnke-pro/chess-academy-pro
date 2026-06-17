import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='schliemann-defence'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const t=s.triggerMove,p=s.atPly; let c;
  if(t==='Bc4'&&p===4) c='SCH_ITALIAN';
  else if(t==='Nc3'&&p===4) c='SCH_FOUR_KNIGHTS';
  else if(t==='d4'&&p===4) c='SCH_SCOTCH';
  else if(t==='Nc3'&&p===6) c='SCH_NC3';
  else if(t==='d3'&&p===6) c='SCH_D3';
  else if(t==='d4'&&p===6) c='SCH_D4';
  else if(t==='Bxc6'&&p===6) c='SCH_BXC6';
  else c='SCH_SHARP';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_sch.txt','  // -- Schliemann Defence --\n'+out.join('\n')+'\n');
console.log('total',out.length);

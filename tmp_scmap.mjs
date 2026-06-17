import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base = fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine = fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='scotch-game'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi), t=s.triggerMove, p=s.atPly;
  let c;
  if(t==='Nf6'&&p===5) c='SC_NF6_EARLY';
  else if(t==='Bc5'&&p===7) c='SC_CLASSICAL';
  else if(v===0) c='SC_CLASSICAL';
  else if(v===1) c='SC_MIESES';
  else if(v===2) c='SC_BC4';
  else if(v===3||v===6) c='SC_NC3_IQP';
  else if(v===4) c='SC_GORING';
  else if(v===5) c='SC_STEINITZ_QH4';
  else if(v===7) c='SC_NB3_MODERN';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_sc.txt','  // ── Scotch Game ──\n'+out.join('\n')+'\n');
console.log('total',out.length);

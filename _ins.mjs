import fs from 'fs';
const file="src/data/lessons/sublineNarrationD4Flank.ts";
let src=fs.readFileSync(file,"utf8");
const block=fs.readFileSync("./_block.txt","utf8").replace(/\n$/,"");
const rewire=JSON.parse(fs.readFileSync("./_rewire.json","utf8"));
const anchor="\nexport const SUBLINE_NARRATION_D4FLANK: Record<string, SublineNarration> = {";
if(!src.includes(anchor)){console.error("anchor not found");process.exit(1);}
src=src.replace(anchor, "\n"+block+"\n"+anchor);
let n=0;
for(const [key,newc] of Object.entries(rewire)){
  const esc=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const re=new RegExp("('"+esc+"': )([A-Za-z0-9_]+)(,)");
  if(re.test(src)){src=src.replace(re,"$1"+newc+"$3");n++;}
  else console.error("KEY NOT FOUND:",key);
}
fs.writeFileSync(file,src);
console.log("inserted + rewired",n,"keys");

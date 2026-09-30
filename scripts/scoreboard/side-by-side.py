# His narration vs ours, per student move, for reading.
#   python3 scripts/scoreboard/side-by-side.py <tape.json> <games.json> <out.md>
# His lines come from the per-ply transcript census (CENSUS_DIR, default
# /tmp/claude-0/g430). Questions asked on the walk are listed per game.
import json,sys,glob,re,os
tape=json.load(open(sys.argv[1])); games={g['id']:g for g in json.load(open(sys.argv[2]))}
his={}
for f in glob.glob(os.environ.get('CENSUS_DIR','/tmp/claude-0/g430')+'/*.txt'):
  vid=re.sub(r'^\d{3}-','',f.split('/')[-1][:-4])
  for l in open(f).read().split('\n')[1:]:
    m=re.match(r'^ply (\d+) \[[^\]]*\] (.+)$',l)
    if m: his.setdefault(vid,{})[int(m[1])]=m[2]
out=[]
for gid,r in tape.items():
  vid=gid.replace('naro-',''); g=games.get(gid) or games.get('naro-'+vid,{}); plies=g.get('plies',[])
  out.append(f'\n## {gid}  (his transcript: {"yes" if vid in his else "none"})\n')
  for p in sorted(r['plies'],key=int):
    p=int(p); san=' '.join(x.get('san') or '?' for x in plies[max(0,p-1):p+1]) if plies else ''
    h=[his.get(vid,{}).get(q) for q in (p,p+1)]; h=[x for x in h if x]
    ours=r['plies'][str(p)]
    if not h and not ours: continue
    out.append(f'**ply {p}** `{san}`\n- HIM: {" / ".join(h) or "—"}\n- US: {" / ".join(ours) or "(silent)"}\n')
  for q in r.get('questions',[]):
    out.append(f'**Q at ply {q["ply"]}:** {q["q"]}\n- A: {q["a"]}\n')
open(sys.argv[3],'w').write('\n'.join(out)); print('wrote',sys.argv[3])

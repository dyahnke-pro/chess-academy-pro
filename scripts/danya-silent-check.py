import json,re,sys,collections
S='/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad'
bc=open('/home/user/urg-wt/src/services/boardComputers.ts').read()
# registry id -> catalog computer
pairs=re.findall(r"^  ([a-zA-Z0-9]+): \{\n(?:(?!^  [a-zA-Z0-9]+: \{\n).*\n){0,80}?    computer: '([a-zA-Z0-9]+)'",bc,re.M)
idmap=collections.defaultdict(set)
for i,c in pairs: idmap[i].add(c)
ideas=json.load(open(f'{S}/havecheck/merged.json'))['ideas']
dump=sys.argv[1]
boards={}
for l in open(dump):
  d=json.loads(l); boards[d['id']]=d.get('facts',[])
silent=[x for x in ideas if x['status']=='missing' and x['computer']]
fired=collections.Counter(); total=collections.Counter(); nowfire=[]
for x in silent:
  L=x['computer']; names={L}|idmap.get(L,set())
  fs=boards.get(x['board'],[])
  hit=[f for f in fs if f.get('computer') in names]
  total[L]+=1
  if hit: fired[L]+=1; nowfire.append((x,hit))
print('silent ideas',len(silent),'computer now fires on its board',sum(fired.values()))
for L,n in total.most_common(): print(f'{L:22s} {fired[L]}/{n}')
json.dump([{'idea':x['idea'],'board':x['board'],'computer':x['computer'],'ours':[h['text'] for h in hit]} for x,hit in nowfire],open(f'{S}/silent-nowfire.json','w'),indent=1)

import json,collections,sys
MAP={
 ('behavior','piece-activity'):['P-PIECE-QUALITY'],('behavior','weak-square'):['P-STRUCTURE'],('behavior','pawn-structure'):['P-STRUCTURE'],
 ('behavior','pawn-break'):['S-BREAK'],('behavior','open-file'):['P-PRINCIPLE'],('behavior','prophylaxis'):['T-THREAT'],
 ('behavior','rook-lift'):['S-MANEUVER'],('behavior','king-activity'):['E-TECHNIQUE'],('behavior','bishop-pair'):['P-PIECE-QUALITY'],
 ('behavior','fianchetto'):['P-PIECE-QUALITY'],('behavior','pressure'):['T-HANG'],('behavior','space'):['S-SPACE'],
 ('behavior','passed-pawn'):['E-PASSER'],('behavior','tactics'):['T-TACTIC'],('behavior','piece-preservation'):['M-TRADE'],
 ('behavior','king-safety'):['S-KING-ATTACK'],('behavior','material'):['M-TRADE'],('behavior','outpost'):['P-STRUCTURE'],
 ('behavior','rook-behind-passer'):['E-TECHNIQUE'],('behavior','knight-maneuver'):['S-MANEUVER'],('behavior','development'):['P-PRINCIPLE'],
 ('behavior','blockade'):['E-PASSER'],('behavior','x-ray'):['T-TACTIC'],
 ('positional','piece'):['P-PIECE-QUALITY'],('positional','king'):['P-PRINCIPLE'],('positional','minority'):['S-PLAN'],
 ('positional','passer'):['E-PASSER'],('positional','lever'):['S-BREAK'],('positional','development'):['P-PRINCIPLE'],
 ('positional','plan'):['S-PLAN'],('positional','structure'):['P-STRUCTURE'],('positional','complex'):['P-STRUCTURE'],('positional','file'):['P-PRINCIPLE'],
 ('facts','method'):['H-OPP-THINK'],('facts','concept'):['T-TACTIC','T-LINE'],('facts','convert'):['E-CONVERT','S-WHEN-AHEAD'],
 ('facts','latent-danger'):['T-HIDDEN'],('facts','key-moment'):['H-DONT-PANIC'],('facts','fundamental'):['S-PLAN'],
 ('facts','must-defend'):['T-THREAT'],('facts','structure-plan'):['S-PLAN'],('facts','trade'):['M-TRADE'],
 ('facts','deliberation'):['H-CANDIDATES','M-REFUTED','T-LINE'],('facts','stopped'):['M-OPP-PURPOSE'],('facts','bluff'):['H-PRACTICAL'],
 ('facts','latent-chance'):['T-HIDDEN'],('backward','mistake'):['M-VERDICT','M-REFUTED'],('backward','drawback'):['M-VERDICT'],
}
his=json.load(open('scripts/scoreboard/his-tags.json'))
h=json.load(open('audit-reports/claim-check/harvest.json'))
ours=collections.defaultdict(set); plies=set()
for x in h:
  if x['set']!='naro': continue
  g=x['game'].replace('naro-',''); plies.add((g,x['ply']))
  for c in MAP.get((x['lane'],x['kind']),[]): ours[(g,x['ply'])].add(c)
W=int(sys.argv[1]) if len(sys.argv)>1 else 0
tot=collections.Counter(); hit=collections.Counter(); opp=collections.Counter()
for k,v in his.items():
  g,p=k.rsplit(':',1); p=int(p)
  codes=[c for c in v['codes'] if not c.startswith(('X-','NEW'))]
  if (g,p) not in plies:
    for c in codes: opp[c]+=1
    continue
  have=set().union(*[ours.get((g,q),set()) for q in range(p-W,p+W+1)])
  for c in codes:
    tot[c]+=1; hit[c]+= c in have
T=sum(tot.values()); H=sum(hit.values())
print(f'window ±{W} · student-move moments: {H}/{T} code-hits = {100*H/max(T,1):.1f}%  · codes at plies we never harvest (opponent moves): {sum(opp.values())}')
print(f'{"code":20}{"his":>6}{"ours":>6}{"match":>7}')
for c,n in tot.most_common(): print(f'{c:20}{n:6}{hit[c]:6}{100*hit[c]/n:6.0f}%')

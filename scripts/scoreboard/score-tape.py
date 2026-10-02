# Scoreboard v2: what Learn SPEAKS (the tape) vs what he teaches, per beat.
# Our beat after student ply p covers his lines at p (the student's move) and
# p+1 (the reply) — Learn speaks once for the pair.
#   python3 scripts/scoreboard/score-tape.py <tape.json> <our-tags.json>
import json,collections,sys
tape=json.load(open(sys.argv[1])); ours=json.load(open(sys.argv[2]))
his=json.load(open('scripts/scoreboard/his-tags.json'))
teach=lambda cs:[c for c in cs if not c.startswith(('X-','NEW'))]
tot=collections.Counter(); hit=collections.Counter(); oursN=collections.Counter()
beats=0; silent=0
for g,r in tape.items():
  for p,lines in r['plies'].items():
    p=int(p); beats+=1; silent+= not lines
    have=set(c for l in lines for c in teach(ours.get(l,[])))
    for c in have: oursN[c]+=1
    for q in (p,p+1):
      v=his.get(f'{g}:{q}')
      if not v: continue
      for c in set(teach(v['codes'])): tot[c]+=1; hit[c]+= c in have
T=sum(tot.values()); H=sum(hit.values())
print(f'{len(tape)} games · {beats} beats ({silent} silent) · match {H}/{T} = {100*H/max(T,1):.1f}%')
print(f'{"code":20}{"his":>6}{"hit":>6}{"match":>7}{"ours":>7}')
for c,n in tot.most_common(): print(f'{c:20}{n:6}{hit[c]:6}{100*hit[c]/n:6.0f}%{oursN[c]:7}')
extra=[(c,n) for c,n in oursN.most_common() if c not in tot]
if extra: print('we say, he never does here:', extra)

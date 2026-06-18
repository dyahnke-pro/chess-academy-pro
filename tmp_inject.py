import json, re, sys
beats=json.load(open(sys.argv[1]))
f='src/data/lessons/sublineNarrationE4E5.ts'; s=open(f).read()
def esc(t): return t.replace('"','\\"')
def beat_ts(b):
    arr=b.get('ar'); arrs=('['+', '.join(f"A('{a[0]}', '{a[1]}')" for a in arr)+']') if arr else None
    his=b.get('hi'); hil=('['+', '.join(f"H('{h[0]}', {h[1]})" for h in his)+']') if his else None
    inner=f'atMove: {b["at"]}, say: "{esc(b["say"])}", sayShort: "{esc(b["short"])}"'
    if arrs: inner+=f', arrows: {arrs}'
    if hil: inner+=f', highlights: {hil}'
    return f"{{ {inner} }}"
count=0; miss=0
for key,b in beats.items():
    # match the mapping line: 'key': CONST,
    pat=re.compile(r"^(  '"+re.escape(key)+r"': )([A-Z_][A-Z0-9_]*)(,)$", re.M)
    m=pat.search(s)
    if not m:
        print("NO MAPPING LINE for",key); miss+=1; continue
    repl=m.group(1)+"{ ..."+m.group(2)+", beats: ["+beat_ts(b)+"] }"+m.group(3)
    s=s[:m.start()]+repl+s[m.end():]
    count+=1
open(f,'w').write(s)
print(f"injected {count}, missing {miss}")

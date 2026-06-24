// Re-validate judge findings against the CURRENT (rebuilt) packets.
// For each finding, pull a distinctive text fragment from the quoted `claim`
// and check whether it still exists in the current packet. If it no longer
// appears, the underlying prose changed since the audit ran (likely fixed by
// the parallel session) → mark CHANGED for re-review. Otherwise LIVE.
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('audit-reports/content-audit/_judge-findings.json', 'utf8'));

function fragment(claim) {
  if (!claim) return null;
  // strip a leading  "key":  wrapper and quotes, take the longest word-run
  let s = String(claim).replace(/^\s*"?\w+"?\s*:\s*/, '').replace(/^["'\s]+|["'\s]+$/g, '');
  // collapse whitespace; take a distinctive middle slice of real prose
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length < 12) return null;
  // pick a ~40-char window starting a bit in (avoids generic openings)
  const start = Math.min(8, Math.floor(s.length * 0.15));
  return s.slice(start, start + 42).toLowerCase();
}

let live = 0, changed = 0, uncheckable = 0;
const out = [];
for (const o of data) {
  let packet = '';
  try { packet = fs.readFileSync(`audit-reports/content-packets/${o.id}.json`, 'utf8').replace(/\s+/g, ' ').toLowerCase(); }
  catch { packet = ''; }
  const findings = o.findings.map((f) => {
    const frag = fragment(f.claim);
    let status;
    if (!frag || !packet) { status = 'uncheckable'; uncheckable++; }
    else if (packet.includes(frag)) { status = 'live'; live++; }
    else { status = 'changed'; changed++; }
    return { ...f, status };
  });
  out.push({ id: o.id, findings });
}
fs.writeFileSync('audit-reports/content-audit/_findings-revalidated.json', JSON.stringify(out, null, 2));

// severity x status breakdown for HIGH
const high = out.flatMap((o) => o.findings.filter((f) => f.severity === 'high'));
const cnt = (s) => high.filter((f) => f.status === s).length;
console.log('ALL findings — live:', live, '| changed(re-review):', changed, '| uncheckable:', uncheckable);
console.log('HIGH only:', high.length, '-> live:', cnt('live'), '| changed:', cnt('changed'), '| uncheckable:', cnt('uncheckable'));

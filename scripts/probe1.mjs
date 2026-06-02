import { chromium } from 'playwright';
const Q = process.argv[2];
const T = Number(process.argv[3] ?? 150000);
const ACK = /board'?s?\s+(?:is\s+)?set|position\s+set|you'?re\s+playing|taking too long|your move|let me (check|grab|get|pull|look)/i;
const b = await chromium.connectOverCDP('http://localhost:9222');
const p = b.contexts()[0].pages()[0];
const last = async () => p.$$eval('[data-testid="chat-message-assistant"]', els => { const e=els[els.length-1]; if(!e) return ''; const bd=e.querySelector('[data-testid="coach-badge"]'); const bt=bd&&bd.textContent?bd.textContent:''; let t=e.textContent||''; if(bt&&t.startsWith(bt))t=t.slice(bt.length); return t.trim(); });
const inp = p.locator('[data-testid="chat-text-input"]');
await inp.waitFor({state:'visible',timeout:12000}); await inp.click(); await inp.fill(Q);
await p.locator('[data-testid="chat-send-btn"]').click();
const t0=Date.now(); let prev='',st=0,ans='';
while(Date.now()-t0<T){
  await p.waitForTimeout(1000);
  const cur=await last();
  if(cur.length>12 && !ACK.test(cur)){ if(cur===prev){st++; if(st>=3){ans=cur;break;}} else st=0; prev=cur; }
}
if(!ans) ans = prev || '(EMPTY/COLLAPSE)';
console.log('A:', ans);
await b.close();

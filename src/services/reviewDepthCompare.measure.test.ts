import { describe, it } from 'vitest';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { moveOnlyRestates, afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './pvPlayback';

// TWO REVIEW-DEPTH RUNS, SIDE BY SIDE (WO-DECIDER-02): which plies went silent
// as restatements, which costly moves got shorter, words by seat. Reads two
// `reviewDepth.eval.measure.test.ts` outputs (EVAL_OUT). CMP=1 to run;
// CMP_A / CMP_B name the runs; writes <B>/compare-vs-<A>.json.
const A = process.env.CMP_A ?? 'audit-reports/review-depth-v2';
const B = process.env.CMP_B ?? 'audit-reports/review-depth-v3';
const words = (s: string | undefined | null): number => (s ?? '').split(/\s+/).filter(Boolean).length;

describe.skipIf(process.env.CMP !== '1')('review depth — two runs compared', () => { it('compares', () => {
  const files = readdirSync(B).filter((f) => f.startsWith('game-') && existsSync(`${A}/${f}`));
  const tot = { games: files.length, plies: 0, aN: 0, bN: 0, aW: 0, bW: 0, quietSilenced: 0, quietStillSaid: 0, restatePlies: 0, shorter: 0, longer: 0, newlySaid: 0, newlySilent: 0 };
  const seatW: Record<string, { a: number; b: number; aN: number; bN: number }> = { student: { a: 0, b: 0, aN: 0, bN: 0 }, opponent: { a: 0, b: 0, aN: 0, bN: 0 } };
  const costly = { n: 0, aW: 0, bW: 0, aS: 0, bS: 0 };
  const sentences = (x: string): number => (x.match(/[.!?](\s|$)/g) ?? []).length;
  const samples: Record<string, string[]> = { quietSilenced: [], quietStillSaid: [], shorter: [], newlySilentOther: [], newlySaid: [] };
  for (const f of files) {
    const a = JSON.parse(readFileSync(`${A}/${f}`, 'utf8'));
    const b = JSON.parse(readFileSync(`${B}/${f}`, 'utf8'));
    if (!Array.isArray(a.plies) || !b.said) continue;
    const seat: 'w' | 'b' = a.seat === 'black' || a.seat === 'b' ? 'b' : 'w';
    let run: PrevCaptureContext = NO_PREV_CAPTURE;
    const c = new Chess();
    for (let i = 0; i < a.plies.length; i += 1) {
      const p = a.plies[i];
      const ply = i + 1;
      const fen = c.fen();
      let mv;
      try { mv = c.move(p.san); } catch { break; }
      const restates = moveOnlyRestates(fen, p.san, run);
      run = afterCapture(run, mv);
      const sa: string = a.said[String(ply)] ?? '';
      const sb: string = b.said[String(ply)] ?? '';
      const who = mv.color === seat ? 'student' : 'opponent';
      const cpB = a.plies[i].lines?.[0]?.cp ?? null;
      const cpA = a.plies[i + 1]?.lines?.[0]?.cp ?? null;
      const loss = cpB != null && cpA != null ? (mv.color === 'w' ? cpB - cpA : cpA - cpB) : 0;
      if (who === 'student' && loss >= 100 && sa && sb) { costly.n += 1; costly.aW += words(sa); costly.bW += words(sb); costly.aS += sentences(sa); costly.bS += sentences(sb); }
      tot.plies += 1;
      if (sa) { tot.aN += 1; tot.aW += words(sa); seatW[who].a += words(sa); seatW[who].aN += 1; }
      if (sb) { tot.bN += 1; tot.bW += words(sb); seatW[who].b += words(sb); seatW[who].bN += 1; }
      const tag = `${f.slice(5, -5)} ply ${ply} ${who} ${p.san}`;
      if (restates) {
        tot.restatePlies += 1;
        if (sa && !sb) { tot.quietSilenced += 1; if (samples.quietSilenced.length < 30) samples.quietSilenced.push(`${tag}: WAS "${sa.slice(0, 200)}"`); }
        if (sb) { tot.quietStillSaid += 1; if (samples.quietStillSaid.length < 30) samples.quietStillSaid.push(`${tag}: "${sb.slice(0, 220)}"`); }
      } else if (sa && !sb) {
        tot.newlySilent += 1; if (samples.newlySilentOther.length < 30) samples.newlySilentOther.push(`${tag}: WAS "${sa.slice(0, 200)}"`);
      }
      if (!sa && sb) { tot.newlySaid += 1; if (samples.newlySaid.length < 20) samples.newlySaid.push(`${tag}: "${sb.slice(0, 200)}"`); }
      if (sa && sb && sa !== sb) {
        if (words(sb) < words(sa)) { tot.shorter += 1; if (samples.shorter.length < 40) samples.shorter.push(`${tag} (${words(sa)}→${words(sb)}w)\n   A: ${sa}\n   B: ${sb}`); }
        else tot.longer += 1;
      }
    }
  }
  const out = { tot, costlyStudent: { ...costly, meanWordsA: +(costly.aW / Math.max(1, costly.n)).toFixed(1), meanWordsB: +(costly.bW / Math.max(1, costly.n)).toFixed(1), meanSentA: +(costly.aS / Math.max(1, costly.n)).toFixed(1), meanSentB: +(costly.bS / Math.max(1, costly.n)).toFixed(1) }, meanWords: { a: +(tot.aW / Math.max(1, tot.aN)).toFixed(1), b: +(tot.bW / Math.max(1, tot.bN)).toFixed(1) }, seatW, samples };
  writeFileSync(`${B}/compare-vs-${A.split('/').pop()}.json`, JSON.stringify(out, null, 2));
}, 600000); });

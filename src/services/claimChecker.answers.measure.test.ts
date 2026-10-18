/**
 * THE ANSWER PASS (David 2026-10-17: "Does it ask questions along the way?" →
 * "Can you do that"). The claim harvest records what the coach SAYS; this
 * records what it says BACK when the student answers. At every student-to-move
 * board of the 100-game corpus, every question Learn can ask there (the
 * thinking-step tap questions, as the carry-over asks them) is answered three
 * ways — right, a wrong tap, and missed until it is shown — and every reply
 * goes into `audit-reports/claim-check/answers.json` in the harvest's shape, so
 * `claim-verify.mjs` checks it on the same board rules.
 *
 * Opt-in like the harvest (`CLAIM_CHECK=1`); it reads the harvest's positions.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess, type Square } from 'chess.js';
import { STEP_KITS } from './thinkingSteps.built';
import { isFairKey } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';

const HARVEST = 'audit-reports/claim-check/harvest.json';
const RUN = process.env.CLAIM_CHECK === '1' && existsSync(HARVEST);

interface Row { game: string; set: string; ply: number; seat: string; fenBefore: string }
interface AnswerClaim {
  game: string; set: string; ply: number; seat: string; fenBefore: string; san: string; probe: string;
  cpLoss: null; studentEvalAfter: null; lane: 'answer'; kind: string; text: string; squares: string[]; claim: string;
  /** The question's answer squares — a wrong-tap reply may never name one. */
  key: string[];
}

/** A square the student could tap that is NOT the answer: an occupied square
 *  first (a real student tap is usually on a piece), else any empty one. */
function wrongSquare(fen: string, key: readonly string[]): Square | null {
  const c = new Chess(fen);
  const cells = c.board().flat().filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.square);
  return (cells.find((s) => !key.includes(s)) ?? null);
}

describe.skipIf(!RUN)('ANSWER PASS — what the coach says back, on 100 real games', () => {
  it('answers every question right, wrong, and shown', () => {
    const rows = JSON.parse(readFileSync(HARVEST, 'utf8')) as Row[];
    const seen = new Set<string>();
    const boards: Row[] = [];
    for (const r of rows) {
      const k = r.fenBefore.split(' ').slice(0, 2).join(' ');
      if (seen.has(k)) continue;
      seen.add(k);
      boards.push(r);
    }
    // Carry-over kits only: no engine enrichment and no adaptation, exactly
    // the set a drill may ask on a live board.
    const kits = Object.values(STEP_KITS).map((f) => f()).filter((k): k is StepKit => !!k && !k.enrich && !k.adapt);
    const out: AnswerClaim[] = [];
    for (const b of boards) {
      for (const kit of kits) {
        let fk;
        try { fk = kit.keyFor(b.fenBefore); } catch { continue; }
        if (!isFairKey(fk)) continue;
        const key = fk.key.map(String);
        const push = (kind: string, text: string | null, squares: readonly string[] = []): void => {
          if (!text) return;
          out.push({ game: b.game, set: b.set, ply: b.ply, seat: b.seat, fenBefore: b.fenBefore, san: '', probe: b.fenBefore, cpLoss: null, studentEvalAfter: null, lane: 'answer', kind: `answer:${kit.step}:${kind}`, text, squares: [...squares], claim: `${kit.step}:${kind}`, key });
        };
        const rot = b.ply;
        push('prompt', kit.prompt(rot, b.fenBefore));
        // RIGHT: every key square's reason, as the close of a solved question.
        for (const sq of fk.key) {
          push('right', kit.reasonFor(b.fenBefore, sq), [sq]);
          for (const f of kit.followUps?.(b.fenBefore, sq, rot) ?? []) {
            push(`follow-${f.id}-prompt`, f.prompt, f.key);
            push(`follow-${f.id}-shown`, f.shownLine, f.key);
            const fw = wrongSquare(b.fenBefore, f.key);
            if (fw) out.push({ ...out[out.length - 1], kind: `answer:${kit.step}:follow-${f.id}-wrong`, text: f.wrongTapLine(fw), squares: [fw], claim: `${kit.step}:follow-wrong`, key: f.key.map(String) });
          }
        }
        // WRONG: a tap off the key — the method, never the answer.
        const w = wrongSquare(b.fenBefore, key);
        if (w) push('wrong', kit.wrongTapLine(b.fenBefore, w), [w]);
        // SHOWN: the worked example, said when the student misses it.
        push('shown', kit.showLine(b.fenBefore, fk.key, rot), key);
      }
    }
    writeFileSync('audit-reports/claim-check/answers.json', JSON.stringify(out));
    const byKind = new Map<string, number>();
    for (const c of out) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
    console.log(`[answers] ${out.length} replies on ${boards.length} boards`);
    for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)} ${k}`);
    expect(out.length).toBeGreaterThan(100);
  }, 1_800_000);
});

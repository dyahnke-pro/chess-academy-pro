/**
 * THE `stated` ESCAPE ONLY CLOSES (one-coach P3, David 2026-10-07: "Root
 * cause"). `NO_PROOF.stated` is the one no-proof reason that is not a reason —
 * a conclusion said with nothing behind it. Every other reason (`name`,
 * `description`, `method`, `withheld`) says WHY the fact needs no proof. Each
 * producer converted to its computer's real `Proof` lowers the count; the
 * ceiling is the measured backlog and may only go down. When it reaches zero
 * the reason is deleted from `NoProofReason` and the type closes the door.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const CEILING = 18; // 2026-10-07: the Learn page carries none (was 36; 42 before the line-backed lanes)

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.(ts|tsx)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

describe('no-proof "stated" — the backlog only shrinks', () => {
  it('counts every unproven conclusion a producer hands in', () => {
    const per = walk(SRC).map((p) => ({ p: p.slice(SRC.length + 1), n: (readFileSync(p, 'utf8').match(/NO_PROOF\.stated/g) ?? []).length })).filter((x) => x.n > 0);
    const total = per.reduce((a, x) => a + x.n, 0);
    // NON-VACUOUS: the scan must still see the reason while it exists.
    expect(readFileSync(resolve(SRC, 'services/proof.ts'), 'utf8')).toMatch(/'stated'/);
    expect(total, `${total} "stated" no-proofs, ceiling ${CEILING} — convert a producer to its computer's Proof, never add one:\n${per.map((x) => `${x.p}: ${x.n}`).join('\n')}`).toBeLessThanOrEqual(CEILING);
  });
});

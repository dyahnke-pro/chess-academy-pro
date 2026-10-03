/**
 * 🔒 ONE LINE READER (WO-OUTCOME-01, 2026-10-03). What a line WINS is read by
 * one computer — `exchangeLedger.proofCut` — never a private sum of captured
 * piece values. Five readers once answered the question with five rules and
 * the narration contradicted itself (a pawn "won" that the line handed back,
 * a line cut mid-exchange read as a rook up).
 *
 * This fails on any `x += VALUE[…captured]` accumulator outside the ledger.
 * A listed exception names why it is not an outcome claim.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ACCUMULATE = /[+-]=\s*[^`'";]*\b[A-Za-z_]*VALUE[A-Za-z_]*\s*\[[^\]]*captured[^\]]*\]/;

const ALLOW: Record<string, string> = {
  'src/services/exchangeLedger.ts': 'the one reader',
  'src/services/arrowEngine.ts': 'a move-ordering score for drawing arrows, never spoken',
};

function hits(): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
          const t = l.trim();
          if (t.startsWith('//') || t.startsWith('*')) return;
          if (ACCUMULATE.test(l)) out.push(`${p.split(path.sep).join('/')}:${i + 1}`);
        });
      }
    }
  };
  walk('src');
  return out;
}

describe('one line reader', () => {
  it('the pattern catches a private capture sum (negative control)', () => {
    expect(ACCUMULATE.test('if (m.captured) net += (m.color === me ? 1 : -1) * MATERIAL_VALUE[m.captured];')).toBe(true);
    expect(ACCUMULATE.test("base += `, capturing ${REVIEW_PIECE_NAME[played.captured]}`;")).toBe(false);
  });
  it('no private capture sum outside the ledger', () => {
    const found = hits().filter((h) => !ALLOW[h.split(':')[0]]);
    expect(found).toEqual([]);
  });
  it('no stale exception', () => {
    const files = new Set(hits().map((h) => h.split(':')[0]));
    expect(Object.keys(ALLOW).filter((f) => f !== 'src/services/exchangeLedger.ts' && !files.has(f))).toEqual([]);
  });
});

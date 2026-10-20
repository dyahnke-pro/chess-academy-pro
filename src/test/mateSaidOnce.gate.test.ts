// MATE IS SAID ONCE (OS-11 2026-10-20: "They threaten queen takes c7,
// checkmate, and it is mate"). The voice reads a SAN's "#" as ", checkmate",
// so a sentence that says mate in words carries its move through `unmarked`.
// Blamed by STATEMENT: a template that puts a raw SAN in front of "is mate" /
// "was mate" / "would be mate" / ", and it is mate" fails here.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { threatProof } from '../services/threatProof';
import { unmarked } from '../utils/sanMark';

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const MATE_AFTER = /\$\{([^{}]+)\}(?:, and it|,)? (?:is|was|would be) (?:check)?mate\b/g;

describe('a sentence that says mate carries its move without the mark', () => {
  it('the threat proof names the mating move once', () => {
    // Black's rook threatens Ra1#: White (the student) to move.
    const p = threatProof('r5k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1', 'w', []);
    expect(p?.full).toBe('They threaten Ra1, and it is mate');
    expect(p?.short).toBe('Ra1 is mate');
  });

  it('unmarked takes off only the trailing mark', () => {
    expect(unmarked('Qxc7#')).toBe('Qxc7');
    expect(unmarked('Rd8+')).toBe('Rd8');
    expect(unmarked('e8=Q#')).toBe('e8=Q');
    expect(unmarked('O-O')).toBe('O-O');
  });

  it('no producer puts a raw move in front of "is mate"', () => {
    const offenders: string[] = [];
    for (const file of sources('src')) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(MATE_AFTER)) {
        const expr = m[1].trim();
        if (/^unmarked\(/.test(expr)) continue;
        if (/^name\(unmarked\(/.test(expr)) continue;
        // A local already taken through `unmarked`, or a spoken-move phrase (no mark).
        if (/^[A-Za-z_$][\w$]*$/.test(expr) && new RegExp(`\\b${expr}\\s*=\\s*(?:unmarked|sayMoveClause|sayMoveNoun)\\(`).test(text)) continue;
        offenders.push(`${file}: \${${expr}} … ${m[0].slice(m[0].indexOf('}') + 1)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

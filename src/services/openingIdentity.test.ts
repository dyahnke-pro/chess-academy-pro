import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { identityFor, openingIdentityLine, setOpeningIdentity } from './openingIdentity';

const FILE = 'public/data/opening-identity.json';

describe('openingIdentity', () => {
  beforeAll(() => { setOpeningIdentity(JSON.parse(readFileSync(FILE, 'utf8'))); });

  it('the shipped file is what the builder makes today (not stale)', () => {
    const before = readFileSync(FILE, 'utf8');
    execFileSync(process.execPath, ['scripts/build-opening-identity.mjs'], { stdio: 'ignore' });
    expect(readFileSync(FILE, 'utf8')).toBe(before);
  }, 120_000);

  it('Alekhine: provokes the pawn at the knight, from the student\'s seat', () => {
    const asBlack = openingIdentityLine('Alekhine Defense', 'b', 'seat');
    expect(asBlack?.text).toMatch(/they (almost always|usually|often|sometimes) answer with the pawn to e5, a centre pawn thrown forward at your knight on f6/);
    const asWhite = openingIdentityLine('Alekhine Defense', 'w', 'seat');
    expect(asWhite?.text).toMatch(/you (almost always|usually|often|sometimes) answer with the pawn to e5, a centre pawn thrown forward at their knight on f6/);
    expect(openingIdentityLine('Alekhine Defense', 'w', 'demo')?.text).toMatch(/White (almost always|usually|often|sometimes) answers with/);
  });

  it('a gambit that lasts is said with its length; an ordinary opening is not a gambit', () => {
    expect(openingIdentityLine('Italian Game: Evans Gambit', 'w', 'seat')?.text).toMatch(/you stay a pawn down for at least \d+ moves/);
    expect(openingIdentityLine("Queen's Gambit", 'w', 'seat')?.text ?? '').not.toMatch(/pawn down/);
  });

  it('an e4/e5 standoff is not a locked centre; a real chain is', () => {
    expect(openingIdentityLine('Italian Game', 'w', 'seat')?.text ?? '').not.toMatch(/locks the centre/);
    expect(openingIdentityLine('French Defense: Advance Variation', 'b', 'seat')?.text).toMatch(/locks the centre, pawns on e5 and e6/);
  });

  it('a variation falls back to its named parent', () => {
    expect(identityFor('Alekhine Defense: Some Unknown Line, Deep Sub')?.name).toBe('Alekhine Defense');
  });

  // Learn tape 2026-10-07: the game was named "Scandinavian Defense", refined a
  // move later to the Mieses-Kotroc, and the refined entry had nothing of its
  // own — so the family's fact was never spoken all game (340 lines like it).
  it('a refined variation keeps its family\'s fact, naming the family', () => {
    expect(openingIdentityLine('Scandinavian Defense: Mieses-Kotroc Variation', 'b', 'seat')?.text)
      .toMatch(/^The Scandinavian Defense challenges the centre at once: they (almost always|usually) take on d5, and the pawn is taken back\./);
    // The Lasker Variation is defined by WHITE's h3; the inherited question is
    // still Black's d5, answered by White — the seat follows the family's move.
    expect(openingIdentityLine('Scandinavian Defense: Lasker Variation', 'w', 'seat')?.text)
      .toMatch(/^The Scandinavian Defense challenges the centre at once: you (almost always|usually) take on d5/);
  });

  it('a family fact is inherited only where the line itself played it', () => {
    // The Marshall/Modern Scandinavian answers exd5 with …Nf6, not a recapture:
    // "and the pawn is taken back" would be false there, so nothing is inherited.
    for (const n of ['Scandinavian Defense: Marshall Variation', 'Scandinavian Defense: Modern Variation']) {
      expect(openingIdentityLine(n, 'b', 'seat')?.text ?? '').not.toMatch(/taken back/);
    }
  });

  it('a defining move that captures offers nothing (an exchange is not a gambit)', () => {
    // exd5 cxd5 was read as "it offers a pawn, and they take it" on 31 lines.
    for (const n of ['Caro-Kann Defense: Exchange Variation', 'French Defense: Exchange Variation', 'Sicilian Defense: Smith-Morra Gambit Accepted']) {
      expect(openingIdentityLine(n, 'w', 'seat')?.text ?? '').not.toMatch(/offers a pawn/);
    }
  });

  it('famous games are over-the-board masters only', () => {
    const all = Object.values(JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, { famous: Array<{ event: string | null }> }>);
    for (const r of all) for (const g of r.famous) expect(g.event ?? '').not.toMatch(/chess\.com|lichess|blitz|bullet|rapid/i);
  });
});
